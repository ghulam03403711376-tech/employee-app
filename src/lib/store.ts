import { useState, useMemo } from 'react';
import { SystemData, Employee, AttendanceRecord } from '../types';

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

  const [currentUser, setCurrentUser] = useState<Employee | null>({
    id: '1',
    name: 'Demo User',
    email: 'demo@email.com',
    role: 'Admin'
  });

  const [loading] = useState(false);

  // ✅ Local updates only (no Firebase)
  const updateData = (newData: Partial<SystemData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const addEmployee = (emp: Omit<Employee, 'id' | 'isActive'>) => {
    const id = crypto.randomUUID();
    const newEmp = { ...emp, id, isActive: true };

    setData(prev => ({
      ...prev,
      employees: [...prev.employees, newEmp]
    }));
  };

  const recordAttendance = (record: Omit<AttendanceRecord, 'id'>) => {
    const newRecord = {
      ...record,
      id: crypto.randomUUID(),
      employeeId: record.employeeId || currentUser?.id
    };

    setData(prev => ({
      ...prev,
      attendance: [...prev.attendance, newRecord]
    }));
  };

  const updateEmployee = (employeeId: string, updates: Partial<Employee>) => {
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
