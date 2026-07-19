import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Deterministic PRNG so the demo dataset looks the same on every fresh `db:seed` run.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "Passw0rd!";

async function main() {
  console.log("Seeding database...");

  await prisma.taskHistory.deleteMany();
  await prisma.task.deleteMany();
  await prisma.taskCategory.deleteMany();
  await prisma.employee.updateMany({ data: { managerId: null } });
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // ---- Companies ----
  const alpha = await prisma.company.create({ data: { name: "Alpha Industries", code: "ALPHA", address: "Mumbai, India" } });
  const beta = await prisma.company.create({ data: { name: "Beta Traders", code: "BETA", address: "Ahmedabad, India" } });
  const gamma = await prisma.company.create({ data: { name: "Gamma Exports", code: "GAMMA", address: "Surat, India" } });

  // ---- Departments ----
  const deptDefs = [
    { name: "Accounts", company: alpha },
    { name: "Sales", company: alpha },
    { name: "IT", company: alpha },
    { name: "HR", company: alpha },
    { name: "Finance", company: beta },
    { name: "Purchase", company: beta },
    { name: "Marketing", company: beta },
    { name: "Exports", company: gamma },
    { name: "Imports", company: gamma },
    { name: "Production", company: gamma },
  ];
  const departments = await Promise.all(
    deptDefs.map((d) => prisma.department.create({ data: { name: d.name, companyId: d.company.id } })),
  );

  // ---- Task categories ----
  const categoryNames = [
    "Reporting",
    "Data Entry",
    "Client Follow-up",
    "Documentation",
    "Reconciliation",
    "Coordination",
    "Compliance",
    "Procurement",
  ];
  const categories = await Promise.all(categoryNames.map((name) => prisma.taskCategory.create({ data: { name } })));

  // ---- Admin ----
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@tasktracker.local",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  // ---- Employees + linked User accounts ----
  interface EmployeeDef {
    name: string;
    designation: string;
    dept: number;
    isManager?: boolean;
  }
  const employeeDefs: EmployeeDef[] = [
    { name: "Rohit Sharma", designation: "Accounts Manager", dept: 0, isManager: true },
    { name: "Priya Nair", designation: "Accounts Executive", dept: 0 },
    { name: "Karan Mehta", designation: "Sales Manager", dept: 1, isManager: true },
    { name: "Ananya Rao", designation: "Sales Executive", dept: 1 },
    { name: "Vivek Iyer", designation: "IT Support Engineer", dept: 2 },
    { name: "Sneha Kulkarni", designation: "HR Executive", dept: 3 },
    { name: "Arjun Patel", designation: "Finance Manager", dept: 4, isManager: true },
    { name: "Meera Joshi", designation: "Purchase Executive", dept: 5 },
    { name: "Devansh Shah", designation: "Marketing Executive", dept: 6 },
    { name: "Kavita Desai", designation: "Export Coordinator", dept: 7 },
  ];

  const employees: Awaited<ReturnType<typeof prisma.employee.create>>[] = [];
  const managerIdByDept = new Map<number, string>();

  for (let i = 0; i < employeeDefs.length; i++) {
    const def = employeeDefs[i];
    const dept = departments[def.dept];
    const emailSlug = def.name.toLowerCase().replace(/\s+/g, ".");
    const employee = await prisma.employee.create({
      data: {
        employeeCode: `EMP${String(i + 1).padStart(3, "0")}`,
        name: def.name,
        designation: def.designation,
        email: `${emailSlug}@tasktracker.local`,
        phone: `+91-9${randInt(100000000, 999999999)}`,
        status: i === employeeDefs.length - 1 ? "INACTIVE" : "ACTIVE",
        joiningDate: new Date(2022, randInt(0, 11), randInt(1, 28)),
        departmentId: dept.id,
        companyId: dept.companyId,
      },
    });
    employees.push(employee);
    if (def.isManager) managerIdByDept.set(def.dept, employee.id);

    await prisma.user.create({
      data: {
        email: employee.email,
        passwordHash,
        role: "EMPLOYEE",
        isActive: employee.status === "ACTIVE",
        employeeId: employee.id,
      },
    });
  }

  // Assign managers where one exists for the employee's department (and isn't themselves).
  for (const employee of employees) {
    const deptIndex = departments.findIndex((d) => d.id === employee.departmentId);
    const managerId = managerIdByDept.get(deptIndex);
    if (managerId && managerId !== employee.id) {
      await prisma.employee.update({ where: { id: employee.id }, data: { managerId } });
    }
  }

  // ---- Tasks ----
  const priorities = ["P1_URGENT", "P2_MEDIUM", "P3_LOW"] as const;
  const taskTitles = [
    "Prepare monthly reconciliation statement",
    "Follow up with client on pending invoice",
    "Update inventory records in ERP",
    "Draft quotation for new customer",
    "Compile weekly sales report",
    "Review purchase orders for the week",
    "Coordinate shipment documentation",
    "Resolve employee payroll query",
    "Fix printer/network issue in office",
    "Prepare GST filing documents",
    "Onboard new vendor in system",
    "Send marketing newsletter draft",
    "Audit petty cash register",
    "Update customer contact database",
    "Prepare export compliance checklist",
    "Schedule client review meeting",
    "Verify bank statement entries",
    "Update department budget tracker",
    "Coordinate with logistics for delivery",
    "Prepare presentation for management review",
  ];

  const today = new Date();
  const activeEmployees = employees.filter((e) => e.status === "ACTIVE");

  let created = 0;
  const TASK_COUNT = 55;
  for (let i = 0; i < TASK_COUNT; i++) {
    const employee = pick(activeEmployees);
    const category = pick(categories);
    const priority = pick(priorities);
    const dueOffset = randInt(-12, 10); // negative = already past due
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + dueOffset);
    const assignedDate = new Date(dueDate);
    assignedDate.setDate(assignedDate.getDate() - randInt(1, 5));

    // Weight status distribution to produce a realistic, varied dashboard.
    const roll = rand();
    let status: string;
    let completedDate: Date | null = null;
    let progressPercent = 0;

    if (roll < 0.32) {
      status = "COMPLETED";
      const completeOffset = randInt(-2, 3); // may complete a bit after due date -> delay
      completedDate = new Date(dueDate);
      completedDate.setDate(completedDate.getDate() + completeOffset);
      progressPercent = 100;
    } else if (roll < 0.5 && dueOffset < 0) {
      status = "DELAYED";
      progressPercent = randInt(20, 80);
    } else if (roll < 0.68) {
      status = "IN_PROGRESS";
      progressPercent = randInt(10, 90);
    } else if (roll < 0.78) {
      status = "WAITING_APPROVAL";
      progressPercent = randInt(80, 99);
    } else if (roll < 0.86) {
      status = "ON_HOLD";
      progressPercent = randInt(0, 50);
    } else if (roll < 0.93) {
      status = "CANCELLED";
      progressPercent = randInt(0, 40);
    } else {
      status = "PENDING";
      progressPercent = 0;
    }

    const task = await prisma.task.create({
      data: {
        title: `${pick(taskTitles)} #${i + 1}`,
        description: "Auto-generated seed task for demo purposes.",
        priority,
        status,
        assignedDate,
        dueDate,
        completedDate,
        progressPercent,
        estimatedHours: randInt(1, 16),
        actualHours: status === "COMPLETED" ? randInt(1, 18) : null,
        remarks: status === "DELAYED" ? "Waiting on inputs from client." : null,
        tags: JSON.stringify([category.name.split(" ")[0].toLowerCase()]),
        assignedToId: employee.id,
        assignedById: adminUser.id,
        departmentId: employee.departmentId,
        companyId: employee.companyId,
        categoryId: category.id,
      },
    });

    await prisma.taskHistory.create({
      data: {
        taskId: task.id,
        changedById: adminUser.id,
        action: "CREATED",
        newValue: "PENDING",
        createdAt: assignedDate,
      },
    });
    if (status !== "PENDING") {
      await prisma.taskHistory.create({
        data: {
          taskId: task.id,
          changedById: adminUser.id,
          action: status === "COMPLETED" ? "COMPLETED" : "STATUS_CHANGED",
          field: "status",
          oldValue: "PENDING",
          newValue: status,
          createdAt: completedDate ?? dueDate,
        },
      });
    }

    created++;
  }

  // A handful of historical completed tasks spread over the past 5 months, purely so the
  // Monthly Completion Trend / Delay Trend dashboard charts have more than one data point.
  for (let m = 5; m >= 1; m--) {
    const count = randInt(2, 5);
    for (let i = 0; i < count; i++) {
      const employee = pick(activeEmployees);
      const category = pick(categories);
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, randInt(1, 26));
      const dueDate = new Date(monthDate);
      const completeOffset = randInt(-2, 4);
      const completedDate = new Date(dueDate);
      completedDate.setDate(completedDate.getDate() + completeOffset);
      const assignedDate = new Date(dueDate);
      assignedDate.setDate(assignedDate.getDate() - randInt(1, 5));

      const task = await prisma.task.create({
        data: {
          title: `${pick(taskTitles)} #${created + 1}`,
          description: "Auto-generated seed task for demo purposes.",
          priority: pick(priorities),
          status: "COMPLETED",
          assignedDate,
          dueDate,
          completedDate,
          progressPercent: 100,
          estimatedHours: randInt(1, 16),
          actualHours: randInt(1, 18),
          tags: JSON.stringify([category.name.split(" ")[0].toLowerCase()]),
          assignedToId: employee.id,
          assignedById: adminUser.id,
          departmentId: employee.departmentId,
          companyId: employee.companyId,
          categoryId: category.id,
        },
      });
      await prisma.taskHistory.createMany({
        data: [
          { taskId: task.id, changedById: adminUser.id, action: "CREATED", newValue: "PENDING", createdAt: assignedDate },
          { taskId: task.id, changedById: adminUser.id, action: "COMPLETED", field: "status", oldValue: "PENDING", newValue: "COMPLETED", createdAt: completedDate },
        ],
      });
      created++;
    }
  }

  console.log(`Seeded ${departments.length} departments, ${employees.length} employees, ${created} tasks.`);
  console.log(`\nLogin as admin:    admin@tasktracker.local / ${DEFAULT_PASSWORD}`);
  console.log(`Login as employee: ${employees[0].email} / ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
