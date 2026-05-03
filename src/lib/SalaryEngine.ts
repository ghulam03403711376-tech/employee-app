import { 
  differenceInMinutes, 
  parseISO, 
  format, 
  isSameDay, 
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isFriday,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { 
  SystemData, 
  Employee, 
  AttendanceRecord, 
  LeaveRequest, 
  Holiday, 
  Payroll,
  SaleRecord,
  Advance,
  Bonus
} from '../types';

export class SalaryEngine {
  static calculateAttendanceStats(
    employee: Employee,
    records: AttendanceRecord[],
    holidays: Holiday[],
    leaves: LeaveRequest[]
  ) {
    let totalLate = 0;
    let daysWorked = 0;
    let earlyLeaves = 0;
    let mealAllowances = 0;
    let totalOvertimeHours = 0;

    records.forEach(record => {
      if (record.status === 'Present') {
        daysWorked++;
        totalLate += record.lateMinutes;
        earlyLeaves += record.earlyLeaveMinutes;
        if (record.isMealAllowanceGranted) {
          mealAllowances++;
        }

        if (record.checkIn && record.checkOut) {
          const expectedOut = parseISO(record.checkIn);
          expectedOut.setHours(18, 0, 0, 0); // Assuming 6 PM is standard expected clock out
          
          let workedMinutes = differenceInMinutes(parseISO(record.checkOut), parseISO(record.checkIn));
          
          if (record.lunchIn && record.lunchOut) {
             const lunchDuration = Math.max(0, differenceInMinutes(parseISO(record.lunchIn), parseISO(record.lunchOut)));
             workedMinutes -= lunchDuration;
          }

          // Expected work hours is 8 hours (480 minutes)
          if (workedMinutes > 480) {
            totalOvertimeHours += (workedMinutes - 480) / 60;
          }
        }
      }
    });

    return { totalLate, daysWorked, earlyLeaves, mealAllowances, totalOvertimeHours };
  }

  static generatePayroll(
    employee: Employee,
    data: SystemData,
    start: Date,
    end: Date
  ): Payroll {
    const records = data.attendance.filter(r => 
      r.employeeId === employee.id && 
      isWithinInterval(parseISO(r.date), { start, end })
    );

    const stats = this.calculateAttendanceStats(
      employee, 
      records, 
      data.holidays, 
      data.leaves.filter(l => l.employeeId === employee.id && l.status === 'Approved')
    );

    // 1. Commission
    const sales = data.sales.filter(s => 
      s.employeeId === employee.id && 
      isWithinInterval(parseISO(s.date), { start, end })
    );
    const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
    const commission = (totalSales * employee.commissionPercentage) / 100;

    // 2. Bonus
    const bonuses = data.bonuses.filter(b => 
      b.employeeId === employee.id && 
      isWithinInterval(parseISO(b.date), { start, end })
    );
    const bonusAmount = bonuses.reduce((sum, b) => sum + b.amount, 0);

    // 3. Meal Allowance
    const mealAllowance = stats.mealAllowances * data.settings.mealAllowanceAmount;

    const hourlyRate = (employee.salaryAmount / 30) / 8; // Assumes 30 days, 8h

    // 4. Overtime (Calculated from timesheets)
    const overtimeRate = data.settings?.overtimeRatePerHour || (hourlyRate * 1.5);
    const overtime = stats.totalOvertimeHours * overtimeRate; 

    // 5. Late Deductions
    // 120 min free allowance per month
    const excessLate = Math.max(0, stats.totalLate - employee.lateAllowanceMinutes);
    // Rough deduction: hourly rate / 60 * excess min
    const lateDeduction = excessLate * (hourlyRate / 2); // Penalty factor

    // 6. Leave Deductions
    // Count unpaid leaves
    const approvedLeaves = data.leaves.filter(l => 
      l.employeeId === employee.id && 
      l.status === 'Approved' &&
      isWithinInterval(parseISO(l.startDate), { start, end })
    );
    const unpaidLeaves = approvedLeaves.filter(l => !l.isPaid).length;
    const leaveDeduction = unpaidLeaves * (employee.salaryAmount / 30);

    // 7. Advances
    const pendingAdvances = data.advances.filter(a => 
      a.employeeId === employee.id && 
      !a.isDeducted &&
      isWithinInterval(parseISO(a.date), { start, end })
    );
    const advancesDeducted = pendingAdvances.reduce((sum, a) => sum + a.amount, 0);

    const baseSalary = employee.salaryAmount;
    const grandTotal = baseSalary + commission + bonusAmount + overtime + mealAllowance - advancesDeducted - lateDeduction - leaveDeduction;

    return {
      id: crypto.randomUUID(),
      employeeId: employee.id,
      periodStart: format(start, 'yyyy-MM-dd'),
      periodEnd: format(end, 'yyyy-MM-dd'),
      baseSalary,
      commission,
      bonus: bonusAmount,
      overtime,
      mealAllowance,
      advancesDeducted,
      lateDeductions: lateDeduction,
      leaveDeductions: leaveDeduction,
      grandTotal: Math.max(0, grandTotal),
      status: 'Pending',
      generatedAt: new Date().toISOString()
    };
  }
}
