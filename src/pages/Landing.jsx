import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Moon, Calendar, CheckCircle, BarChart3, Clock, Brain, Heart, Zap, 
  TrendingUp, Shield, Users, ArrowRight, Sparkles, ChevronDown, User, 
  LogOut, Home, ListTodo, Mic, MessageCircle 
} from 'lucide-react';
import ZenPsychLogo from '../assets/ZenPsych.png';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
    navigate('/');
  };

  const features = [
    {
      icon: Moon,
      title: "Smart Sleep Tracking",
      description: "Log your bedtime and wake time with one-tap quick actions or voice commands. AI tracks patterns automatically."
    },
    {
      icon: Brain,
      title: "AI Assistant",
      description: "Chat with your intelligent assistant using text or voice. Get personalized insights, manage tasks, and control everything hands-free."
    },
    {
      icon: CheckCircle,
      title: "Custom Routines",
      description: "Build personalized nightly habits with task lists, multi-date scheduling, and AI-powered reminders that adapt to your schedule."
    },
    {
      icon: BarChart3,
      title: "Insights & Analytics",
      description: "Visualize your sleep data with interactive charts, AI-generated coaching tips, and predictive sleep quality scores."
    },
    {
      icon: MessageCircle,
      title: "Natural Language Control",
      description: "Simply say 'I'm going to sleep' or 'Add workout tomorrow at 7 AM' - the AI understands and executes commands instantly."
    },
    {
      icon: TrendingUp,
      title: "Intelligent Streak Tracking",
      description: "Stay motivated with AI-powered streak protection alerts and smart notifications when you're at risk of breaking consistency."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Create Your Account",
      description: "Sign up with your email and complete your profile. The AI assistant greets you and helps set up your sleep goals."
    },
    {
      number: "02",
      title: "Build Your Routine with AI",
      description: "Tell the AI what tasks you want: 'Add meditation at 9 PM' or 'Create my bedtime routine' - it handles scheduling for any date."
    },
    {
      number: "03",
      title: "Track Sleep Hands-Free",
      description: "Say 'I'm going to sleep' or tap the quick button. Wake up and tell the AI 'I woke up' - fully automated tracking."
    },
    {
      number: "04",
      title: "Get AI-Powered Insights",
      description: "Ask 'Why is my sleep inconsistent?' or 'Analyze my patterns' - receive personalized coaching and actionable recommendations."
    }
  ];

  const benefits = [
    { icon: Brain, text: "AI-powered sleep analysis and coaching" },
    { icon: Mic, text: "Voice control for hands-free tracking" },
    { icon: Zap, text: "Instant task management across all dates" },
    { icon: Users, text: "Join thousands improving with AI guidance" }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={ZenPsychLogo} 
              alt="ZenPsych Logo" 
              className="h-8 sm:h-10 w-auto" 
            />
            <span className="text-xl sm:text-2xl font-bold text-white">ZenPsych</span>
          </div>

          {/* Conditional Navigation */}
          {user ? (
            // Logged In - Show User Dropdown
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-sm font-semibold">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {user.email?.split('@')[0]}
                </span>
                <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    <p className="text-xs text-slate-400 mt-1">Free Account</p>
                  </div>

                  <div className="p-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Home size={18} />
                      <span className="text-sm">Dashboard</span>
                    </Link>
                    <Link
                      to="/tracker"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Moon size={18} />
                      <span className="text-sm">Sleep Tracker</span>
                    </Link>
                    <Link
                      to="/routine"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <ListTodo size={18} />
                      <span className="text-sm">My Routine</span>
                    </Link>
                    <Link
                      to="/insights"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <BarChart3 size={18} />
                      <span className="text-sm">Insights</span>
                    </Link>
                  </div>

                  <div className="p-2 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors w-full"
                    >
                      <LogOut size={18} />
                      <span className="text-sm">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Not Logged In - MOBILE OPTIMIZED BUTTONS
            <div className="flex gap-2 sm:gap-4">
              <Link 
                to="/login" 
                className="px-3 sm:px-6 py-2 text-sm sm:text-base text-slate-300 hover:text-white transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link 
                to="/register" 
                className="px-3 sm:px-6 py-2 text-sm sm:text-base bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/25 whitespace-nowrap"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
            <Sparkles size={16} className="text-indigo-400" />
            <span className="text-sm text-indigo-300">Now with AI-Powered Voice Assistant 🎙️</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Master Your Sleep with
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AI Intelligence
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Track sleep patterns, build routines, and chat with your personal AI assistant. 
            Control everything with voice commands or natural language—ZenPsych adapts to you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link to="/dashboard" className="group px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2">
                Go to Dashboard
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <Link to="/register" className="group px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2">
                Start Free Today
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            <a href="#how-it-works" className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-semibold transition-all">
              See AI in Action
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto">
            {benefits.map((benefit, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/10 transition-colors">
                <benefit.icon className="text-indigo-400 mb-3 mx-auto" size={24} />
                <p className="text-sm text-slate-300">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Highlight - NEW SECTION */}
      <section className="py-20 px-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-2 rounded-full mb-4">
              <Brain size={20} className="text-purple-400" />
              <span className="text-sm text-purple-300">Powered by Advanced AI</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">Your Intelligent Sleep Companion</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Meet your AI assistant that understands natural language, adapts to your habits, and helps you sleep better
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-indigo-600/20 rounded-xl flex items-center justify-center mb-4">
                <Mic className="text-indigo-400" size={28} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Voice Control</h3>
              <p className="text-slate-400 mb-4">
                "I'm going to sleep", "Add meditation tomorrow", "Analyze my sleep" - just speak naturally and the AI executes instantly.
              </p>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-indigo-500/20">
                <p className="text-sm text-indigo-300 font-mono">"I woke up" → Logs sleep automatically ✓</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-purple-600/20 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="text-purple-400" size={28} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Conversational AI</h3>
              <p className="text-slate-400 mb-4">
                Chat with your assistant on any page. It knows your data, understands context, and provides personalized coaching.
              </p>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-purple-500/20">
                <p className="text-sm text-purple-300 font-mono">"Why am I tired?" → Detailed analysis ✓</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-pink-600/20 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="text-pink-400" size={28} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Multi-Date Scheduling</h3>
              <p className="text-slate-400 mb-4">
                Schedule tasks for today, tomorrow, next week, or any date. The AI understands and creates tasks intelligently.
              </p>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-pink-500/20">
                <p className="text-sm text-pink-300 font-mono">"Add dentist on Monday" → Scheduled ✓</p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="w-14 h-14 bg-green-600/20 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="text-green-400" size={28} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Predictive Insights</h3>
              <p className="text-slate-400 mb-4">
                AI analyzes your patterns and proactively suggests improvements before issues arise. Smart streak protection included.
              </p>
              <div className="bg-slate-900/50 rounded-lg p-4 border border-green-500/20">
                <p className="text-sm text-green-300 font-mono">7-day streak at risk → Alert sent ✓</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need for Better Sleep</h2>
            <p className="text-slate-400 text-lg">Comprehensive AI-powered tools designed to help you rest, recover, and thrive.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/10 group">
                <div className="w-14 h-14 bg-indigo-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                  <feature.icon className="text-indigo-400 group-hover:text-white transition-colors" size={24} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How ZenPsych Works</h2>
            <p className="text-slate-400 text-lg">Four simple steps to transform your sleep quality with AI assistance</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-8 hover:from-white/10 hover:to-white/5 transition-all">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-xl">
                  {step.number}
                </div>
                <h3 className="text-2xl font-semibold mb-3 mt-2">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Workflow Diagram */}
      <section className="py-20 px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Complete AI-Powered Sleep System</h2>
            <p className="text-slate-400 text-lg">A holistic approach with intelligent automation at every step</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
                  <Moon size={32} className="text-white" />
                </div>
                <h3 className="font-semibold text-xl mb-2">AI Data Collection</h3>
                <p className="text-slate-400 text-sm">Voice commands, sleep times, routine tracking with context awareness</p>
              </div>

              <div className="hidden md:flex items-center justify-center">
                <ArrowRight size={40} className="text-indigo-500" />
              </div>

              <div className="text-center">
                <div className="w-20 h-20 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-500/30">
                  <Brain size={32} className="text-white" />
                </div>
                <h3 className="font-semibold text-xl mb-2">Smart Analysis</h3>
                <p className="text-slate-400 text-sm">Pattern recognition, predictive modeling, personalized coaching</p>
              </div>

              <div className="hidden md:flex items-center justify-center md:col-span-3">
                <div className="w-px h-12 bg-gradient-to-b from-purple-500 to-indigo-500"></div>
              </div>

              <div className="text-center md:col-span-3">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-500/30">
                  <Sparkles size={32} className="text-white" />
                </div>
                <h3 className="font-semibold text-xl mb-2">AI-Driven Action</h3>
                <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                  Conversational insights, proactive streak protection, automated task management, and real-time sleep coaching
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-3xl p-12 backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">Why Better Sleep Matters</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center mt-1">
                      <CheckCircle size={14} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Enhanced Cognitive Function</h4>
                      <p className="text-slate-400 text-sm">Improved memory, focus, and decision-making abilities.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center mt-1">
                      <CheckCircle size={14} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Better Physical Health</h4>
                      <p className="text-slate-400 text-sm">Stronger immune system, lower risk of chronic diseases.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center mt-1">
                      <CheckCircle size={14} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Emotional Balance</h4>
                      <p className="text-slate-400 text-sm">Reduced stress, anxiety, and improved mood regulation.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center mt-1">
                      <CheckCircle size={14} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Increased Productivity</h4>
                      <p className="text-slate-400 text-sm">Higher energy levels and better work performance.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                <h3 className="text-2xl font-semibold mb-6 text-center">For Everyone</h3>
                <div className="space-y-4">
                  <div className="bg-slate-900/50 p-4 rounded-xl">
                    <h4 className="font-semibold text-indigo-300 mb-2">Students & Professionals</h4>
                    <p className="text-slate-400 text-sm">Optimize study and work performance through AI-guided sleep.</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl">
                    <h4 className="font-semibold text-purple-300 mb-2">Athletes & Fitness Enthusiasts</h4>
                    <p className="text-slate-400 text-sm">Maximize recovery with intelligent sleep tracking.</p>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl">
                    <h4 className="font-semibold text-pink-300 mb-2">Anyone Seeking Wellness</h4>
                    <p className="text-slate-400 text-sm">Build healthy habits with AI coaching and support.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Sleep Smarter with AI?</h2>
          <p className="text-xl text-slate-400 mb-10">
            Join thousands using AI-powered sleep intelligence to transform their rest quality.
          </p>
          {user ? (
            <Link to="/dashboard" className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all shadow-2xl shadow-indigo-500/30 group">
              Go to Your Dashboard
              <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <>
              <Link to="/register" className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-semibold text-lg transition-all shadow-2xl shadow-indigo-500/30 group">
                Get Started for Free
                <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <p className="text-slate-500 text-sm mt-6">No credit card required • AI assistant included • Free forever</p>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={ZenPsychLogo} 
                  alt="ZenPsych Icon" 
                  className="h-10 w-auto" 
                />
                <span className="text-2xl font-bold text-white">ZenPsych</span>
              </div>
              <p className="text-slate-400 max-w-sm">
                Your AI-powered sleep tracking and routine management platform. Built with intelligence to help you achieve better rest and healthier habits.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-slate-500 text-sm">
            <p>&copy; 2025 ZenPsych. All rights reserved. Built with AI for better sleep.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
