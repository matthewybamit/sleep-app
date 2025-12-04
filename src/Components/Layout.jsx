import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Moon, ListTodo, BarChart2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Layout({ children }) {
  const location = useLocation();

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to;
    return (
      <Link 
        to={to} 
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-white/10 p-6 flex flex-col fixed h-full z-10">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
            <Moon size={16} className="text-white" fill="currentColor" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SleepSync</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/tracker" icon={Moon} label="Sleep Tracker" />
          <NavItem to="/routine" icon={ListTodo} label="Routine" />
          <NavItem to="/insights" icon={BarChart2} label="Insights" />
        </nav>

        <button 
          onClick={() => supabase.auth.signOut()} 
          className="flex items-center gap-3 p-3 text-slate-400 hover:text-red-400 transition-colors mt-auto"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}