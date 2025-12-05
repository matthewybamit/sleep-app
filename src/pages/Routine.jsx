import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, Circle, Plus, Trash2, Edit2, X, 
  Calendar, Clock, Flame, ChevronLeft, ChevronRight,
  TrendingUp, Target, Brain, Send, Sparkles, Mic, MicOff, CalendarDays
} from 'lucide-react';
import { 
  findTaskByTitle, 
  generateWeeklyReport, 
  generateCoachingMessage,
  calculateTaskPriority 
} from '../lib/aiHelpers';

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
  const [editScheduledDate, setEditScheduledDate] = useState('');

  // Feature state
  const [viewMode, setViewMode] = useState('category');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [streaks, setStreaks] = useState({});
  const [monthCompletions, setMonthCompletions] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [upcomingTask, setUpcomingTask] = useState(null);
  const [viewingDate, setViewingDate] = useState(new Date()); // NEW: Track which date we're viewing

  // AI Assistant state
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAIMessages] = useState([]);
  const [aiInput, setAIInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [hasProactiveSuggestion, setHasProactiveSuggestion] = useState(false);
  
  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // Location state
  const [userLocation, setUserLocation] = useState({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    city: null,
    country: null,
    localTime: new Date().toLocaleString()
  });

  useEffect(() => {
    if (user) {
      fetchData();
      setAIMessages([{
        role: 'assistant',
        content: '👋 Hi! I\'m your Routine Intelligence Assistant. I can help you:\n\n• Manage tasks with text or voice commands\n• Track your progress\n• Schedule tasks for any date\n• Give personalized insights\n\nTry: "Add workout tomorrow at 7 AM" or "Show my weekly report"'
      }]);
    }
  }, [user]);

  // Refetch when viewing date changes
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [viewingDate]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setAIInput(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  // Get user location
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
            );
            const data = await response.json();
            
            setUserLocation({
              timezone,
              city: data.city || data.locality,
              country: data.countryName,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              localTime: new Date().toLocaleString('en-US', { timeZone: timezone })
            });
          } catch (error) {
            console.log('Could not fetch location details:', error);
            setUserLocation({
              timezone,
              city: null,
              country: null,
              localTime: new Date().toLocaleString('en-US', { timeZone: timezone })
            });
          }
        },
        (error) => {
          console.log('Geolocation not available:', error);
          setUserLocation({
            timezone,
            city: null,
            country: null,
            localTime: new Date().toLocaleString('en-US', { timeZone: timezone })
          });
        }
      );
    }
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      calculateStreaks();
    }
  }, [tasks, completions]);

  useEffect(() => {
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

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (!showAIChat && tasks.length > 0) {
        const suggestion = generateProactiveSuggestion();
        
        if (suggestion) {
          setAIMessages(prev => [...prev, {
            role: 'assistant',
            content: suggestion.message,
            action: suggestion.action,
            actionLabel: suggestion.actionLabel,
            timestamp: new Date().toISOString()
          }]);
          
          setHasProactiveSuggestion(true);
          
          if (suggestion.type === 'urgent') {
            setShowAIChat(true);
          }
        }
      }
    }, 15 * 60 * 1000);
    
    return () => clearInterval(checkInterval);
  }, [tasks, completions, streaks, showAIChat]);

  async function fetchData() {
    const targetDate = viewingDate.toISOString().split('T')[0];
    
    // Fetch tasks for specific date OR recurring tasks (no scheduled_date)
    const { data: taskData } = await supabase
      .from('routine_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .or(`scheduled_date.is.null,scheduled_date.eq.${targetDate}`)
      .order('reminder_time', { ascending: true, nullsLast: true });
    
    const { data: compData } = await supabase
      .from('task_completions')
      .select('task_id')
      .eq('user_id', user.id)
      .eq('completed_date', targetDate);
    
    if (taskData) setTasks(taskData);
    if (compData) setCompletions(compData.map(c => c.task_id));
  }

  async function calculateStreaks() {
    const streakData = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (const task of tasks) {
      // Skip one-time scheduled tasks
      if (task.scheduled_date) {
        streakData[task.id] = 0;
        continue;
      }

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
      
      const completedDates = data.map(d => d.completed_date);
      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
      
      if (!completedDates.includes(todayStr)) {
        if (!completedDates.includes(yesterdayStr)) {
          streakData[task.id] = 0;
          continue;
        }
        checkDate = new Date(today.getTime() - 86400000);
      }
      
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
      time_of_day: 'evening',
      scheduled_date: null // Recurring task by default
    });
    
    if (!error) {
      setNewTask('');
      setNewCategory('General');
      fetchData();
    }
  }

  async function toggleTask(taskId, date = null) {
    const targetDate = date || viewingDate.toISOString().split('T')[0];
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
    setEditScheduledDate(task.scheduled_date || '');
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
        time_of_day: editTimeOfDay,
        scheduled_date: editScheduledDate || null
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

  function generateProactiveSuggestion() {
    const prioritizedTasks = tasks
      .map(task => ({ 
        task, 
        priority: calculateTaskPriority(task, getTimeStatus(task), streaks, completions) 
      }))
      .filter(({ priority }) => priority > 0)
      .sort((a, b) => b.priority - a.priority);
    
    if (prioritizedTasks.length === 0) return null;
    
    const { task, priority } = prioritizedTasks[0];
    const streak = streaks[task.id] || 0;
    const status = getTimeStatus(task);
    
    if (status === 'overdue' && streak >= 7) {
      return {
        type: 'urgent',
        message: `🚨 "${task.title}" is overdue! You're on a ${streak}-day streak. Don't break it now!`,
        action: { type: 'TOGGLE_COMPLETE', params: { taskId: task.id } },
        actionLabel: 'Complete Now ✓'
      };
    }
    
    if (status === 'upcoming') {
      return {
        type: 'reminder',
        message: `⏰ "${task.title}" is coming up at ${task.reminder_time}. Ready to start?`,
        action: { type: 'TOGGLE_COMPLETE', params: { taskId: task.id } },
        actionLabel: 'Mark Complete'
      };
    }
    
    const hour = currentTime.getHours();
    if (hour >= 22 && completions.length < tasks.length) {
      const remaining = tasks.length - completions.length;
      return {
        type: 'reminder',
        message: `🌙 It's getting late! You have ${remaining} task${remaining > 1 ? 's' : ''} left. Want to finish strong?`,
        action: null,
        actionLabel: null
      };
    }
    
    return null;
  }

  // Voice input handlers
  function toggleVoiceInput() {
    if (!recognition) {
      alert('Voice recognition not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  }

  // Helper function to parse dates from natural language
  function parseDateFromText(text) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('today')) {
      return today.toISOString().split('T')[0];
    }
    
    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    if (lowerText.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }
    
    // Check for day names
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lowerText.includes(days[i])) {
        const targetDay = i;
        const currentDay = today.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
        
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        return targetDate.toISOString().split('T')[0];
      }
    }
    
    return null; // Recurring task (no specific date)
  }

  // AI Chat Function with Location, Time Context & Date Scheduling
  async function handleAISubmit(e) {
    e.preventDefault();
    if (!aiInput.trim()) return;
    
    const userMessage = { role: 'user', content: aiInput };
    setAIMessages(prev => [...prev, userMessage]);
    const userInput = aiInput; // Store before clearing
    setAIInput('');
    setIsAIThinking(true);
    setHasProactiveSuggestion(false);
    
    try {
      const now = new Date();
      const hour = now.getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
      const todayDate = now.toISOString().split('T')[0];
      const tomorrowDate = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
      
      const systemPrompt = `You are a helpful, friendly Routine Intelligence Assistant. You help users manage their daily habits and provide insights.

CURRENT CONTEXT:
- Current Time: ${currentTime.toTimeString().slice(0, 5)} (24-hour format)
- Time of Day: ${timeOfDay} (${hour}:00)
- Day: ${dayOfWeek}
- Today's Date: ${todayDate}
- Tomorrow's Date: ${tomorrowDate}
- Timezone: ${userLocation.timezone}
${userLocation.city ? `- Location: ${userLocation.city}, ${userLocation.country}` : ''}
- Currently Viewing: ${viewingDate.toISOString().split('T')[0]}

USER'S ROUTINE:
- Total Tasks: ${tasks.length}
- Completed Today: ${completions.length}
- Progress: ${tasks.length > 0 ? Math.round((completions.length / tasks.length) * 100) : 0}%

User's Tasks:
${JSON.stringify(tasks.map(t => ({
  id: t.id,
  title: t.title,
  category: t.category,
  reminder_time: t.reminder_time,
  estimated_duration: t.estimated_duration,
  time_of_day: t.time_of_day,
  scheduled_date: t.scheduled_date,
  is_recurring: !t.scheduled_date,
  completed: completions.includes(t.id)
})), null, 2)}

Current Streaks:
${JSON.stringify(streaks, null, 2)}

AVAILABLE ACTIONS (respond with JSON):
1. TOGGLE_COMPLETE - Mark task complete/incomplete
   Format: {"type": "TOGGLE_COMPLETE", "params": {"taskId": "uuid"}}
   Auto-execute: YES (set autoExecute: true)

2. ADD_TASK - Create new task (recurring or one-time)
   Format: {"type": "ADD_TASK", "params": {
     "title": "string", 
     "category": "Hygiene|Relaxation|Preparation|General", 
     "reminderTime": "HH:MM", 
     "duration": 15, 
     "timeOfDay": "morning|afternoon|evening|night",
     "scheduledDate": "YYYY-MM-DD" or null (null = recurring daily task)
   }}
   Auto-execute: YES (set autoExecute: true)
   
   DATE PARSING RULES:
   - "Add workout" or "Add workout every day" → scheduledDate: null (recurring)
   - "Add workout today" → scheduledDate: "${todayDate}"
   - "Add workout tomorrow" → scheduledDate: "${tomorrowDate}"
   - "Add workout on Monday" → scheduledDate: calculate next Monday's date
   - "Add workout next week" → scheduledDate: add 7 days to today
   - "Add workout on 2025-12-10" → scheduledDate: "2025-12-10"

3. EDIT_TASK - Modify existing task
   Format: {"type": "EDIT_TASK", "params": {"taskTitle": "string", "updates": {"reminder_time": "HH:MM", "scheduled_date": "YYYY-MM-DD"}}}
   Auto-execute: YES (set autoExecute: true)

4. DELETE_TASK - Remove task
   Format: {"type": "DELETE_TASK", "params": {"taskTitle": "string"}}
   Auto-execute: NO (set autoExecute: false, show confirmation button)

5. GET_REPORT - Generate weekly analysis
   Format: {"type": "GET_REPORT", "params": {}}
   Auto-execute: YES (set autoExecute: true)

6. SHOW_NEXT - Show what's next
   Format: {"type": "SHOW_NEXT", "params": {}}
   Auto-execute: YES (set autoExecute: true)

RESPONSE FORMAT (ALWAYS valid JSON):
{
  "message": "Your friendly, encouraging response here",
  "action": {...action object if applicable...} or null,
  "actionLabel": "Button text" or null,
  "autoExecute": true or false
}

SMART CONTEXT GUIDELINES:
- **Time Awareness**: Consider the current time when suggesting tasks
- **Date Awareness**: 
  * If user says "today" → scheduledDate: "${todayDate}"
  * If user says "tomorrow" → scheduledDate: "${tomorrowDate}"
  * If user says day name (Monday, Tuesday, etc.) → calculate next occurrence
  * If NO date mentioned → scheduledDate: null (recurring daily task)
  * Be clear in your message if it's a recurring task or one-time task

- **Realistic Scheduling**: 
  * Don't suggest morning times if it's already 10pm
  * For "tomorrow", suggest appropriate morning/afternoon times
  * For same-day tasks, only suggest times in the future
  
- **AUTO-EXECUTION RULES**:
  * For ADD_TASK: Set autoExecute to TRUE. Say "I've added [task]..." in past tense
  * Mention if it's recurring or for a specific date
  * For TOGGLE_COMPLETE: Set autoExecute to TRUE
  * For DELETE_TASK: Set autoExecute to FALSE (needs confirmation)

EXAMPLES:

User: "Add meditation tomorrow at 8 AM"
Response: {
  "message": "🧘 I've added meditation for tomorrow (${tomorrowDate}) at 08:00. Perfect way to start your day!",
  "action": {"type": "ADD_TASK", "params": {"title": "Meditation", "category": "Relaxation", "reminderTime": "08:00", "duration": 15, "timeOfDay": "morning", "scheduledDate": "${tomorrowDate}"}},
  "actionLabel": null,
  "autoExecute": true
}

User: "Add workout every day at 7 AM"
Response: {
  "message": "💪 I've added daily workout at 07:00. This will repeat every day!",
  "action": {"type": "ADD_TASK", "params": {"title": "Workout", "category": "General", "reminderTime": "07:00", "duration": 30, "timeOfDay": "morning", "scheduledDate": null}},
  "actionLabel": null,
  "autoExecute": true
}

User: "Add dentist appointment on Monday at 2 PM"
Response: {
  "message": "🦷 I've scheduled dentist appointment for next Monday at 14:00.",
  "action": {"type": "ADD_TASK", "params": {"title": "Dentist appointment", "category": "General", "reminderTime": "14:00", "duration": 60, "timeOfDay": "afternoon", "scheduledDate": "[calculate Monday's date]"}},
  "actionLabel": null,
  "autoExecute": true
}

ALWAYS respond with valid JSON`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Groq API Error:', data);
        throw new Error(data.error?.message || 'Groq API error');
      }

      const aiResponse = JSON.parse(data.choices[0].message.content);
      
      // Parse date if needed for ADD_TASK
      if (aiResponse.action && aiResponse.action.type === 'ADD_TASK') {
        if (!aiResponse.action.params.scheduledDate) {
          const parsedDate = parseDateFromText(userInput);
          aiResponse.action.params.scheduledDate = parsedDate;
        }
      }
      
      if (!aiResponse.message) {
        aiResponse.message = "I'm here to help! What would you like to do?";
      }
      
      setAIMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse.message,
        action: aiResponse.action || null,
        actionLabel: aiResponse.actionLabel || null
      }]);
      
      if (aiResponse.autoExecute && aiResponse.action) {
        setTimeout(() => executeAIAction(aiResponse.action), 500);
      }
      
    } catch (error) {
      console.error('AI Error:', error);
      setAIMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Error: ${error.message}. Please try again.`
      }]);
    } finally {
      setIsAIThinking(false);
    }
  }

  async function executeAIAction(action) {
    if (!action) return;
    
    try {
      switch(action.type) {
        case 'TOGGLE_COMPLETE':
          await toggleTask(action.params.taskId);
          break;
        
        case 'ADD_TASK':
          const { error: addError } = await supabase.from('routine_tasks').insert({
            user_id: user.id,
            title: action.params.title,
            category: action.params.category || 'General',
            reminder_time: action.params.reminderTime || null,
            estimated_duration: action.params.duration || 15,
            time_of_day: action.params.timeOfDay || 'evening',
            scheduled_date: action.params.scheduledDate || null
          });
          
          if (!addError) {
            await fetchData();
          }
          break;
        
        case 'EDIT_TASK':
          const editTask = findTaskByTitle(action.params.taskTitle, tasks);
          if (editTask) {
            await supabase.from('routine_tasks')
              .update(action.params.updates)
              .eq('id', editTask.id);
            
            await fetchData();
          }
          break;
        
        case 'DELETE_TASK':
          const delTask = findTaskByTitle(action.params.taskTitle, tasks);
          if (delTask) {
            await deleteTask(delTask.id);
            setAIMessages(prev => [...prev, {
              role: 'assistant',
              content: `✅ Deleted "${delTask.title}" from your routine.`
            }]);
          }
          break;
        
        case 'GET_REPORT':
          const report = await generateWeeklyReport(user.id, tasks, streaks, supabase);
          const coaching = generateCoachingMessage(report);
          setAIMessages(prev => [...prev, {
            role: 'assistant',
            content: coaching
          }]);
          break;
        
        case 'SHOW_NEXT':
          if (upcomingTask) {
            setAIMessages(prev => [...prev, {
              role: 'assistant',
              content: `⏰ Your next task is "${upcomingTask.title}" at ${upcomingTask.reminder_time}.`,
              action: { type: 'TOGGLE_COMPLETE', params: { taskId: upcomingTask.id } },
              actionLabel: 'Complete Now'
            }]);
          } else {
            const incomplete = tasks.filter(t => !completions.includes(t.id));
            if (incomplete.length > 0) {
              setAIMessages(prev => [...prev, {
                role: 'assistant',
                content: `You have ${incomplete.length} task${incomplete.length > 1 ? 's' : ''} remaining:\n\n${incomplete.map(t => `• ${t.title}`).join('\n')}`
              }]);
            } else {
              setAIMessages(prev => [...prev, {
                role: 'assistant',
                content: `🎉 All done! You've completed everything for today. Great work!`
              }]);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Action execution error:', error);
      setAIMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to execute that action. Please try manually.'
      }]);
    }
  }

  // Date navigation functions
  function changeViewingDate(days) {
    const newDate = new Date(viewingDate);
    newDate.setDate(newDate.getDate() + days);
    setViewingDate(newDate);
  }

  function goToToday() {
    setViewingDate(new Date());
  }

  const isToday = viewingDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

  const progress = tasks.length > 0 ? (completions.length / tasks.length) * 100 : 0;

  const groupedTasks = tasks.reduce((acc, task) => {
    const cat = task.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {});

  const timelineTasks = [...tasks].sort((a, b) => {
    if (!a.reminder_time && !b.reminder_time) return 0;
    if (!a.reminder_time) return 1;
    if (!b.reminder_time) return -1;
    return a.reminder_time.localeCompare(b.reminder_time);
  });

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
      {/* Header with Date Navigation */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeViewingDate(-1)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {isToday ? "Today's Routine" : viewingDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'short', 
                  day: 'numeric' 
                })}
              </h2>
              <p className="text-xs text-slate-400">
                {viewingDate.toISOString().split('T')[0]}
              </p>
            </div>

            <button
              onClick={() => changeViewingDate(1)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex gap-2">
            {!isToday && (
              <button
                onClick={goToToday}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm transition-colors"
              >
                Today
              </button>
            )}
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
        {upcomingTask && viewMode === 'timeline' && isToday && (
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

          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs text-slate-500 font-semibold py-2">
                {day}
              </div>
            ))}
            
            {(() => {
              const { daysInMonth, startingDayOfWeek } = getDaysInMonth(calendarDate);
              const days = [];
              
              for (let i = 0; i < startingDayOfWeek; i++) {
                days.push(<div key={`empty-${i}`} className="aspect-square" />);
              }
              
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                const dateStr = date.toISOString().split('T')[0];
                const rate = getCompletionRate(dateStr);
                const isSelectedDay = dateStr === viewingDate.toISOString().split('T')[0];
                const isTodayDay = dateStr === new Date().toISOString().split('T')[0];
                
                days.push(
                  <button
                    key={day}
                    onClick={() => {
                      setViewingDate(date);
                      setShowCalendar(false);
                    }}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                      isSelectedDay
                        ? 'bg-purple-600 text-white font-bold ring-2 ring-purple-400'
                        : isTodayDay 
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
              <div className="w-4 h-4 rounded bg-indigo-600"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500/20"></div>
              <span>100%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500/20"></div>
              <span>Partial</span>
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
                    const isScheduled = !!task.scheduled_date;
                    
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
                              <div className="flex items-center gap-2">
                                <span className={isDone ? 'line-through text-slate-500' : 'text-white'}>
                                  {task.title}
                                </span>
                                {isScheduled && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                    <CalendarDays size={12} className="inline mr-1" />
                                    One-time
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                {streak > 0 && !isScheduled && (
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
              <p>No tasks for this date. Add one below or use the AI assistant!</p>
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
              const isScheduled = !!task.scheduled_date;
              
              return (
                <div
                  key={task.id}
                  className={`p-4 border-b border-white/5 transition-all ${
                    isDone ? 'bg-green-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
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
                            {isScheduled && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                <CalendarDays size={12} className="inline" />
                              </span>
                            )}
                            {!task.reminder_time && (
                              <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-400">
                                Flexible
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1">
                            {streak > 0 && !isScheduled && (
                              <div className="flex items-center gap-1 text-xs text-orange-400">
                                <Flame size={14} />
                                <span>{streak} day streak</span>
                              </div>
                            )}
                            <span className="text-xs text-slate-400">
                              {CATEGORIES.find(c => c.value === task.category)?.icon} {task.category}
                            </span>
                            {task.reminder_time && !isDone && isToday && (
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
              <p>No tasks for this date. Add one below or use the AI assistant!</p>
            </div>
          )}
        </div>
      )}

      {/* Add New Task Form */}
      <form onSubmit={addTask} className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-24">
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
        <p className="text-xs text-slate-500 mt-2">
          💡 Tip: Use the AI assistant to schedule tasks for specific dates!
        </p>
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
                  <CalendarDays size={14} className="inline mr-1" />
                  Scheduled Date (leave empty for recurring)
                </label>
                <input
                  type="date"
                  value={editScheduledDate}
                  onChange={e => setEditScheduledDate(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Empty = repeats daily | Set date = one-time task
                </p>
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

              {streaks[editingTask.id] > 0 && !editingTask.scheduled_date && (
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

      {/* Floating AI Assistant Button */}
      <button
        onClick={() => {
          setShowAIChat(true);
          setHasProactiveSuggestion(false);
        }}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 group"
      >
        <div className="relative">
          <Brain className="text-white" size={24} />
          {hasProactiveSuggestion && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
          <span className="absolute -top-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Assistant
          </span>
        </div>
      </button>

      {/* AI Chat Modal with Voice Input */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center md:justify-end z-50 p-0 md:p-4">
          <div className="bg-slate-900 border border-white/10 rounded-t-3xl md:rounded-2xl w-full md:w-[420px] h-[85vh] md:h-[600px] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                  <Brain size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold">Routine Assistant</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Sparkles size={12} />
                    AI-Powered
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAIChat(false)}
                className="text-slate-400 hover:text-white transition-colors p-2"
              >
                <X size={24} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm' 
                      : 'bg-white/10 text-slate-200 rounded-2xl rounded-bl-sm'
                  } p-3 shadow-lg`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.action && msg.actionLabel && (
                      <button
                        onClick={() => executeAIAction(msg.action)}
                        className="mt-3 w-full py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        {msg.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isAIThinking && (
                <div className="flex justify-start">
                  <div className="bg-white/10 p-4 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input with Voice Button */}
            <form onSubmit={handleAISubmit} className="p-4 border-t border-white/10 bg-slate-900/50">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-3 rounded-xl transition-colors ${
                    isListening 
                      ? 'bg-red-600 hover:bg-red-500 animate-pulse' 
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {isListening ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
                </button>
                <input
                  type="text"
                  value={aiInput}
                  onChange={e => setAIInput(e.target.value)}
                  placeholder={isListening ? "Listening..." : "Type or speak..."}
                  className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  disabled={isAIThinking}
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim() || isAIThinking}
                  className="bg-indigo-600 p-3 rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} className="text-white" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                {isListening ? '🎤 Listening... Speak now!' : 'Try: "Add workout tomorrow at 7 AM"'}
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
