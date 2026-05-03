import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  CheckCircle,
  XCircle,
  UserPlus,
  ShieldCheck,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { useStore } from '../lib/store';
import { Employee, Role, SalaryType, LeavePolicyType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn as cx } from '../lib/utils';

export default function EmployeeManager() {
  const { data, addEmployee, updateData, manualVerifyEmail, currentUser, updateEmployee } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyingEmp, setVerifyingEmp] = useState<Employee | null>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, empId?: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 256;
          const MAX_HEIGHT = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, width, height);
          
          const base64String = canvas.toDataURL('image/jpeg', 0.8);
          
          if (empId) {
            if (editingEmp && editingEmp.id === empId) {
              setEditingEmp({ ...editingEmp, profilePicture: base64String });
            } else {
              await updateEmployee(empId, { profilePicture: base64String });
            }
          } else {
            setNewEmp({ ...newEmp, profilePicture: base64String });
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const [newEmp, setNewEmp] = useState<Omit<Employee, 'id'>>({
    name: '',
    email: '',
    phone: '',
    cnic: '',
    role: 'Employee',
    salaryType: 'Monthly',
    salaryAmount: 25000,
    commissionPercentage: 0,
    leavePolicy: '1/month',
    lateAllowanceMinutes: 120,
    isMealAllowanceEligible: true,
    joinDate: new Date().toISOString().split('T')[0],
    isActive: true,
    isEmailVerified: false,
    leaveBalance: 12
  });

  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addEmployee(newEmp);
    setIsAdding(false);
    setNewEmp({
      name: '',
      email: '',
      phone: '',
      cnic: '',
      role: 'Employee',
      salaryType: 'Monthly',
      salaryAmount: 25000,
      commissionPercentage: 0,
      leavePolicy: '1/month',
      lateAllowanceMinutes: 120,
      isMealAllowanceEligible: true,
      joinDate: new Date().toISOString().split('T')[0],
      isActive: true,
      isEmailVerified: false,
      leaveBalance: 12
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmp) {
      const { id, ...updates } = editingEmp;
      await updateEmployee(id, updates);
      setEditingEmp(null);
    }
  };


  const filteredEmployees = data.employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.phone.includes(searchTerm);
    const matchesActive = activeFilter === 'All' ? true : activeFilter === 'Active' ? emp.isActive : !emp.isActive;
    return matchesSearch && matchesActive;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-slate-500">Manage your workforce from here.</p>
        </div>
        <button 
          id="add-employee-btn"
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors font-medium"
        >
          <UserPlus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl">
          <div className="text-2xl font-bold">{data.employees.length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Staff</div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl">
          <div className="text-2xl font-bold">{data.employees.filter(e => e.isActive).length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as any)}
          className="px-4 py-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Salary</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="border-b dark:border-slate-800 last:border-none hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {emp.profilePicture ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 group cursor-pointer" title="Click to upload new picture">
                          <img src={emp.profilePicture} alt={emp.name} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, emp.id)} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                      ) : (
                        <div className="relative w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold shrink-0 group cursor-pointer" title="Click to upload picture">
                          {emp.name.charAt(0)}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-full transition-opacity">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, emp.id)} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{emp.name}</div>
                        <div className="text-xs text-slate-500">{emp.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cx(
                      "px-2 py-1 rounded-md text-xs font-medium",
                      emp.role === 'Admin' ? "bg-purple-50 text-purple-600 dark:bg-purple-900/20" :
                      emp.role === 'Manager' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" :
                      "bg-slate-50 text-slate-600 dark:bg-slate-800"
                    )}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold">Rs. {emp.salaryAmount.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{emp.salaryType}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {emp.isActive ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </div>
                      )}
                      {emp.isEmailVerified ? (
                        <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Verified</span>
                      ) : (
                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Unverified</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingEmp(emp)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {currentUser?.role === 'Admin' && !emp.isEmailVerified && (
                        <button 
                          title="Manually Verify Email"
                          onClick={() => setVerifyingEmp(emp)}
                          className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          <ShieldCheck className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden"
            >
              <form onSubmit={handleSubmit}>
                <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Add New Employee</h2>
                  <button type="button" onClick={() => setIsAdding(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                  <div className="md:col-span-2 flex justify-center mb-4">
                    <div className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 cursor-pointer group hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      {newEmp.profilePicture ? (
                        <img src={newEmp.profilePicture} alt="Profile preview" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Camera className="w-8 h-8 text-slate-400 group-hover:text-slate-500" />
                      )}
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload profile picture" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Name</label>
                    <input 
                      required
                      value={newEmp.name}
                      onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Email</label>
                    <input 
                      required
                      type="email"
                      value={newEmp.email}
                      onChange={e => setNewEmp({...newEmp, email: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">CNIC</label>
                    <input 
                      required
                      placeholder="12345-1234567-1"
                      value={newEmp.cnic}
                      onChange={e => setNewEmp({...newEmp, cnic: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Phone</label>
                    <input 
                      required
                      value={newEmp.phone}
                      onChange={e => setNewEmp({...newEmp, phone: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Role</label>
                    <select 
                      value={newEmp.role}
                      onChange={e => setNewEmp({...newEmp, role: e.target.value as Role})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>Employee</option>
                      <option>Manager</option>
                      <option>Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Salary Type</label>
                    <select 
                      value={newEmp.salaryType}
                      onChange={e => setNewEmp({...newEmp, salaryType: e.target.value as SalaryType})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Basic Salary Amount</label>
                    <input 
                      type="number"
                      required
                      value={newEmp.salaryAmount}
                      onChange={e => setNewEmp({...newEmp, salaryAmount: Number(e.target.value)})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Commission %</label>
                    <input 
                      type="number"
                      value={newEmp.commissionPercentage}
                      onChange={e => setNewEmp({...newEmp, commissionPercentage: Number(e.target.value)})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Leave Policy</label>
                    <select 
                      value={newEmp.leavePolicy}
                      onChange={e => setNewEmp({...newEmp, leavePolicy: e.target.value as LeavePolicyType})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="None">None</option>
                      <option value="1/month">1 leave/month</option>
                      <option value="2/month">2 leaves/month</option>
                      <option value="Friday-only">Friday-only</option>
                      <option value="Mixed">Mixed (1 Fri + 1 Any)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <input 
                      type="checkbox"
                      id="isActive"
                      checked={newEmp.isActive}
                      onChange={e => setNewEmp({...newEmp, isActive: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="isActive" className="text-sm font-semibold cursor-pointer select-none">
                      Active Employee (can log in and use system)
                    </label>
                  </div>
                </div>

                <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20">
                    Create Employee
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Employee Modal */}
      <AnimatePresence>
        {editingEmp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingEmp(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden"
            >
              <form onSubmit={handleEditSubmit}>
                <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Edit Employee</h2>
                  <button type="button" onClick={() => setEditingEmp(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <XCircle className="w-6 h-6 text-slate-400" />
                  </button>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                  <div className="md:col-span-2 flex justify-center mb-4">
                    <div className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 cursor-pointer group hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      {editingEmp.profilePicture ? (
                        <img src={editingEmp.profilePicture} alt="Profile preview" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Camera className="w-8 h-8 text-slate-400 group-hover:text-slate-500" />
                      )}
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, editingEmp.id)} className="absolute inset-0 opacity-0 cursor-pointer" title="Upload profile picture" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Name</label>
                    <input 
                      required
                      value={editingEmp.name}
                      onChange={e => setEditingEmp({...editingEmp, name: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Phone</label>
                    <input 
                      required
                      value={editingEmp.phone}
                      onChange={e => setEditingEmp({...editingEmp, phone: e.target.value})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Role</label>
                    <select 
                      value={editingEmp.role}
                      onChange={e => setEditingEmp({...editingEmp, role: e.target.value as Role})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>Employee</option>
                      <option>Manager</option>
                      <option>Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Salary Type</label>
                    <select 
                      value={editingEmp.salaryType}
                      onChange={e => setEditingEmp({...editingEmp, salaryType: e.target.value as SalaryType})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>Daily</option>
                      <option>Weekly</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Basic Salary Amount</label>
                    <input 
                      type="number"
                      required
                      value={editingEmp.salaryAmount}
                      onChange={e => setEditingEmp({...editingEmp, salaryAmount: Number(e.target.value)})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Commission %</label>
                    <input 
                      type="number"
                      value={editingEmp.commissionPercentage}
                      onChange={e => setEditingEmp({...editingEmp, commissionPercentage: Number(e.target.value)})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-semibold">Leave Policy</label>
                    <select 
                      value={editingEmp.leavePolicy}
                      onChange={e => setEditingEmp({...editingEmp, leavePolicy: e.target.value as LeavePolicyType})}
                      className="w-full px-4 py-2 rounded-xl border dark:border-slate-800 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="None">None</option>
                      <option value="1/month">1 leave/month</option>
                      <option value="2/month">2 leaves/month</option>
                      <option value="Friday-only">Friday-only</option>
                      <option value="Mixed">Mixed (1 Fri + 1 Any)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <input 
                      type="checkbox"
                      id="editIsActive"
                      checked={editingEmp.isActive}
                      onChange={e => setEditingEmp({...editingEmp, isActive: e.target.checked})}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="editIsActive" className="text-sm font-semibold cursor-pointer select-none">
                      Active Employee (can log in and use system)
                    </label>
                  </div>
                </div>

                <div className="p-6 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingEmp(null)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/20">
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Verification Confirmation Modal */}
      <AnimatePresence>
        {verifyingEmp && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVerifyingEmp(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Verify Email Manually?</h3>
              <p className="text-slate-500 mb-6">
                Are you sure you want to manually verify the email for <span className="font-bold text-slate-900 dark:text-white">{verifyingEmp.name}</span>? 
                This will bypass the standard email verification process.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setVerifyingEmp(null)}
                  className="flex-1 py-2 text-slate-600 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    await manualVerifyEmail(verifyingEmp.id);
                    setVerifyingEmp(null);
                  }}
                  className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Confirm Verify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
