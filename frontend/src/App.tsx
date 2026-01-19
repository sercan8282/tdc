import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import NotificationBell from './components/NotificationBell';
import EventBanner from './components/EventBanner';
import Games from './pages/Games';
import Weapons from './pages/Weapons';
import GameSettings from './pages/GameSettings';
import Forum from './pages/Forum';
import ForumCategory from './pages/ForumCategory';
import ForumTopic from './pages/ForumTopic';
import ForumNewTopic from './pages/ForumNewTopic';
import Leaderboard from './pages/Leaderboard';
import ForumAdmin from './pages/ForumAdmin';
import Admin from './pages/Admin';
import AdminSettings from './pages/AdminSettings';
import UserManagement from './pages/UserManagement';
import SecurityDashboard from './pages/SecurityDashboard';
import IPBlockManagement from './pages/IPBlockManagement';
import Messages from './pages/Messages';
import UserProfile from './pages/UserProfile';
import Videos from './pages/Videos';
import VideoAdmin from './pages/VideoAdmin';
import EventBannerAdmin from './pages/EventBannerAdmin';
import Login from './pages/Login';
import Register from './pages/Register';
import MFASetup from './pages/MFASetup';
import Profile from './pages/Profile';
import './App.css';
import { useState, useEffect } from 'react';
import { Gamepad2, Crosshair, MessageSquare, Shield, LogIn, Settings, UserPlus, User, LogOut, ChevronDown, Users as UsersIcon, Globe, Mail, Film } from 'lucide-react';

interface SiteSettings {
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
}

// Message Icon with unread count
function MessageIcon() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/auth/messages/unread_count/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  return (
    <button
      onClick={() => navigate('/messages')}
      className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
    >
      <Mail className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

// Publiek navigatie menu component
function PublicNav() {
  const location = useLocation();
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [adminDropdown, setAdminDropdown] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    site_name: 'TDC',
    logo_url: null,
    favicon_url: null,
  });

  useEffect(() => {
    fetchSiteSettings();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (adminDropdown && !target.closest('.admin-dropdown-container')) {
        setAdminDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [adminDropdown]);

  const fetchSiteSettings = async () => {
    try {
      const res = await fetch('/api/site-settings/');
      const data = await res.json();
      // API returns array with single item
      const settings = Array.isArray(data) ? data[0] : data;
      setSiteSettings({
        site_name: settings.site_name || 'TDC',
        logo_url: settings.logo_url,
        favicon_url: settings.favicon_url,
      });
      
      // Update favicon
      if (settings.favicon_url) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = settings.favicon_url;
      }
      
      // Update page title
      document.title = settings.site_name || 'TDC Gaming';
    } catch (error) {
      console.error('Failed to fetch site settings:', error);
    }
  };
  
  const navItems = [
    { path: '/', label: 'Games', icon: Gamepad2 },
    { path: '/weapons', label: 'Weapons', icon: Crosshair },
    { path: '/settings', label: 'Game Settings', icon: Settings },
    { path: '/forum', label: 'Forum', icon: MessageSquare },
    { path: '/videos', label: 'Videos', icon: Film },
  ];

  return (
    <>
      <EventBanner />
      <nav className="bg-slate-800 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            {siteSettings.logo_url ? (
              <>
                <img src={siteSettings.logo_url} alt={siteSettings.site_name} className="h-10 object-contain" />
                <span className="text-xl font-bold text-white">{siteSettings.site_name}</span>
              </>
            ) : (
              <>
                <Crosshair className="w-8 h-8 text-blue-500" />
                <span className="text-xl font-bold text-white">{siteSettings.site_name}</span>
              </>
            )}
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
                <NotificationBell />
                <MessageIcon />
                {isAdmin && (
                  <div className="relative admin-dropdown-container">
                    <button
                      onClick={() => setAdminDropdown(!adminDropdown)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                    >
                      <Shield className="w-5 h-5" />
                      Admin
                      <ChevronDown className={`w-4 h-4 transition-transform ${adminDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {adminDropdown && (
                      <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50">
                        <Link
                          to="/admin"
                          onClick={() => setAdminDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                        <Link
                          to="/admin/users"
                          onClick={() => setAdminDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        >
                          <UsersIcon className="w-4 h-4" />
                          User Management
                        </Link>
                        <Link
                          to="/admin/security"
                          onClick={() => setAdminDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        >
                          <Shield className="w-4 h-4" />
                          Security Monitor
                        </Link>
                        {user?.is_superuser && (
                          <Link
                            to="/admin/settings"
                            onClick={() => setAdminDropdown(false)}
                            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                          >
                            <Globe className="w-4 h-4" />
                            Site Settings
                          </Link>
                        )}
                        <Link
                          to="/forum/admin"
                          onClick={() => setAdminDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Forum Admin
                        </Link>
                        <Link
                          to="/admin/videos"
                          onClick={() => setAdminDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        >
                          <Film className="w-4 h-4" />
                          Video Management
                        </Link>
                        <Link
                          to="/admin/banners"
                          onClick={() => setAdminDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        >
                          📢
                          Event Banners
                        </Link>
                      </div>
                    )}
                  </div>
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
    </>
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
      <Route path="/forum/category/:slug" element={<PublicLayout><ForumCategory /></PublicLayout>} />
      <Route path="/forum/topic/:id/:slug?" element={<PublicLayout><ForumTopic /></PublicLayout>} />
      <Route path="/forum/new" element={<PublicLayout><ForumNewTopic /></PublicLayout>} />
      <Route path="/leaderboard" element={<PublicLayout><Leaderboard /></PublicLayout>} />
      <Route path="/forum/admin" element={<PublicLayout><ForumAdmin /></PublicLayout>} />
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
      
      {/* Messages - alleen voor ingelogde gebruikers */}
      <Route 
        path="/messages" 
        element={
          isAuthenticated 
            ? <PublicLayout><Messages /></PublicLayout>
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* Videos - visible to all, content requires login */}
      <Route 
        path="/videos" 
        element={<PublicLayout><Videos /></PublicLayout>} 
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
      
      {/* Admin Settings - alleen voor superusers */}
      <Route 
        path="/admin/settings" 
        element={
          isAuthenticated && isAdmin 
            ? <PublicLayout><AdminSettings /></PublicLayout>
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* User Management - alleen voor staff/superusers */}
      <Route 
        path="/admin/users" 
        element={
          isAuthenticated && isAdmin 
            ? <PublicLayout><UserManagement /></PublicLayout>
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* Security Dashboard - alleen voor admins */}
      <Route 
        path="/admin/security" 
        element={
          isAuthenticated && isAdmin 
            ? <PublicLayout><SecurityDashboard /></PublicLayout>
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* IP Block Management - alleen voor admins */}
      <Route 
        path="/admin/security/ip-blocks" 
        element={
          isAuthenticated && isAdmin 
            ? <PublicLayout><IPBlockManagement /></PublicLayout>
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* Video Admin - alleen voor admins */}
      <Route 
        path="/admin/videos" 
        element={
          isAuthenticated && isAdmin 
            ? <PublicLayout><VideoAdmin /></PublicLayout>
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* Event Banner Admin - alleen voor admins */}
      <Route 
        path="/admin/banners" 
        element={
          isAuthenticated && isAdmin 
            ? <PublicLayout><EventBannerAdmin /></PublicLayout>
            : <Navigate to="/login" replace />
        } 
      />
      
      {/* User Profile - Public profile page */}
      <Route 
        path="/user/:userId" 
        element={
          isAuthenticated 
            ? <PublicLayout><UserProfile /></PublicLayout>
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
