// src/components/GlobalAIAssistant.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAI } from '../context/AIContext';
import { supabase } from '../lib/supabase';
import { Brain, Send, X, Mic, MicOff, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { differenceInDays, isWeekend } from 'date-fns';

const STORAGE_KEY = 'sleepTracker_sleepStart';
const TARGET_SLEEP_HOURS = 7.5;

export default function GlobalAIAssistant() {
  const { user } = useAuth();
  const { showAIChat, setShowAIChat, aiMessages, setAIMessages, isAIThinking, setIsAIThinking } = useAI();
  const [aiInput, setAIInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [userLocation, setUserLocation] = useState({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    city: null,
    country: null
  });

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

      recognitionInstance.onerror = () => setIsListening(false);
      recognitionInstance.onend = () => setIsListening(false);

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
              country: data.countryName
            });
          } catch (error) {
            setUserLocation({ timezone, city: null, country: null });
          }
        },
        () => setUserLocation({ timezone, city: null, country: null })
      );
    }
  }, []);

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

  async function handleAISubmit(e) {
    e.preventDefault();
    if (!aiInput.trim()) return;
    
    const userMessage = { role: 'user', content: aiInput };
    setAIMessages(prev => [...prev, userMessage]);
    const userInputText = aiInput;
    setAIInput('');
    setIsAIThinking(true);
    
    try {
      // Gather all user data INCLUDING NEW INSIGHTS
      const userData = await gatherUserData();
      
      const now = new Date();
      const hour = now.getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
      const todayDate = now.toISOString().split('T')[0];
      const tomorrowDate = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
      
      const systemPrompt = `You are ZenPsych AI - an advanced Sleep & Routine Intelligence Assistant with deep analytics capabilities.

CURRENT CONTEXT:
- Current Page: ${location.pathname}
- Current Time: ${hour}:00 (${timeOfDay})
- Day: ${dayOfWeek}
- Today: ${todayDate}
- Tomorrow: ${tomorrowDate}
- Timezone: ${userLocation.timezone}
${userLocation.city ? `- Location: ${userLocation.city}, ${userLocation.country}` : ''}

USER SLEEP ANALYTICS (LAST 7 DAYS):
${JSON.stringify(userData.sleepAnalytics, null, 2)}

USER ROUTINE DATA:
${JSON.stringify(userData.routine, null, 2)}

AVAILABLE ACTIONS (ALL AUTO-EXECUTE):

1. SLEEP_NOW - Start sleep tracking
2. WAKE_UP - End sleep tracking
3. LOG_PAST_SLEEP - Log historical sleep
4. ADD_TASK - Create routine task (supports any date)
5. TOGGLE_COMPLETE - Mark task done
6. GET_SLEEP_STATS - Show sleep analytics
7. NAVIGATE - Switch pages

INTELLIGENCE RULES:

**Sleep Coaching:**
- Reference actual sleep quality score (${userData.sleepAnalytics.qualityScore}/100)
- Mention sleep debt if > 2 hours: ${userData.sleepAnalytics.sleepDebt}
- Celebrate streaks: ${userData.sleepAnalytics.currentStreak} days
- Warn about inconsistency if bedtime variance > 60 min: ${userData.sleepAnalytics.bedtimeConsistency}
- Compare weekday vs weekend patterns: ${userData.sleepAnalytics.weekdayAvg} vs ${userData.sleepAnalytics.weekendAvg}

**Smart Recommendations:**
- If quality score < 60: "Your sleep quality is ${userData.sleepAnalytics.qualityScore}/100. Let's improve that!"
- If sleep debt > 2: "You have ${userData.sleepAnalytics.sleepDebt} hours of sleep debt. Consider catching up."
- If streak > 7: "Amazing! You're on a ${userData.sleepAnalytics.currentStreak}-day streak! 🔥"
- If inconsistent (>60 min variance): "Your bedtime varies by ${userData.sleepAnalytics.bedtimeConsistency} min. Try consistency."

**Context-Aware Responses:**
- When asked "How am I doing?" → Provide full analysis (quality score, debt, streak, recommendations)
- When asked "Why am I tired?" → Analyze sleep debt, consistency, recent patterns
- When asked "Should I sleep more?" → Compare avg vs target, mention debt
- When asked about patterns → Reference weekday vs weekend, trends

**Time Parsing:**
- "10 PM" → "22:00"
- "tomorrow" → ${tomorrowDate}
- "last night" → Yesterday 22:00 to today 06:00

RESPONSE FORMAT (ALWAYS JSON):
{
  "message": "Friendly, data-driven response with specific metrics and actionable advice",
  "action": {...action object...} or null,
  "actionLabel": null,
  "autoExecute": true
}

EXAMPLES:

User: "How is my sleep?"
Response: {
  "message": "📊 Your sleep quality score is ${userData.sleepAnalytics.qualityScore}/100! You're averaging ${userData.sleepAnalytics.avgDuration} hours (target: ${TARGET_SLEEP_HOURS}h). ${userData.sleepAnalytics.sleepDebt > 0 ? `You have ${userData.sleepAnalytics.sleepDebt}h of sleep debt.` : 'No sleep debt!'} ${userData.sleepAnalytics.currentStreak > 0 ? `🔥 ${userData.sleepAnalytics.currentStreak}-day streak!` : ''} Want to see detailed insights?",
  "action": {"type": "NAVIGATE", "params": {"page": "/insights"}},
  "actionLabel": null,
  "autoExecute": false
}

User: "Why am I tired?"
Response: {
  "message": "Let me analyze... ${userData.sleepAnalytics.sleepDebt > 2 ? `You have ${userData.sleepAnalytics.sleepDebt}h of sleep debt - that's likely why!` : ''} ${userData.sleepAnalytics.bedtimeConsistency > 60 ? `Your bedtime varies by ${userData.sleepAnalytics.bedtimeConsistency} min, disrupting your rhythm.` : ''} ${userData.sleepAnalytics.avgDuration < TARGET_SLEEP_HOURS ? `You're only averaging ${userData.sleepAnalytics.avgDuration}h vs the ${TARGET_SLEEP_HOURS}h target.` : ''} Need specific recommendations?",
  "action": null,
  "actionLabel": null,
  "autoExecute": false
}

User: "I'm going to sleep"
Response: {
  "message": "😴 Sleep mode activated at ${now.toLocaleTimeString()}! Sweet dreams! (Your avg bedtime is ${userData.sleepAnalytics.avgBedtime})",
  "action": {"type": "SLEEP_NOW", "params": {}},
  "actionLabel": null,
  "autoExecute": true
}

User: "I woke up"
Response: {
  "message": "☀️ Good morning! I've logged your sleep. ${userData.sleepAnalytics.currentStreak > 0 ? `Streak: ${userData.sleepAnalytics.currentStreak + 1} days! 🔥` : ''} Want to see how you did?",
  "action": {"type": "WAKE_UP", "params": {}},
  "actionLabel": null,
  "autoExecute": true
}

ALWAYS respond with valid JSON. Use actual data. Be insightful and encouraging!`;

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
            { role: 'user', content: userInputText }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'AI service error');
      }

      const aiResponse = JSON.parse(data.choices[0].message.content);
      
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

  async function gatherUserData() {
    const today = new Date().toISOString().split('T')[0];
    
    // Get routine data
    const { data: tasks } = await supabase
      .from('routine_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { data: completions } = await supabase
      .from('task_completions')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed_date', today);

    // Get ALL sleep logs for comprehensive analysis
    const { data: sleepLogs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: false })
      .limit(30);

    const { data: profile } = await supabase
      .from('profiles')
      .select('sleep_goal_minutes')
      .eq('id', user.id)
      .single();

    // Check for active sleep session
    const sleepStart = localStorage.getItem(STORAGE_KEY);
    let currentSleepDuration = null;
    if (sleepStart) {
      const start = new Date(sleepStart);
      const now = new Date();
      const diffMs = now - start;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      currentSleepDuration = `${hours}h ${minutes}m`;
    }

    // CALCULATE ADVANCED SLEEP ANALYTICS
    const last7Days = sleepLogs?.slice(0, 7) || [];
    const sleepAnalytics = calculateSleepAnalytics(last7Days, sleepLogs || []);

    return {
      routine: {
        tasks: tasks || [],
        completedToday: completions || [],
        progress: tasks?.length > 0 ? Math.round((completions?.length || 0) / tasks.length * 100) : 0
      },
      sleepAnalytics,
      isSleeping: !!sleepStart,
      sleepStartTime: sleepStart,
      currentSleepDuration,
      sleepGoal: profile?.sleep_goal_minutes ? `${(profile.sleep_goal_minutes / 60).toFixed(1)} hours` : `${TARGET_SLEEP_HOURS} hours`
    };
  }

  function calculateSleepAnalytics(last7Days, allLogs) {
    if (last7Days.length === 0) {
      return {
        avgDuration: 0,
        qualityScore: 0,
        sleepDebt: 0,
        currentStreak: 0,
        bedtimeConsistency: 0,
        weekdayAvg: 0,
        weekendAvg: 0,
        avgBedtime: 'No data'
      };
    }

    // Average duration
    const avgMinutes = last7Days.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / last7Days.length;
    const avgDuration = (avgMinutes / 60).toFixed(1);

    // Sleep debt
    const totalDebt = last7Days.reduce((debt, log) => {
      const hours = log.duration_minutes / 60;
      return debt + (TARGET_SLEEP_HOURS - hours);
    }, 0);

    // Current streak
    let streak = 0;
    for (let i = 0; i < allLogs.length; i++) {
      const hours = allLogs[i].duration_minutes / 60;
      if (hours >= TARGET_SLEEP_HOURS) {
        streak++;
      } else {
        break;
      }
    }

    // Bedtime consistency
    const bedtimes = last7Days.map(log => {
      const start = new Date(log.sleep_start);
      return start.getHours() + start.getMinutes() / 60;
    });
    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const bedtimeVariance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) / bedtimes.length;
    const bedtimeStdDev = Math.sqrt(bedtimeVariance) * 60; // minutes

    // Weekday vs Weekend
    const weekdayLogs = last7Days.filter(log => !isWeekend(new Date(log.sleep_start)));
    const weekendLogs = last7Days.filter(log => isWeekend(new Date(log.sleep_start)));
    const weekdayAvg = weekdayLogs.length > 0 
      ? (weekdayLogs.reduce((a, b) => a + b.duration_minutes, 0) / weekdayLogs.length / 60).toFixed(1)
      : 0;
    const weekendAvg = weekendLogs.length > 0 
      ? (weekendLogs.reduce((a, b) => a + b.duration_minutes, 0) / weekendLogs.length / 60).toFixed(1)
      : 0;

    // Quality Score (0-100)
    const durationScore = Math.min((parseFloat(avgDuration) / TARGET_SLEEP_HOURS) * 40, 40);
    const consistencyScore = Math.max(30 - bedtimeStdDev / 2, 0);
    const goalScore = (last7Days.filter(log => log.duration_minutes / 60 >= TARGET_SLEEP_HOURS).length / last7Days.length) * 30;
    const qualityScore = Math.round(durationScore + consistencyScore + goalScore);

    // Format average bedtime
    const hour = Math.floor(avgBedtime);
    const minute = Math.round((avgBedtime - hour) * 60);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const avgBedtimeFormatted = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;

    return {
      avgDuration,
      qualityScore,
      sleepDebt: totalDebt.toFixed(1),
      currentStreak: streak,
      bedtimeConsistency: Math.round(bedtimeStdDev),
      weekdayAvg,
      weekendAvg,
      avgBedtime: avgBedtimeFormatted
    };
  }

  async function executeAIAction(action) {
    if (!action) return;
    
    try {
      switch(action.type) {
        case 'SLEEP_NOW':
          const now = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, now);
          if (location.pathname !== '/tracker') {
            navigate('/tracker');
          }
          // Refresh page to update data
          window.location.reload();
          break;
        
        case 'WAKE_UP':
          const sleepStart = localStorage.getItem(STORAGE_KEY);
          if (sleepStart) {
            await supabase.from('sleep_logs').insert({
              user_id: user.id,
              sleep_start: sleepStart,
              sleep_end: new Date().toISOString()
            });
            localStorage.removeItem(STORAGE_KEY);
          }
          if (location.pathname !== '/tracker') {
            navigate('/tracker');
          }
          // Refresh to update insights
          window.location.reload();
          break;
        
        case 'LOG_PAST_SLEEP':
          await supabase.from('sleep_logs').insert({
            user_id: user.id,
            sleep_start: action.params.sleepStart,
            sleep_end: action.params.sleepEnd
          });
          if (location.pathname !== '/tracker') {
            navigate('/tracker');
          }
          window.location.reload();
          break;
        
        case 'ADD_TASK':
          await supabase.from('routine_tasks').insert({
            user_id: user.id,
            title: action.params.title,
            category: action.params.category || 'General',
            reminder_time: action.params.reminderTime || null,
            estimated_duration: action.params.duration || 15,
            time_of_day: action.params.timeOfDay || 'evening',
            scheduled_date: action.params.scheduledDate || null
          });
          if (location.pathname !== '/routine') {
            navigate('/routine');
          }
          break;
        
        case 'TOGGLE_COMPLETE':
          const today = new Date().toISOString().split('T')[0];
          const { data: existing } = await supabase
            .from('task_completions')
            .select('*')
            .eq('user_id', user.id)
            .eq('task_id', action.params.taskId)
            .eq('completed_date', today)
            .single();

          if (existing) {
            await supabase.from('task_completions').delete().match({
              user_id: user.id,
              task_id: action.params.taskId,
              completed_date: today
            });
          } else {
            await supabase.from('task_completions').insert({
              user_id: user.id,
              task_id: action.params.taskId,
              completed_date: today
            });
          }
          break;
        
        case 'GET_SLEEP_STATS':
          navigate('/insights');
          break;
        
        case 'GET_ROUTINE_REPORT':
          navigate('/routine');
          break;
        
        case 'NAVIGATE':
          navigate(action.params.page);
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

  if (!showAIChat) {
    return (
      <button
        onClick={() => setShowAIChat(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 group"
      >
        <div className="relative">
          <Brain className="text-white" size={24} />
          <span className="absolute -top-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Assistant
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center md:justify-end z-50 p-0 md:p-4">
      <div className="bg-slate-900 border border-white/10 rounded-t-3xl md:rounded-2xl w-full md:w-[420px] h-[85vh] md:h-[600px] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold">ZenPsych AI</h3>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles size={12} />
                {location.pathname === '/' && 'Landing'}
                {location.pathname === '/dashboard' && 'Dashboard Mode'}
                {location.pathname === '/tracker' && 'Sleep Tracker Mode'}
                {location.pathname === '/routine' && 'Routine Mode'}
                {location.pathname === '/insights' && 'Insights Mode'}
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

        {/* Input */}
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
              placeholder={isListening ? "Listening..." : "How is my sleep?"}
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
            {isListening ? '🎤 Listening...' : 'Try: "How is my sleep?" or "Why am I tired?"'}
          </p>
        </form>
      </div>
    </div>
  );
}
