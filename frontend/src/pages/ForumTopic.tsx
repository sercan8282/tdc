import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  MessageSquare, Eye, Pin, Lock, CheckCircle,
  Loader, ThumbsUp, Reply, User, Send, AtSign,
  Edit, Trash2, X, Quote
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ContentRenderer from '../components/ContentRenderer';
import RichTextEditor from '../components/RichTextEditor';

interface UserRank {
  name: string;
  icon: string;
  image_url: string | null;
  color: string;
  chevrons: number;
}

interface Author {
  id: number;
  nickname: string;
  avatar_url: string | null;
  rank: UserRank | null;
  stats: {
    total_topics: number;
    total_replies: number;
    points: number;
  };
  is_streamer: boolean;
  stream_url: string | null;
  created_at: string;
}

interface QuotedReply {
  id: number;
  author: string;
  content: string;
  created_at: string;
}

interface ReplyData {
  id: number;
  content: string;
  author: Author;
  parent: number | null;
  quoted_reply: QuotedReply | null;
  mentioned_users: string[];
  is_edited: boolean;
  is_solution: boolean;
  likes_count: number;
  is_liked: boolean;
  is_own: boolean;
  created_at: string;
  updated_at: string;
}

interface TopicData {
  id: number;
  title: string;
  slug: string;
  content: string;
  category: {
    id: number;
    name: string;
    slug: string;
  };
  author: Author;
  is_pinned: boolean;
  is_locked: boolean;
  is_solved: boolean;
  views: number;
  reply_count: number;
  replies: ReplyData[];
  created_at: string;
  updated_at: string;
}

