import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Moon,
  TrendingUp,
  Calendar,
  Award,
  Clock,
  Target,
  Sparkles,
  Brain,
  Send,
  X,
  Mic,
  MicOff,
} from 'lucide-react';
import { format, subDays } from 'date-fns';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

async function pickDailyQuote() {
  const todayKey = getTodayKey();
  const stored = localStorage.getItem('zenpsych_daily_quote');
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === todayKey) return parsed;
    } catch {
      // ignore parse errors
    }
  }

  // Generate new quote using AI
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a psychology and mental wellness expert. Generate an inspiring, evidence-based quote about psychology, mental health, sleep, habits, or personal growth. The quote should be:
- Motivational and actionable
- 1-2 sentences long
- Attributed to a famous psychologist, therapist, or researcher (real person)
- Scientifically grounded

Respond ONLY with valid JSON in this exact format:
{
  "text": "the quote text here",
  "author": "Author Name"
}`
          },
          {
            role: 'user',
            content: 'Generate a daily psychology insight quote for today.'
          }
        ],
        temperature: 0.9,
        max_tokens: 150,
        response_format: { type: 'json_object' }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error('Failed to generate quote');
    }

    const quoteData = JSON.parse(data.choices[0].message.content);
    const quote = { 
      text: quoteData.text, 
      author: quoteData.author, 
      date: todayKey 
    };
    
    localStorage.setItem('zenpsych_daily_quote', JSON.stringify(quote));
    return quote;
  } catch (error) {
    console.error('Error generating quote:', error);
    
    // Fallback quote if AI fails
    const fallbackQuote = {
      text: "The good life is a process, not a state of being. It is a direction, not a destination.",
      author: "Carl Rogers",
      date: todayKey
    };
    
    localStorage.setItem('zenpsych_daily_quote', JSON.stringify(fallbackQuote));
    return fallbackQuote;
  }
}

function hasSeenQuoteToday() {
  const todayKey = getTodayKey();
  const seenDate = localStorage.getItem('zenpsych_quote_seen');
  return seenDate === todayKey;
}

function markQuoteAsSeen() {
  const todayKey = getTodayKey();
  localStorage.setItem('zenpsych_quote_seen', todayKey);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    streak: 0,
    routineProgress: 0,
    completedTasks: 0,
    totalTasks: 0,
    avgSleep: 0,
    avgSleepMinutes: 0,
    sleepGoalMinutes: 450,
    lastSleep: null,
    totalLogs: 0,
    sleepConsistency: null,
  });
  const [weatherData, setWeatherData] = useState(null);
  const [dynamicTips, setDynamicTips] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAIMessages] = useState([]);
  const [aiInput, setAIInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  const [userLocation, setUserLocation] = useState({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    city: null,
    country: null,
  });

  const [badges, setBadges] = useState([]);

  // Daily quote - always loaded, modal shown only once per day
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [todayQuote, setTodayQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    async function initializeDashboard() {
      fetchDashboardData();
      fetchWeather();
      initializeAI();
      
      // Load or generate today's quote
      setQuoteLoading(true);
      const q = await pickDailyQuote();
      setTodayQuote(q);
      setQuoteLoading(false);
      
      // Only show modal if user hasn't seen it today
      if (!hasSeenQuoteToday()) {
        setShowQuoteModal(true);
      }
    }
    
    initializeDashboard();
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
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

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`,
            );
            const data = await response.json();

            setUserLocation({
              timezone,
              city: data.city || data.locality,
              country: data.countryName,
            });
          } catch (error) {
            setUserLocation({ timezone, city: null, country: null });
          }
        },
        () => {
          setUserLocation({ timezone, city: null, country: null });
        },
      );
    }
  }, []);

  function handleCloseQuoteModal() {
    setShowQuoteModal(false);
    markQuoteAsSeen();
  }

  function initializeAI() {
    setAIMessages([
      {
        role: 'assistant',
        content:
          "👋 Hi! I'm your Sleep Intelligence Assistant. I can help you:\n\n• Analyze your sleep patterns\n• Get personalized sleep advice\n• Track your progress\n• Answer questions about your data\n\nTry: \"Why is my sleep inconsistent?\" or \"How can I improve my sleep tonight?\"",
      },
    ]);
  }

  async function fetchWeather() {
    setTimeout(() => {
      const mockTemp = Math.floor(Math.random() * 30) + 60;
      setWeatherData({
        temperature: mockTemp,
        unit: 'F',
      });
    }, 500);
  }

  function computeBadges(nextStats) {
    const badgeList = [];

    if (nextStats.streak >= 30) {
      badgeList.push({
        id: 'streak_30',
        label: 'Zen Phoenix',
        desc: '30-day sleep routine streak.',
        icon: '🔥',
      });
    } else if (nextStats.streak >= 7) {
      badgeList.push({
        id: 'streak_7',
        label: 'Consistency Sage',
        desc: '7-day sleep routine streak.',
        icon: '✨',
      });
    } else if (nextStats.streak >= 3) {
      badgeList.push({
        id: 'streak_3',
        label: 'Habit Builder',
        desc: '3-day streak—momentum is growing.',
        icon: '🌱',
      });
    }

    if (nextStats.totalLogs >= 30) {
      badgeList.push({
        id: 'logs_30',
        label: 'Sleep Scientist',
        desc: 'Logged 30 or more nights.',
        icon: '🧪',
      });
    } else if (nextStats.totalLogs >= 10) {
      badgeList.push({
        id: 'logs_10',
        label: 'Sleep Tracker',
        desc: 'Logged 10 or more nights.',
        icon: '📊',
      });
    }

    if (nextStats.sleepConsistency !== null && nextStats.sleepConsistency <= 45) {
      badgeList.push({
        id: 'consistency',
        label: 'Clockwork Mind',
        desc: 'Highly consistent bedtimes this week.',
        icon: '⏰',
      });
    }

    if (
      nextStats.avgSleepMinutes > 0 &&
      nextStats.avgSleepMinutes >= nextStats.sleepGoalMinutes
    ) {
      badgeList.push({
        id: 'goal_meet',
        label: 'Goal Guardian',
        desc: 'Meeting your weekly sleep duration goal.',
        icon: '🛡️',
      });
    }

    return badgeList;
  }

  async function fetchDashboardData() {
    setLoading(true);

    const { data: profile } = await supabase
      .from('profiles')
      .select('sleep_goal_minutes')
      .eq('id', user.id)
      .single();

    const today = new Date().toISOString().split('T')[0];
    const { data: tasks } = await supabase
      .from('routine_tasks')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { data: completions } = await supabase
      .from('task_completions')
      .select('task_id, completed_date')
      .eq('user_id', user.id)
      .eq('completed_date', today);

    const { data: sleepLogs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: false })
      .limit(30);

    const streak = await calculateStreak();

    const last7Days = sleepLogs?.slice(0, 7) || [];
    const avgSleepMinutes =
      last7Days.length > 0
        ? last7Days.reduce(
            (sum, log) => sum + (log.duration_minutes || 0),
            0,
          ) / last7Days.length
        : 0;

    const consistency = calculateBedtimeConsistency(last7Days);

    const statsData = {
      streak,
      routineProgress:
        tasks?.length > 0
          ? Math.round(((completions?.length || 0) / tasks.length) * 100)
          : 0,
      completedTasks: completions?.length || 0,
      totalTasks: tasks?.length || 0,
      avgSleep: avgSleepMinutes / 60,
      avgSleepMinutes: avgSleepMinutes,
      sleepGoalMinutes: profile?.sleep_goal_minutes || 450,
      lastSleep: sleepLogs?.[0] || null,
      totalLogs: sleepLogs?.length || 0,
      sleepConsistency: consistency,
      recentLogs: last7Days,
    };

    setStats(statsData);
    setBadges(computeBadges(statsData));
    setLoading(false);
  }

  async function calculateStreak() {
    const { data: completions } = await supabase
      .from('task_completions')
      .select('completed_date')
      .eq('user_id', user.id)
      .order('completed_date', { ascending: false });

    if (!completions || completions.length === 0) return 0;

    const uniqueDates = [...new Set(completions.map((c) => c.completed_date))]
      .sort()
      .reverse();

    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    let currentDate =
      uniqueDates[0] === today
        ? today
        : uniqueDates[0] === yesterday
        ? yesterday
        : null;

    if (!currentDate) return 0;

    for (let i = 0; i < uniqueDates.length; i++) {
      if (uniqueDates[i] === currentDate) {
        streak++;
        currentDate = format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd');
      } else {
        break;
      }
    }

    return streak;
  }

  function calculateBedtimeConsistency(sleepLogs) {
    if (sleepLogs.length < 2) return null;

    const bedtimes = sleepLogs.map((log) => {
      const date = new Date(log.sleep_start);
      return date.getHours() * 60 + date.getMinutes();
    });

    const mean =
      bedtimes.reduce((sum, time) => sum + time, 0) / bedtimes.length;
    const variance =
      bedtimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) /
      bedtimes.length;
    const stdDev = Math.sqrt(variance);

    return stdDev;
  }

  function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '0 hr 0 min';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours} hr ${mins} min`;
  }

  function getDynamicTips() {
    const tips = [];

    if (weatherData && weatherData.temperature > 75) {
      tips.push({
        priority: 1,
        title: 'Cool Down Your Room',
        desc: `It's ${weatherData.temperature}°F tonight. Set your thermostat to 65°F (18°C) to facilitate sleep onset and deeper REM cycles.`,
        icon: '🧊',
      });
    }

    if (stats.routineProgress < 50 && stats.totalTasks > 0) {
      tips.push({
        priority: 2,
        title: 'Boost Your Routine',
        desc: `You're at ${stats.routineProgress}% completion. Complete the first two tasks now to build momentum for better sleep preparation.`,
        icon: '✅',
      });
    }

    if (stats.sleepConsistency !== null && stats.sleepConsistency > 60) {
      const variationHours = Math.round((stats.sleepConsistency / 60) * 10) / 10;
      tips.push({
        priority: 3,
        title: 'Stabilize Your Schedule',
        desc: `Your bedtimes varied by ${variationHours} hours this week. Aim for a consistent 11:00 PM bedtime to regulate your circadian rhythm.`,
        icon: '🎯',
      });
    }

    if (
      stats.avgSleepMinutes > 0 &&
      stats.avgSleepMinutes < stats.sleepGoalMinutes - 30
    ) {
      const deficit = Math.round(stats.sleepGoalMinutes - stats.avgSleepMinutes);
      tips.push({
        priority: 4,
        title: 'Close Your Sleep Gap',
        desc: `You're averaging ${Math.round(
          deficit,
        )} minutes below your goal. Try logging off all screens 60 minutes before bed tonight.`,
        icon: '⏳',
      });
    }

    if (stats.totalLogs < 5) {
      tips.push({
        priority: 5,
        title: 'Build Your Baseline',
        desc: `Welcome! Focus on tracking your wake time accurately this week. After ${
          5 - stats.totalLogs
        } more logs, we'll unlock personalized insights.`,
        icon: '✨',
      });
    }

    tips.push({
      priority: 6,
      title: '4-7-8 Breathing Technique',
      desc: 'Try this now to begin your wind-down: Inhale for 4s, hold for 7s, exhale for 8s. Repeat 4 times to activate your parasympathetic system.',
      icon: '🧘',
    });

    tips.push({
      priority: 7,
      title: 'Screen Curfew Protocol',
      desc: 'Blue light suppresses melatonin by up to 50%. Avoid screens 60-90 mins before bed for optimal sleep onset.',
      icon: '📱',
    });

    tips.push({
      priority: 8,
      title: 'Dark Environment',
      desc: 'Even small amounts of light can disrupt sleep. Use blackout curtains or an eye mask to maintain circadian rhythm integrity.',
      icon: '🌙',
    });

    tips.push({
      priority: 9,
      title: 'Caffeine Cutoff',
      desc: 'Caffeine has a half-life of 5-6 hours. Avoid it at least 6 hours before bedtime to prevent sleep fragmentation.',
      icon: '☕',
    });

    return tips.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }

  useEffect(() => {
    if (!loading && weatherData) {
      const tips = getDynamicTips();
      setDynamicTips(tips);
      setBadges(computeBadges(stats));
    }
  }, [loading, weatherData, stats]);

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

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
    setAIMessages((prev) => [...prev, userMessage]);
    const userInputText = aiInput;
    setAIInput('');
    setIsAIThinking(true);

    try {
      const now = new Date();
      const hour = now.getHours();
      const timeOfDay =
        hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

      const systemPrompt = `You are a Sleep Intelligence Assistant specialized in sleep science, circadian rhythms, and behavior change. You help users optimize their sleep quality through evidence-based advice.

CURRENT USER DATA:
- Current Time: ${hour}:00 (${timeOfDay})
- Day: ${dayOfWeek}
- Timezone: ${userLocation.timezone}
${userLocation.city ? `- Location: ${userLocation.city}, ${userLocation.country}` : ''}

SLEEP METRICS:
- Current Streak: ${stats.streak} days
- Total Sleep Logs: ${stats.totalLogs}
- Average Sleep (7 days): ${formatDuration(stats.avgSleepMinutes)}
- Sleep Goal: ${formatDuration(stats.sleepGoalMinutes)}
- Sleep Deficit: ${
        stats.avgSleepMinutes > 0
          ? formatDuration(Math.abs(stats.sleepGoalMinutes - stats.avgSleepMinutes))
          : 'No data'
      }
- Bedtime Consistency: ${
        stats.sleepConsistency ? `${Math.round(stats.sleepConsistency)} minutes variance` : 'Not enough data'
      }
- Last Sleep: ${
        stats.lastSleep
          ? formatDuration(stats.lastSleep.duration_minutes) +
            ' on ' +
            format(new Date(stats.lastSleep.sleep_start), 'MMM d')
          : 'No recent log'
      }

ROUTINE STATUS:
- Tonight's Progress: ${stats.routineProgress}% (${stats.completedTasks}/${stats.totalTasks} tasks)

ENVIRONMENTAL:
- Current Temperature: ${weatherData?.temperature || 'Unknown'}°F

RECENT SLEEP PATTERN (last 7 days):
${
  stats.recentLogs?.map(
    (log, i) =>
      `Day ${i + 1}: ${formatDuration(log.duration_minutes)} (${format(
        new Date(log.sleep_start),
        'MMM d',
      )})`,
  ).join('\n') || 'No data'
}

YOUR CAPABILITIES:
1. Analyze sleep patterns and identify issues
2. Provide evidence-based sleep recommendations
3. Explain sleep science concepts (REM, circadian rhythm, etc.)
4. Give personalized tips based on user's data
5. Motivate and encourage consistency
6. Answer questions about their stats

RESPONSE GUIDELINES:
- Be supportive, encouraging, and science-based
- Reference their actual data when relevant
- Keep responses 3-4 sentences for simple questions
- Use emojis sparingly (1-2 per message)
- If they ask for analysis, provide detailed insights
- For "why" questions, explain the science
- Suggest actionable steps they can take tonight

ALWAYS be helpful, data-driven, and actionable. Never make medical diagnoses.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInputText },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Groq API Error:', data);
        throw new Error(data.error?.message || 'AI service error');
      }

      const aiResponse = data.choices[0].message.content;

      setAIMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: aiResponse,
        },
      ]);
    } catch (error) {
      console.error('AI Error:', error);
      setAIMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Error: ${error.message}. Please try again.`,
        },
      ]);
    } finally {
      setIsAIThinking(false);
    }
  }

  if (loading || !weatherData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading personalized dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-6 ">
      {/* Daily Psychology Quote Modal - Shows once per day */}
      {showQuoteModal && todayQuote && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 relative border border-[#BCE1F0]">
            <button
              onClick={handleCloseQuoteModal}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-[#8488C2]" size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#4A5A8A]">
                Daily Psychology Insight
              </span>
            </div>
            <p className="text-slate-800 text-sm leading-relaxed mb-4">
              "{todayQuote.text}"
            </p>
            <p className="text-right text-xs font-medium text-[#4A5A8A]">
              — {todayQuote.author}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header>
        <h2 className="text-2xl sm:text-3xl font-bold flex flex-wrap items-center gap-2 sm:gap-3 text-slate-900">
          <span>
            {getGreeting()}, {user?.email?.split('@')[0] || 'User'}
          </span>
          <Sparkles className="text-yellow-500 flex-shrink-0" size={24} />
        </h2>
        <p className="text-slate-700 mt-2 text-sm sm:text-base">
          {stats.totalLogs > 0
            ? 'Your personalized insights are ready! Ask the AI for detailed analysis.'
            : "Let's start building your sleep profile!"}
        </p>
      </header>

      {/* Daily Quote Card - Always visible in dashboard */}
      {quoteLoading ? (
        <div className="bg-gradient-to-br from-[#E9D5FF] to-[#F5EBFF] border border-purple-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-purple-600 animate-pulse" size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              Generating Today's Insight...
            </span>
          </div>
          <div className="h-16 bg-purple-100 rounded animate-pulse"></div>
        </div>
      ) : todayQuote ? (
        <div className="bg-gradient-to-br from-[#E9D5FF] to-[#F5EBFF] border border-purple-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-purple-600" size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">
              Today's Psychology Insight
            </span>
          </div>
          <p className="text-slate-800 text-sm leading-relaxed mb-3 italic">
            "{todayQuote.text}"
          </p>
          <p className="text-right text-xs font-medium text-purple-700">
            — {todayQuote.author}
          </p>
        </div>
      ) : null}

      {/* Rest of the dashboard remains exactly the same... */}
      {/* Badges row */}
      {badges.length > 0 && (
        <div className="bg-white/80 border border-[#BCE1F0] rounded-2xl p-4 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Award className="text-[#8488C2]" size={18} />
            <span className="text-sm font-semibold text-slate-900">
              Your Achievements
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#BCE1F0]/60 border border-[#BCE1F0] text-xs text-[#4A5A8A]"
                title={b.desc}
              >
                <span>{b.icon}</span>
                <span className="font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          icon={Award}
          label="Routine Streak"
          value={`${stats.streak} ${stats.streak === 1 ? 'Day' : 'Days'}`}
          subtext="Task completion"
          color="from-[#FDE68A] to-[#FEF9C3] border-yellow-300"
          iconColor="text-yellow-500"
        />

        <StatCard
          icon={Target}
          label="Today's Routine"
          value={`${stats.completedTasks}/${stats.totalTasks}`}
          subtext={`${stats.routineProgress}% complete`}
          color="from-[#C7D2FE] to-[#E0EAFF] border-indigo-300"
          iconColor="text-indigo-500"
        />
        <StatCard
          icon={Clock}
          label="Avg Sleep (7d)"
          value={
            stats.avgSleepMinutes > 0
              ? formatDuration(stats.avgSleepMinutes)
              : '--'
          }
          subtext={
            stats.sleepGoalMinutes
              ? `Goal: ${formatDuration(stats.sleepGoalMinutes)}`
              : ''
          }
          color="from-[#E9D5FF] to-[#F5EBFF] border-purple-300"
          iconColor="text-purple-500"
        />
        <StatCard
          icon={Calendar}
          label="Sleep Logs"
          value={stats.totalLogs}
          subtext="Total tracked"
          color="from-[#BBF7D0] to-[#DCFCE7] border-green-300"
          iconColor="text-green-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dynamic Sleep Tips */}
        <div className="lg:col-span-2 bg-white/80 border border-[#BCE1F0] rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2 text-slate-900">
              <Moon size={18} className="text-[#8488C2] flex-shrink-0" />
              <span>Personalized Sleep Tips</span>
            </h3>
            <span className="text-xs text-[#4A5A8A] bg-[#E0EDFB] px-2 py-1 rounded self-start sm:self-auto">
              AI-Powered
            </span>
          </div>
          <div className="grid gap-3 sm:gap-4">
            {dynamicTips.map((tip, i) => (
              <div
                key={i}
                className="bg-[#F3F7FE] p-3 sm:p-4 rounded-xl hover:bg-white transition-all hover:scale-[1.01] sm:hover:scale-[1.02] cursor-pointer border border-[#BCE1F0]"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl sm:text-2xl flex-shrink-0">
                    {tip.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium text-[#4A5A8A] text-sm sm:text-base">
                        {tip.title}
                      </h4>
                      {tip.priority <= 3 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                          High Priority
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {tip.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-gradient-to-br from-[#8488C2] to-[#4A5A8A] rounded-2xl p-5 sm:p-6 shadow-xl shadow-[#4A5A8A]/40 text-white flex flex-col justify-between min-h-[280px]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="opacity-90" size={20} />
              <h3 className="text-base sm:text-lg font-medium opacity-90">
                Routine Streak
              </h3>
            </div>
            <div className="text-4xl sm:text-5xl font-bold mt-2">
              {stats.streak}
            </div>
            <p className="text-xs sm:text-sm opacity-80 mt-1">
              {stats.streak === 0 && 'Complete any task to start your streak!'}
              {stats.streak === 1 &&
                'Day 1 of your routine! Keep going!'}
              {stats.streak > 1 &&
                stats.streak < 7 &&
                `${stats.streak} days of completing tasks!`}
              {stats.streak >= 7 &&
                stats.streak < 30 &&
                'Building a solid habit!'}
              {stats.streak >= 30 && 'Incredible routine discipline! 🎉'}
            </p>
            <p className="text-xs opacity-70 mt-2 italic">
              Complete at least 1 task daily to maintain streak.
            </p>
          </div>

          <div className="mt-6 sm:mt-8">
            <div className="flex justify-between text-xs sm:text-sm mb-2 opacity-90">
              <span>Tonight&apos;s Routine</span>
              <span>{stats.routineProgress}%</span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${stats.routineProgress}%` }}
              ></div>
            </div>
            <p className="text-xs opacity-80 mt-2">
              {stats.completedTasks} of {stats.totalTasks} tasks completed
            </p>
          </div>
        </div>
      </div>

      {/* Last Sleep Summary */}
      {stats.lastSleep && (
        <div className="bg-white/80 border border-[#BCE1F0] rounded-2xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2 text-slate-900">
            <TrendingUp size={18} className="text-green-500 flex-shrink-0" />
            <span>Last Sleep Session</span>
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-slate-600 text-xs sm:text-sm">
                {format(
                  new Date(stats.lastSleep.sleep_start),
                  'MMM d, yyyy',
                )}
              </p>
              <p className="text-base sm:text-lg mt-1 text-slate-900">
                {format(new Date(stats.lastSleep.sleep_start), 'h:mm a')} -{' '}
                {format(new Date(stats.lastSleep.sleep_end), 'h:mm a')}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl sm:text-3xl font-bold text-[#8488C2]">
                {formatDuration(stats.lastSleep.duration_minutes)}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {stats.lastSleep.duration_minutes >= stats.sleepGoalMinutes ? (
                  <span className="text-green-500">✓ Goal Met</span>
                ) : (
                  <span className="text-yellow-600">Below Goal</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <a
          href="/tracker"
          className="bg-white/80 border border-[#BCE1F0] rounded-2xl p-5 sm:p-6 hover:bg-white transition-all group shadow-sm"
        >
          <Moon
            className="text-[#8488C2] mb-3 group-hover:scale-110 transition-transform"
            size={28}
          />
          <h4 className="text-base sm:text-lg font-semibold mb-2 text-slate-900">
            Log Your Sleep
          </h4>
          <p className="text-slate-700 text-xs sm:text-sm">
            Track tonight&apos;s sleep session.
          </p>
        </a>

        <a
          href="/routine"
          className="bg-white/80 border border-[#E9D5FF] rounded-2xl p-5 sm:p-6 hover:bg-white transition-all group shadow-sm"
        >
          <Target
            className="text-purple-500 mb-3 group-hover:scale-110 transition-transform"
            size={28}
          />
          <h4 className="text-base sm:text-lg font-semibold mb-2 text-slate-900">
            Complete Routine
          </h4>
          <p className="text-slate-700 text-xs sm:text-sm">
            Finish your nightly tasks.
          </p>
        </a>
      </div>

      {/* Floating AI Assistant Button */}
      <button
        onClick={() => setShowAIChat(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-[#8488C2] to-[#4A5A8A] p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-40 group"
      >
        <div className="relative">
          <Brain className="text-white" size={24} />
          <span className="absolute -top-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Sleep AI
          </span>
        </div>
      </button>

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center md:justify-end z-50 p-0 md:p-4">
          <div className="bg-slate-900 border border-white/10 rounded-t-3xl md:rounded-2xl w-full md:w-[420px] h-[85vh] md:h-[600px] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#8488C2]/40 to-[#4A5A8A]/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#8488C2] to-[#4A5A8A] flex items-center justify-center">
                  <Brain size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Sleep AI Assistant</h3>
                  <p className="text-xs text-slate-300 flex items-center gap-1">
                    <Sparkles size={12} />
                    Powered by AI
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

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-[#8488C2] text-white rounded-2xl rounded-br-sm'
                        : 'bg-white/10 text-slate-200 rounded-2xl rounded-bl-sm'
                    } p-3 shadow-lg`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              {isAIThinking && (
                <div className="flex justify-start">
                  <div className="bg-white/10 p-4 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={handleAISubmit}
              className="p-4 border-t border-white/10 bg-slate-900/70"
            >
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
                  {isListening ? (
                    <MicOff size={20} className="text-white" />
                  ) : (
                    <Mic size={20} className="text-white" />
                  )}
                </button>
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAIInput(e.target.value)}
                  placeholder={
                    isListening ? 'Listening...' : 'Ask about your sleep...'
                  }
                  className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BCE1F0] transition-colors"
                  disabled={isAIThinking}
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim() || isAIThinking}
                  className="bg-[#8488C2] p-3 rounded-xl hover:bg-[#7378b5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} className="text-white" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                {isListening
                  ? '🎤 Listening...'
                  : 'Try: "Analyze my sleep" or "Why am I tired?"'}
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color, iconColor }) {
  return (
    <div
      className={`bg-gradient-to-br ${color} border rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm`}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <Icon className={iconColor} size={20} />
      </div>
      <div className="text-xs sm:text-sm text-slate-700 mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-slate-600 mt-1 truncate" title={subtext}>
          {subtext}
        </div>
      )}
    </div>
  );
}
