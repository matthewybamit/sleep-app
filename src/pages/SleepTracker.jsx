// src/pages/SleepTracker.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format, subDays, differenceInHours, addDays } from 'date-fns';
import { Moon, Calendar, ChevronDown, ChevronUp, Clock, Bell, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'sleepTracker_sleepStart';
const MAX_SLEEP_HOURS = 10;

export default function SleepTracker() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [sleepStart, setSleepStart] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState('');
  const [notificationPermission, setNotificationPermission] = useState('default');

  const maxDateTime = new Date().toISOString().slice(0, 16);

  useEffect(() => {
    const savedSleepStart = localStorage.getItem(STORAGE_KEY);
    if (savedSleepStart) {
      setSleepStart(savedSleepStart);
    }

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    }

    fetchLogs();
  }, []);

  useEffect(() => {
    if (!sleepStart) return;

    const checkSleepDuration = () => {
      const sleepStartTime = new Date(sleepStart);
      const now = new Date();
      const hoursSleeping = differenceInHours(now, sleepStartTime);

      if (hoursSleeping >= MAX_SLEEP_HOURS) {
        sendWakeUpNotification(hoursSleeping);
      }
    };

    checkSleepDuration();
    const interval = setInterval(checkSleepDuration, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [sleepStart]);

  function sendWakeUpNotification(hours) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Time to Wake Up? 🌅', {
        body: `You've been sleeping for ${hours} hours. Don't forget to log your wake time!`,
        icon: '/moon-icon.png',
        tag: 'sleep-reminder',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  async function fetchLogs() {
    const { data } = await supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('sleep_start', { ascending: false });
    if (data) setLogs(data);
  }

  function handleGoToSleep() {
    const now = new Date();
    const timestamp = now.toISOString();
    setSleepStart(timestamp);
    localStorage.setItem(STORAGE_KEY, timestamp);
  }

  async function handleWakeUp() {
    if (!sleepStart) return;
    const now = new Date();

    const { error } = await supabase.from('sleep_logs').insert({
      user_id: user.id,
      sleep_start: sleepStart,
      sleep_end: now.toISOString(),
    });

    if (!error) {
      setSleepStart(null);
      localStorage.removeItem(STORAGE_KEY);
      fetchLogs();
    }
  }

  function cancelSleep() {
    setSleepStart(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  function fillLastNight() {
    const now = new Date();
    const yesterday = subDays(now, 1);

    const bedtime = new Date(yesterday);
    bedtime.setHours(22, 0, 0, 0);

    const wakeTime = new Date(now);
    wakeTime.setHours(6, 0, 0, 0);

    setStart(bedtime.toISOString().slice(0, 16));
    setEnd(wakeTime.toISOString().slice(0, 16));
    setError('');
  }

  function fillYesterday() {
    const yesterday = subDays(new Date(), 1);
    const twoDaysAgo = subDays(new Date(), 2);

    const bedtime = new Date(twoDaysAgo);
    bedtime.setHours(22, 0, 0, 0);

    const wakeTime = new Date(yesterday);
    wakeTime.setHours(6, 0, 0, 0);

    setStart(bedtime.toISOString().slice(0, 16));
    setEnd(wakeTime.toISOString().slice(0, 16));
    setError('');
  }

  function calculateManualDuration(startTime, endTime) {
    if (!startTime || !endTime) return '';

    let start = new Date(startTime);
    let end = new Date(endTime);

    if (end <= start) {
      end = addDays(end, 1);
    }

    const diffMs = end - start;

    if (diffMs <= 0) return 'Invalid duration';
    if (diffMs > 24 * 60 * 60 * 1000) return 'Too long (>24h)';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours} hr ${minutes} min`;
  }

  function calculateCurrentSleepDuration() {
    if (!sleepStart) return '';
    const start = new Date(sleepStart);
    const now = new Date();
    const diffMs = now - start;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  async function handleManualSave() {
    setError('');

    if (!start || !end) {
      setError('Please fill in both bedtime and wake time');
      return;
    }

    let startTime = new Date(start);
    let endTime = new Date(end);
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    if (endTime <= startTime) {
      endTime = addDays(endTime, 1);
      setEnd(endTime.toISOString().slice(0, 16));
    }

    if (endTime <= startTime) {
      setError('Wake time must be after bedtime (even after auto-correction)');
      return;
    }

    if (startTime > now) {
      setError('Cannot log future sleep');
      return;
    }

    if (endTime > now) {
      setError('Wake time cannot be in the future');
      return;
    }

    if (startTime < sevenDaysAgo) {
      setError('Can only log sleep from the past 7 days');
      return;
    }

    const duration = (endTime - startTime) / (1000 * 60);
    if (duration > 24 * 60) {
      setError('Sleep duration cannot exceed 24 hours');
      return;
    }

    if (duration < 10) {
      setError('Sleep duration must be at least 10 minutes');
      return;
    }

    const { error: dbError } = await supabase.from('sleep_logs').insert({
      user_id: user.id,
      sleep_start: startTime.toISOString(),
      sleep_end: endTime.toISOString(),
    });

    if (!dbError) {
      fetchLogs();
      setStart('');
      setEnd('');
      setShowManual(false);
      setError('');
    } else {
      setError('Failed to save sleep log');
    }
  }

  async function deleteLog(logId) {
    if (!confirm('Delete this sleep log?')) return;

    const { error } = await supabase
      .from('sleep_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', user.id);

    if (!error) {
      fetchLogs();
    }
  }

  function formatDuration(minutes) {
    if (!minutes) return '0 hr 0 min';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours} hr ${mins} min`;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Notification Permission Banner */}
      {notificationPermission === 'default' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
          <Bell className="text-yellow-500 flex-shrink-0 mt-1" size={20} />
          <div className="flex-1">
            <p className="text-sm text-slate-700 mb-2">
              Enable notifications to get reminded if you forget to log your wake time.
            </p>
            <button
              onClick={() => {
                Notification.requestPermission().then((permission) => {
                  setNotificationPermission(permission);
                });
              }}
              className="px-4 py-2 bg-yellow-500 text-white hover:bg-yellow-600 rounded-lg text-sm transition-colors"
            >
              Enable Notifications
            </button>
          </div>
        </div>
      )}

      {/* Quick Log Section */}
      <div className="bg-gradient-to-br from-[#BCE1F0] to-[#E9D5FF] border border-[#BCE1F0] rounded-2xl p-8 shadow-md">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-slate-900">
          <Moon className="text-[#8488C2]" size={28} />
          Quick Sleep Log
        </h2>

        {!sleepStart ? (
          <div className="text-center">
            <p className="text-slate-700 mb-6">
              Track your sleep in real-time and keep your routine consistent.
            </p>
            <button
              onClick={handleGoToSleep}
              className="px-8 py-4 bg-[#8488C2] hover:bg-[#7378b5] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#8488C2]/40 flex items-center gap-3 mx-auto"
            >
              <Moon size={20} />
              Go To Sleep Now
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-full mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-700">Currently Sleeping</span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-slate-600 text-sm mb-2">Sleep started at</p>
              <p className="text-2xl font-bold text-slate-900">
                {format(new Date(sleepStart), 'h:mm a')}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {format(new Date(sleepStart), 'MMM d, yyyy')}
              </p>
              <p className="text-[#4A5A8A] text-lg font-semibold mt-3">
                Duration: {calculateCurrentSleepDuration()}
              </p>
            </div>

            <button
              onClick={handleWakeUp}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-400/40 flex items-center gap-3 mx-auto mb-3"
            >
              <Clock size={20} />
              Wake Up Now
            </button>

            <button
              onClick={cancelSleep}
              className="text-slate-500 hover:text-slate-800 text-sm transition-colors"
            >
              Cancel Sleep Session
            </button>
          </div>
        )}
      </div>

      {/* Manual Entry Toggle */}
      <div className="bg-white/80 border border-[#BCE1F0] rounded-2xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowManual(!showManual)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#F3F7FE] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#8488C2]" />
            <span className="font-medium text-slate-900">
              Log Past Sleep Manually
            </span>
          </div>
          {showManual ? (
            <ChevronUp size={20} className="text-slate-500" />
          ) : (
            <ChevronDown size={20} className="text-slate-500" />
          )}
        </button>

        {showManual && (
          <div className="p-6 border-t border-[#E0EDFB]">
            <div className="bg-[#DBEAFE] border border-[#BFDBFE] rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-700">
                💡 <strong>Tip:</strong> If you wake up on a different day than you
                slept, the system will automatically adjust the date for you.
              </p>
            </div>

            {/* Quick Fill Buttons */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={fillLastNight}
                className="px-4 py-2 bg-white hover:bg-[#F3F7FE] border border-[#E0EDFB] rounded-lg text-sm transition-colors text-slate-800"
              >
                Last Night
              </button>
              <button
                onClick={fillYesterday}
                className="px-4 py-2 bg-white hover:bg-[#F3F7FE] border border-[#E0EDFB] rounded-lg text-sm transition-colors text-slate-800"
              >
                Night Before
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Bedtime Input */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2 flex items-center gap-2">
                  <Moon size={16} className="text-[#8488C2]" />
                  Bedtime
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-white border border-[#E0EDFB] rounded-lg p-3 text-slate-900 focus:border-[#8488C2] focus:outline-none transition-colors"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  max={maxDateTime}
                />
                <p className="text-xs text-slate-500 mt-1">
                  When you went to bed
                </p>
              </div>

              {/* Wake Time Input */}
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-2 flex items-center gap-2">
                  <Clock size={16} className="text-emerald-500" />
                  Wake Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-white border border-[#E0EDFB] rounded-lg p-3 text-slate-900 focus:border-[#8488C2] focus:outline-none transition-colors"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  max={maxDateTime}
                />
                <p className="text-xs text-slate-500 mt-1">
                  When you woke up (date will auto-adjust if needed)
                </p>
              </div>

              {/* Duration Preview */}
              {start && end && (
                <div className="bg-[#E0EDFB] border border-[#BFDBFE] rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">
                      Sleep Duration:
                    </span>
                    <span className="text-lg font-bold text-[#4A5A8A]">
                      {calculateManualDuration(start, end)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleManualSave}
              disabled={!start || !end}
              className="bg-[#8488C2] hover:bg-[#7378b5] disabled:bg-slate-300 disabled:text-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full"
            >
              Save Sleep Record
            </button>
          </div>
        )}
      </div>

      {/* Recent History */}
      <div>
        <h3 className="text-xl font-bold mb-4 text-slate-900">Recent History</h3>
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white/80 border border-[#E0EDFB] p-4 rounded-xl flex justify-between items-center hover:bg-white transition-colors group"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#F3F7FE] flex items-center justify-center">
                  <Calendar size={18} className="text-[#8488C2]" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {format(new Date(log.sleep_start), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-slate-600">
                    {format(new Date(log.sleep_start), 'h:mm a')} →{' '}
                    {format(new Date(log.sleep_end), 'h:mm a')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-bold text-[#4A5A8A]">
                    {formatDuration(log.duration_minutes)}
                  </div>
                  <div className="text-xs text-slate-500">Duration</div>
                </div>
                <button
                  onClick={() => deleteLog(log.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete log"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-slate-500 text-center py-12 text-lg">
              No logs yet. Sweet dreams! 😴
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
