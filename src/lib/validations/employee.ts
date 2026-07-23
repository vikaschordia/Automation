import { z } from "zod";
import { EMPLOYEE_STATUSES } from "@/lib/constants";

export const employeeSchema = z.object({
  employeeCode: z.string().trim().min(2, "Employee code is required").max(30),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  designation: z.string().trim().min(2, "Designation is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  status: z.enum(EMPLOYEE_STATUSES),
  joiningDate: z.coerce.date(),
  departmentId: z.string().min(1, "Department is required"),
  companyId: z.string().min(1, "Company is required"),
  // Companies this employee is also mapped to, beyond their primary companyId above — e.g. so
  // they can be assigned tasks under those companies too. Never includes companyId itself; that's
  // enforced server-side rather than trusted from the client.
  additionalCompanyIds: z.array(z.string()).max(50).optional(),
  managerId: z.string().optional().nullable(),
  canViewExpenses: z.boolean().optional(),
  createLogin: z.boolean().optional(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
