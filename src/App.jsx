import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './Components/Layout'; // ✅ lowercase
import Landing from './pages/Landing';     // ✅ correct name
import Login from './pages/Login';         // ✅ added
import Register from './pages/Register';
import Dashboard from './pages/Dashboard'; // ✅ added
import SleepTracker from './pages/SleepTracker';
import Routine from './pages/Routine';
import Insights from './pages/Insights';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />; // ✅ proper redirect
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />           {/* ✅ added */}
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} /> {/* ✅ added */}
          <Route path="/tracker" element={<ProtectedRoute><SleepTracker /></ProtectedRoute>} />
          <Route path="/routine" element={<ProtectedRoute><Routine /></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
