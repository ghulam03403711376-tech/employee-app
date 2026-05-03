import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Clock, 
  Calendar, 
  CreditCard, 
  Settings, 
  LayoutDashboard, 
  LogOut,
  ChevronRight,
  Menu,
  X,
  Store,
  FileText,
  UserCircle,
  TrendingUp,
  Moon,
  Sun,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from './lib/store';
import { cn as cx } from './lib/utils';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { firebaseService } from './lib/firebaseService';
import DashboardView from './components/DashboardView';
import EmployeeManager from './components/EmployeeManager';
import AttendanceTerminal from './components/AttendanceTerminal';
import LeaveManager from './components/LeaveManager';
import PayrollDashboard from './components/PayrollDashboard';
import HistoryView from './components/HistoryView';
import Login from './components/Login';
import TaskManager from './components/TaskManager';

type View = 'dashboard' | 'employees' | 'attendance' | 'leaves' | 'payroll' | 'history' | 'settings' | 'tasks';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setDarkMode] = useState(false);
  const { currentUser, data, loading } = useStore();

  React.useEffect(() => {
    const syncVerify = async () => {
      if (auth.currentUser && currentUser && auth.currentUser.emailVerified && !currentUser.isEmailVerified) {
        try {
          await auth.currentUser.getIdToken(true);
          await firebaseService.updateEmployee(currentUser.id, { isEmailVerified: true });
        } catch (e) {
          console.error("Failed to sync verification status:", e);
        }
      }
    };
    syncVerify();
  }, [currentUser]);

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

  React.useEffect(() => {
    if (currentUser) {
      const allowedRoles = menuItems.find(item => item.id === currentView)?.roles || [];
      if (!allowedRoles.includes(currentUser.role)) {
        const firstAllowed = menuItems.find(item => item.roles.includes(currentUser.role))?.id as View;
        if (firstAllowed) {
          setCurrentView(firstAllowed);
        }
      }
    }
  }, [currentUser, currentView]);

  const filteredMenuItems = useMemo(() => {
    if (!currentUser) return [];
    return menuItems.filter(item => item.roles.includes(currentUser.role));
  }, [currentUser, menuItems]);

  const toggleDarkMode = () => {
    setDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'employees': return <EmployeeManager />;
      case 'attendance': return <AttendanceTerminal />;
      case 'leaves': return <LeaveManager />;
      case 'tasks': return <TaskManager />;
      case 'payroll': return <PayrollDashboard />;
      case 'history': return <HistoryView employeeId={currentUser?.role === 'Employee' ? currentUser.id : undefined} />;
      default: return <DashboardView />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  // If the user has an email but it's not verified, and they don't have a phone number, show login (which will show the verify screen)
  if (auth.currentUser?.email && !auth.currentUser.emailVerified && !auth.currentUser.phoneNumber) {
    return <Login />;
  }


  return (
    <div className={cx(
      "min-h-screen transition-colors duration-300",
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg">
            <Store className="text-white w-5 h-5" />
          </div>
          <span className="font-bold">RetailFlow</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      <div className="flex relative">
        {/* Sidebar */}
        <aside className={cx(
          "fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full",
          "bg-white dark:bg-slate-900 border-r dark:border-slate-800 flex flex-col pt-4"
        )}>
          <div className="px-6 mb-8 hidden lg:flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl">
              <Store className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">RetailFlow Pro</span>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  setCurrentView(item.id as View);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={cx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                  currentView === item.id 
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" 
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <item.icon className={cx(
                  "w-5 h-5 transition-colors",
                  currentView === item.id ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                )} />
                {item.label}
                {currentView === item.id && (
                  <motion.div 
                    layoutId="active-nav"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t dark:border-slate-800 space-y-2">
            <button 
              onClick={toggleDarkMode}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors text-sm font-medium"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>

            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full shrink-0 bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold overflow-hidden">
                {currentUser.profilePicture ? (
                  <img src={currentUser.profilePicture} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser.name.charAt(0)
                )}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-semibold truncate">{currentUser.name}</div>
                <div className="text-xs text-slate-500">{currentUser.role}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 lg:p-8 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
