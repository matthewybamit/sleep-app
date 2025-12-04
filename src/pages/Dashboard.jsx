import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Moon, TrendingUp, Calendar, Award, Clock, Target, Sparkles } from 'lucide-react';
import { format, subDays } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    streak: 0,
    routineProgress: 0,
    completedTasks: 0,
    totalTasks: 0,
    avgSleep: 0,
    avgSleepMinutes: 0,
    sleepGoalMinutes: 450, // Default 7.5 hours
    lastSleep: null,
    totalLogs: 0,
    sleepConsistency: null
  });
  const [weatherData, setWeatherData] = useState(null);
  const [dynamicTips, setDynamicTips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchWeather();
  }, []);

  // Mock weather API
  async function fetchWeather() {
    setTimeout(() => {
      const mockTemp = Math.floor(Math.random() * 30) + 60; // 60-90°F
      setWeatherData({
        temperature: mockTemp,
        unit: 'F'
      });
    }, 500);
  }

  async function fetchDashboardData() {
    setLoading(true);

    // Fetch user profile with sleep goal
    const { data: profile } = await supabase
      .from('profiles')
      .select('sleep_goal_minutes')
      .eq('id', user.id)
      .single();

    // Fetch routine data
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

    // Fetch sleep logs
    const { data: sleepLogs } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: false })
      .limit(30);

    // Calculate streak
    const streak = await calculateStreak();

    // Calculate average sleep from last 7 days
    const last7Days = sleepLogs?.slice(0, 7) || [];
    const avgSleepMinutes = last7Days.length > 0
      ? last7Days.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / last7Days.length
      : 0;

    // Calculate bedtime consistency
    const consistency = calculateBedtimeConsistency(last7Days);

    const statsData = {
      streak,
      routineProgress: tasks?.length > 0 ? Math.round((completions?.length || 0) / tasks.length * 100) : 0,
      completedTasks: completions?.length || 0,
      totalTasks: tasks?.length || 0,
      avgSleep: avgSleepMinutes / 60,
      avgSleepMinutes: avgSleepMinutes,
      sleepGoalMinutes: profile?.sleep_goal_minutes || 450,
      lastSleep: sleepLogs?.[0] || null,
      totalLogs: sleepLogs?.length || 0,
      sleepConsistency: consistency
    };

    setStats(statsData);
    setLoading(false);
  }

  async function calculateStreak() {
    const { data: completions } = await supabase
      .from('task_completions')
      .select('completed_date')
      .eq('user_id', user.id)
      .order('completed_date', { ascending: false });

    if (!completions || completions.length === 0) return 0;

    const uniqueDates = [...new Set(completions.map(c => c.completed_date))].sort().reverse();

    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    let currentDate = uniqueDates[0] === today ? today : (uniqueDates[0] === yesterday ? yesterday : null);

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

    // Extract hours from sleep_start as minutes from midnight
    const bedtimes = sleepLogs.map(log => {
      const date = new Date(log.sleep_start);
      return date.getHours() * 60 + date.getMinutes();
    });

    // Calculate mean
    const mean = bedtimes.reduce((sum, time) => sum + time, 0) / bedtimes.length;

    // Calculate standard deviation
    const variance = bedtimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / bedtimes.length;
    const stdDev = Math.sqrt(variance);

    return stdDev; // in minutes
  }

  // Utility function to format duration
  function formatDuration(minutes) {
    if (!minutes || minutes <= 0) return '0 hr 0 min';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours} hr ${mins} min`;
  }

  // 🧠 SOPHISTICATED DYNAMIC TIP ENGINE
  function getDynamicTips() {
    const tips = [];

    // P1: Environmental - Temperature check
    if (weatherData && weatherData.temperature > 75) {
      tips.push({
        priority: 1,
        title: "Cool Down Your Room",
        desc: `It's ${weatherData.temperature}°F tonight. Set your thermostat to 65°F (18°C) to facilitate sleep onset and deeper REM cycles.`,
        icon: "🧊"
      });
    }

    // P2: Behavioral Gaps - Routine progress
    if (stats.routineProgress < 50 && stats.totalTasks > 0) {
      tips.push({
        priority: 2,
        title: "Boost Your Routine",
        desc: `You're at ${stats.routineProgress}% completion. Complete the first two tasks now to build momentum for better sleep preparation.`,
        icon: "✅"
      });
    }

    // P3: Consistency - Bedtime variance
    if (stats.sleepConsistency !== null && stats.sleepConsistency > 60) {
      const variationHours = Math.round(stats.sleepConsistency / 60 * 10) / 10;
      tips.push({
        priority: 3,
        title: "Stabilize Your Schedule",
        desc: `Your bedtimes varied by ${variationHours} hours this week. Aim for a consistent 11:00 PM bedtime to regulate your circadian rhythm.`,
        icon: "🎯"
      });
    }

    // P4: Performance - Sleep goal deficit
    if (stats.avgSleepMinutes > 0 && stats.avgSleepMinutes < stats.sleepGoalMinutes - 30) {
      const deficit = Math.round(stats.sleepGoalMinutes - stats.avgSleepMinutes);
      tips.push({
        priority: 4,
        title: "Close Your Sleep Gap",
        desc: `You're averaging ${Math.round(deficit)} minutes below your goal. Try logging off all screens 60 minutes before bed tonight.`,
        icon: "⏳"
      });
    }

    // P5: Onboarding - New user guidance
    if (stats.totalLogs < 5) {
      tips.push({
        priority: 5,
        title: "Build Your Baseline",
        desc: `Welcome! Focus on tracking your wake time accurately this week. After ${5 - stats.totalLogs} more logs, we'll unlock personalized insights.`,
        icon: "✨"
      });
    }

    // P6+: Default/Wellness fallbacks
    tips.push({
      priority: 6,
      title: "4-7-8 Breathing Technique",
      desc: "Try this now to begin your wind-down: Inhale for 4s, hold for 7s, exhale for 8s. Repeat 4 times to activate your parasympathetic system.",
      icon: "🧘"
    });

    tips.push({
      priority: 7,
      title: "Screen Curfew Protocol",
      desc: "Blue light suppresses melatonin by up to 50%. Avoid screens 60-90 mins before bed for optimal sleep onset.",
      icon: "📱"
    });

    tips.push({
      priority: 8,
      title: "Dark Environment",
      desc: "Even small amounts of light can disrupt sleep. Use blackout curtains or an eye mask to maintain circadian rhythm integrity.",
      icon: "🌙"
    });

    tips.push({
      priority: 9,
      title: "Caffeine Cutoff",
      desc: "Caffeine has a half-life of 5-6 hours. Avoid it at least 6 hours before bedtime to prevent sleep fragmentation.",
      icon: "☕"
    });

    // Sort by priority and return top 3
    return tips.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }

  // Generate tips when data is ready
  useEffect(() => {
    if (!loading && weatherData) {
      const tips = getDynamicTips();
      setDynamicTips(tips);
    }
  }, [loading, weatherData, stats]);

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  if (loading || !weatherData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading personalized dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-6">
      {/* Header - Mobile Optimized */}
      <header>
        <h2 className="text-2xl sm:text-3xl font-bold flex flex-wrap items-center gap-2 sm:gap-3">
          <span>{getGreeting()}, {user?.email?.split('@')[0] || 'User'}</span>
          <Sparkles className="text-yellow-400 flex-shrink-0" size={24} />
        </h2>
        <p className="text-slate-400 mt-2 text-sm sm:text-base">
          {stats.totalLogs > 0 
            ? "Your personalized insights are ready!" 
            : "Let's start building your sleep profile!"}
        </p>
      </header>

      {/* Stats Grid - Mobile Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          icon={Award}
          label="Current Streak"
          value={`${stats.streak} ${stats.streak === 1 ? 'Day' : 'Days'}`}
          color="from-yellow-600/20 to-yellow-600/5 border-yellow-500/30"
          iconColor="text-yellow-400"
        />
        <StatCard
          icon={Target}
          label="Today's Routine"
          value={`${stats.completedTasks}/${stats.totalTasks}`}
          subtext={`${stats.routineProgress}% complete`}
          color="from-indigo-600/20 to-indigo-600/5 border-indigo-500/30"
          iconColor="text-indigo-400"
        />
        <StatCard
          icon={Clock}
          label="Avg Sleep (7d)"
          value={stats.avgSleepMinutes > 0 ? formatDuration(stats.avgSleepMinutes) : '--'}
          subtext={stats.sleepGoalMinutes ? `Goal: ${formatDuration(stats.sleepGoalMinutes)}` : ''}
          color="from-purple-600/20 to-purple-600/5 border-purple-500/30"
          iconColor="text-purple-400"
        />
        <StatCard
          icon={Calendar}
          label="Sleep Logs"
          value={stats.totalLogs}
          subtext="Total tracked"
          color="from-green-600/20 to-green-600/5 border-green-500/30"
          iconColor="text-green-400"
        />
      </div>

      {/* Main Content Grid - Mobile Stacked */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ✨ DYNAMIC SLEEP TIPS */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Moon size={18} className="text-indigo-400 flex-shrink-0" /> 
              <span>Personalized Sleep Tips</span>
            </h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded self-start sm:self-auto">
              AI-Powered
            </span>
          </div>
          <div className="grid gap-3 sm:gap-4">
            {dynamicTips.map((tip, i) => (
              <div 
                key={i} 
                className="bg-slate-900/40 p-3 sm:p-4 rounded-xl hover:bg-slate-900/60 transition-all hover:scale-[1.01] sm:hover:scale-[1.02] cursor-pointer border border-transparent hover:border-indigo-500/30"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl sm:text-2xl flex-shrink-0">{tip.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium text-indigo-300 text-sm sm:text-base">{tip.title}</h4>
                      {tip.priority <= 3 && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                          High Priority
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Card - Full Width on Mobile */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 sm:p-6 shadow-xl shadow-indigo-900/50 text-white flex flex-col justify-between min-h-[280px]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="opacity-90" size={20} />
              <h3 className="text-base sm:text-lg font-medium opacity-90">Sleep Streak</h3>
            </div>
            <div className="text-4xl sm:text-5xl font-bold mt-2">{stats.streak}</div>
            <p className="text-xs sm:text-sm opacity-75 mt-1">
              {stats.streak === 0 && "Start your streak today!"}
              {stats.streak === 1 && "Great start! Keep going!"}
              {stats.streak > 1 && stats.streak < 7 && "You're building momentum!"}
              {stats.streak >= 7 && stats.streak < 30 && "Amazing consistency!"}
              {stats.streak >= 30 && "Incredible dedication! 🎉"}
            </p>
          </div>

          <div className="mt-6 sm:mt-8">
            <div className="flex justify-between text-xs sm:text-sm mb-2 opacity-90">
              <span>Tonight's Routine</span>
              <span>{stats.routineProgress}%</span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500" 
                style={{ width: `${stats.routineProgress}%` }}
              ></div>
            </div>
            <p className="text-xs opacity-75 mt-2">
              {stats.completedTasks} of {stats.totalTasks} tasks completed
            </p>
          </div>
        </div>
      </div>

      {/* Last Sleep Summary - Mobile Responsive */}
      {stats.lastSleep && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-400 flex-shrink-0" />
            <span>Last Sleep Session</span>
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-slate-400 text-xs sm:text-sm">
                {format(new Date(stats.lastSleep.sleep_start), 'MMM d, yyyy')}
              </p>
              <p className="text-base sm:text-lg mt-1">
                {format(new Date(stats.lastSleep.sleep_start), 'h:mm a')} - {' '}
                {format(new Date(stats.lastSleep.sleep_end), 'h:mm a')}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-2xl sm:text-3xl font-bold text-indigo-300">
                {formatDuration(stats.lastSleep.duration_minutes)}
              </p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {stats.lastSleep.duration_minutes >= stats.sleepGoalMinutes ? (
                  <span className="text-green-400">✓ Goal Met</span>
                ) : (
                  <span className="text-yellow-400">Below Goal</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions - Mobile Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <a 
          href="/tracker"
          className="bg-gradient-to-br from-indigo-600/20 to-indigo-600/5 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 hover:from-indigo-600/30 hover:to-indigo-600/10 transition-all group"
        >
          <Moon className="text-indigo-400 mb-3 group-hover:scale-110 transition-transform" size={28} />
          <h4 className="text-base sm:text-lg font-semibold mb-2">Log Your Sleep</h4>
          <p className="text-slate-400 text-xs sm:text-sm">Track tonight's sleep session</p>
        </a>

        <a 
          href="/routine"
          className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/30 rounded-2xl p-5 sm:p-6 hover:from-purple-600/30 hover:to-purple-600/10 transition-all group"
        >
          <Target className="text-purple-400 mb-3 group-hover:scale-110 transition-transform" size={28} />
          <h4 className="text-base sm:text-lg font-semibold mb-2">Complete Routine</h4>
          <p className="text-slate-400 text-xs sm:text-sm">Finish your nightly tasks</p>
        </a>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color, iconColor }) {
  return (
    <div className={`bg-gradient-to-br ${color} border rounded-2xl p-4 sm:p-5 lg:p-6`}>
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <Icon className={iconColor} size={20} />
      </div>
      <div className="text-xs sm:text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-bold text-white break-words">{value}</div>
      {subtext && <div className="text-xs text-slate-500 mt-1 truncate" title={subtext}>{subtext}</div>}
    </div>
  );
}