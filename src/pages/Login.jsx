import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, Navigate } from 'react-router-dom';
import { Moon, ArrowRight, Mail, Lock, ArrowLeft } from 'lucide-react';
// 1. Import the logo asset
import ZenPsychLogo from '../assets/ZenPsych.png';

export default function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Redirect authenticated users to dashboard
  if (user) return <Navigate to="/dashboard" replace />;
return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#BCE1F0] to-[#8488C2]">
      <div className="bg-white/10 backdrop-blur-lg border border-[#8488C2]/40 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-[#8488C2] mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            <img
              src={ZenPsychLogo}
              alt="ZenPsych Logo"
              className="h-20 w-auto mx-auto drop-shadow-xl"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-slate-900">
            Welcome Back
          </h1>
          <p className="text-slate-600">
            Track your sleep, build better habits.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Mail size={16} /> Email
            </label>
            <input
              type="email"
              required
              className="w-full bg-white/70 border border-[#8488C2]/40 rounded-lg p-3 focus:outline-none focus:border-[#8488C2] focus:ring-2 focus:ring-[#BCE1F0] transition-colors text-slate-900 placeholder:text-slate-400"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Lock size={16} /> Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-white/70 border border-[#8488C2]/40 rounded-lg p-3 focus:outline-none focus:border-[#8488C2] focus:ring-2 focus:ring-[#BCE1F0] transition-colors text-slate-900 placeholder:text-slate-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <button
            disabled={loading}
            className="w-full bg-[#8488C2] hover:bg-[#7378b5] text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-[#8488C2]/35 disabled:opacity-50 flex items-center justify-center gap-2 group"
          >
            {loading ? (
              'Signing In...'
            ) : (
              <>
                Sign In
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-600">
          Don't have an account?
          <Link
            to="/register"
            className="text-[#8488C2] ml-2 hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}