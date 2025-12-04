// src/pages/Register.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Moon, ArrowRight, User, Mail, Lock, Calendar } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    age: '',
    sex: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            age: parseInt(formData.age),
            sex: formData.sex
          })
          .eq('id', data.user.id);

        if (profileError) console.error('Profile update error:', profileError);
      }

      alert('Account created successfully! Please check your email to verify your account.');
      navigate('/');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/40">
            <Moon size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-slate-400">Start your journey to better sleep</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
              <User size={16} /> Full Name
            </label>
            <input 
              type="text" 
              name="fullName"
              required 
              className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-indigo-500 transition-colors" 
              value={formData.fullName} 
              onChange={handleChange}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
              <Mail size={16} /> Email
            </label>
            <input 
              type="email" 
              name="email"
              required 
              className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-indigo-500 transition-colors" 
              value={formData.email} 
              onChange={handleChange}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
              <Lock size={16} /> Password
            </label>
            <input 
              type="password" 
              name="password"
              required 
              minLength={6}
              className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-indigo-500 transition-colors" 
              value={formData.password} 
              onChange={handleChange}
              placeholder="At least 6 characters"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                <Calendar size={16} /> Age
              </label>
              <input 
                type="number" 
                name="age"
                required 
                min="1"
                max="120"
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-indigo-500 transition-colors" 
                value={formData.age} 
                onChange={handleChange}
                placeholder="25"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Sex</label>
              <select 
                name="sex"
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 focus:outline-none focus:border-indigo-500 transition-colors text-white"
                value={formData.sex}
                onChange={handleChange}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <button 
            disabled={loading} 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 flex items-center justify-center gap-2 group"
          >
            {loading ? 'Creating Account...' : (
              <>
                Create Account
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-400">
          Already have an account?
          <Link to="/Login" className="text-indigo-400 ml-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
