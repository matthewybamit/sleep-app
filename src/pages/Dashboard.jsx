import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Moon, TrendingUp, Calendar, Award, Clock, Target, Sparkles } from 'lucide-react';
import { format, subDays, startOfDay, differenceInDays } from 'date-fns';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    streak: 0,
    routineProgress: 0,
    completedTasks: 0,
    totalTasks: 0,
    avgSleep: 0,
    lastSleep: null,
    totalLogs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

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

    // Calculate streak (consecutive days with completed routines)
    const streak = await calculateStreak();

    // Calculate average sleep from last 7 days
    const last7Days = sleepLogs?.slice(0, 7) || [];
    const avgSleep = last7Days.length > 0
      ? last7Days.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / last7Days.length
      : 0;

    setStats({
      streak,
      routineProgress: tasks?.length > 0 ? Math.round((completions?.length || 0) / tasks.length * 100) : 0,
      completedTasks: completions?.length || 0,
      totalTasks: tasks?.length || 0,
      avgSleep: avgSleep / 60, // Convert to hours
      lastSleep: sleepLogs?.[0] || null,
      totalLogs: sleepLogs?.length || 0
    });

    setLoading(false);
  }

  async function calculateStreak() {
    const { data: completions } = await supabase
      .from('task_completions')
      .select('completed_date')
      .eq('user_id', user.id)
      .order('completed_date', { ascending: false });

    if (!completions || completions.length === 0) return 0;

    // Get unique dates
    const uniqueDates = [...new Set(completions.map(c => c.completed_date))].sort().reverse();

    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Start counting from today or yesterday
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

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  const tips = [
    { 
      title: "4-7-8 Breathing", 
      desc: "Inhale for 4s, hold for 7s, exhale for 8s. Repeat 4 times.",
      icon: "🫁"
    },
    { 
      title: "Screen Curfew", 
      desc: "Avoid blue light 60 mins before bed for better melatonin production.",
      icon: "📱"
    },
    { 
      title: "Cool Temperature", 
      desc: "Keep your room between 60-67°F (15-19°C) for optimal sleep.",
      icon: "🌡️"
    },
    { 
      title: "Consistent Schedule", 
      desc: "Go to bed and wake up at the same time every day, even weekends.",
      icon: "⏰"
    },
    { 
      title: "Dark Environment", 
      desc: "Use blackout curtains or an eye mask to block all light.",
      icon: "🌙"
    },
    { 
      title: "No Caffeine Late", 
      desc: "Avoid caffeine at least 6 hours before bedtime.",
      icon: "☕"
    }
  ];

  // Randomly select 3 tips
  const [selectedTips] = useState(() => {
    const shuffled = [...tips].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-bold flex items-center gap-3">
          {getGreeting()}, {user?.email?.split('@')[0] || 'User'}
          <Sparkles className="text-yellow-400" size={28} />
        </h2>
        <p className="text-slate-400 mt-2">
          {stats.totalLogs > 0 
            ? "Keep up the great work tracking your sleep!" 
            : "Ready to start your sleep journey?"}
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
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
          value={stats.avgSleep > 0 ? `${stats.avgSleep.toFixed(1)} hrs` : '--'}
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

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Sleep Tips */}
        <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Moon size={20} className="text-indigo-400" /> 
            Today's Sleep Tips
          </h3>
          <div className="grid gap-4">
            {selectedTips.map((tip, i) => (
              <div 
                key={i} 
                className="bg-slate-900/40 p-4 rounded-xl hover:bg-slate-900/60 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{tip.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-indigo-300">{tip.title}</h4>
                    <p className="text-sm text-slate-400 mt-1">{tip.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 shadow-xl shadow-indigo-900/50 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="opacity-90" size={20} />
              <h3 className="text-lg font-medium opacity-90">Sleep Streak</h3>
            </div>
            <div className="text-5xl font-bold mt-2">{stats.streak}</div>
            <p className="text-sm opacity-75 mt-1">
              {stats.streak === 0 && "Start your streak today!"}
              {stats.streak === 1 && "Great start! Keep going!"}
              {stats.streak > 1 && stats.streak < 7 && "You're building momentum!"}
              {stats.streak >= 7 && stats.streak < 30 && "Amazing consistency!"}
              {stats.streak >= 30 && "Incredible dedication! 🎉"}
            </p>
          </div>

          <div className="mt-8">
            <div className="flex justify-between text-sm mb-2 opacity-90">
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

      {/* Last Sleep Summary */}
      {stats.lastSleep && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-400" />
            Last Sleep Session
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">
                {format(new Date(stats.lastSleep.sleep_start), 'MMM d, yyyy')}
              </p>
              <p className="text-lg mt-1">
                {format(new Date(stats.lastSleep.sleep_start), 'h:mm a')} - {' '}
                {format(new Date(stats.lastSleep.sleep_end), 'h:mm a')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-indigo-300">
                {(stats.lastSleep.duration_minutes / 60).toFixed(1)} hrs
              </p>
              <p className="text-sm text-slate-400">Duration</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <a 
          href="/tracker"
          className="bg-gradient-to-br from-indigo-600/20 to-indigo-600/5 border border-indigo-500/30 rounded-2xl p-6 hover:from-indigo-600/30 hover:to-indigo-600/10 transition-all group"
        >
          <Moon className="text-indigo-400 mb-3 group-hover:scale-110 transition-transform" size={32} />
          <h4 className="text-lg font-semibold mb-2">Log Your Sleep</h4>
          <p className="text-slate-400 text-sm">Track tonight's sleep session</p>
        </a>

        <a 
          href="/routine"
          className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border border-purple-500/30 rounded-2xl p-6 hover:from-purple-600/30 hover:to-purple-600/10 transition-all group"
        >
          <Target className="text-purple-400 mb-3 group-hover:scale-110 transition-transform" size={32} />
          <h4 className="text-lg font-semibold mb-2">Complete Routine</h4>
          <p className="text-slate-400 text-sm">Finish your nightly tasks</p>
        </a>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color, iconColor }) {
  return (
    <div className={`bg-gradient-to-br ${color} border rounded-2xl p-6`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={iconColor} size={24} />
      </div>
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </div>
  );
}