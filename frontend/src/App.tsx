import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Weapons from './pages/Weapons';
import GameSettings from './pages/GameSettings';
import Forum from './pages/Forum';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import MFASetup from './pages/MFASetup';
import Profile from './pages/Profile';
import './App.css';
import { useState } from 'react';
import { Gamepad2, Crosshair, MessageSquare, Shield, LogIn, Settings, UserPlus, User, LogOut } from 'lucide-react';

// Publiek navigatie menu component
function PublicNav() {
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  
  const navItems = [
    { path: '/', label: 'Games', icon: Gamepad2 },
    { path: '/weapons', label: 'Weapons', icon: Crosshair },
    { path: '/settings', label: 'Game Settings', icon: Settings },
    { path: '/forum', label: 'Forum', icon: MessageSquare },
  ];

  return (
    <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Crosshair className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold text-white">TDC</span>
          </Link>

          {/* Nav Items */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Admin/Profile/Login/Register Links */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    <Shield className="w-5 h-5" />
                    Admin
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition"
                >
                  <User className="w-5 h-5" />
                  Profile
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition"
                >
                  <UserPlus className="w-5 h-5" />
                  Register
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  <LogIn className="w-5 h-5" />
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// Logout button component
function LogoutButton() {
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout();
  };
  
  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition"
    >
      <LogOut className="w-5 h-5" />
      Logout
    </button>
  );
}

// Publieke layout met navigatie
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900">
      <PublicNav />
      <main>{children}</main>
    </div>
  );
}

// Admin layout met sidebar
function AdminLayout() {
  const { logout } = useAuth();
  const [adminTab, setAdminTab] = useState<string>('users');

  const handleAdminTabChange = (tab: string) => {
    setAdminTab(tab);
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar onLogout={logout} onAdminTabChange={handleAdminTabChange} activeAdminTab={adminTab} />
      <main className="flex-1 overflow-auto">
        <Admin initialTab={adminTab} />
      </main>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      {/* Publieke routes */}
      <Route path="/" element={<PublicLayout><Games /></PublicLayout>} />
      <Route path="/weapons" element={<PublicLayout><Weapons /></PublicLayout>} />
      <Route path="/settings" element={<PublicLayout><GameSettings /></PublicLayout>} />
      <Route path="/forum" element={<PublicLayout><Forum /></PublicLayout>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* MFA Setup - alleen voor ingelogde gebruikers */}
      <Route 
        path="/mfa-setup" 
        element={
          isAuthenticated 
            ? <MFASetup /> 
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* Profile - alleen voor ingelogde gebruikers */}
      <Route 
        path="/profile" 
        element={
          isAuthenticated 
            ? <PublicLayout><Profile /></PublicLayout>
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* Admin route - alleen toegankelijk voor admins */}
      <Route 
        path="/admin" 
        element={
          isAuthenticated && isAdmin 
            ? <AdminLayout /> 
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
