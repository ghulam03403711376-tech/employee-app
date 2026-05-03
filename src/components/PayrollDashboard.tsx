import React, { useState } from 'react';
import { 
  CreditCard, 
  Download, 
  RefreshCw, 
  Search, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Calculator
} from 'lucide-react';
import { useStore } from '../lib/store';
import { firebaseService } from '../lib/firebaseService';
import { SalaryEngine } from '../lib/SalaryEngine';
import { Payroll } from '../types';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import { cn as cx } from '../lib/utils';

export default function PayrollDashboard() {
  const { data, nameMap } = useStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const handleGeneratePayroll = async () => {
    setIsGenerating(true);
    try {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      
      const newPayrolls: Payroll[] = data.employees
        .filter(emp => emp.isActive)
        .map(emp => SalaryEngine.generatePayroll(emp, data, start, end));

      await firebaseService.addPayrolls(newPayrolls);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getRecentPayrolls = () => {
    return data.payrolls
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
      .slice(0, 5);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-slate-500">Generate and manage employee salaries.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={format(selectedMonth, 'yyyy-MM')}
            onChange={(e) => setSelectedMonth(new Date(e.target.value))}
            className="px-4 py-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl outline-none"
          >
            {[-2, -1, 0, 1].map(offset => {
              const d = subMonths(new Date(), -offset);
              return <option key={offset} value={format(d, 'yyyy-MM')}>{format(d, 'MMMM yyyy')}</option>;
            })}
          </select>
          <button 
            onClick={handleGeneratePayroll}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
            {isGenerating ? 'Calculating...' : 'Generate Payroll'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold">Recent Payrolls</h3>
              <button className="text-sm text-emerald-600 font-bold hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Employee</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Period</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Net Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getRecentPayrolls().map(p => {
                    const emp = data.employees.find(e => e.id === p.employeeId); // Still need emp for role/other details not in nameMap
                    return (
                      <tr key={p.id} className="border-b dark:border-slate-800 last:border-none hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold">{nameMap[p.employeeId] || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">{emp?.role}</div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {format(parseISO(p.periodStart), 'MMM dd')} - {format(parseISO(p.periodEnd), 'MMM dd')}
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-600">
                          Rs. {p.grandTotal.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/20 text-[10px] font-bold uppercase tracking-wider">
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                            <Download className="w-4 h-4 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {getRecentPayrolls().length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No payrolls generated yet for this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-xl">
            <h3 className="text-lg font-bold mb-6">Payroll Summary</h3>
            <div className="space-y-6">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-bold">Total Expenses</div>
                <div className="text-3xl font-black">Rs. {data.payrolls.reduce((s, p) => s + p.grandTotal, 0).toLocaleString()}</div>
              </div>

              <div className="space-y-3">
                <SummaryItem label="Base Salaries" amount={data.payrolls.reduce((s, p) => s + p.baseSalary, 0)} icon={PlusCircle} />
                <SummaryItem label="Commissions" amount={data.payrolls.reduce((s, p) => s + p.commission, 0)} icon={ArrowUpRight} color="text-emerald-400" />
                <SummaryItem label="Meal Allowances" amount={data.payrolls.reduce((s, p) => s + p.mealAllowance, 0)} icon={PlusCircle} color="text-blue-400" />
                <SummaryItem label="Late Deductions" amount={-data.payrolls.reduce((s, p) => s + p.lateDeductions, 0)} icon={ArrowDownRight} color="text-red-400" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl">
            <h3 className="font-bold mb-4">Export Options</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 p-3 rounded-2xl border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-bold">
                <FileText className="w-4 h-4" /> PDF
              </button>
              <button className="flex items-center justify-center gap-2 p-3 rounded-2xl border dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-bold">
                <Store className="w-4 h-4" /> CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, amount, icon: Icon, color = "text-slate-400" }: any) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
      <div className="flex items-center gap-3">
        <Icon className={cx("w-4 h-4", color)} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className={cx("text-sm font-bold", amount < 0 ? "text-red-400" : "text-white")}>
        Rs. {Math.abs(amount).toLocaleString()}
      </span>
    </div>
  );
}

function FileText(props: any) {
  return <CreditCard {...props} />
}

function Store(props: any) {
  return <RefreshCw {...props} />
}
