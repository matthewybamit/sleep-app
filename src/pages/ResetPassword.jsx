// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import ZenPsychLogo from '../assets/ZenPsych.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isValidRecovery, setIsValidRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if this is a valid password reset session
    const checkRecoverySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // Check if this is specifically a recovery session
        // Password reset links have a special token type
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        
        if (type === 'recovery' && session) {
          setIsValidRecovery(true);
        } else {
          // Not a valid recovery session, redirect to login
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Error checking recovery session:', err);
        navigate('/login', { replace: true });
      } finally {
        setChecking(false);
      }
    };

    checkRecoverySession();
  }, [navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking recovery session
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#BCE1F0] to-[#8488C2]">
        <div className="bg-white/10 backdrop-blur-lg border border-[#8488C2]/40 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#8488C2] border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#BCE1F0] to-[#8488C2]">
        <div className="bg-white/10 backdrop-blur-lg border border-[#8488C2]/40 p-8 rounded-2xl w-full max-w-md shadow-2xl text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-slate-900">
            Password Reset Successful!
          </h1>
          <p className="text-slate-600 mb-6">
            Your password has been updated. Redirecting to login...
          </p>
          <div className="animate-pulse text-[#8488C2]">●●●</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#BCE1F0] to-[#8488C2]">
      <div className="bg-white/10 backdrop-blur-lg border border-[#8488C2]/40 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4">
            <img
              src={ZenPsychLogo}
              alt="ZenPsych Logo"
              className="h-20 w-auto mx-auto drop-shadow-xl"
            />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-slate-900">
            Create New Password
          </h1>
          <p className="text-slate-600">
            Enter your new password below.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Lock size={16} /> New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full bg-white/70 border border-[#8488C2]/40 rounded-lg p-3 focus:outline-none focus:border-[#8488C2] focus:ring-2 focus:ring-[#BCE1F0] transition-colors text-slate-900 placeholder:text-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
              <Lock size={16} /> Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full bg-white/70 border border-[#8488C2]/40 rounded-lg p-3 focus:outline-none focus:border-[#8488C2] focus:ring-2 focus:ring-[#BCE1F0] transition-colors text-slate-900 placeholder:text-slate-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8488C2] hover:bg-[#7378b5] text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-[#8488C2]/35 disabled:opacity-50 flex items-center justify-center gap-2 group"
          >
            {loading ? (
              'Updating...'
            ) : (
              <>
                Reset Password
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
