import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, Circle, Plus, Trash2, Edit2, X, 
  Calendar, Clock, Flame, ChevronLeft, ChevronRight,
  TrendingUp, Target
} from 'lucide-react';

const CATEGORIES = [
  { value: 'Hygiene', label: '🧼 Hygiene', icon: '🧼' },
  { value: 'Relaxation', label: '🧘 Relaxation', icon: '🧘' },
  { value: 'Preparation', label: '📝 Preparation', icon: '📝' },
  { value: 'General', label: '⭐ General', icon: '⭐' }
];

const TIME_OF_DAY = [
  { value: 'morning', label: '🌅 Morning' },
  { value: 'afternoon', label: '☀️ Afternoon' },
  { value: 'evening', label: '🌆 Evening' },
  { value: 'night', label: '🌙 Night' },
  { value: 'anytime', label: '⏰ Anytime' }
];

export default function Routine() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editReminderTime, setEditReminderTime] = useState('');
  const [editDuration, setEditDuration] = useState(15);
  const [editTimeOfDay, setEditTimeOfDay] = useState('evening');

  // New state for features
  const [viewMode, setViewMode] = useState('category'); // 'category' or 'timeline'
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [streaks, setStreaks] = useState({});
  const [monthCompletions, setMonthCompletions] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [upcomingTask, setUpcomingTask] = useState(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (tasks.length > 0) {
      calculateStreaks();
    }
  }, [tasks, completions]);

  useEffect(() => {
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      getNextUncompletedTask();
    }, 60000);
    
    getNextUncompletedTask();
    return () => clearInterval(interval);
  }, [tasks, completions]);

  useEffect(() => {
    if (showCalendar) {
      fetchMonthData(calendarDate.getFullYear(), calendarDate.getMonth() + 1);
    }
  }, [showCalendar, calendarDate]);

  async function fetchData() {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: taskData } = await supabase
      .from('routine_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('reminder_time', { ascending: true, nullsLast: true });
    
    const { data: compData } = await supabase
      .from('task_completions')
      .select('task_id')
      .eq('user_id', user.id)
      .eq('completed_date', today);
    
    if (taskData) setTasks(taskData);
    if (compData) setCompletions(compData.map(c => c.task_id));
  }

  async function calculateStreaks() {
    const streakData = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const task of tasks) {
      const { data } = await supabase
        .from('task_completions')
        .select('completed_date')
        .eq('task_id', task.id)
        .eq('user_id', user.id)
        .order('completed_date', { ascending: false })
        .limit(365);
      
      if (!data || data.length === 0) {
        streakData[task.id] = 0;
        continue;
      }

      let streak = 0;
      let checkDate = new Date(today);
      
      // Check if completed today or yesterday (to not break streak if not done yet today)
      const completedDates = data.map(d => d.completed_date);
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
      
      // Start from yesterday if not completed today
      if (!completedDates.includes(todayStr)) {
        if (!completedDates.includes(yesterdayStr)) {
          streakData[task.id] = 0;
          continue;
        }
        checkDate = new Date(today.getTime() - 86400000);
      }
      
      // Count consecutive days
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        
        if (completedDates.includes(dateStr)) {
          streak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
          break;
        }
      }
      
      streakData[task.id] = streak;
    }
    
    setStreaks(streakData);
  }

  async function fetchMonthData(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    
    const { data } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', user.id)
      .gte('completed_date', startDate)
      .lte('completed_date', endDate);
    
    setMonthCompletions(data || []);
  }

  async function addTask(e) {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    const { error } = await supabase.from('routine_tasks').insert({
      user_id: user.id,
      title: newTask,
      category: newCategory,
      estimated_duration: 15,
      time_of_day: 'evening'
    });
    
    if (!error) {
      setNewTask('');
      setNewCategory('General');
      fetchData();
    }
  }

  async function toggleTask(taskId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const currentCompletions = date ? monthCompletions : completions;
    
    let isCompleted;
    if (date) {
      isCompleted = currentCompletions.some(
        c => c.task_id === taskId && c.completed_date === targetDate
      );
    } else {
      isCompleted = currentCompletions.includes(taskId);
    }

    if (isCompleted) {
      await supabase.from('task_completions').delete().match({
        user_id: user.id,
        task_id: taskId,
        completed_date: targetDate
      });
    } else {
      await supabase.from('task_completions').insert({
        user_id: user.id,
        task_id: taskId,
        completed_date: targetDate
      });
    }
    
    if (date) {
      fetchMonthData(calendarDate.getFullYear(), calendarDate.getMonth() + 1);
    }
    fetchData();
  }

  async function deleteTask(taskId) {
    await supabase.from('routine_tasks').delete().eq('id', taskId);
    fetchData();
  }

  function openEditModal(task) {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCategory(task.category || 'General');
    setEditReminderTime(task.reminder_time || '');
    setEditDuration(task.estimated_duration || 15);
    setEditTimeOfDay(task.time_of_day || 'evening');
  }

  async function saveEdit() {
    if (!editTitle.trim()) return;
    
    const { error } = await supabase
      .from('routine_tasks')
      .update({ 
        title: editTitle, 
        category: editCategory,
        reminder_time: editReminderTime || null,
        estimated_duration: editDuration,
        time_of_day: editTimeOfDay
      })
      .eq('id', editingTask.id);
    
    if (!error) {
      setEditingTask(null);
      fetchData();
    }
  }

  function getNextUncompletedTask() {
    const now = currentTime.toTimeString().slice(0, 5);
    
    const upcoming = tasks
      .filter(t => t.reminder_time && !completions.includes(t.id))
      .sort((a, b) => a.reminder_time.localeCompare(b.reminder_time))
      .find(t => t.reminder_time >= now);
    
    setUpcomingTask(upcoming || null);
  }

  function getTimeStatus(task) {
    if (!task.reminder_time) return 'no-time';
    
    const now = currentTime.toTimeString().slice(0, 5);
    const taskTime = task.reminder_time;
    
    if (completions.includes(task.id)) return 'completed';
    if (taskTime < now) return 'overdue';
    
    const nowMinutes = parseInt(now.split(':')[0]) * 60 + parseInt(now.split(':')[1]);
    const taskMinutes = parseInt(taskTime.split(':')[0]) * 60 + parseInt(taskTime.split(':')[1]);
    const diff = taskMinutes - nowMinutes;
    
    if (diff <= 0) return 'current';
    if (diff <= 30) return 'upcoming';
    
    return 'future';
  }

  function getStatusColor(status) {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/10';
      case 'overdue': return 'text-red-400 bg-red-500/10';
      case 'current': return 'text-yellow-400 bg-yellow-500/10';
      case 'upcoming': return 'text-orange-400 bg-orange-500/10';
      case 'future': return 'text-blue-400 bg-blue-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  }

  const progress = tasks.length > 0 ? (completions.length / tasks.length) * 100 : 0;

  // Group tasks by category
  const groupedTasks = tasks.reduce((acc, task) => {
    const cat = task.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {});

  // Sort tasks by time for timeline view
  const timelineTasks = [...tasks].sort((a, b) => {
    if (!a.reminder_time && !b.reminder_time) return 0;
    if (!a.reminder_time) return 1;
    if (!b.reminder_time) return -1;
    return a.reminder_time.localeCompare(b.reminder_time);
  });

  // Calendar helpers
  function getDaysInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  }

  function getCompletionRate(date) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const dayCompletions = monthCompletions.filter(c => c.completed_date === dateStr);
    if (tasks.length === 0) return 0;
    return (dayCompletions.length / tasks.length) * 100;
  }

  function changeMonth(direction) {
    const newDate = new Date(calendarDate);
    newDate.setMonth(calendarDate.getMonth() + direction);
    setCalendarDate(newDate);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Tonight's Routine</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className={`p-2 rounded-lg transition-colors ${
                showCalendar 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              <Calendar size={20} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'category' ? 'timeline' : 'category')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'timeline' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              <Clock size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
          <span>{completions.length} / {tasks.length} Completed</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Next Up Banner */}
        {upcomingTask && viewMode === 'timeline' && (
          <div className="mt-4 p-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Target className="text-indigo-400" size={24} />
              <div className="flex-1">
                <p className="text-sm text-slate-400">Next Up</p>
                <p className="text-white font-semibold">{upcomingTask.title}</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-400 font-bold">{upcomingTask.reminder_time}</p>
                <p className="text-xs text-slate-400">{upcomingTask.estimated_duration} min</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {showCalendar && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-lg font-bold">
              {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs text-slate-500 font-semibold py-2">
                {day}
              </div>
            ))}
            
            {(() => {
              const { daysInMonth, startingDayOfWeek } = getDaysInMonth(calendarDate);
              const days = [];
              
              // Empty cells before month starts
              for (let i = 0; i < startingDayOfWeek; i++) {
                days.push(<div key={`empty-${i}`} className="aspect-square" />);
              }
              
              // Month days
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                const dateStr = date.toISOString().split('T')[0];
                const rate = getCompletionRate(dateStr);
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                
                days.push(
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDate(date);
                      setShowCalendar(false);
                    }}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                      isToday 
                        ? 'bg-indigo-600 text-white font-bold' 
                        : rate === 100 
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                        : rate > 0 
                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <span>{day}</span>
                    {rate > 0 && (
                      <span className="text-xs mt-1">{Math.round(rate)}%</span>
                    )}
                  </button>
                );
              }
              
              return days;
            })()}
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/20"></div>
              <span>100%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500/20"></div>
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-white/5"></div>
              <span>None</span>
            </div>
          </div>
        </div>
      )}

      {/* Task List - Category View */}
      {viewMode === 'category' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
          {Object.keys(groupedTasks).length > 0 ? (
            Object.entries(groupedTasks).map(([category, categoryTasks]) => {
              const categoryInfo = CATEGORIES.find(c => c.value === category) || CATEGORIES[3];
              return (
                <div key={category}>
                  <div className="bg-slate-900/50 px-4 py-2 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-slate-300">
                      {categoryInfo.icon} {category}
                    </h3>
                  </div>
                  {categoryTasks.map(task => {
                    const isDone = completions.includes(task.id);
                    const streak = streaks[task.id] || 0;
                    
                    return (
                      <div
                        key={task.id}
                        className={`p-4 border-b border-white/5 transition-all ${
                          isDone ? 'bg-green-500/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center gap-4 cursor-pointer flex-1"
                            onClick={() => toggleTask(task.id)}
                          >
                            {isDone ? (
                              <CheckCircle2 className="text-green-400" size={24} />
                            ) : (
                              <Circle className="text-slate-500" size={24} />
                            )}
                            <div className="flex-1">
                              <span className={isDone ? 'line-through text-slate-500' : 'text-white'}>
                                {task.title}
                              </span>
                              <div className="flex items-center gap-3 mt-1">
                                {streak > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-orange-400">
                                    <Flame size={14} />
                                    <span>{streak} day{streak !== 1 ? 's' : ''}</span>
                                  </div>
                                )}
                                {task.reminder_time && (
                                  <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock size={12} />
                                    <span>{task.reminder_time}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(task)}
                              className="text-slate-600 hover:text-indigo-400 p-2 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500">
              <p>No tasks yet. Add your first habit below!</p>
            </div>
          )}
        </div>
      )}

      {/* Task List - Timeline View */}
      {viewMode === 'timeline' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-6">
          {timelineTasks.length > 0 ? (
            timelineTasks.map((task, index) => {
              const isDone = completions.includes(task.id);
              const streak = streaks[task.id] || 0;
              const status = getTimeStatus(task);
              const statusColor = getStatusColor(status);
              
              return (
                <div
                  key={task.id}
                  className={`p-4 border-b border-white/5 transition-all ${
                    isDone ? 'bg-green-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Time Column */}
                    <div className="w-20 text-right">
                      {task.reminder_time ? (
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {task.reminder_time}
                          </p>
                          <p className="text-xs text-slate-500">
                            {task.estimated_duration}m
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600">No time</p>
                      )}
                    </div>

                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          isDone 
                            ? 'bg-green-400 border-green-400' 
                            : status === 'overdue'
                            ? 'bg-red-400 border-red-400'
                            : 'bg-slate-700 border-slate-600'
                        }`}
                      />
                      {index < timelineTasks.length - 1 && (
                        <div className="w-0.5 h-12 bg-slate-700 my-1" />
                      )}
                    </div>

                    {/* Task Content */}
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleTask(task.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={isDone ? 'line-through text-slate-500' : 'text-white font-medium'}>
                              {task.title}
                            </span>
                            {!task.reminder_time && (
                              <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-400">
                                Flexible
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1">
                            {streak > 0 && (
                              <div className="flex items-center gap-1 text-xs text-orange-400">
                                <Flame size={14} />
                                <span>{streak} day streak</span>
                              </div>
                            )}
                            <span className="text-xs text-slate-400">
                              {CATEGORIES.find(c => c.value === task.category)?.icon} {task.category}
                            </span>
                            {task.reminder_time && !isDone && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
                                {status === 'overdue' && '⚠️ Overdue'}
                                {status === 'current' && '⏰ Now'}
                                {status === 'upcoming' && '⏳ Soon'}
                                {status === 'future' && '📅 Later'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(task);
                            }}
                            className="text-slate-600 hover:text-indigo-400 p-2 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                            className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500">
              <p>No tasks yet. Add your first habit below!</p>
            </div>
          )}
        </div>
      )}

      {/* Add New Task Form */}
      <form onSubmit={addTask} className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Add new habit..."
            className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            className="flex-1 bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2 font-medium"
          >
            <Plus size={20} />
            Add
          </button>
        </div>
      </form>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Edit Task</h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Task Name</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Category</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  <Clock size={14} className="inline mr-1" />
                  Reminder Time (Optional)
                </label>
                <input
                  type="time"
                  value={editReminderTime}
                  onChange={e => setEditReminderTime(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  step="5"
                  value={editDuration}
                  onChange={e => setEditDuration(parseInt(e.target.value))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Time of Day</label>
                <select
                  value={editTimeOfDay}
                  onChange={e => setEditTimeOfDay(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  {TIME_OF_DAY.map(time => (
                    <option key={time.value} value={time.value}>
                      {time.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Streak Display */}
              {streaks[editingTask.id] > 0 && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-400">
                    <Flame size={20} />
                    <div>
                      <p className="font-semibold">{streaks[editingTask.id]} Day Streak!</p>
                      <p className="text-xs text-slate-400">Keep it going!</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingTask(null)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors font-medium"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
