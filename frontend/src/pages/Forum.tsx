import { useState, useEffect } from 'react';
import { MessageSquare, Pin, Lock, Trash2, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

interface Thread {
  id: number;
  title: string;
  content: string;
  author: number;
  game: number;
  is_pinned: boolean;
  is_locked: boolean;
  post_count: number;
  created_at: string;
}

export default function Forum() {
  const { token } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchThreads();
  }, [currentPage]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/threads/?page=${currentPage}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setThreads(data.results || data);
        if (data.count) {
          setTotalPages(Math.ceil(data.count / 15));
        }
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (id: number, currentState: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/api/threads/${id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_pinned: !currentState }),
      });
      if (response.ok) fetchThreads();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const toggleLock = async (id: number, currentState: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/api/threads/${id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_locked: !currentState }),
      });
      if (response.ok) fetchThreads();
    } catch (error) {
      console.error('Error toggling lock:', error);
    }
  };

  const deleteThread = async (id: number) => {
    if (!confirm('Delete this thread and all its posts?')) return;
    try {
      const response = await fetch(`http://localhost:8000/api/threads/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) fetchThreads();
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  if (loading && threads.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Forum Management</h1>
        <p className="text-slate-400">Moderate threads and posts</p>
      </div>

      <div className="bg-slate-800 rounded-lg border border-slate-700">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className="border-b border-slate-700 last:border-0 p-4 hover:bg-slate-700/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {thread.is_pinned && (
                    <Pin className="w-4 h-4 text-yellow-500" />
                  )}
                  {thread.is_locked && (
                    <Lock className="w-4 h-4 text-red-500" />
                  )}
                  <h3 className="text-lg font-semibold text-white">{thread.title}</h3>
                </div>
                <p className="text-slate-400 text-sm line-clamp-2">{thread.content}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {thread.post_count} posts
                  </span>
                  <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => togglePin(thread.id, thread.is_pinned)}
                  className={`p-2 rounded ${
                    thread.is_pinned
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : 'bg-slate-700 text-slate-400 hover:text-yellow-500'
                  }`}
                  title={thread.is_pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleLock(thread.id, thread.is_locked)}
                  className={`p-2 rounded ${
                    thread.is_locked
                      ? 'bg-red-500/20 text-red-500'
                      : 'bg-slate-700 text-slate-400 hover:text-red-500'
                  }`}
                  title={thread.is_locked ? 'Unlock' : 'Lock'}
                >
                  <Lock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteThread(thread.id)}
                  className="p-2 bg-slate-700 text-slate-400 hover:text-red-500 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {threads.length === 0 && !loading && (
        <div className="text-center text-slate-400 py-12">
          No forum threads yet.
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
