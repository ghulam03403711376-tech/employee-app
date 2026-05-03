import React, { useMemo } from 'react';
import { 
  Users, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useStore } from '../lib/store';
import { motion } from 'motion/react';
import { format, startOfMonth, subMonths, isSameMonth, parseISO } from 'date-fns';

export default function DashboardView() {
  const { data, nameMap } = useStore();
  
  const stats = [
    { label: 'Total Employees', value: data.employees.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Today Attendance', value: `${data.attendance.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length}/${data.employees.length}`, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Leaves', value: data.leaves.filter(l => l.status === 'Pending').length, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Monthly Payroll', value: `Rs. ${data.payrolls.filter(p => p.periodStart >= format(startOfMonth(new Date()), 'yyyy-MM-dd')).reduce((s, p) => s + p.grandTotal, 0).toLocaleString()}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  // Mock data for trends
  const attendanceTrend = [
    { name: 'Mon', present: 12 },
    { name: 'Tue', present: 14 },
    { name: 'Wed', present: 13 },
    { name: 'Thu', present: 15 },
    { name: 'Fri', present: 10 },
    { name: 'Sat', present: 8 },
    { name: 'Sun', present: 0 },
  ];

  // Sales data
  const { currentMonthSales, salesTrend } = useMemo(() => {
    const currentMonth = new Date();
    const currentMonthSales = data.sales
      .filter(s => {
        try { return isSameMonth(parseISO(s.date), currentMonth); } catch { return false; }
      })
      .reduce((sum, s) => sum + s.amount, 0);

    const salesTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(currentMonth, i);
      const monthName = format(monthDate, 'MMM');
      const monthTotal = data.sales
        .filter(s => {
          try { return isSameMonth(parseISO(s.date), monthDate); } catch { return false; }
        })
        .reduce((sum, s) => sum + s.amount, 0);
      salesTrend.push({ name: monthName, sales: monthTotal });
    }
    
    return { currentMonthSales, salesTrend };
  }, [data.sales]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Overview</h1>
        <p className="text-slate-500">Welcome back. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={stat.bg + " p-3 rounded-xl"}>
                <stat.icon className={stat.color + " w-6 h-6"} />
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>+4%</span>
              </div>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Attendance Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-lg font-bold">Monthly Sales Trend</h3>
              <div className="text-left sm:text-right">
                <div className="text-sm font-semibold text-slate-500 flex items-center sm:justify-end gap-1">
                  <ShoppingCart className="w-4 h-4" /> This Month
                </div>
                <div className="text-2xl font-bold text-emerald-600">Rs. {currentMonthSales.toLocaleString()}</div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Sales']}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-6">Action Needed</h3>
          <div className="flex-1 space-y-4">
            {data.leaves.filter(l => l.status === 'Pending').length > 0 ? (
              data.leaves.filter(l => l.status === 'Pending').map(leave => (
                <div key={leave.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">Leave Request</div>
                    <div className="text-xs text-slate-500">{nameMap[leave.employeeId]} needs approval</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
                <AlertCircle className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm italic">All caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
