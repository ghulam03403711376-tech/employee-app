import React, { useState, useMemo } from 'react';
import { 
  Users, Clock, Calendar, CreditCard, Settings,
  LayoutDashboard, LogOut, Menu, X, Store,
  FileText, Moon, Sun, Loader2, CheckCircle
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
import { useStore } from './lib/store';
import { cn as cx } from './lib/utils';

import DashboardView from './components/DashboardView';
import EmployeeManager from './components/EmployeeManager';
import AttendanceTerminal from './components/AttendanceTerminal';
import LeaveManager from './components/LeaveManager';
import PayrollDashboard from './components/PayrollDashboard';
import HistoryView from './components/HistoryView';
import Login from './components/Login';
import TaskManager from './components/TaskManager';

type View = 
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'leaves'
  | 'payroll'
  | 'history'
  | 'settings'
  | 'tasks';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setDarkMode] = useState(false);

  const { currentUser, loading } = useStore();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Manager'] },
    { id: 'employees', label: 'Employees', icon: Users, roles: ['Admin', 'Manager'] },
    { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['Admin', 'Manager', 'Employee'] },
    { id: 'leaves', label: 'Leaves', icon: Calendar, roles: ['Admin', 'Manager', 'Employee'] },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle, roles: ['Admin', 'Manager', 'Employee'] },
    { id: 'payroll', label: 'Payroll', icon: CreditCard, roles: ['Admin', 'Manager'] },
    { id: 'history', label: 'History', icon: FileText, roles: ['Admin', 'Manager', 'Employee'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin'] },
  ];

  const filteredMenuItems = useMemo(() => {
    if (!currentUser) return [];
    return menuItems.filter(item => item.roles.includes(currentUser.role));
  }, [currentUser]);

  const toggleDarkMode = () => {
    setDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = () => {
    alert("Logout removed (Firebase disabled)");
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'employees': return <EmployeeManager />;
      case 'attendance': return <AttendanceTerminal />;
      case 'leaves': return <LeaveManager />;
      case 'tasks': return <TaskManager />;
      case 'payroll': return <PayrollDashboard />;
      case 'history':
        return <HistoryView employeeId={currentUser?.role === 'Employee' ? currentUser.id : undefined} />;
      default:
        return <DashboardView />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className={cx(
      "min-h-screen transition-colors duration-300",
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    )}>

      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg">
            <Store className="text-white w-5 h-5" />
          </div>
          <span className="font-bold">RetailFlow</span>
        </div>

        <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </header>

      <div className="flex">

        {/* Sidebar */}
        <aside className={cx(
          "w-64",
          !isSidebarOpen && "hidden",
          "bg-white dark:bg-slate-900 border-r dark:border-slate-800"
        )}>
          <nav className="p-4 space-y-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t space-y-2">
            <button onClick={toggleDarkMode} className="w-full flex gap-2 p-3">
              {isDarkMode ? <Sun /> : <Moon />}
              Toggle Theme
            </button>

            <button onClick={handleSignOut} className="w-full flex gap-2 p-3 text-red-500">
              <LogOut />
              Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}
