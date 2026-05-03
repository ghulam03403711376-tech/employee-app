import React, { useState, useEffect } from 'react';
import { 
  LogIn, 
  LogOut, 
  UtensilsCrossed, 
  CheckCircle2, 
  MapPin,
  Clock,
  CalendarDays,
  Utensils
} from 'lucide-react';
import { useStore } from '../lib/store';
import { AttendanceRecord } from '../types';
import { format, differenceInMinutes, parseISO, isSameDay } from 'date-fns';
import { motion } from 'motion/react';
import { cn as cx } from '../lib/utils';

export default function AttendanceTerminal() {
  const { data, currentUser, recordAttendance, updateData, nameMap, emailMap } = useStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecord = data.attendance.find(a => 
    a.employeeId === currentUser?.id && a.date === todayStr
  );

  const isHoliday = data.holidays.some(h => h.date === todayStr);

  const handleAction = (action: keyof AttendanceRecord) => {
    const now = new Date().toISOString();
    
    if (!todayRecord) {
      // First action of the day
      const newRecord: Partial<AttendanceRecord> = {
        employeeId: currentUser!.id,
        date: todayStr,
        status: isHoliday ? 'Holiday' : 'Present',
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        isMealAllowanceGranted: false,
      };
      
      if (action === 'checkIn') {
        const expectedIn = new Date();
        expectedIn.setHours(9, 0, 0, 0); // Default 9 AM
        const late = Math.max(0, differenceInMinutes(new Date(), expectedIn));
        newRecord.checkIn = now;
        newRecord.lateMinutes = late;
      }
      
      recordAttendance(newRecord as AttendanceRecord);
    } else {
      // Update existing record
      const updated = { ...todayRecord, [action]: now };
      
      if (action === 'lunchIn') {
        const lunchOut = parseISO(todayRecord.lunchOut!);
        const lunchIn = parseISO(now);
        const lunchDuration = differenceInMinutes(lunchIn, lunchOut);
        if (lunchDuration > 60) {
          updated.lateMinutes = todayRecord.lateMinutes + (lunchDuration - 60);
          updated.isMealAllowanceGranted = false;
        }
      }
      
      if (action === 'checkOut') {
        if (!todayRecord.lunchOut && !todayRecord.lunchIn) {
          updated.isMealAllowanceGranted = true;
        }
      }
      
      recordAttendance(updated);
    }
  };

  const getStatusColor = () => {
    if (isHoliday) return 'bg-amber-500 text-white';
    if (!todayRecord) return 'bg-slate-500 text-white';
    if (todayRecord.checkOut) return 'bg-emerald-500 text-white';
    return 'bg-blue-500 text-white';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tight">{format(currentTime, 'hh:mm:ss a')}</h1>
        <div className="flex items-center justify-center gap-4 text-slate-500 font-medium">
          <CalendarDays className="w-5 h-5" />
          <span>{format(currentTime, 'EEEE, MMMM do, yyyy')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Terminal Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 border dark:border-slate-800 shadow-2xl relative overflow-hidden"
        >
          <div className={cx("absolute top-0 right-0 px-4 py-1 text-xs font-bold", getStatusColor())}>
            {isHoliday ? 'HOLIDAY' : todayRecord?.status || 'NOT SIGNED IN'}
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 font-bold text-2xl overflow-hidden shrink-0">
              {currentUser?.profilePicture ? (
                <img src={currentUser.profilePicture} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser?.name.charAt(0)
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{currentUser?.name}</h2>
              <p className="text-slate-500 text-xs font-medium">{currentUser?.email}</p>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1 tracking-wider">{currentUser?.role}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ActionButton 
              id="btn-checkin"
              label="Check In" 
              icon={LogIn} 
              time={todayRecord?.checkIn} 
              active={!todayRecord?.checkIn}
              onClick={() => handleAction('checkIn')}
            />
            <ActionButton 
              id="btn-lunchout"
              label="Lunch Out" 
              icon={UtensilsCrossed} 
              time={todayRecord?.lunchOut} 
              active={!!todayRecord?.checkIn && !todayRecord?.lunchOut && !todayRecord?.checkOut}
              onClick={() => handleAction('lunchOut')}
            />
            <ActionButton 
              id="btn-lunchin"
              label="Lunch In" 
              icon={Utensils} 
              time={todayRecord?.lunchIn} 
              active={!!todayRecord?.lunchOut && !todayRecord?.lunchIn && !todayRecord?.checkOut}
              onClick={() => handleAction('lunchIn')}
            />
            <ActionButton 
              id="btn-checkout"
              label="Check Out" 
              icon={LogOut} 
              time={todayRecord?.checkOut} 
              active={!!todayRecord?.checkIn && !todayRecord?.checkOut}
              onClick={() => handleAction('checkOut')}
            />
          </div>
        </motion.div>

        {/* Stats & Rules Card */}
        <div className="space-y-6">
          <div className="p-6 bg-emerald-600 rounded-3xl text-white shadow-xl shadow-emerald-600/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" /> Today's Stats
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-sm">Late Minutes</span>
                <span className="font-bold text-xl">{todayRecord?.lateMinutes || 0}m</span>
              </div>
              <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-sm">Meal Allowance</span>
                <span className={cx(
                  "font-bold text-xl",
                  todayRecord?.isMealAllowanceGranted ? "text-emerald-200" : "text-white/40"
                )}>
                  {todayRecord?.isMealAllowanceGranted ? 'Rs. 120' : 'No'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Quick Rules</h3>
            <ul className="text-sm space-y-3">
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Default lunch break: 1 hour</span>
              </li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Rs. 120 meal if no lunch break</span>
              </li>
              <li className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>120 min/month late allowance</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, icon: Icon, time, active, onClick, id }: any) {
  return (
    <button
      id={id}
      disabled={!active}
      onClick={onClick}
      className={cx(
        "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all group relative",
        active 
          ? "border-emerald-600/20 bg-emerald-50 dark:bg-emerald-900/10 hover:border-emerald-600 hover:bg-emerald-100" 
          : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 opacity-50 grayscale cursor-not-allowed",
        time && "border-emerald-600 bg-emerald-600 text-white opacity-100 grayscale-0"
      )}
    >
      <Icon className={cx(
        "w-8 h-8 mb-2",
        active ? "text-emerald-600" : "text-slate-400",
        time && "text-white"
      )} />
      <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
      {time && (
        <span className="text-[10px] mt-1 opacity-80">
          {format(parseISO(time), 'hh:mm a')}
        </span>
      )}
      {time && (
        <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-white" />
      )}
    </button>
  );
}
