// src/pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, Navigate } from 'react-router-dom';
import { Moon, ArrowRight, Mail, Lock, ArrowLeft, X, CheckCircle } from 'lucide-react';
import ZenPsychLogo from '../assets/ZenPsych.png';

export default function Login() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      setResetSent(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSent(false);
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700 flex items-center gap-2">
                <Lock size={16} /> Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs text-[#8488C2] hover:text-[#7378b5] hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              required
              className="w-full bg-white/70 border border-[#8488C2]/40 rounded-lg p-3 focus:outline-none focus:border-[#8488C2] focus:ring-2 focus:ring-[#BCE1F0] transition-colors text-slate-900 placeholder:text-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-[#BCE1F0]">
            <button
              onClick={closeForgotPasswordModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X size={20} />
            </button>

            {!resetSent ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-[#BCE1F0] rounded-full mx-auto flex items-center justify-center mb-4">
                    <Lock className="text-[#8488C2]" size={28} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    Reset Password
                  </h2>
                  <p className="text-slate-600 text-sm">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                      <Mail size={16} /> Email Address
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 focus:outline-none focus:border-[#8488C2] focus:ring-2 focus:ring-[#BCE1F0] transition-colors text-slate-900 placeholder:text-slate-400"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-[#8488C2] hover:bg-[#7378b5] text-white font-semibold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>

                  <button
                    type="button"
                    onClick={closeForgotPasswordModal}
                    className="w-full text-slate-600 hover:text-slate-900 font-medium py-2 transition-colors"
                  >
                    Cancel
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
                  <CheckCircle className="text-green-600" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Check Your Email
                </h2>
                <p className="text-slate-600 mb-6">
                  We've sent a password reset link to <strong>{resetEmail}</strong>
                </p>
                <p className="text-sm text-slate-500 mb-6">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
                <button
                  onClick={closeForgotPasswordModal}
                  className="w-full bg-[#8488C2] hover:bg-[#7378b5] text-white font-semibold py-3 rounded-lg transition-all"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
