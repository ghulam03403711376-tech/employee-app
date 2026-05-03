import React, { useState } from 'react';
import { 
  History, 
  MapPin, 
  Clock, 
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CalendarCheck
} from 'lucide-react';
import { useStore } from '../lib/store';
import { format, parseISO } from 'date-fns';
import { cn as cx } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function HistoryView({ employeeId }: { employeeId?: string }) {
  const { data, nameMap } = useStore();
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves'>('attendance');

  const filteredAttendance = employeeId 
    ? data.attendance.filter(a => a.employeeId === employeeId)
    : data.attendance;

  const sortedAttendance = [...filteredAttendance].sort((a, b) => b.date.localeCompare(a.date));

  const filteredLeaves = employeeId
    ? data.leaves.filter(l => l.employeeId === employeeId)
    : data.leaves;
    
  const sortedLeaves = [...filteredLeaves].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Records</h1>
          <p className="text-slate-500">Complete historical logs of attendance, transactions, and leaves.</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-max">
          <button
            onClick={() => setActiveTab('attendance')}
            className={cx(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2",
              activeTab === 'attendance' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <History className="w-4 h-4" />
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={cx(
              "px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2",
              activeTab === 'leaves' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <CalendarCheck className="w-4 h-4" />
            Leave Requests
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden">
            <div className="p-6 border-b dark:border-slate-800">
              <h3 className="font-bold flex items-center gap-2">
                {activeTab === 'attendance' ? (
                  <>
                    <History className="w-5 h-5 text-emerald-600" />
                    Attendance Logs
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-5 h-5 text-indigo-600" />
                    Leave Requests
                  </>
                )}
              </h3>
            </div>
            
            <div className="divide-y dark:divide-slate-800 min-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'attendance' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="attendance"
                    className="divide-y dark:divide-slate-800"
                  >
                    {sortedAttendance.map((record, i) => (
                      <div 
                        key={record.id} 
                        className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                {format(parseISO(record.date), 'MMM')}
                              </span>
                              <span className="text-lg font-black leading-none">
                                {format(parseISO(record.date), 'dd')}
                              </span>
                            </div>
                            <div>
                              {!employeeId && <div className="font-bold">{nameMap[record.employeeId]}</div>}
                              <div className="flex items-center gap-3 mt-1">
                                <span className={cx(
                                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                  record.status === 'Present' ? "bg-emerald-100 text-emerald-700" :
                                  record.status === 'Holiday' ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                )}>
                                  {record.status}
                                </span>
                                <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                                  <Clock className="w-3 h-3" />
                                  {record.checkIn ? format(parseISO(record.checkIn), 'hh:mm a') : '--:--'}
                                  <span className="mx-1">→</span>
                                  {record.checkOut ? format(parseISO(record.checkOut), 'hh:mm a') : '--:--'}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-xs text-slate-400 font-medium">Late</div>
                              <div className={cx(
                                "font-bold text-sm",
                                record.lateMinutes > 0 ? "text-red-500" : "text-emerald-500"
                              )}>
                                {record.lateMinutes > 0 ? `+${record.lateMinutes}m` : 'On time'}
                              </div>
                            </div>
                            <div className="p-2 border dark:border-slate-800 rounded-xl group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors">
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {sortedAttendance.length === 0 && (
                      <div className="p-12 text-center text-slate-400 italic">No attendance records found.</div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'leaves' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    key="leaves"
                    className="divide-y dark:divide-slate-800"
                  >
                    {sortedLeaves.map((request, i) => (
                      <div 
                        key={request.id} 
                        className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex flex-col items-center justify-center shrink-0">
                              <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                              {!employeeId && <div className="font-bold">{nameMap[request.employeeId]}</div>}
                              <div className="text-sm text-slate-500 mt-1">{request.reason || 'No reason provided'}</div>
                              <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-400">
                                <span>{format(parseISO(request.startDate), 'MMM dd, yyyy')}</span>
                                {request.endDate && request.endDate !== request.startDate && (
                                  <>
                                    <span>→</span>
                                    <span>{format(parseISO(request.endDate), 'MMM dd, yyyy')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={cx(
                              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                              request.status === 'Approved' ? "bg-emerald-100 text-emerald-700" :
                              request.status === 'Rejected' ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {request.status}
                            </span>
                            {request.isPaid !== undefined && (
                              <span className="text-xs text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {request.isPaid ? 'Paid' : 'Unpaid'} Leave
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {sortedLeaves.length === 0 && (
                      <div className="p-12 text-center text-slate-400 italic">No leave requests found.</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl">
            <h3 className="font-bold mb-4">Summary</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Total Present</div>
                <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {filteredAttendance.filter(a => a.status === 'Present').length} Days
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                <div className="text-[10px] uppercase font-bold text-amber-600 mb-1">Holidays Take</div>
                <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
                  {filteredAttendance.filter(a => a.status === 'Holiday').length} Days
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                <div className="text-[10px] uppercase font-bold text-indigo-600 mb-1">Leaves Approved</div>
                <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
                  {filteredLeaves.filter(a => a.status === 'Approved').length}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                <div className="text-[10px] uppercase font-bold text-red-600 mb-1">Late Instances</div>
                <div className="text-2xl font-black text-red-700 dark:text-red-400">
                  {filteredAttendance.filter(a => a.lateMinutes > 0).length}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-emerald-600 rounded-3xl text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <h3 className="font-bold">Meal Allowances</h3>
            </div>
            <div className="text-3xl font-black mb-2">Rs. {filteredAttendance.filter(a => a.isMealAllowanceGranted).length * 120}</div>
            <p className="text-xs text-emerald-100">Earned for taking short or no lunch breaks this period.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
