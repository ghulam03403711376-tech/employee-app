# Security Specification - RetailFlow Pro

## 1. Data Invariants
- An employee record must have a unique email.
- Attendance records must belong to a valid employee.
- Only Admins and Managers can modify employee basic data (salary, role).
- Employees can only 'read' and 'create' their own attendance (check-in/out).
- Leave requests are strictly 'read' only for the owner, 'read/write' for Admin.
- Salaries (Payroll) are read-only for employees (only their own).

## 2. The Dirty Dozen Payloads (Rejection Targets)
1. **The Salary Buff**: Employee attempts to update `salaryAmount` in `/employees/{uid}`.
2. **The Self-Approval**: Employee attempts to update `status` to `Approved` in `/leaves/{id}`.
3. **The Ghost Worker**: Anonymous user attempts to create a document in `/employees`.
4. **The Identity Spoof**: User A attempts to create an attendance record for User B.
5. **The Retro-Fitter**: User attempts to update `checkIn` time from 2 hours ago to current time (if restricted).
6. **The Admin Escalation**: User attempts to update their own `role` to `Admin`.
7. **The PII Scraper**: User B attempts to list all documents in `/employees` without being Admin.
8. **The Fake Bonus**: User attempts to create a `/payrolls` record with `commission` higher than allowed.
9. **The Zero-Deduction**: User attempts to update a payroll record to remove `deductions`.
10. **The ID Poison**: Sending 1MB string as employeeId.
11. **The Shadow Field**: Adding `isVerified: true` to a leave request.
12. **The Double Advance**: Deleting an `Advance` record before it's deducted from payroll.

## 3. Test Runner Invariant
All tests must verify `PERMISSION_DENIED` for unauthorized path traversals.
