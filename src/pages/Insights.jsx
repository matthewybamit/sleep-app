import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Calendar, TrendingUp, Award } from 'lucide-react';

const TARGET_SLEEP_HOURS = 7.5;

export default function Insights() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('7'); // '7', '30', 'all'
  const [consistency, setConsistency] = useState(0);

  useEffect(() => {
    getData();
  }, [period]);

  async function getData() {
    let query = supabase
      .from('sleep_logs')
      .select('sleep_start, sleep_end, duration_minutes')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: true });

    if (period === '7') {
      query = query.limit(7);
    } else if (period === '30') {
      query = query.limit(30);
    }
    // 'all' = no limit

    const { data: logs } = await query;
    
    if (logs && logs.length > 0) {
      const formatted = logs.map(log => ({
        day: new Date(log.sleep_start).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        hours: parseFloat((log.duration_minutes / 60).toFixed(1)),
        time: new Date(log.sleep_start).getHours() + new Date(log.sleep_start).getMinutes() / 60
      }));
      setData(formatted);

      // Calculate bedtime consistency (standard deviation of sleep times)
      const times = formatted.map(d => d.time);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      setConsistency(stdDev * 60); // Convert to minutes
    } else {
      setData([]);
      setConsistency(0);
    }
  }

  const avgDuration = data.length ? (data.reduce((a, b) => a + b.hours, 0) / data.length).toFixed(1) : 0;
  const bestNight = data.length ? Math.max(...data.map(d => d.hours)).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Sleep Insights</h2>
        
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setPeriod('7')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === '7'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPeriod('30')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === '30'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
          <Calendar className="text-indigo-400" size={20} />
          Sleep Duration
        </h3>
        {data.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
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
                    borderRadius: '8px'
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  formatter={(value) => [`${value} hrs`, 'Duration']}
                />
                <ReferenceLine
                  y={TARGET_SLEEP_HOURS}
                  stroke="#6366f1"
                  strokeDasharray="5 5"
                  label={{
                    value: 'Target',
                    position: 'right',
                    fill: '#6366f1',
                    fontSize: 12
                  }}
                />
                <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.hours >= TARGET_SLEEP_HOURS ? '#6366f1' : '#e2e8f0'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex flex-col items-center justify-center">
            <div className="text-slate-500 text-center">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-xl font-medium mb-2">No Sleep Data Yet</p>
              <p className="text-sm">Start tracking your sleep to see insights here</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatCard
          icon={TrendingUp}
          title="Avg Duration"
          value={avgDuration ? `${avgDuration} hrs` : '--'}
          color="indigo"
        />
        <StatCard
          icon={Award}
          title="Best Night"
          value={bestNight ? `${bestNight} hrs` : '--'}
          color="purple"
        />
        <StatCard
          icon={Calendar}
          title="Bedtime Consistency"
          value={consistency ? `±${Math.round(consistency)} min` : '--'}
          subtext="Avg variation"
          color="green"
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtext, color = 'indigo' }) {
  const colorClasses = {
    indigo: 'from-indigo-600/20 to-indigo-600/5 border-indigo-500/30',
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/30',
    green: 'from-green-600/20 to-green-600/5 border-green-500/30'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-6`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
          <Icon size={20} className="text-white" />
        </div>
        <div className="text-slate-400 text-sm font-medium">{title}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {subtext && <div className="text-xs text-slate-400 mt-1">{subtext}</div>}
    </div>
  );
}
