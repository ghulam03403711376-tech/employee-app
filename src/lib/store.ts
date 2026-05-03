import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { firebaseService } from './firebaseService';
import { SystemData, Employee, AttendanceRecord, LeaveRequest, Payroll, Holiday, Advance, Bonus, SaleRecord } from '../types';

export function useStore() {
  const [data, setData] = useState<SystemData>({
    employees: [],
    attendance: [],
    leaves: [],
    holidays: [],
    advances: [],
    bonuses: [],
    sales: [],
    payrolls: [],
    tasks: [],
    settings: {
      lastAutomationRun: new Date().toISOString(),
      overtimeRatePerHour: 500,
      mealAllowanceAmount: 120
    }
  });

  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const emp = await firebaseService.getEmployee(user.uid);
        setCurrentUser(emp);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const unsubEmp = firebaseService.subscribeAttendance((recs) => {
      setData(prev => ({ ...prev, attendance: recs }));
    }, currentUser.role === 'Employee' ? currentUser.id : undefined);

    const unsubLeaves = firebaseService.subscribeLeaves((leaves) => {
      setData(prev => ({ ...prev, leaves }));
    }, currentUser.role === 'Employee' ? currentUser.id : undefined);

    const unsubPayrolls = firebaseService.subscribePayrolls((payrolls) => {
      setData(prev => ({ ...prev, payrolls }));
    }, currentUser.role === 'Employee' ? currentUser.id : undefined);

    const unsubHolidays = firebaseService.subscribeHolidays((holidays) => {
      setData(prev => ({ ...prev, holidays }));
    });

    const unsubTasks = firebaseService.subscribeTasks((tasks) => {
      setData(prev => ({ ...prev, tasks }));
    }, currentUser.role === 'Employee' ? currentUser.id : undefined);

    // Initial load for employees (Admin/Manager only)
    if (currentUser.role !== 'Employee') {
      firebaseService.getAllEmployees().then(emps => {
        setData(prev => ({ ...prev, employees: emps }));
      });
    }

    return () => {
      unsubEmp();
      unsubLeaves();
      unsubPayrolls();
      unsubHolidays();
      unsubTasks();
    };
  }, [currentUser]);

  const updateData = (newData: Partial<SystemData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const addEmployee = async (emp: Omit<Employee, 'id' | 'isActive'>) => {
    // In real app, this would also create Firebase Auth account via Cloud Function
    // For now, we assume user IDs are manually mapped or handled
    const id = crypto.randomUUID();
    await firebaseService.addEmployee(id, { ...emp, id, isActive: true });
    // Refetch or let subscription handle it
  };

  const recordAttendance = async (record: Omit<AttendanceRecord, 'id'>) => {
    if (!record.employeeId && currentUser) {
      record.employeeId = currentUser.id;
    }
    await firebaseService.recordAttendance(record);
  };

  const manualVerifyEmail = async (employeeId: string) => {
    await updateEmployee(employeeId, { isEmailVerified: true });
  };

  const updateEmployee = async (employeeId: string, updates: Partial<Employee>) => {
    await firebaseService.updateEmployee(employeeId, updates);
    setData(prev => ({
      ...prev,
      employees: prev.employees.map(emp => 
        emp.id === employeeId ? { ...emp, ...updates } : emp
      )
    }));
  };

  return {
    data,
    updateData,
    currentUser,
    setCurrentUser,
    addEmployee,
    updateEmployee,
    manualVerifyEmail,
    recordAttendance,
    loading,
    emailMap: useMemo(() => {
      return data.employees.reduce((acc, emp) => {
        acc[emp.id] = emp.email;
        return acc;
      }, {} as Record<string, string>);
    }, [data.employees]),
    nameMap: useMemo(() => {
      return data.employees.reduce((acc, emp) => {
        acc[emp.id] = emp.name;
        return acc;
      }, {} as Record<string, string>);
    }, [data.employees])
  };
}

