import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AIProvider } from './context/AIContext';
import Landing from './pages/Landing'; // NEW: Import Landing
import Login from './pages/Login';
import Register from './pages/Register'; // NEW: Import Register
import Dashboard from './pages/Dashboard';
import SleepTracker from './pages/SleepTracker';
import Routine from './pages/Routine';
import Insights from './pages/Insights';
import Layout from './Components/Layout'; // Fixed: lowercase 'components'
import GlobalAIAssistant from './Components/GlobalAIAssistant'; // Fixed: lowercase
import { useAuth } from './context/AuthContext';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
          <div className="text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
}

function AppContent() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        
        {/* PROTECTED ROUTES */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <AIProvider>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/tracker" element={<SleepTracker />} />
                    <Route path="/routine" element={<Routine />} />
                    <Route path="/insights" element={<Insights />} />
                  </Routes>
                </Layout>
                <GlobalAIAssistant />
              </AIProvider>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
