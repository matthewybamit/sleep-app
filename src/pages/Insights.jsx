// src/pages/Insights.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Cell, ReferenceLine, Legend, Area, AreaChart 
} from 'recharts';
import { 
  Calendar, TrendingUp, Award, Clock, Zap, Target, 
  AlertTriangle, CheckCircle, Moon, Sun, Brain, Activity 
} from 'lucide-react';
import { format, differenceInDays, startOfWeek, endOfWeek, isWeekend } from 'date-fns';

const TARGET_SLEEP_HOURS = 7.5;
const OPTIMAL_BEDTIME_HOUR = 22; // 10 PM
const OPTIMAL_WAKE_HOUR = 6; // 6 AM

export default function Insights() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [period, setPeriod] = useState('7');
  const [stats, setStats] = useState({
    avgDuration: 0,
    bestNight: 0,
    worstNight: 0,
    consistency: 0,
    wakeConsistency: 0,
    sleepDebt: 0,
    qualityScore: 0,
    streak: 0,
    weekdayAvg: 0,
    weekendAvg: 0,
    optimalBedtimes: 0,
    trend: 'stable'
  });
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    getData();
  }, [period]);

  async function getData() {
    // Fetch ALL logs for comprehensive analysis
    const { data: allLogsData } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: true });

    setAllLogs(allLogsData || []);

    // Fetch period-specific logs for chart
    let query = supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: true });

    if (period === '7') {
      query = query.limit(7);
    } else if (period === '30') {
      query = query.limit(30);
    }

    const { data: logs } = await query;
    
    if (logs && logs.length > 0) {
      const formatted = logs.map(log => {
        const sleepStart = new Date(log.sleep_start);
        const sleepEnd = new Date(log.sleep_end);
        const hours = log.duration_minutes / 60;
        
        return {
          day: format(sleepStart, 'MMM dd'),
          fullDate: format(sleepStart, 'yyyy-MM-dd'),
          hours: parseFloat(hours.toFixed(1)),
          bedtime: sleepStart.getHours() + sleepStart.getMinutes() / 60,
          wakeTime: sleepEnd.getHours() + sleepEnd.getMinutes() / 60,
          bedtimeFormatted: format(sleepStart, 'h:mm a'),
          wakeTimeFormatted: format(sleepEnd, 'h:mm a'),
          isWeekend: isWeekend(sleepStart),
          meetsGoal: hours >= TARGET_SLEEP_HOURS
        };
      });
      
      setData(formatted);
      calculateStats(formatted, allLogsData || []);
    } else {
      setData([]);
      setStats({
        avgDuration: 0,
        bestNight: 0,
        worstNight: 0,
        consistency: 0,
        wakeConsistency: 0,
        sleepDebt: 0,
        qualityScore: 0,
        streak: 0,
        weekdayAvg: 0,
        weekendAvg: 0,
        optimalBedtimes: 0,
        trend: 'stable'
      });
      setRecommendations([]);
    }
  }

  function calculateStats(chartData, allData) {
    if (chartData.length === 0) return;

    // Basic stats
    const hours = chartData.map(d => d.hours);
    const avgDuration = hours.reduce((a, b) => a + b, 0) / hours.length;
    const bestNight = Math.max(...hours);
    const worstNight = Math.min(...hours);

    // Bedtime consistency (standard deviation)
    const bedtimes = chartData.map(d => d.bedtime);
    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const bedtimeVariance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) / bedtimes.length;
    const bedtimeStdDev = Math.sqrt(bedtimeVariance) * 60; // minutes

    // Wake time consistency
    const wakeTimes = chartData.map(d => d.wakeTime);
    const avgWakeTime = wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length;
    const wakeVariance = wakeTimes.reduce((sum, time) => sum + Math.pow(time - avgWakeTime, 2), 0) / wakeTimes.length;
    const wakeStdDev = Math.sqrt(wakeVariance) * 60; // minutes

    // Sleep debt (cumulative difference from target)
    const totalDebt = chartData.reduce((debt, day) => {
      return debt + (TARGET_SLEEP_HOURS - day.hours);
    }, 0);

    // Current streak (consecutive days meeting goal)
    let streak = 0;
    for (let i = allData.length - 1; i >= 0; i--) {
      const hours = allData[i].duration_minutes / 60;
      if (hours >= TARGET_SLEEP_HOURS) {
        streak++;
      } else {
        break;
      }
    }

    // Weekday vs Weekend
    const weekdayLogs = chartData.filter(d => !d.isWeekend);
    const weekendLogs = chartData.filter(d => d.isWeekend);
    const weekdayAvg = weekdayLogs.length > 0 
      ? weekdayLogs.reduce((a, b) => a + b.hours, 0) / weekdayLogs.length 
      : 0;
    const weekendAvg = weekendLogs.length > 0 
      ? weekendLogs.reduce((a, b) => a + b.hours, 0) / weekendLogs.length 
      : 0;

    // Optimal bedtimes (10 PM - 11 PM)
    const optimalCount = chartData.filter(d => d.bedtime >= 22 && d.bedtime <= 23).length;
    const optimalBedtimes = (optimalCount / chartData.length) * 100;

    // Quality Score (0-100)
    const durationScore = Math.min((avgDuration / TARGET_SLEEP_HOURS) * 40, 40);
    const consistencyScore = Math.max(30 - bedtimeStdDev / 2, 0); // Max 30 points
    const goalScore = (chartData.filter(d => d.meetsGoal).length / chartData.length) * 30;
    const qualityScore = Math.round(durationScore + consistencyScore + goalScore);

    // Trend analysis (comparing first half vs second half)
    const midpoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midpoint);
    const secondHalf = chartData.slice(midpoint);
    const firstAvg = firstHalf.reduce((a, b) => a + b.hours, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.hours, 0) / secondHalf.length;
    const trend = secondAvg > firstAvg + 0.3 ? 'improving' : secondAvg < firstAvg - 0.3 ? 'declining' : 'stable';

    setStats({
      avgDuration: avgDuration.toFixed(1),
      bestNight: bestNight.toFixed(1),
      worstNight: worstNight.toFixed(1),
      consistency: Math.round(bedtimeStdDev),
      wakeConsistency: Math.round(wakeStdDev),
      sleepDebt: totalDebt.toFixed(1),
      qualityScore,
      streak,
      weekdayAvg: weekdayAvg.toFixed(1),
      weekendAvg: weekendAvg.toFixed(1),
      optimalBedtimes: Math.round(optimalBedtimes),
      trend,
      avgBedtime: formatHourToTime(avgBedtime),
      avgWakeTime: formatHourToTime(avgWakeTime)
    });

    generateRecommendations({
      avgDuration,
      bedtimeStdDev,
      wakeStdDev,
      totalDebt,
      qualityScore,
      weekdayAvg,
      weekendAvg,
      optimalBedtimes,
      avgBedtime,
      trend
    });
  }

  function formatHourToTime(hour) {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  }

  function generateRecommendations(data) {
    const recs = [];

    // Sleep duration recommendations
    if (data.avgDuration < 6) {
      recs.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Severe Sleep Deprivation',
        message: `You're averaging ${data.avgDuration.toFixed(1)} hours—far below the 7.5 hour target. Prioritize an earlier bedtime immediately.`,
        action: 'Go to bed 90 minutes earlier tonight'
      });
    } else if (data.avgDuration < 7) {
      recs.push({
        type: 'warning',
        icon: Target,
        title: 'Below Sleep Target',
        message: `At ${data.avgDuration.toFixed(1)} hours average, you're missing ~${(TARGET_SLEEP_HOURS - data.avgDuration).toFixed(1)} hours per night.`,
        action: 'Aim for 30-60 minutes more sleep'
      });
    } else if (data.avgDuration >= TARGET_SLEEP_HOURS) {
      recs.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Excellent Sleep Duration',
        message: `You're meeting your sleep goals at ${data.avgDuration.toFixed(1)} hours average. Keep it up!`,
        action: 'Maintain this schedule'
      });
    }

    // Consistency recommendations
    if (data.bedtimeStdDev > 60) {
      recs.push({
        type: 'warning',
        icon: Clock,
        title: 'Inconsistent Bedtime',
        message: `Your bedtime varies by ±${Math.round(data.bedtimeStdDev)} minutes. Irregular sleep schedules reduce sleep quality.`,
        action: 'Set a consistent bedtime within 30 min window'
      });
    } else if (data.bedtimeStdDev < 30) {
      recs.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Great Consistency',
        message: `Your bedtime only varies by ±${Math.round(data.bedtimeStdDev)} minutes. Excellent routine!`,
        action: 'Keep maintaining this consistency'
      });
    }

    // Sleep debt
    if (data.totalDebt > 5) {
      recs.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Significant Sleep Debt',
        message: `You have ${Math.abs(data.totalDebt).toFixed(1)} hours of sleep debt. This impacts cognitive function and health.`,
        action: 'Add 1-2 hours of catch-up sleep this weekend'
      });
    } else if (data.totalDebt < -2) {
      recs.push({
        type: 'info',
        icon: Zap,
        title: 'Sleep Surplus',
        message: `You're sleeping ${Math.abs(data.totalDebt).toFixed(1)} hours more than your target. Feeling well-rested?`,
        action: 'Monitor for oversleeping patterns'
      });
    }

    // Weekday vs Weekend
    if (Math.abs(data.weekdayAvg - data.weekendAvg) > 1.5) {
      recs.push({
        type: 'warning',
        icon: Calendar,
        title: 'Weekend Sleep Catch-Up Pattern',
        message: `You sleep ${Math.abs(data.weekdayAvg - data.weekendAvg).toFixed(1)} hours ${data.weekendAvg > data.weekdayAvg ? 'more' : 'less'} on weekends. This disrupts your circadian rhythm.`,
        action: 'Aim for consistent sleep 7 days/week'
      });
    }

    // Bedtime optimization
    if (data.optimalBedtimes < 50) {
      recs.push({
        type: 'info',
        icon: Moon,
        title: 'Optimize Bedtime Window',
        message: `Only ${data.optimalBedtimes}% of your bedtimes are in the optimal 10-11 PM window. Earlier sleep improves quality.`,
        action: 'Try going to bed between 10-11 PM'
      });
    }

    // Trend-based recommendations
    if (data.trend === 'improving') {
      recs.push({
        type: 'success',
        icon: TrendingUp,
        title: 'Positive Trend Detected',
        message: 'Your sleep duration is improving over time. Great progress!',
        action: 'Keep up the momentum'
      });
    } else if (data.trend === 'declining') {
      recs.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Declining Sleep Pattern',
        message: 'Your sleep duration has decreased recently. Address this before it becomes chronic.',
        action: 'Review what changed in your routine'
      });
    }

    setRecommendations(recs);
  }

  const getQualityColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-8">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Sleep Insights</h2>
        
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setPeriod('7')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === '7' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPeriod('30')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === '30' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12">
          <div className="text-center">
            <Calendar size={64} className="mx-auto mb-4 text-slate-600" />
            <h3 className="text-2xl font-bold mb-2">No Sleep Data Yet</h3>
            <p className="text-slate-400 mb-6">Start tracking your sleep to unlock personalized insights and recommendations</p>
            <a 
              href="/tracker" 
              className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors"
            >
              Go to Sleep Tracker
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Sleep Quality Score - Hero Card */}
          <div className="bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/50 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Brain size={48} className={getQualityColor(stats.qualityScore)} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Sleep Quality Score</h3>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-6xl font-bold ${getQualityColor(stats.qualityScore)}`}>
                      {stats.qualityScore}
                    </span>
                    <span className="text-2xl text-slate-400">/100</span>
                  </div>
                  <p className={`text-lg font-semibold mt-2 ${getQualityColor(stats.qualityScore)}`}>
                    {getQualityLabel(stats.qualityScore)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">{stats.streak}</div>
                  <div className="text-xs text-slate-400">Day Streak</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className={`text-2xl font-bold ${stats.sleepDebt > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {stats.sleepDebt > 0 ? '-' : '+'}{Math.abs(stats.sleepDebt)}h
                  </div>
                  <div className="text-xs text-slate-400">Sleep {stats.sleepDebt > 0 ? 'Debt' : 'Surplus'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4">
            <StatCard
              icon={TrendingUp}
              title="Avg Duration"
              value={`${stats.avgDuration} hrs`}
              subtext={`Target: ${TARGET_SLEEP_HOURS} hrs`}
              color="indigo"
              trend={stats.trend}
            />
            <StatCard
              icon={Award}
              title="Best Night"
              value={`${stats.bestNight} hrs`}
              subtext={`Worst: ${stats.worstNight} hrs`}
              color="purple"
            />
            <StatCard
              icon={Moon}
              title="Bedtime Consistency"
              value={`±${stats.consistency} min`}
              subtext={stats.consistency < 30 ? 'Excellent' : stats.consistency < 60 ? 'Good' : 'Needs work'}
              color="blue"
            />
            <StatCard
              icon={Sun}
              title="Wake Consistency"
              value={`±${stats.wakeConsistency} min`}
              subtext={stats.wakeConsistency < 30 ? 'Excellent' : stats.wakeConsistency < 60 ? 'Good' : 'Needs work'}
              color="orange"
            />
          </div>

          {/* Sleep Duration Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
              <Activity className="text-indigo-400" size={20} />
              Sleep Duration Trend
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 12]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '12px'
                    }}
                    formatter={(value, name, props) => [
                      `${value} hrs (${props.payload.bedtimeFormatted} - ${props.payload.wakeTimeFormatted})`,
                      'Duration'
                    ]}
                  />
                  <ReferenceLine
                    y={TARGET_SLEEP_HOURS}
                    stroke="#6366f1"
                    strokeDasharray="5 5"
                    label={{
                      value: `Target: ${TARGET_SLEEP_HOURS}h`,
                      position: 'right',
                      fill: '#6366f1',
                      fontSize: 12
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorHours)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekday vs Weekend Comparison */}
          {stats.weekdayAvg > 0 && stats.weekendAvg > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Calendar className="text-blue-400" size={20} />
                  Weekday vs Weekend
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-400">Weekday Average</span>
                      <span className="text-lg font-bold">{stats.weekdayAvg} hrs</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: `${(parseFloat(stats.weekdayAvg) / 12) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-400">Weekend Average</span>
                      <span className="text-lg font-bold">{stats.weekendAvg} hrs</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3">
                      <div 
                        className="bg-purple-500 h-3 rounded-full transition-all"
                        style={{ width: `${(parseFloat(stats.weekendAvg) / 12) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-slate-400">
                      Difference: <span className="font-bold text-white">
                        {Math.abs(stats.weekdayAvg - stats.weekendAvg).toFixed(1)} hrs
                      </span>
                      {Math.abs(stats.weekdayAvg - stats.weekendAvg) > 1.5 && (
                        <span className="text-yellow-400 ml-2">⚠️ High variance</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Clock className="text-indigo-400" size={20} />
                  Sleep Schedule
                </h3>
                <div className="space-y-4">
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Average Bedtime</span>
                      <Moon size={16} className="text-indigo-400" />
                    </div>
                    <p className="text-2xl font-bold">{stats.avgBedtime}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Average Wake Time</span>
                      <Sun size={16} className="text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold">{stats.avgWakeTime}</p>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Optimal bedtimes</span>
                      <span className="font-bold">{stats.optimalBedtimes}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.optimalBedtimes}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
                <Brain className="text-purple-400" size={20} />
                Personalized Recommendations
              </h3>
              <div className="space-y-4">
                {recommendations.map((rec, i) => (
                  <RecommendationCard key={i} {...rec} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtext, color = 'indigo', trend }) {
  const colorClasses = {
    indigo: 'from-indigo-600/20 to-indigo-600/5 border-indigo-500/30',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/30',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/30',
    orange: 'from-orange-600/20 to-orange-600/5 border-orange-500/30',
    green: 'from-green-600/20 to-green-600/5 border-green-500/30'
  };

  const getTrendIcon = () => {
    if (trend === 'improving') return <TrendingUp size={16} className="text-green-400" />;
    if (trend === 'declining') return <TrendingUp size={16} className="text-red-400 rotate-180" />;
    return null;
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6 relative overflow-hidden`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
          <Icon size={20} className="text-white" />
        </div>
        <div className="text-slate-400 text-sm font-medium flex-1">{title}</div>
        {trend && getTrendIcon()}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {subtext && <div className="text-xs text-slate-400">{subtext}</div>}
    </div>
  );
}

function RecommendationCard({ type, icon: Icon, title, message, action }) {
  const typeStyles = {
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    critical: 'bg-red-500/10 border-red-500/30 text-red-300',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300'
  };

  const iconStyles = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400',
    info: 'text-blue-400'
  };

  return (
    <div className={`${typeStyles[type]} border rounded-xl p-4`}>
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <Icon size={24} className={iconStyles[type]} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm text-slate-300 mb-2">{message}</p>
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-white/10 px-3 py-1.5 rounded-lg">
            <Target size={12} />
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
