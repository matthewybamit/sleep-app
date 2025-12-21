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
const OPTIMAL_BEDTIME_HOUR = 22;
const OPTIMAL_WAKE_HOUR = 6;

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
    trend: 'stable',
  });
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    getData();
  }, [period]);

  async function getData() {
    const { data: allLogsData } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: true });

    setAllLogs(allLogsData || []);

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
      const formatted = logs.map((log) => {
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
          meetsGoal: hours >= TARGET_SLEEP_HOURS,
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
        trend: 'stable',
      });
      setRecommendations([]);
    }
  }

  function calculateStats(chartData, allData) {
    if (chartData.length === 0) return;

    const hours = chartData.map((d) => d.hours);
    const avgDuration = hours.reduce((a, b) => a + b, 0) / hours.length;
    const bestNight = Math.max(...hours);
    const worstNight = Math.min(...hours);

    const bedtimes = chartData.map((d) => d.bedtime);
    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const bedtimeVariance =
      bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) /
      bedtimes.length;
    const bedtimeStdDev = Math.sqrt(bedtimeVariance) * 60;

    const wakeTimes = chartData.map((d) => d.wakeTime);
    const avgWakeTime = wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length;
    const wakeVariance =
      wakeTimes.reduce((sum, time) => sum + Math.pow(time - avgWakeTime, 2), 0) /
      wakeTimes.length;
    const wakeStdDev = Math.sqrt(wakeVariance) * 60;

    const totalDebt = chartData.reduce((debt, day) => {
      return debt + (TARGET_SLEEP_HOURS - day.hours);
    }, 0);

    let streak = 0;
    for (let i = allData.length - 1; i >= 0; i--) {
      const h = allData[i].duration_minutes / 60;
      if (h >= TARGET_SLEEP_HOURS) streak++;
      else break;
    }

    const weekdayLogs = chartData.filter((d) => !d.isWeekend);
    const weekendLogs = chartData.filter((d) => d.isWeekend);
    const weekdayAvg =
      weekdayLogs.length > 0
        ? weekdayLogs.reduce((a, b) => a + b.hours, 0) / weekdayLogs.length
        : 0;
    const weekendAvg =
      weekendLogs.length > 0
        ? weekendLogs.reduce((a, b) => a + b.hours, 0) / weekendLogs.length
        : 0;

    const optimalCount = chartData.filter(
      (d) => d.bedtime >= 22 && d.bedtime <= 23,
    ).length;
    const optimalBedtimes = (optimalCount / chartData.length) * 100;

    const durationScore = Math.min((avgDuration / TARGET_SLEEP_HOURS) * 40, 40);
    const consistencyScore = Math.max(30 - bedtimeStdDev / 2, 0);
    const goalScore =
      (chartData.filter((d) => d.meetsGoal).length / chartData.length) * 30;
    const qualityScore = Math.round(
      durationScore + consistencyScore + goalScore,
    );

    const midpoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midpoint);
    const secondHalf = chartData.slice(midpoint);
    const firstAvg =
      firstHalf.reduce((a, b) => a + b.hours, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((a, b) => a + b.hours, 0) / secondHalf.length;
    const trend =
      secondAvg > firstAvg + 0.3
        ? 'improving'
        : secondAvg < firstAvg - 0.3
        ? 'declining'
        : 'stable';

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
      avgWakeTime: formatHourToTime(avgWakeTime),
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
      trend,
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

    if (data.avgDuration < 6) {
      recs.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Severe Sleep Deprivation',
        message: `You're averaging ${data.avgDuration.toFixed(
          1,
        )} hours—far below the 7.5 hour target. Prioritize an earlier bedtime immediately.`,
        action: 'Go to bed 90 minutes earlier tonight',
      });
    } else if (data.avgDuration < 7) {
      recs.push({
        type: 'warning',
        icon: Target,
        title: 'Below Sleep Target',
        message: `At ${data.avgDuration.toFixed(
          1,
        )} hours average, you're missing ~${(
          TARGET_SLEEP_HOURS - data.avgDuration
        ).toFixed(1)} hours per night.`,
        action: 'Aim for 30-60 minutes more sleep',
      });
    } else if (data.avgDuration >= TARGET_SLEEP_HOURS) {
      recs.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Excellent Sleep Duration',
        message: `You're meeting your sleep goals at ${data.avgDuration.toFixed(
          1,
        )} hours average. Keep it up!`,
        action: 'Maintain this schedule',
      });
    }

    if (data.bedtimeStdDev > 60) {
      recs.push({
        type: 'warning',
        icon: Clock,
        title: 'Inconsistent Bedtime',
        message: `Your bedtime varies by ±${Math.round(
          data.bedtimeStdDev,
        )} minutes. Irregular sleep schedules reduce sleep quality.`,
        action: 'Set a consistent bedtime within 30 min window',
      });
    } else if (data.bedtimeStdDev < 30) {
      recs.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Great Consistency',
        message: `Your bedtime only varies by ±${Math.round(
          data.bedtimeStdDev,
        )} minutes. Excellent routine!`,
        action: 'Keep maintaining this consistency',
      });
    }

    if (data.totalDebt > 5) {
      recs.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Significant Sleep Debt',
        message: `You have ${Math.abs(
          data.totalDebt,
        ).toFixed(1)} hours of sleep debt. This impacts cognitive function and health.`,
        action: 'Add 1-2 hours of catch-up sleep this weekend',
      });
    } else if (data.totalDebt < -2) {
      recs.push({
        type: 'info',
        icon: Zap,
        title: 'Sleep Surplus',
        message: `You're sleeping ${Math.abs(
          data.totalDebt,
        ).toFixed(1)} hours more than your target. Feeling well-rested?`,
        action: 'Monitor for oversleeping patterns',
      });
    }

    if (Math.abs(data.weekdayAvg - data.weekendAvg) > 1.5) {
      recs.push({
        type: 'warning',
        icon: Calendar,
        title: 'Weekend Sleep Catch-Up Pattern',
        message: `You sleep ${Math.abs(
          data.weekdayAvg - data.weekendAvg,
        ).toFixed(1)} hours ${
          data.weekendAvg > data.weekdayAvg ? 'more' : 'less'
        } on weekends. This disrupts your circadian rhythm.`,
        action: 'Aim for consistent sleep 7 days/week',
      });
    }

    if (data.optimalBedtimes < 50) {
      recs.push({
        type: 'info',
        icon: Moon,
        title: 'Optimize Bedtime Window',
        message: `Only ${data.optimalBedtimes}% of your bedtimes are in the optimal 10-11 PM window. Earlier sleep improves quality.`,
        action: 'Try going to bed between 10-11 PM',
      });
    }

    if (data.trend === 'improving') {
      recs.push({
        type: 'success',
        icon: TrendingUp,
        title: 'Positive Trend Detected',
        message: 'Your sleep duration is improving over time. Great progress!',
        action: 'Keep up the momentum',
      });
    } else if (data.trend === 'declining') {
      recs.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Declining Sleep Pattern',
        message:
          'Your sleep duration has decreased recently. Address this before it becomes chronic.',
        action: 'Review what changed in your routine',
      });
    }

    setRecommendations(recs);
  }

  const getQualityColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
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
        <h2 className="text-2xl font-bold text-slate-900">Sleep Insights</h2>

        <div className="flex gap-2 bg-white/80 border border-[#BCE1F0] rounded-xl p-1">
          <button
            onClick={() => setPeriod('7')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === '7'
                ? 'bg-[#8488C2] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#E0EDFB]'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPeriod('30')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === '30'
                ? 'bg-[#8488C2] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#E0EDFB]'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === 'all'
                ? 'bg-[#8488C2] text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-[#E0EDFB]'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-white/80 border border-[#BCE1F0] rounded-2xl p-12">
          <div className="text-center">
            <Calendar size={64} className="mx-auto mb-4 text-slate-400" />
            <h3 className="text-2xl font-bold mb-2 text-slate-900">
              No Sleep Data Yet
            </h3>
            <p className="text-slate-600 mb-6">
              Start tracking your sleep to unlock personalized insights and recommendations.
            </p>
            <a
              href="/tracker"
              className="inline-block px-6 py-3 bg-[#8488C2] hover:bg-[#7378b5] text-white rounded-xl font-medium transition-colors"
            >
              Go to Sleep Tracker
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Sleep Quality Score - Hero Card */}
          <div className="bg-gradient-to-br from-[#BCE1F0] to-[#E9D5FF] border border-[#BCE1F0] rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-white/70 flex items-center justify-center shadow-md">
                  <Brain
                    size={48}
                    className={getQualityColor(stats.qualityScore)}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-600 mb-1">
                    Sleep Quality Score
                  </h3>
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-6xl font-bold ${getQualityColor(
                        stats.qualityScore,
                      )}`}
                    >
                      {stats.qualityScore}
                    </span>
                    <span className="text-2xl text-slate-500">/100</span>
                  </div>
                  <p
                    className={`text-lg font-semibold mt-2 ${getQualityColor(
                      stats.qualityScore,
                    )}`}
                  >
                    {getQualityLabel(stats.qualityScore)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white/80 rounded-xl p-4 border border-[#BCE1F0]">
                  <div className="text-2xl font-bold text-slate-900">
                    {stats.streak}
                  </div>
                  <div className="text-xs text-slate-600">Day Streak</div>
                </div>
                <div className="bg-white/80 rounded-xl p-4 border border-[#BCE1F0]">
                  <div
                    className={`text-2xl font-bold ${
                      stats.sleepDebt > 0 ? 'text-red-500' : 'text-green-600'
                    }`}
                  >
                    {stats.sleepDebt > 0 ? '-' : '+'}
                    {Math.abs(stats.sleepDebt)}h
                  </div>
                  <div className="text-xs text-slate-600">
                    Sleep {stats.sleepDebt > 0 ? 'Debt' : 'Surplus'}
                  </div>
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
              subtext={
                stats.consistency < 30
                  ? 'Excellent'
                  : stats.consistency < 60
                  ? 'Good'
                  : 'Needs work'
              }
              color="blue"
            />
            <StatCard
              icon={Sun}
              title="Wake Consistency"
              value={`±${stats.wakeConsistency} min`}
              subtext={
                stats.wakeConsistency < 30
                  ? 'Excellent'
                  : stats.wakeConsistency < 60
                  ? 'Good'
                  : 'Needs work'
              }
              color="green"
            />
          </div>

          {/* Sleep Duration Chart */}
          <div className="bg-white/80 border border-[#BCE1F0] rounded-2xl p-6">
            <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-slate-900">
              <Activity className="text-[#8488C2]" size={20} />
              Sleep Duration Trend
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#8488C2"
                        stopOpacity={0.5}
                      />
                      <stop
                        offset="95%"
                        stopColor="#8488C2"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 12]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#BCE1F0',
                      color: '#0f172a',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                    formatter={(value, name, props) => [
                      `${value} hrs (${props.payload.bedtimeFormatted} - ${props.payload.wakeTimeFormatted})`,
                      'Duration',
                    ]}
                  />
                  <ReferenceLine
                    y={TARGET_SLEEP_HOURS}
                    stroke="#4f46e5"
                    strokeDasharray="5 5"
                    label={{
                      value: `Target: ${TARGET_SLEEP_HOURS}h`,
                      position: 'right',
                      fill: '#4f46e5',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#8488C2"
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
              <div className="bg-white/80 border border-[#BCE1F0] rounded-2xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-slate-900">
                  <Calendar className="text-[#4f46e5]" size={20} />
                  Weekday vs Weekend
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">
                        Weekday Average
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {stats.weekdayAvg} hrs
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-[#4f46e5] h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (parseFloat(stats.weekdayAvg) / 12) * 100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">
                        Weekend Average
                      </span>
                      <span className="text-lg font-bold text-slate-900">
                        {stats.weekendAvg} hrs
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-[#a855f7] h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (parseFloat(stats.weekendAvg) / 12) * 100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#E5EDF9]">
                    <p className="text-sm text-slate-700">
                      Difference:{' '}
                      <span className="font-bold text-slate-900">
                        {Math.abs(
                          stats.weekdayAvg - stats.weekendAvg,
                        ).toFixed(1)}{' '}
                        hrs
                      </span>
                      {Math.abs(stats.weekdayAvg - stats.weekendAvg) > 1.5 && (
                        <span className="text-yellow-600 ml-2">
                          ⚠️ High variance
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 border border-[#BCE1F0] rounded-2xl p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-slate-900">
                  <Clock className="text-[#8488C2]" size={20} />
                  Sleep Schedule
                </h3>
                <div className="space-y-4">
                  <div className="bg-[#F3F7FE] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">
                        Average Bedtime
                      </span>
                      <Moon size={16} className="text-[#8488C2]" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.avgBedtime}
                    </p>
                  </div>
                  <div className="bg-[#F3F7FE] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">
                        Average Wake Time
                      </span>
                      <Sun size={16} className="text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats.avgWakeTime}
                    </p>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Optimal bedtimes</span>
                      <span className="font-bold text-slate-900">
                        {stats.optimalBedtimes}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(stats.optimalBedtimes, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Smart Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-white/80 border border-[#BCE1F0] rounded-2xl p-6">
              <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-slate-900">
                <Brain className="text-[#a855f7]" size={20} />
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
    indigo: 'from-[#C7D2FE] to-[#E0EAFF] border-indigo-200',
    purple: 'from-[#E9D5FF] to-[#F5EBFF] border-purple-200',
    blue: 'from-[#BFDBFE] to-[#DBEAFE] border-blue-200',
    green: 'from-[#BBF7D0] to-[#DCFCE7] border-green-200',
  };

  const getTrendIcon = () => {
    if (trend === 'improving')
      return <TrendingUp size={16} className="text-green-600" />;
    if (trend === 'declining')
      return (
        <TrendingUp size={16} className="text-red-500 rotate-180" />
      );
    return null;
  };

  return (
    <div
      className={`bg-gradient-to-br ${
        colorClasses[color]
      } border rounded-2xl p-6 relative overflow-hidden`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-white/70 rounded-xl flex items-center justify-center">
          <Icon size={20} className="text-[#4A5A8A]" />
        </div>
        <div className="text-slate-600 text-sm font-medium flex-1">
          {title}
        </div>
        {trend && getTrendIcon()}
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      {subtext && (
        <div className="text-xs text-slate-600">{subtext}</div>
      )}
    </div>
  );
}

function RecommendationCard({ type, icon: Icon, title, message, action }) {
  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const iconStyles = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
    info: 'text-blue-500',
  };

  return (
    <div className={`${typeStyles[type]} border rounded-xl p-4`}>
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <Icon size={24} className={iconStyles[type]} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm mb-2 text-slate-700">{message}</p>
          <div className="inline-flex items-center gap-2 text-xs font-medium bg-white/70 px-3 py-1.5 rounded-lg text-slate-900">
            <Target size={12} />
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
