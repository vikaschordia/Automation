import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const EMPLOYEE_DEFAULT_PASSWORD = process.env.EMPLOYEE_DEFAULT_PASSWORD ?? "Employee@123";

// Path to the JSON export to restore — the file dropped into prisma/data-import/.
const EXPORT_PATH = join(__dirname, "data-import", "data-export-2026-07-22.json");

interface ExportShape {
  companies: { id: string; name: string; code: string; address: string | null; isActive: boolean; createdAt: string; updatedAt: string }[];
  departments: { id: string; name: string; companyId: string; isActive: boolean; createdAt: string; updatedAt: string }[];
  employees: {
    id: string; employeeCode: string; name: string; designation: string; email: string; phone: string | null;
    status: string; joiningDate: string; createdAt: string; updatedAt: string; departmentId: string; companyId: string;
    managerId: string | null; canViewExpenses: boolean;
  }[];
  taskCategories: { id: string; name: string; createdAt: string }[];
  tasks: {
    id: number; title: string; description: string | null; priority: string; status: string; assignedDate: string;
    dueDate: string; completedDate: string | null; progressPercent: number; estimatedHours: number | null;
    actualHours: number | null; remarks: string | null; tags: string; deletedAt: string | null; createdAt: string;
    updatedAt: string; groupId: string | null; assignedToId: string; assignedById: string; departmentId: string;
    companyId: string; categoryId: string | null;
  }[];
  taskHistory: {
    id: string; taskId: number; changedById: string; action: string; field: string | null; oldValue: string | null;
    newValue: string | null; createdAt: string;
  }[];
  monthlyExpenses: {
    id: string; name: string; dueDate: string; amount: number; status: string; paidDate: string | null;
    isRecurring: boolean; recurringGroupId: string | null; remarks: string | null; createdAt: string; updatedAt: string;
  }[];
  notes: { id: string; userId: string; content: string; done: boolean; order: number; createdAt: string; updatedAt: string }[];
  users: {
    id: string; email: string; role: string; isActive: boolean; lastLoginAt: string | null; employeeId: string | null;
    createdAt: string; updatedAt: string;
  }[];
}

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD must be set in .env before running the restore");
  }

  const data: ExportShape = JSON.parse(readFileSync(EXPORT_PATH, "utf-8"));

  console.log("Wiping existing collections...");
  await prisma.taskHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.counter.deleteMany();
  await prisma.note.deleteMany();
  await prisma.monthlyExpense.deleteMany();
  await prisma.taskCategory.deleteMany();
  await prisma.employee.updateMany({ data: { managerId: null } });
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const employeePasswordHash = await bcrypt.hash(EMPLOYEE_DEFAULT_PASSWORD, 10);

  // Old id (cuid string, or old numeric Task.id) -> new Mongo ObjectId string, per collection.
  const companyIdMap = new Map<string, string>();
  const departmentIdMap = new Map<string, string>();
  const employeeIdMap = new Map<string, string>();
  const categoryIdMap = new Map<string, string>();
  const userIdMap = new Map<string, string>();
  const taskIdMap = new Map<number, string>();

  // ---- Companies ----
  console.log(`Restoring ${data.companies.length} companies...`);
  for (const c of data.companies) {
    const created = await prisma.company.create({
      data: {
        name: c.name,
        code: c.code,
        address: c.address,
        isActive: c.isActive,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      },
    });
    companyIdMap.set(c.id, created.id);
  }

  // ---- Departments ----
  console.log(`Restoring ${data.departments.length} departments...`);
  for (const d of data.departments) {
    const companyId = companyIdMap.get(d.companyId);
    if (!companyId) throw new Error(`Department ${d.id} references unknown companyId ${d.companyId}`);
    const created = await prisma.department.create({
      data: {
        name: d.name,
        companyId,
        isActive: d.isActive,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      },
    });
    departmentIdMap.set(d.id, created.id);
  }

  // ---- Task categories ----
  console.log(`Restoring ${data.taskCategories.length} task categories...`);
  for (const cat of data.taskCategories) {
    const created = await prisma.taskCategory.create({
      data: { name: cat.name, createdAt: new Date(cat.createdAt) },
    });
    categoryIdMap.set(cat.id, created.id);
  }

  // ---- Admin user ----
  // The export's admin user row (role ADMIN) — restored with ADMIN_PASSWORD from .env since
  // password hashes are never exported.
  const exportedAdmin = data.users.find((u) => u.role === "ADMIN");
  if (!exportedAdmin) throw new Error("No ADMIN user found in export");
  const adminUser = await prisma.user.create({
    data: {
      email: exportedAdmin.email,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: exportedAdmin.isActive,
      lastLoginAt: exportedAdmin.lastLoginAt ? new Date(exportedAdmin.lastLoginAt) : null,
      createdAt: new Date(exportedAdmin.createdAt),
      updatedAt: new Date(exportedAdmin.updatedAt),
    },
  });
  userIdMap.set(exportedAdmin.id, adminUser.id);

  // ---- Employees ----
  console.log(`Restoring ${data.employees.length} employees...`);
  for (const e of data.employees) {
    const departmentId = departmentIdMap.get(e.departmentId);
    const companyId = companyIdMap.get(e.companyId);
    if (!departmentId) throw new Error(`Employee ${e.id} references unknown departmentId ${e.departmentId}`);
    if (!companyId) throw new Error(`Employee ${e.id} references unknown companyId ${e.companyId}`);
    const created = await prisma.employee.create({
      data: {
        employeeCode: e.employeeCode,
        name: e.name,
        designation: e.designation,
        email: e.email,
        phone: e.phone,
        status: e.status,
        joiningDate: new Date(e.joiningDate),
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
        departmentId,
        companyId,
        canViewExpenses: e.canViewExpenses,
      },
    });
    employeeIdMap.set(e.id, created.id);
  }

  // Second pass: employee.managerId (self-referencing, needs every employee already created).
  for (const e of data.employees) {
    if (!e.managerId) continue;
    const newId = employeeIdMap.get(e.id)!;
    const newManagerId = employeeIdMap.get(e.managerId);
    if (!newManagerId) throw new Error(`Employee ${e.id} references unknown managerId ${e.managerId}`);
    await prisma.employee.update({ where: { id: newId }, data: { managerId: newManagerId } });
  }

  // ---- Employee login users ----
  const employeeUsers = data.users.filter((u) => u.role === "EMPLOYEE");
  console.log(`Restoring ${employeeUsers.length} employee logins...`);
  for (const u of employeeUsers) {
    const employeeId = u.employeeId ? employeeIdMap.get(u.employeeId) : null;
    if (u.employeeId && !employeeId) throw new Error(`User ${u.id} references unknown employeeId ${u.employeeId}`);
    const created = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: employeePasswordHash,
        role: "EMPLOYEE",
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
        employeeId,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
    userIdMap.set(u.id, created.id);
  }

  // ---- Tasks ----
  console.log(`Restoring ${data.tasks.length} tasks...`);
  let maxTaskNumber = 0;
  for (const t of data.tasks) {
    const assignedToId = employeeIdMap.get(t.assignedToId);
    const assignedById = userIdMap.get(t.assignedById);
    const departmentId = departmentIdMap.get(t.departmentId);
    const companyId = companyIdMap.get(t.companyId);
    const categoryId = t.categoryId ? categoryIdMap.get(t.categoryId) : null;
    if (!assignedToId) throw new Error(`Task ${t.id} references unknown assignedToId ${t.assignedToId}`);
    if (!assignedById) throw new Error(`Task ${t.id} references unknown assignedById ${t.assignedById}`);
    if (!departmentId) throw new Error(`Task ${t.id} references unknown departmentId ${t.departmentId}`);
    if (!companyId) throw new Error(`Task ${t.id} references unknown companyId ${t.companyId}`);
    if (t.categoryId && !categoryId) throw new Error(`Task ${t.id} references unknown categoryId ${t.categoryId}`);

    const created = await prisma.task.create({
      data: {
        taskNumber: t.id,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        assignedDate: new Date(t.assignedDate),
        dueDate: new Date(t.dueDate),
        completedDate: t.completedDate ? new Date(t.completedDate) : null,
        progressPercent: t.progressPercent,
        estimatedHours: t.estimatedHours,
        actualHours: t.actualHours,
        remarks: t.remarks,
        tags: t.tags,
        deletedAt: t.deletedAt ? new Date(t.deletedAt) : null,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
        groupId: t.groupId,
        assignedToId,
        assignedById,
        departmentId,
        companyId,
        categoryId,
      },
    });
    taskIdMap.set(t.id, created.id);
    if (t.id > maxTaskNumber) maxTaskNumber = t.id;
  }

  // Seed the taskNumber counter to continue right after the highest restored task number, so the
  // next task created through the app doesn't collide with a restored taskNumber.
  await prisma.counter.create({ data: { id: "task", value: maxTaskNumber } });

  // ---- Task history ----
  console.log(`Restoring ${data.taskHistory.length} task history entries...`);
  for (const h of data.taskHistory) {
    const taskId = taskIdMap.get(h.taskId);
    const changedById = userIdMap.get(h.changedById);
    if (!taskId) throw new Error(`TaskHistory ${h.id} references unknown taskId ${h.taskId}`);
    if (!changedById) throw new Error(`TaskHistory ${h.id} references unknown changedById ${h.changedById}`);
    await prisma.taskHistory.create({
      data: {
        taskId,
        changedById,
        action: h.action,
        field: h.field,
        oldValue: h.oldValue,
        newValue: h.newValue,
        createdAt: new Date(h.createdAt),
      },
    });
  }

  // ---- Monthly expenses (no foreign keys — restored as-is) ----
  console.log(`Restoring ${data.monthlyExpenses.length} monthly expenses...`);
  for (const m of data.monthlyExpenses) {
    await prisma.monthlyExpense.create({
      data: {
        name: m.name,
        dueDate: new Date(m.dueDate),
        amount: m.amount,
        status: m.status,
        paidDate: m.paidDate ? new Date(m.paidDate) : null,
        isRecurring: m.isRecurring,
        recurringGroupId: m.recurringGroupId,
        remarks: m.remarks,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      },
    });
  }

  // ---- Notes ----
  console.log(`Restoring ${data.notes.length} notes...`);
  for (const n of data.notes) {
    const userId = userIdMap.get(n.userId);
    if (!userId) throw new Error(`Note ${n.id} references unknown userId ${n.userId}`);
    await prisma.note.create({
      data: {
        userId,
        content: n.content,
        done: n.done,
        order: n.order,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
      },
    });
  }

  console.log("\nRestore complete.");
  console.log(`  Companies: ${data.companies.length}`);
  console.log(`  Departments: ${data.departments.length}`);
  console.log(`  Employees: ${data.employees.length}`);
  console.log(`  Task categories: ${data.taskCategories.length}`);
  console.log(`  Tasks: ${data.tasks.length}`);
  console.log(`  Task history: ${data.taskHistory.length}`);
  console.log(`  Monthly expenses: ${data.monthlyExpenses.length}`);
  console.log(`  Notes: ${data.notes.length}`);
  console.log(`  Users: ${data.users.length}`);
  console.log(`\nAdmin login: ${exportedAdmin.email} / ${ADMIN_PASSWORD}`);
  console.log(`Employee login (shared password): ${EMPLOYEE_DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
