import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RichTextEditor from '../components/RichTextEditor';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export default function ForumNewTopic() {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/forum/categories/');
      if (res.ok) {
        const data = await res.json();
        const cats = data.results || data;
        setCategories(cats);
        
        // Pre-select category from URL param
        const categorySlug = searchParams.get('category');
        if (categorySlug) {
          const cat = cats.find((c: Category) => c.slug === categorySlug);
          if (cat) setCategoryId(cat.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/forum/topics/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          category: categoryId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Navigate to topic detail page - use ID only since that's all we need
        navigate(`/forum/topic/${data.id}`);
      } else {
        const data = await res.json();
        setError(data.error || data.title?.[0] || data.content?.[0] || 'Failed to create topic');
      }
    } catch {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
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
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link to="/forum" className="hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Forum
          </Link>
          <span>/</span>
          <span className="text-white">New Topic</span>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h1 className="text-2xl font-bold text-white mb-6">Create New Topic</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Category *
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(Number(e.target.value) || null)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title..."
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                minLength={5}
                maxLength={300}
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                {title.length}/300 characters (minimum 5)
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Content *
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your topic content... Be descriptive and clear. You can format text and upload images."
                token={token || ''}
              />
            </div>

            {/* Tips */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-2">Tips for a great topic:</h3>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Use a clear, descriptive title</li>
                <li>• Provide enough context for others to understand</li>
                <li>• If asking for help, include relevant details</li>
                <li>• Be respectful and follow community guidelines</li>
              </ul>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4">
              <Link
                to="/forum"
                className="px-4 py-2 text-slate-400 hover:text-white transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim() || !categoryId}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition"
              >
                {submitting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Create Topic
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
