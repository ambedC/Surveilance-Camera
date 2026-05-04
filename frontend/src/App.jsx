import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LiveFeed from './pages/LiveFeed';
import Login from './pages/Login';
import Register from './pages/Register';
import RegistrationPending from './pages/RegistrationPending';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { Toaster } from 'sonner';
import LoadingScreen from './components/LoadingScreen';
import { useState, useEffect } from 'react';

function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem('authenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Simulate initialization
    const timer = setTimeout(() => setInitializing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (initializing) return <LoadingScreen />;

  return (
    <Router>
      <Toaster richColors position="top-right" closeButton />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/registration-pending" element={<RegistrationPending />} />
        {/* admin dashboard is always accessible; login page handles setting flag */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="flex h-screen">
                <Sidebar />
                <LiveFeed />
              </div>
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
