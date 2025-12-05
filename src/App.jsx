import { Routes, Route, Navigate } from 'react-router-dom';  // ← REMOVE BrowserRouter
import { AuthProvider } from './context/AuthContext';
import { AIProvider } from './context/AIContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SleepTracker from './pages/SleepTracker';
import Routine from './pages/Routine';
import Insights from './pages/Insights';
import Layout from './Components/Layout';
import GlobalAIAssistant from './Components/GlobalAIAssistant';
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
    <Routes>  {/* ← REMOVE BrowserRouter wrapper */}
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      
      {/* PROTECTED ROUTES */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <AIProvider>
              <Layout>
                <Dashboard />
              </Layout>
              <GlobalAIAssistant />
            </AIProvider>
          </PrivateRoute>
        }
      />
      <Route
        path="/tracker"
        element={
          <PrivateRoute>
            <AIProvider>
              <Layout>
                <SleepTracker />
              </Layout>
              <GlobalAIAssistant />
            </AIProvider>
          </PrivateRoute>
        }
      />
      <Route
        path="/routine"
        element={
          <PrivateRoute>
            <AIProvider>
              <Layout>
                <Routine />
              </Layout>
              <GlobalAIAssistant />
            </AIProvider>
          </PrivateRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <PrivateRoute>
            <AIProvider>
              <Layout>
                <Insights />
              </Layout>
              <GlobalAIAssistant />
            </AIProvider>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
