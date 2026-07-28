/**
 * One-time repair for a schema/data mismatch: Task.assignedToId, Task.departmentId, and
 * Employee.departmentId were stored as plain BSON strings instead of ObjectId, which silently
 * breaks Prisma's relation `orderBy` (e.g. sorting the Tasks list by Employee or Department name)
 * because the aggregation pipeline it builds can't match a string FK against an ObjectId `_id`.
 *
 * Run once, after `prisma/schema.prisma` gets `@db.ObjectId` added to those three fields:
 *   npx dotenv -e .env -- tsx prisma/fix-objectid-types.ts
 *
 * Idempotent — re-running is safe, already-converted fields are left untouched.
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backup() {
  const tasks = await prisma.task.findMany({ select: { id: true, assignedToId: true, departmentId: true } });
  const employees = await prisma.employee.findMany({ select: { id: true, departmentId: true } });

  const path = join(process.cwd(), `objectid-backup-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify({ tasks, employees }, null, 2));
  console.log(`Backed up ${tasks.length} task rows + ${employees.length} employee rows to ${path}`);
}

async function convert(collection: "Task" | "Employee", fields: string[]) {
  const setStage: Record<string, unknown> = {};
  for (const field of fields) {
    setStage[field] = {
      $cond: [{ $eq: [{ $type: `$${field}` }, "string"] }, { $toObjectId: `$${field}` }, `$${field}`],
    };
  }

  const result = (await prisma.$runCommandRaw({
    update: collection,
    updates: [{ q: {}, u: [{ $set: setStage }], multi: true }],
  } as Prisma.InputJsonObject)) as { n?: number; nModified?: number };
  console.log(`${collection}: matched ${result.n ?? 0}, modified ${result.nModified ?? 0}`);
}

async function verify() {
  const stillStringTasks = (await prisma.$runCommandRaw({
    aggregate: "Task",
    pipeline: [
      { $match: { $or: [{ assignedToId: { $type: "string" } }, { departmentId: { $type: "string" } }] } },
      { $count: "count" },
    ],
    cursor: {},
  })) as { cursor?: { firstBatch?: { count: number }[] } };

  const stillStringEmployees = (await prisma.$runCommandRaw({
    aggregate: "Employee",
    pipeline: [{ $match: { departmentId: { $type: "string" } } }, { $count: "count" }],
    cursor: {},
  })) as { cursor?: { firstBatch?: { count: number }[] } };

  const taskCount = stillStringTasks.cursor?.firstBatch?.[0]?.count ?? 0;
  const employeeCount = stillStringEmployees.cursor?.firstBatch?.[0]?.count ?? 0;
  console.log(`Remaining unconverted: ${taskCount} task field(s), ${employeeCount} employee field(s)`);
  if (taskCount > 0 || employeeCount > 0) {
    throw new Error("Conversion incomplete — some fields are still stored as strings");
  }
}

async function main() {
  console.log("Step 1/3: backing up affected fields...");
  await backup();

  console.log("Step 2/3: converting stored string ids to ObjectId...");
  await convert("Task", ["assignedToId", "departmentId"]);
  await convert("Employee", ["departmentId"]);

  console.log("Step 3/3: verifying...");
  await verify();

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
