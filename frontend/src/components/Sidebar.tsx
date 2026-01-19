import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Gamepad2, Crosshair, MessageSquare, Users, LogOut, ChevronDown, UserCheck } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  onLogout: () => void;
  onAdminTabChange?: (tab: string) => void;
  activeAdminTab?: string;
}

export default function Sidebar({ onLogout, onAdminTabChange, activeAdminTab = 'users' }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandCoreMenu, setExpandCoreMenu] = useState(false);
  const [expandUserMenu, setExpandUserMenu] = useState(true);

  const isActive = (path: string) => location.pathname === path;
  const isAdminSection = location.pathname === '/admin';

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/games', label: 'Games', icon: Gamepad2 },
    { path: '/weapons', label: 'Weapons', icon: Crosshair },
    { path: '/forum', label: 'Forum', icon: MessageSquare },
  ];

  const userMenuItems = [
    { id: 'users', label: 'All Users', icon: Users },
    { id: 'pending-users', label: 'Pending Approvals', icon: UserCheck },
  ];

  const coreMenuItems = [
    { id: 'games', label: 'Games' },
    { id: 'categories', label: 'Categories' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'attachments', label: 'Attachments' },
    { id: 'attachment-types', label: 'Attachment Types' },
    { id: 'game-settings', label: 'Game Settings' },
    { id: 'settings', label: 'Global Settings' },
  ];

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-screen">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-2xl font-bold text-white">TDC Admin</h2>
        <p className="text-xs text-slate-400 mt-1">Management Panel</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* User Management Menu */}
        <div className="mt-6">
          <button
            onClick={() => setExpandUserMenu(!expandUserMenu)}
            className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-400 uppercase flex items-center justify-between hover:text-slate-300 transition rounded-lg"
          >
            Users
            <ChevronDown
              className={`w-4 h-4 transition ${expandUserMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {expandUserMenu && (
            <div className="space-y-1 mt-2">
              {userMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onAdminTabChange?.(item.id);
                      if (location.pathname !== '/admin') {
                        navigate('/admin');
                      }
                    }}
                    className={`w-full text-left px-4 py-2 text-sm rounded transition flex items-center gap-2 ${
                      activeAdminTab === item.id
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Core Menu */}
        <div className="mt-2">
          <button
            onClick={() => setExpandCoreMenu(!expandCoreMenu)}
            className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-400 uppercase flex items-center justify-between hover:text-slate-300 transition rounded-lg"
          >
            Core
            <ChevronDown
              className={`w-4 h-4 transition ${expandCoreMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {expandCoreMenu && (
            <div className="space-y-1 mt-2">
              {coreMenuItems.map((coreItem) => (
                <button
                  key={coreItem.id}
                  onClick={() => {
                    onAdminTabChange?.(coreItem.id);
                    // Navigate to /admin if not already there
                    if (location.pathname !== '/admin') {
                      navigate('/admin');
                    }
                  }}
                  className={`w-full text-left px-4 py-2 text-sm rounded transition ${
                    activeAdminTab === coreItem.id
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {coreItem.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
