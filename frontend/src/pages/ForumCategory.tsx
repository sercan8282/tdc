import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MessageSquare, Pin, Lock, CheckCircle,
  Loader, Plus, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopicAuthor {
  id: number;
  nickname: string;
  avatar_url: string | null;
  rank: {
    name: string;
    icon: string;
    color: string;
    chevrons: number;
  } | null;
  stats: {
    total_topics: number;
    total_replies: number;
    points: number;
  };
  created_at: string;
}

interface Topic {
  id: number;
  title: string;
  slug: string;
  category: number;
  category_name: string;
  category_slug: string;
  author: TopicAuthor;
  is_pinned: boolean;
  is_locked: boolean;
  is_solved: boolean;
  views: number;
  reply_count: number;
  last_reply: {
    author: string;
    created_at: string;
  } | null;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
}

const rankColorMap: Record<string, string> = {
  gray: 'text-gray-400',
  green: 'text-green-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  yellow: 'text-yellow-400',
  orange: 'text-orange-400',
  red: 'text-red-400',
};

export default function ForumCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const fetchData = async () => {
    try {
      // Fetch category info
      const catRes = await fetch(`/api/forum/categories/`);
      if (catRes.ok) {
        const data = await catRes.json();
        const cat = (data.results || data).find((c: Category) => c.slug === slug);
        setCategory(cat || null);
      }

      // Fetch topics for this category
      const topicsRes = await fetch(`/api/forum/topics/?category=${slug}`);
      if (topicsRes.ok) {
        const data = await topicsRes.json();
        setTopics(data.results || data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
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

  if (!category) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Category not found</h2>
          <Link to="/forum" className="text-blue-400 hover:text-blue-300">
            Back to Forum
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link to="/forum" className="hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Forum
          </Link>
          <span>/</span>
          <span className="text-white">{category.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{category.name}</h1>
            <p className="text-slate-400">{category.description}</p>
          </div>
          {isAuthenticated && (
            <Link
              to={`/forum/new?category=${category.slug}`}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              New Topic
            </Link>
          )}
        </div>

        {/* Topics List */}
        {topics.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No topics yet</h3>
            <p className="text-slate-400 mb-4">Be the first to start a discussion!</p>
            {isAuthenticated && (
              <Link
                to={`/forum/new?category=${category.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Create Topic
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header Row */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs text-slate-500 uppercase tracking-wide">
              <div className="col-span-6">Topic</div>
              <div className="col-span-2 text-center">Replies</div>
              <div className="col-span-2 text-center">Views</div>
              <div className="col-span-2 text-right">Last Activity</div>
            </div>

            {/* Topics */}
            {topics.map((topic) => (
              <Link
                key={topic.id}
                to={`/forum/topic/${topic.id}/${topic.slug}`}
                className="block bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center">
                  {/* Topic Info */}
                  <div className="md:col-span-6">
                    <div className="flex items-start gap-3">
                      {/* Author Avatar */}
                      <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {topic.author.avatar_url ? (
                          <img src={topic.author.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      
                      <div className="min-w-0">
                        {/* Title with badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {topic.is_pinned && (
                            <Pin className="w-4 h-4 text-yellow-500" />
                          )}
                          {topic.is_locked && (
                            <Lock className="w-4 h-4 text-red-500" />
                          )}
                          {topic.is_solved && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          <h3 className="text-white font-medium truncate">{topic.title}</h3>
                        </div>
                        
                        {/* Author info */}
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="text-slate-400">by</span>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/user/${topic.author.id}`);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {topic.author.nickname}
                          </button>
                          {topic.author.rank && (
                            <span className={`text-xs ${rankColorMap[topic.author.rank.color] || 'text-gray-400'}`}>
                              {topic.author.rank.icon} {topic.author.rank.name}
                            </span>
                          )}
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-500">{formatTimeAgo(topic.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  <div className="md:col-span-2 text-center">
                    <div className="flex md:flex-col items-center justify-start md:justify-center gap-1">
                      <MessageSquare className="w-4 h-4 text-slate-500 md:hidden" />
                      <span className="text-white font-medium">{topic.reply_count}</span>
                      <span className="text-xs text-slate-500 hidden md:block">replies</span>
                    </div>
                  </div>

                  {/* Views */}
                  <div className="md:col-span-2 text-center hidden md:block">
                    <div className="flex flex-col items-center">
                      <span className="text-white font-medium">{topic.views}</span>
                      <span className="text-xs text-slate-500">views</span>
                    </div>
                  </div>

                  {/* Last Activity */}
                  <div className="md:col-span-2 text-right">
                    {topic.last_reply ? (
                      <div className="text-sm">
                        <div className="text-slate-400">{formatTimeAgo(topic.last_reply.created_at)}</div>
                        <div className="text-xs text-slate-500">by {topic.last_reply.author}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No replies</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
