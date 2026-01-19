import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, Gamepad2, Cpu, Wrench, Bug, Settings, 
  ChevronRight, Users, Clock, Loader, Plus, Trophy, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  topics_count: number;
  replies_count: number;
  latest_topic: {
    id: number;
    title: string;
    slug: string;
    author: string;
    created_at: string;
  } | null;
}

interface ForumStats {
  total_topics: number;
  total_replies: number;
  total_users: number;
  total_categories: number;
}

// Icon mapping for Lucide icons
const iconMap: Record<string, React.ReactNode> = {
  Gamepad2: <Gamepad2 className="w-6 h-6" />,
  Cpu: <Cpu className="w-6 h-6" />,
  Wrench: <Wrench className="w-6 h-6" />,
  Bug: <Bug className="w-6 h-6" />,
  Settings: <Settings className="w-6 h-6" />,
  MessageSquare: <MessageSquare className="w-6 h-6" />,
};

// Color mapping for Tailwind
const colorMap: Record<string, string> = {
  blue: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  purple: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  red: 'bg-red-600/20 text-red-400 border-red-600/30',
  orange: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  green: 'bg-green-600/20 text-green-400 border-green-600/30',
  slate: 'bg-slate-600/20 text-slate-400 border-slate-600/30',
  gray: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
};

export default function Forum() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [catRes, statsRes] = await Promise.all([
        fetch('/api/forum/categories/'),
        fetch('/api/forum/stats/overview/'),
      ]);

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.results || data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch forum data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Community Forum</h1>
            <p className="text-slate-400">
              Join the discussion with fellow gamers
            </p>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <Link
                to="/leaderboard"
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition"
              >
                <Trophy className="w-4 h-4" />
                Leaderboard
              </Link>
              {isAdmin && (
                <Link
                  to="/forum/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}
              <Link
                to="/forum/new"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                New Topic
              </Link>
            </div>
          )}
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-2xl font-bold text-white">{stats.total_topics}</div>
              <div className="text-sm text-slate-400">Topics</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-2xl font-bold text-white">{stats.total_replies}</div>
              <div className="text-sm text-slate-400">Replies</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-2xl font-bold text-white">{stats.total_users}</div>
              <div className="text-sm text-slate-400">Members</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <div className="text-2xl font-bold text-white">{stats.total_categories}</div>
              <div className="text-sm text-slate-400">Categories</div>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/forum/category/${category.slug}`}
              className="block bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition overflow-hidden"
            >
              <div className="p-5 flex items-start gap-4">
                {/* Icon */}
                <div className={`p-3 rounded-lg border ${colorMap[category.color] || colorMap.slate}`}>
                  {iconMap[category.icon] || <MessageSquare className="w-6 h-6" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-semibold text-white">{category.name}</h2>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                  <p className="text-slate-400 text-sm mb-3">{category.description}</p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {category.topics_count} topics
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {category.replies_count} replies
                    </span>
                  </div>
                </div>

                {/* Latest Topic */}
                <div className="hidden md:block text-right min-w-[200px]">
                  {category.latest_topic ? (
                    <div>
                      <div className="text-sm text-white truncate max-w-[200px]">
                        {category.latest_topic.title}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center justify-end gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(category.latest_topic.created_at)}
                        <span className="text-slate-600">by</span>
                        <span className="text-blue-400">{category.latest_topic.author}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No topics yet</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Call to action if not authenticated */}
        {!isAuthenticated && (
          <div className="mt-8 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-600/30 p-6 text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              Join the Community
            </h3>
            <p className="text-slate-400 mb-4">
              Create an account to participate in discussions and earn ranks!
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/leaderboard"
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                Leaderboard
              </Link>
              <Link
                to="/register"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Log In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
