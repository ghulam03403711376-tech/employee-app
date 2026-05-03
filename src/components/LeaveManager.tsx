import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Briefcase,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../lib/store';
import { firebaseService } from '../lib/firebaseService';
import { LeaveRequest } from '../types';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn as cx } from '../lib/utils';

export default function LeaveManager() {
  const { data, currentUser, nameMap } = useStore();
  const [isAdding, setIsAdding] = useState(false);

  const [newLeave, setNewLeave] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const leave: Partial<LeaveRequest> = {
      employeeId: currentUser!.id,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      reason: newLeave.reason,
      status: currentUser?.role === 'Admin' ? 'Approved' : 'Pending',
      isPaid: true,
      appliedAt: new Date().toISOString()
    };
    await firebaseService.submitLeave(leave);
    setIsAdding(false);
  };

  const handleStatusChange = async (leave: LeaveRequest, status: 'Approved' | 'Rejected', isPaid: boolean = true) => {
    const approvedAt = new Date().toISOString();
    await firebaseService.updateLeaveStatus(leave.id, status, isPaid, currentUser?.id, approvedAt);
    
    if (status === 'Approved') {
      const days = Math.max(1, Math.ceil((parseISO(leave.endDate).getTime() - parseISO(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const employee = data.employees.find(e => e.id === leave.employeeId);
      if (employee) {
        const newBalance = (employee.leaveBalance || 0) - days;
        await firebaseService.updateEmployee(employee.id, { leaveBalance: newBalance });
      }
    }
  };


  const leavesToShow = ['Admin', 'Manager'].includes(currentUser?.role || '') 
    ? data.leaves 
    : data.leaves.filter(l => l.employeeId === currentUser?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leaves</h1>
          <p className="text-slate-500">Track and manage time off.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20"
        >
          <Plus className="w-5 h-5" />
          Request Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl md:col-span-2">
          {currentUser && (
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Available Leave Balance</div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{currentUser.leaveBalance || 0} <span className="text-sm font-medium text-slate-500">days</span></div>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                <Briefcase className="w-8 h-8" />
              </div>
            </div>
          )}
          <h3 className="text-lg font-bold mb-6">Recent Requests</h3>
          <div className="space-y-4">
            {leavesToShow.length === 0 && (
              <div className="text-center py-12 text-slate-400 italic">No leave requests found.</div>
            )}
            {leavesToShow.map(leave => {
              return (
                <div key={leave.id} className="p-4 rounded-2xl border dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                      <Calendar className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <div className="font-bold">{nameMap[leave.employeeId]}</div>
                      <div className="text-xs text-slate-500">{leave.startDate} to {leave.endDate}</div>
                      <div className="text-sm mt-1">{leave.reason}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cx(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      leave.status === 'Approved' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" :
                      leave.status === 'Rejected' ? "bg-red-100 text-red-700 dark:bg-red-900/30" :
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/30"
                    )}>
                      {leave.status}
                    </span>

                    {['Admin', 'Manager'].includes(currentUser?.role || '') && leave.status === 'Pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleStatusChange(leave, 'Approved', true)}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleStatusChange(leave, 'Rejected')}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-slate-900 rounded-3xl text-white">
            <h3 className="text-lg font-bold mb-4">Policies</h3>
            <div className="space-y-4">
              {['None', '1/month', '2/month', 'Friday-only', 'Mixed'].map(policy => (
                <div key={policy} className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">{policy}</span>
                  <span className="font-medium">Active</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
            <h3 className="text-emerald-900 dark:text-emerald-100 font-bold mb-2">Did you know?</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Approved leaves automatically update the attendance record as "Leave" status. Admin can override policies anytime.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 w-full max-w-lg">
              <h2 className="text-2xl font-bold mb-6">Leave Request</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                    <input type="date" required value={newLeave.startDate} onChange={e => setNewLeave({...newLeave, startDate: e.target.value})} className="w-full p-3 rounded-xl border dark:border-slate-800 dark:bg-slate-950" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
                    <input type="date" required value={newLeave.endDate} onChange={e => setNewLeave({...newLeave, endDate: e.target.value})} className="w-full p-3 rounded-xl border dark:border-slate-800 dark:bg-slate-950" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Reason</label>
                  <textarea required value={newLeave.reason} onChange={e => setNewLeave({...newLeave, reason: e.target.value})} className="w-full p-3 rounded-xl border dark:border-slate-800 dark:bg-slate-950 h-32" placeholder="Explain your reason for leave..." />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 text-slate-500 font-bold">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20">Submit Request</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
