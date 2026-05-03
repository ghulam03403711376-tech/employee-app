import React, { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { firebaseService } from '../lib/firebaseService';
import { Task } from '../types';
import { format, parseISO } from 'date-fns';
import { CheckCircle, Circle, Plus, Bell, Calendar as CalendarIcon, Trash2, X, BellRing, Search, User, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn as cx } from '../lib/utils';

export default function TaskManager() {
  const { data, currentUser } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    dueDate: '',
    reminderDate: '',
    priority: 'Medium',
    assigneeId: '',
    tags: [],
    subtasks: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');

  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Completed'>('All');
  const [filterPriority, setFilterPriority] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [filterTag, setFilterTag] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt_desc' | 'createdAt_asc' | 'dueDate_asc' | 'dueDate_desc' | 'priority_desc' | 'priority_asc'>('createdAt_desc');

  const [notifications, setNotifications] = useState<Task[]>([]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const newNotifications = data.tasks.filter(t => {
        if (t.status !== 'Pending' || !t.reminderDate) return false;
        const reminderTime = parseISO(t.reminderDate);
        return reminderTime <= now;
      });
      setNotifications(newNotifications);
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [data.tasks]);

  const dismissNotification = (taskId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== taskId));
    
    // We update the backend to remove the reminderDate so it doesn't notify again
    firebaseService.updateTask(taskId, {
      reminderDate: '' 
    });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.dueDate) return;

    await firebaseService.addTask({
      title: newTask.title,
      description: newTask.description || '',
      dueDate: parseISO(newTask.dueDate).toISOString(),
      reminderDate: newTask.reminderDate ? parseISO(newTask.reminderDate).toISOString() : '',
      status: 'Pending',
      priority: newTask.priority || 'Medium',
      createdAt: new Date().toISOString(),
      employeeId: currentUser?.id,
      assigneeId: newTask.assigneeId || currentUser?.id,
      tags: tagInput.split(',').map(t => t.trim()).filter(Boolean),
      subtasks: subtaskInput.split(',').map(t => t.trim()).filter(Boolean).map(t => ({ id: Math.random().toString(36).substr(2, 9), title: t, completed: false })),
    });
    
    setNewTask({ title: '', description: '', dueDate: '', reminderDate: '', priority: 'Medium', assigneeId: '', tags: [], subtasks: [] });
    setTagInput('');
    setSubtaskInput('');
    setShowAddModal(false);
  };

  const toggleSubtaskStatus = async (task: Task, subtaskId: string) => {
    if (!task.subtasks) return;
    const newSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    await firebaseService.updateTask(task.id, {
      subtasks: newSubtasks
    });
  };

  const toggleTaskStatus = async (task: Task) => {
    await firebaseService.updateTask(task.id, {
      status: task.status === 'Pending' ? 'Completed' : 'Pending'
    });
  };

  const deleteTask = async (task: Task) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await firebaseService.deleteTask(task.id);
    }
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return 'Unassigned';
    if (assigneeId === currentUser?.id) return 'Self';
    const emp = data.employees.find(e => e.id === assigneeId);
    return emp ? emp.name : 'Unknown';
  };

  const toggleSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkMarkComplete = async () => {
    await Promise.all(selectedTasks.map(id => firebaseService.updateTask(id, { status: 'Completed' })));
    setSelectedTasks([]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) return;
    await Promise.all(selectedTasks.map(id => firebaseService.deleteTask(id)));
    setSelectedTasks([]);
  };

  const filteredTasks = data.tasks.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchDesc) return false;
    }

    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
    if (filterTag !== 'All' && (!t.tags || !t.tags.includes(filterTag))) return false;
    if (filterAssignee !== 'All') {
      if (filterAssignee === 'Self') {
        if (t.assigneeId !== currentUser?.id) return false;
      } else {
        if (t.assigneeId !== filterAssignee) return false;
      }
    }
    
    if (filterStartDate) {
       const start = new Date(filterStartDate);
       start.setHours(0,0,0,0);
       const tDate = new Date(t.dueDate);
       if (tDate < start) return false;
    }

    if (filterEndDate) {
       const end = new Date(filterEndDate);
       end.setHours(23,59,59,999);
       const tDate = new Date(t.dueDate);
       if (tDate > end) return false;
    }
    
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'createdAt_asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'createdAt_desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'dueDate_asc':
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'dueDate_desc':
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      case 'priority_desc': {
        const pScores = { High: 3, Medium: 2, Low: 1 };
        return (pScores[b.priority] || 0) - (pScores[a.priority] || 0);
      }
      case 'priority_asc': {
        const pScores = { High: 3, Medium: 2, Low: 1 };
        return (pScores[a.priority] || 0) - (pScores[b.priority] || 0);
      }
      default:
        return 0;
    }
  });

  const selectAll = () => {
    if (selectedTasks.length === sortedTasks.length && sortedTasks.length > 0) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(sortedTasks.map(t => t.id));
    }
  };

  const allTags = Array.from(new Set(data.tasks.flatMap(t => t.tags || []))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-slate-500">Manage your tasks and set reminders.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors relative"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      <AnimatePresence>
        {notifications.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {notifications.map(notif => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={`notif-${notif.id}`} 
                className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-start gap-4 shadow-sm"
              >
                <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-full text-amber-600 mt-1">
                  <BellRing className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 dark:text-amber-100">Reminder: {notif.title}</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Due: {format(parseISO(notif.dueDate), 'MMM dd, yyyy hh:mm a')}</p>
                </div>
                <button 
                  onClick={() => dismissNotification(notif.id)}
                  className="text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50 p-1.5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-end flex-wrap">
        <div className="w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
            />
          </div>
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-[150px]">
          <label className="block text-sm font-bold mb-2">Status</label>
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 outline-none"
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-[150px]">
          <label className="block text-sm font-bold mb-2">Assignee</label>
          <select 
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 outline-none"
          >
            <option value="All">All</option>
            <option value="Self">Self</option>
            {currentUser?.role !== 'Employee' && data.employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-[150px]">
          <label className="block text-sm font-bold mb-2">Tag</label>
          <select 
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 outline-none"
          >
            <option value="All">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <label className="block text-sm font-bold mb-2">Priority</label>
          <select 
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as any)}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 outline-none"
          >
            <option value="All">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <label className="block text-sm font-bold mb-2">Sort By</label>
          <select 
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 outline-none"
          >
            <option value="createdAt_desc">Newest First</option>
            <option value="createdAt_asc">Oldest First</option>
            <option value="dueDate_asc">Due Date (Earliest)</option>
            <option value="dueDate_desc">Due Date (Latest)</option>
            <option value="priority_desc">Priority (High to Low)</option>
            <option value="priority_asc">Priority (Low to High)</option>
          </select>
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <label className="block text-sm font-bold mb-2">Start Due Date</label>
          <input 
            type="date"
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 [color-scheme:light] dark:[color-scheme:dark] outline-none"
          />
        </div>
        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
          <label className="block text-sm font-bold mb-2">End Due Date</label>
          <input 
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 [color-scheme:light] dark:[color-scheme:dark] outline-none"
          />
        </div>
        {(filterStatus !== 'All' || filterStartDate || filterEndDate || filterPriority !== 'All' || filterTag !== 'All' || filterAssignee !== 'All' || searchQuery || sortBy !== 'createdAt_desc') && (
          <button 
            onClick={() => { setFilterStatus('All'); setFilterStartDate(''); setFilterEndDate(''); setFilterPriority('All'); setFilterAssignee('All'); setFilterTag('All'); setSearchQuery(''); setSortBy('createdAt_desc'); }}
            className="px-4 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {sortedTasks.length > 0 && (
          <div className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox"
                checked={selectedTasks.length === sortedTasks.length && sortedTasks.length > 0}
                onChange={selectAll}
                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {selectedTasks.length > 0 ? `${selectedTasks.length} selected` : 'Select All'}
              </span>
            </label>
            
            {selectedTasks.length > 0 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleBulkMarkComplete}
                  className="px-3 py-1.5 text-sm font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  Mark Complete
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-sm font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        )}
        <div className="divide-y dark:divide-slate-800">
          {sortedTasks.map(task => (
            <div key={task.id} className="p-6 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <input 
                type="checkbox"
                checked={selectedTasks.includes(task.id)}
                onChange={() => toggleSelection(task.id)}
                className="mt-1 w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <button 
                onClick={() => toggleTaskStatus(task)}
                className="mt-1 flex-shrink-0 text-slate-400 hover:text-emerald-500 transition-colors"
              >
                {task.status === 'Completed' ? 
                  <CheckCircle className="w-6 h-6 text-emerald-500" /> : 
                  <Circle className="w-6 h-6" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <h3 className={cx("font-bold text-lg", task.status === 'Completed' && "line-through text-slate-400")}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-slate-500 text-sm mt-2">{task.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                    <CalendarIcon className="w-4 h-4" />
                    {format(parseISO(task.dueDate), 'MMM dd, yy hh:mm a')}
                  </div>
                  {task.priority && (
                    <div className={cx(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md border",
                      task.priority === 'High' ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-900/30" :
                      task.priority === 'Medium' ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/30" :
                      "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900/30"
                    )}>
                      {task.priority}
                    </div>
                  )}
                  {task.assigneeId && (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      <User className="w-4 h-4" />
                      {getAssigneeName(task.assigneeId)}
                    </div>
                  )}
                  {task.reminderDate && (
                    <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 px-2 py-1 rounded-md">
                      <Bell className="w-4 h-4" />
                      {format(parseISO(task.reminderDate), 'MMM dd, yy hh:mm a')}
                    </div>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1">
                      <Tag className="w-4 h-4 text-slate-400" />
                      {task.tags.map(tag => (
                        <span key={tag} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-bold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="mt-4 max-w-sm">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>Subtasks</span>
                      <span>{task.subtasks.filter(s => s.completed).length} / {task.subtasks.length}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      {task.subtasks.map(subtask => (
                        <label key={subtask.id} className="flex items-center gap-2 cursor-pointer group/subtask">
                          <input 
                            type="checkbox" 
                            checked={subtask.completed}
                            onChange={() => toggleSubtaskStatus(task, subtask.id)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className={cx("text-sm transition-colors", subtask.completed ? "text-slate-400 line-through" : "text-slate-600 dark:text-slate-300 group-hover/subtask:text-slate-900 dark:group-hover/subtask:text-white")}>
                            {subtask.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => deleteTask(task)}
                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {sortedTasks.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic">No tasks found based on the current filters.</div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative"
          >
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold">New Task</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Title</label>
                <input 
                  type="text" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none" 
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Description</label>
                <textarea 
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 h-24 resize-none focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Priority</label>
                <select 
                  value={newTask.priority}
                  onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none" 
                  required
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Tags <span className="text-slate-400 font-normal">(comma separated)</span></label>
                <input 
                  type="text" 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="e.g. frontend, bug, urgent"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Subtasks <span className="text-slate-400 font-normal">(comma separated)</span></label>
                <input 
                  type="text" 
                  value={subtaskInput}
                  onChange={e => setSubtaskInput(e.target.value)}
                  placeholder="e.g. Design mockup, Write code, Test"
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none" 
                />
              </div>

              {currentUser?.role !== 'Employee' && (
                <div>
                  <label className="block text-sm font-bold mb-2">Assign To</label>
                  <select 
                    value={newTask.assigneeId || ''}
                    onChange={e => setNewTask({...newTask, assigneeId: e.target.value})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none" 
                  >
                    <option value="">Self (Unassigned)</option>
                    {data.employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Due Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={newTask.dueDate}
                    onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 [color-scheme:light] dark:[color-scheme:dark] focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Reminder Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={newTask.reminderDate}
                    onChange={e => setNewTask({...newTask, reminderDate: e.target.value})}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none ring-1 ring-slate-200 dark:ring-slate-700 [color-scheme:light] dark:[color-scheme:dark] focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none" 
                  />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">Save Task</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