const rankColorMap: Record<string, string> = {
  gray: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  green: 'text-green-400 bg-green-500/10 border-green-500/30',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  red: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export default function ForumTopic() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, token, user } = useAuth();
  const [topic, setTopic] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReplyData | null>(null);
  const [editingReply, setEditingReply] = useState<ReplyData | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingTopic, setEditingTopic] = useState(false);
  const [editTopicTitle, setEditTopicTitle] = useState('');
  const [editTopicContent, setEditTopicContent] = useState('');
  const [deleteTopicConfirm, setDeleteTopicConfirm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTopic();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTopic = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/forum/topics/${id}/`, {
        headers: token ? { 'Authorization': `Token ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setTopic(data);
      }
    } catch (error) {
      console.error('Failed to fetch topic:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !topic) return;

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/forum/topics/${topic.id}/replies/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          content: replyContent,
          parent: replyingTo?.id || null,
        }),
      });

      if (res.ok) {
        setReplyContent('');
        setReplyingTo(null);
        fetchTopic(); // Refresh
      }
    } catch (error) {
      console.error('Failed to post reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (replyId: number) => {
    if (!editContent.trim() || !topic) return;

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/forum/topics/${topic.id}/replies/${replyId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (res.ok) {
        setEditingReply(null);
        setEditContent('');
        fetchTopic();
      }
    } catch (error) {
      console.error('Failed to edit reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!topic) return;

    try {
      const res = await fetch(`http://localhost:8000/api/forum/topics/${topic.id}/replies/${replyId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });

      if (res.ok) {
        setDeleteConfirm(null);
        fetchTopic();
      }
    } catch (error) {
      console.error('Failed to delete reply:', error);
    }
  };

  const handleEditTopic = async () => {
    if (!editTopicTitle.trim() || !editTopicContent.trim() || !topic) return;

    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/forum/topics/${topic.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          title: editTopicTitle,
          content: editTopicContent,
        }),
      });

      if (res.ok) {
        setEditingTopic(false);
        fetchTopic();
      }
    } catch (error) {
      console.error('Failed to edit topic:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!topic) return;

    try {
      const res = await fetch(`http://localhost:8000/api/forum/topics/${topic.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });

      if (res.ok) {
        window.location.href = `/forum/category/${topic.category.slug}`;
      }
    } catch (error) {
      console.error('Failed to delete topic:', error);
    }
  };

  const handleLike = async (replyId: number) => {
    if (!token) return;
    
    try {
      await fetch(`http://localhost:8000/api/forum/topics/${topic?.id}/replies/${replyId}/like/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
      });
      fetchTopic();
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  // Render chevrons
  const renderChevrons = (count: number) => {
    return '▸'.repeat(count);
  };

  const renderContent = (content: string) => {
    return content.split(/(@\w+)/g).map((part, i) => {
      if (part.match(/^@\w+$/)) {
        return (
          <span key={i} className="text-blue-400 bg-blue-500/10 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const canEdit = (reply: ReplyData) => {
    if (!user) return false;
    return reply.is_own || user.is_staff;
  };

  const canDelete = (reply: ReplyData) => {
    if (!user) return false;
    return user.is_staff; // Only admins can delete
  };

  const startReply = (reply: ReplyData) => {
    setReplyingTo(reply);
    setReplyContent('');
    document.getElementById('reply-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const startEdit = (reply: ReplyData) => {
    setEditingReply(reply);
    setEditContent(reply.content);
  };

  const startEditTopic = () => {
    if (!topic) return;
    setEditingTopic(true);
    setEditTopicTitle(topic.title);
    setEditTopicContent(topic.content);
  };

  const canEditOrDeleteTopic = () => {
    if (!user || !topic) return false;
    return topic.author.id === user.id || user.is_staff;
  };

  const renderReply = (reply: ReplyData) => {
    const rankColor = reply.author.rank?.color || 'gray';
    const isEditing = editingReply?.id === reply.id;
    const isDeleting = deleteConfirm === reply.id;

    return (
      <div key={reply.id} className="flex gap-3 mb-3">
        {/* Author profile box (left) */}
        <div className="hidden md:block w-48 flex-shrink-0">
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden mb-3">
                {reply.author.avatar_url ? (
                  <img src={reply.author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <Link to={`/profile/${reply.author.nickname}`} className="text-sm font-medium text-blue-400 hover:text-blue-300 text-center mb-2">
                {reply.author.nickname}
              </Link>
              {reply.author.rank && (
                <div className={`text-xs px-2 py-1 rounded border mb-2 flex items-center gap-1 ${rankColorMap[rankColor]}`}>
                  {reply.author.rank.image_url ? (
                    <img src={reply.author.rank.image_url} alt="" className="w-4 h-4" />
                  ) : reply.author.rank.chevrons > 0 ? (
                    <span>{renderChevrons(reply.author.rank.chevrons)}</span>
                  ) : null}
                  <span>{reply.author.rank.name}</span>
                </div>
              )}
              <div className="text-xs text-slate-500 text-center">
                <div>{reply.author.stats.total_topics} topics</div>
                <div>{reply.author.stats.total_replies} replies</div>
                <div className="font-semibold text-blue-400 mt-1">{reply.author.stats.points} pts</div>
              </div>
              {reply.author.is_streamer && reply.author.stream_url && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <a
                    href={reply.author.stream_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center justify-center gap-1"
                  >
                    <span>🎮</span> Stream
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reply content box (right) */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            {/* Mobile author */}
            <div className="flex md:hidden items-center gap-2 mb-3 pb-3 border-b border-slate-700">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                {reply.author.avatar_url ? (
                  <img src={reply.author.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div>
                <span className="text-blue-400 text-sm font-medium">{reply.author.nickname}</span>
                {reply.author.rank && (
                  <div className={`text-xs ${rankColorMap[rankColor].split(' ')[0]} mt-0.5`}>
                    {reply.author.rank.image_url ? (
                      <img src={reply.author.rank.image_url} alt="" className="w-4 h-4 inline mr-1" />
                    ) : null}
                    {reply.author.rank.name}
                  </div>
                )}
              </div>
            </div>

            {/* Quoted reply box */}
            {reply.quoted_reply && (
              <div className="mb-4 p-3 bg-slate-700/50 border-l-4 border-blue-500 rounded-r-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Quote className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400 font-medium">@{reply.quoted_reply.author}</span>
                  <span className="text-xs text-slate-500">wrote:</span>
                </div>
                <div className="text-slate-400 text-sm italic">
                  {reply.quoted_reply.content}
                </div>
              </div>
            )}

            {/* Edit mode */}
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditSubmit(reply.id)}
                    disabled={submitting || !editContent.trim()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm rounded-lg transition"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingReply(null)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Content with mentions highlighted */}
                <div className="text-slate-300">
                  <ContentRenderer content={reply.content} />
                </div>

                {/* Solution badge */}
                {reply.is_solution && (
                  <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Marked as solution
                  </div>
                )}
              </>
            )}

            {/* Delete confirmation */}
            {isDeleting && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm mb-2">Are you sure you want to delete this reply?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteReply(reply.id)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {!isEditing && !isDeleting && (
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700 text-sm">
                <span className="text-slate-500">{formatTimeAgo(reply.created_at)}</span>
                {reply.is_edited && <span className="text-slate-500 italic">(edited)</span>}
                
                <button
                  onClick={() => handleLike(reply.id)}
                  className={`flex items-center gap-1 transition ${
                    reply.is_liked ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                  disabled={!isAuthenticated}
                >
                  <ThumbsUp className="w-4 h-4" />
                  {reply.likes_count > 0 && reply.likes_count}
                </button>

                {isAuthenticated && !topic?.is_locked && (
                  <button
                    onClick={() => startReply(reply)}
                    className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition"
                  >
                    <Reply className="w-4 h-4" />
                    Quote
                  </button>
                )}

                {canEdit(reply) && !topic?.is_locked && (
                  <>
                    <button
                      onClick={() => startEdit(reply)}
                      className="flex items-center gap-1 text-slate-500 hover:text-yellow-400 transition"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </>
                )}

                {canDelete(reply) && !topic?.is_locked && (
                  <button
                    onClick={() => setDeleteConfirm(reply.id)}
                    className="flex items-center gap-1 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Topic not found</h2>
          <Link to="/forum" className="text-blue-400 hover:text-blue-300">
            Back to Forum
          </Link>
        </div>
      </div>
    );
  }

  const authorRankColor = topic.author.rank?.color || 'gray';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6 flex-wrap">
          <Link to="/forum" className="hover:text-white">Forum</Link>
          <span>/</span>
          <Link to={`/forum/category/${topic.category.slug}`} className="hover:text-white">
            {topic.category.name}
          </Link>
          <span>/</span>
          <span className="text-white truncate">{topic.title}</span>
        </div>

        {/* Topic Header */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-start gap-2 mb-4 flex-wrap">
            {topic.is_pinned && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                <Pin className="w-3 h-3" /> Pinned
              </span>
            )}
            {topic.is_locked && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
            {topic.is_solved && (
              <span className="flex items-center gap-1 text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                <CheckCircle className="w-3 h-3" /> Solved
              </span>
            )}
          </div>

          {editingTopic ? (
            <div className="space-y-4 mb-6">
              <input
                type="text"
                value={editTopicTitle}
                onChange={(e) => setEditTopicTitle(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Topic title"
              />
              <textarea
                value={editTopicContent}
                onChange={(e) => setEditTopicContent(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={6}
                placeholder="Topic content"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEditTopic}
                  disabled={submitting || !editTopicTitle.trim() || !editTopicContent.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingTopic(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-4">{topic.title}</h1>

              <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
              {topic.author.avatar_url ? (
                <img src={topic.author.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-medium">{topic.author.nickname}</span>
                {topic.author.rank && (
                  <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${rankColorMap[authorRankColor]}`}>
                    {topic.author.rank.image_url ? (
                      <img src={topic.author.rank.image_url} alt="" className="w-4 h-4" />
                    ) : topic.author.rank.chevrons > 0 ? (
                      <span>{renderChevrons(topic.author.rank.chevrons)}</span>
                    ) : null}
                    <span>{topic.author.rank.name}</span>
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500">{formatDate(topic.created_at)}</div>
            </div>
          </div>

          <div className="leading-relaxed">
            <ContentRenderer content={topic.content} />
          </div>

          {deleteTopicConfirm && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 mb-3">Are you sure you want to delete this topic? This will also delete all replies.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteTopic}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                >
                  Delete Topic
                </button>
                <button
                  onClick={() => setDeleteTopicConfirm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {topic.views} views
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {topic.reply_count} replies
              </span>
            </div>
            {canEditOrDeleteTopic() && !deleteTopicConfirm && (
              <div className="flex items-center gap-2">
                <button
                  onClick={startEditTopic}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-yellow-400 transition"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTopicConfirm(true)}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
            </>
          )}
        </div>

        {/* Replies */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {topic.reply_count} {topic.reply_count === 1 ? 'Reply' : 'Replies'}
          </h2>
          
          {topic.replies.length === 0 ? (
            <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8 text-center">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No replies yet. Be the first to respond!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topic.replies.map(reply => renderReply(reply))}
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div id="reply-form">
          {isAuthenticated && !topic.is_locked ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                {replyingTo ? 'Reply with Quote' : 'Post a Reply'}
              </h3>
              
              {/* Quote preview */}
              {replyingTo && (
                <div className="mb-4 p-3 bg-slate-700/50 border-l-4 border-blue-500 rounded-r-lg relative">
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    <Quote className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-medium">@{replyingTo.author.nickname}</span>
                    <span className="text-xs text-slate-500">wrote:</span>
                  </div>
                  <div className="text-slate-400 text-sm italic pr-8">
                    {replyingTo.content.length > 200 
                      ? replyingTo.content.slice(0, 200) + '...' 
                      : replyingTo.content}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleReplySubmit}>
                <RichTextEditor
                  value={replyContent}
                  onChange={setReplyContent}
                  placeholder="Write your reply... Use @username to mention someone and upload images to enhance your message."
                  token={token || ''}
                />
                <div className="flex items-center justify-end mt-4">
                  <button
                    type="submit"
                    disabled={!replyContent.trim() || submitting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition"
                  >
                    {submitting ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Post Reply
                  </button>
                </div>
              </form>
            </div>
          ) : topic.is_locked ? (
            <div className="bg-slate-800/50 rounded-xl border border-red-500/30 p-6 text-center">
              <Lock className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-slate-400">This topic is locked and no longer accepting replies.</p>
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 text-center">
              <p className="text-slate-400 mb-4">Log in to join the discussion</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Log In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
