import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Moon, ListTodo, BarChart2, LogOut, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ZenPsychLogo from '../assets/ZenPsych.png'; // Import the logo

export default function Layout({ children }) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ to, icon: Icon, label, mobile = false }) => {
    const isActive = location.pathname === to;

    const handleClick = () => {
      if (mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    return (
      <Link 
        to={to}
        onClick={handleClick}
        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
          isActive 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  const handleSignOut = () => {
    supabase.auth.signOut();
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/50 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img 
            src={ZenPsychLogo} 
            alt="ZenPsych Logo" 
            className="h-8 w-auto"
          />
          <h1 className="text-lg font-bold tracking-tight">ZenPsych</h1>
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile Slide-in */}
      <aside 
        className={`
          w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col fixed h-full z-50
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Desktop Logo */}
        <div className="hidden lg:flex items-center gap-3 px-2 mb-10">
          <img 
            src={ZenPsychLogo} 
            alt="ZenPsych Logo" 
            className="h-10 w-auto"
          />
          <h1 className="text-xl font-bold tracking-tight">ZenPsych</h1>
        </div>

        {/* Mobile Close Button (inside sidebar) */}
        <div className="lg:hidden flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img 
              src={ZenPsychLogo} 
              alt="ZenPsych Logo" 
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-bold tracking-tight">ZenPsych</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" mobile />
          <NavItem to="/tracker" icon={Moon} label="Sleep Tracker" mobile />
          <NavItem to="/routine" icon={ListTodo} label="Routine" mobile />
          <NavItem to="/insights" icon={BarChart2} label="Insights" mobile />
        </nav>

        {/* Sign Out Button */}
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-3 p-3 text-slate-400 hover:text-red-400 transition-colors mt-auto rounded-xl hover:bg-white/5"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content - Added more top padding */}
      <main className="flex-1 lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}