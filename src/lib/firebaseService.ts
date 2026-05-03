import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
  or
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Employee, AttendanceRecord, LeaveRequest, Payroll, Advance, Task } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Service Methods
export const firebaseService = {
  // Employees
  async getEmployee(id: string) {
    try {
      const snap = await getDoc(doc(db, 'employees', id));
      return snap.exists() ? { id: snap.id, ...snap.data() } as Employee : null;
    } catch (e) { handleFirestoreError(e, OperationType.GET, `employees/${id}`); }
  },

  async getAllEmployees() {
    try {
      const snap = await getDocs(collection(db, 'employees'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Employee[];
    } catch (e) { handleFirestoreError(e, OperationType.LIST, 'employees'); }
  },

  async addEmployee(id: string, data: Partial<Employee>) {
    try {
      await setDoc(doc(db, 'employees', id), data);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, `employees/${id}`); }
  },

  async updateEmployee(id: string, data: Partial<Employee>) {
    try {
      await updateDoc(doc(db, 'employees', id), data as any);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `employees/${id}`); }
  },

  // Attendance
  subscribeAttendance(callback: (records: AttendanceRecord[]) => void, employeeId?: string) {
    const q = employeeId 
      ? query(collection(db, 'attendance'), where('employeeId', '==', employeeId), orderBy('date', 'desc'))
      : query(collection(db, 'attendance'), orderBy('date', 'desc'), limit(100));
    
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => {
        const data = d.data();
        return { 
          ...data, 
          id: d.id,
          employeeId: data.employeeId || d.id.split('_')[0] 
        } as AttendanceRecord;
      }));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'attendance'));
  },

  async recordAttendance(record: Partial<AttendanceRecord>) {
    const employeeId = record.employeeId || auth.currentUser?.uid;
    if (!employeeId) throw new Error("No employee ID available for attendance record");
    
    const recordToSave = { ...record, employeeId };
    const id = record.id || `${employeeId}_${recordToSave.date}`;
    
    try {
      await setDoc(doc(db, 'attendance', id), recordToSave, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, `attendance/${id}`); }
  },

  // Leaves
  subscribeLeaves(callback: (leaves: LeaveRequest[]) => void, employeeId?: string) {
    const q = employeeId
      ? query(collection(db, 'leaves'), where('employeeId', '==', employeeId))
      : query(collection(db, 'leaves'));
    
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as LeaveRequest[]);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'leaves'));
  },

  async submitLeave(leave: Partial<LeaveRequest>) {
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, 'leaves', id), leave);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, `leaves/${id}`); }
  },

  async updateLeaveStatus(id: string, status: string, isPaid: boolean, approvedBy?: string, approvedAt?: string) {
    try {
      const updateData: any = { status, isPaid };
      if (approvedBy) updateData.approvedBy = approvedBy;
      if (approvedAt) updateData.approvedAt = approvedAt;
      await updateDoc(doc(db, 'leaves', id), updateData);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `leaves/${id}`); }
  },

  // Payrolls
  subscribePayrolls(callback: (payrolls: Payroll[]) => void, employeeId?: string) {
    const q = employeeId
      ? query(collection(db, 'payrolls'), where('employeeId', '==', employeeId), orderBy('generatedAt', 'desc'))
      : query(collection(db, 'payrolls'), orderBy('generatedAt', 'desc'), limit(100));
    
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Payroll[]);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'payrolls'));
  },

  async addPayrolls(payrolls: Payroll[]) {
    try {
      for (const p of payrolls) {
        const id = p.id || crypto.randomUUID();
        await setDoc(doc(db, 'payrolls', id), p);
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'payrolls'); }
  },

  // Holidays
  subscribeHolidays(callback: (holidays: any[]) => void) {
    return onSnapshot(collection(db, 'holidays'), (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'holidays'));
  },

  // Tasks
  subscribeTasks(callback: (tasks: Task[]) => void, employeeId?: string) {
    const q = employeeId
      ? query(
          collection(db, 'tasks'), 
          or(
            where('employeeId', '==', employeeId),
            where('assigneeId', '==', employeeId)
          )
        )
      : query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(100));
    
    return onSnapshot(q, (snap) => {
      let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
      if (employeeId) {
        tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      callback(tasks);
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'tasks'));
  },

  async addTask(task: Omit<Task, 'id'>) {
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, 'tasks', id), task);
    } catch (e) { handleFirestoreError(e, OperationType.CREATE, `tasks/${id}`); }
  },

  async updateTask(id: string, updates: Partial<Task>) {
    try {
      await updateDoc(doc(db, 'tasks', id), updates as any);
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `tasks/${id}`); }
  },

  async deleteTask(id: string) {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, `tasks/${id}`); }
  }
};
