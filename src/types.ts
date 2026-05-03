/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'Admin' | 'Manager' | 'Employee';
export type SalaryType = 'Daily' | 'Weekly' | 'Monthly';
export type LeavePolicyType = 'None' | '1/month' | '2/month' | 'Friday-only' | 'Mixed';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  cnic: string;
  role: Role;
  salaryType: SalaryType;
  salaryAmount: number;
  commissionPercentage: number;
  leavePolicy: LeavePolicyType;
  lateAllowanceMinutes: number; // default 120
  isMealAllowanceEligible: boolean;
  joinDate: string;
  isActive: boolean;
  isEmailVerified: boolean;
  leaveBalance: number;
  profilePicture?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // ISO string
  lunchOut?: string;
  lunchIn?: string;
  checkOut?: string;
  status: 'Present' | 'Absent' | 'Holiday' | 'Leave';
  lateMinutes: number;
  earlyLeaveMinutes: number;
  isMealAllowanceGranted: boolean;
  notes?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  isPaid: boolean;
  appliedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
}

export interface Advance {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  isDeducted: boolean;
  deductionPayrollId?: string;
}

export interface Bonus {
  id: string;
  employeeId: string;
  amount: number;
  type: 'Fixed' | 'Performance';
  date: string;
  reason: string;
}

export interface SaleRecord {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  commission: number;
  bonus: number;
  overtime: number;
  mealAllowance: number;
  advancesDeducted: number;
  lateDeductions: number;
  leaveDeductions: number;
  grandTotal: number;
  status: 'Pending' | 'Paid';
  generatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  reminderDate?: string;
  status: 'Pending' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  employeeId?: string;
  assigneeId?: string;
  tags?: string[];
  subtasks?: { id: string; title: string; completed: boolean }[];
}

export interface SystemData {
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  holidays: Holiday[];
  advances: Advance[];
  bonuses: Bonus[];
  sales: SaleRecord[];
  payrolls: Payroll[];
  tasks: Task[];
  settings: {
    lastAutomationRun: string;
    overtimeRatePerHour: number;
    mealAllowanceAmount: number;
  };
}
