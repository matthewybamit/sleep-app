import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { format, subDays, differenceInHours } from 'date-fns';
import { Moon, Calendar, ChevronDown, ChevronUp, Clock, Bell } from 'lucide-react';

const STORAGE_KEY = 'sleepTracker_sleepStart';
const MAX_SLEEP_HOURS = 10; // Alert after 10 hours

export default function SleepTracker() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [sleepStart, setSleepStart] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState('');
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Max date is now (can't log future sleep)
  const maxDateTime = new Date().toISOString().slice(0, 16);

  // Load sleep state from localStorage on mount
  useEffect(() => {
    const savedSleepStart = localStorage.getItem(STORAGE_KEY);
    if (savedSleepStart) {
      setSleepStart(savedSleepStart);
    }

    // Request notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    fetchLogs();
  }, []);

  // Monitor sleep duration and send notification if too long
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

    // Check immediately
    checkSleepDuration();

    // Check every 30 minutes
    const interval = setInterval(checkSleepDuration, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [sleepStart]);

  function sendWakeUpNotification(hours) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Time to Wake Up? 🌅', {
        body: `You've been sleeping for ${hours} hours. Don't forget to log your wake time!`,
        icon: '/moon-icon.png', // Add your app icon path
        tag: 'sleep-reminder',
        requireInteraction: true
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
    // Save to localStorage for persistence
    localStorage.setItem(STORAGE_KEY, timestamp);
  }

  async function handleWakeUp() {
    if (!sleepStart) return;
    const now = new Date();

    const { error } = await supabase.from('sleep_logs').insert({
      user_id: user.id,
      sleep_start: sleepStart,
      sleep_end: now.toISOString()
    });

    if (!error) {
      setSleepStart(null);
      // Clear from localStorage
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

    // Default: sleep at 10 PM yesterday, wake at 6 AM today
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

    // Default: sleep at 10 PM, wake at 6 AM (next day)
    const bedtime = new Date(yesterday);
    bedtime.setHours(22, 0, 0, 0);

    const wakeTime = new Date(yesterday);
    wakeTime.setHours(6, 0, 0, 0);
    wakeTime.setDate(wakeTime.getDate() + 1);

    setStart(bedtime.toISOString().slice(0, 16));
    setEnd(wakeTime.toISOString().slice(0, 16));
    setError('');
  }

  function calculateManualDuration(startTime, endTime) {
    if (!startTime || !endTime) return '';

    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;

    if (diffMs <= 0) return 'Invalid duration';

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

    const startTime = new Date(start);
    const endTime = new Date(end);
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    // Validation
    if (endTime <= startTime) {
      setError('Wake time must be after bedtime');
      return;
    }

    if (startTime > now) {
      setError('Cannot log future sleep');
      return;
    }

    if (startTime < sevenDaysAgo) {
      setError('Can only log sleep from the past 7 days');
      return;
    }

    const duration = (endTime - startTime) / (1000 * 60); // in minutes
    if (duration > 24 * 60) {
      setError('Sleep duration cannot exceed 24 hours');
      return;
    }

    const { error: dbError } = await supabase.from('sleep_logs').insert({
      user_id: user.id,
      sleep_start: startTime.toISOString(),
      sleep_end: endTime.toISOString()
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
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-start gap-3">
          <Bell className="text-yellow-400 flex-shrink-0 mt-1" size={20} />
          <div className="flex-1">
            <p className="text-sm text-slate-300 mb-2">
              Enable notifications to get reminded if you forget to log your wake time
            </p>
            <button
              onClick={() => {
                Notification.requestPermission().then(permission => {
                  setNotificationPermission(permission);
                });
              }}
              className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-lg text-sm transition-colors"
            >
              Enable Notifications
            </button>
          </div>
        </div>
      )}

      {/* Quick Log Section */}
      <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Moon className="text-indigo-400" size={28} />
          Quick Sleep Log
        </h2>

        {!sleepStart ? (
          <div className="text-center">
            <p className="text-slate-300 mb-6">Track your sleep in real-time</p>
            <button
              onClick={handleGoToSleep}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/30 flex items-center gap-3 mx-auto"
            >
              <Moon size={20} />
              Go To Sleep Now
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-full mb-4">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-300">Currently Sleeping</span>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-slate-400 text-sm mb-2">Sleep started at</p>
              <p className="text-2xl font-bold text-white">
                {format(new Date(sleepStart), 'h:mm a')}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {format(new Date(sleepStart), 'MMM d, yyyy')}
              </p>
              <p className="text-indigo-300 text-lg font-semibold mt-3">
                Duration: {calculateCurrentSleepDuration()}
              </p>
            </div>

            <button
              onClick={handleWakeUp}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/30 flex items-center gap-3 mx-auto mb-3"
            >
              <Clock size={20} />
              Wake Up Now
            </button>

            <button
              onClick={cancelSleep}
              className="text-slate-400 hover:text-white text-sm transition-colors"
            >
              Cancel Sleep Session
            </button>
          </div>
        )}
      </div>

      {/* Manual Entry Toggle */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowManual(!showManual)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-indigo-400" />
            <span className="font-medium text-slate-300">Log Past Sleep Manually</span>
          </div>
          {showManual ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showManual && (
          <div className="p-6 border-t border-white/10">
            <p className="text-sm text-slate-400 mb-4">
              Forgot to track? Log your sleep from the past 7 days.
            </p>

            {/* Quick Fill Buttons */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={fillLastNight}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
              >
                Last Night
              </button>
              <button
                onClick={fillYesterday}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
              >
                Night Before
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Bedtime Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Moon size={16} className="text-indigo-400" />
                  Bedtime
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white [color-scheme:dark] focus:border-indigo-500 focus:outline-none transition-colors"
                  value={start}
                  onChange={e => setStart(e.target.value)}
                  max={maxDateTime}
                />
                <p className="text-xs text-slate-500 mt-1">When you went to bed</p>
              </div>

              {/* Wake Time Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Clock size={16} className="text-green-400" />
                  Wake Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-slate-800 border border-white/10 rounded-lg p-3 text-white [color-scheme:dark] focus:border-indigo-500 focus:outline-none transition-colors"
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                  min={start}
                  max={maxDateTime}
                />
                <p className="text-xs text-slate-500 mt-1">When you woke up</p>
              </div>

              {/* Duration Preview */}
              {start && end && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">Sleep Duration:</span>
                    <span className="text-lg font-bold text-indigo-300">
                      {calculateManualDuration(start, end)}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleManualSave}
              disabled={!start || !end}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full"
            >
              Save Sleep Record
            </button>
          </div>
        )}
      </div>

      {/* Recent History */}
      <div>
        <h3 className="text-xl font-bold mb-4">Recent History</h3>
        <div className="space-y-3">
          {logs.map(log => (
            <div
              key={log.id}
              className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                  <Calendar size={18} className="text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium">{format(new Date(log.sleep_start), 'MMM d, yyyy')}</p>
                  <p className="text-sm text-slate-400">
                    {format(new Date(log.sleep_start), 'h:mm a')} - {format(new Date(log.sleep_end), 'h:mm a')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-indigo-300">
                  {formatDuration(log.duration_minutes)}
                </div>
                <div className="text-xs text-slate-500">Duration</div>
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