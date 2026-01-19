import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, Film, Play, ThumbsUp, ThumbsDown, MessageSquare, Eye, 
  X, ChevronLeft, ChevronRight, Hash, Loader, Send, Trash2, LogIn 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface VideoTag {
  id: number;
  name: string;
  description: string;
  color: string;
  video_count: number;
}

interface VideoUploader {
  id: number;
  nickname: string;
  avatar: string | null;
}

interface VideoComment {
  id: number;
  user: VideoUploader;
  content: string;
  parent: number | null;
  replies: VideoComment[];
  reply_count: number;
  created_at: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  video_url?: string;
  embed_url?: string;
  embed_player_url?: string;
  video_source: 'upload' | 'youtube' | 'twitch' | 'kick';
  uploader: VideoUploader;
  tags: VideoTag[];
  view_count: number;
  unique_view_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  is_featured: boolean;
  user_reaction: 'like' | 'dislike' | null;
  comments?: VideoComment[];
  created_at: string;
}

interface PaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Video[];
}

export default function Videos() {
  const { token, isAuthenticated, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || '-created_at');
  
  // Tags
  const [popularTags, setPopularTags] = useState<VideoTag[]>([]);
  
  // Video modal
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  
  // Comments
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [videoComments, setVideoComments] = useState<VideoComment[]>([]);
  
  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const fetchVideos = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedTag) params.set('tag', selectedTag);
      params.set('sort', sortBy);
      params.set('featured_first', 'true');
      
      const response = await axios.get<PaginatedResponse>(
        `http://localhost:8000/api/videos/?${params.toString()}`,
        { headers: { Authorization: `Token ${token}` } }
      );
      
      setVideos(response.data.results);
      setTotalVideos(response.data.count);
      setTotalPages(Math.ceil(response.data.count / 40));
      setError('');
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, debouncedSearch, selectedTag, sortBy]);
  
  const fetchPopularTags = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get<VideoTag[]>(
        'http://localhost:8000/api/videos/tags/popular/?limit=15',
        { headers: { Authorization: `Token ${token}` } }
      );
      setPopularTags(response.data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };
  
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);
  
  useEffect(() => {
    fetchPopularTags();
  }, [token]);

  // Auto-open video if watch parameter is present
  useEffect(() => {
    const watchId = searchParams.get('watch');
    if (watchId && token && !selectedVideo) {
      // Fetch and open the video
      const fetchAndOpenVideo = async () => {
        setVideoLoading(true);
        try {
          const response = await axios.get<Video>(
            `http://localhost:8000/api/videos/${watchId}/`,
            { headers: { Authorization: `Token ${token}` } }
          );
          setSelectedVideo(response.data);
          setVideoComments(response.data.comments || []);
          
          // Record view
          await axios.post(
            `http://localhost:8000/api/videos/${watchId}/view/`,
            {},
            { headers: { Authorization: `Token ${token}` } }
          );
        } catch (err) {
          console.error('Failed to load video:', err);
          // Remove invalid watch param
          const params = new URLSearchParams(searchParams);
          params.delete('watch');
          setSearchParams(params, { replace: true });
        } finally {
          setVideoLoading(false);
        }
      };
      fetchAndOpenVideo();
    }
  }, [searchParams, token, selectedVideo, setSearchParams]);
  
  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedTag) params.set('tag', selectedTag);
    if (sortBy !== '-created_at') params.set('sort', sortBy);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, selectedTag, sortBy, setSearchParams]);
  
  const openVideo = async (video: Video) => {
    setSelectedVideo(video);
    setVideoLoading(true);
    
    try {
      // Fetch full video details
      const response = await axios.get<Video>(
        `http://localhost:8000/api/videos/${video.id}/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      setSelectedVideo(response.data);
      setVideoComments(response.data.comments || []);
      
      // Record view
      await axios.post(
        `http://localhost:8000/api/videos/${video.id}/view/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
    } catch (err) {
      console.error('Failed to load video:', err);
    } finally {
      setVideoLoading(false);
    }
  };
  
  const closeVideo = () => {
    setSelectedVideo(null);
    setVideoComments([]);
    setNewComment('');
    // Refresh video list to update view counts
    fetchVideos();
  };
  
  const handleReaction = async (reactionType: 'like' | 'dislike') => {
    if (!selectedVideo) return;
    
    try {
      const response = await axios.post(
        `http://localhost:8000/api/videos/${selectedVideo.id}/react/`,
        { reaction_type: reactionType },
        { headers: { Authorization: `Token ${token}` } }
      );
      
      setSelectedVideo(prev => prev ? {
        ...prev,
        user_reaction: response.data.user_reaction,
        like_count: response.data.like_count,
        dislike_count: response.data.dislike_count
      } : null);
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };
  
  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo || !newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      const response = await axios.post(
        `http://localhost:8000/api/videos/${selectedVideo.id}/comments/`,
        { content: newComment.trim() },
        { headers: { Authorization: `Token ${token}` } }
      );
      
      setVideoComments(prev => [response.data, ...prev]);
      setNewComment('');
      setSelectedVideo(prev => prev ? {
        ...prev,
        comment_count: prev.comment_count + 1
      } : null);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };
  
  const deleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await axios.delete(
        `http://localhost:8000/api/videos/comments/${commentId}/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      
      setVideoComments(prev => prev.filter(c => c.id !== commentId));
      setSelectedVideo(prev => prev ? {
        ...prev,
        comment_count: prev.comment_count - 1
      } : null);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };
  
  const selectTag = (tagName: string) => {
    setSelectedTag(selectedTag === tagName ? '' : tagName);
    setCurrentPage(1);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Film className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Login Required</h2>
            <p className="text-slate-400 mb-6">
              Please log in to access our video library. Watch gameplay videos, tutorials, and highlights from the community.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                <LogIn className="w-5 h-5" />
                Login
              </Link>
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos, tags, or uploaders..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="-created_at">Newest First</option>
              <option value="created_at">Oldest First</option>
              <option value="-view_count">Most Viewed</option>
              <option value="-like_count">Most Liked</option>
              <option value="title">Title A-Z</option>
              <option value="-title">Title Z-A</option>
            </select>
          </div>
          
          {/* Popular Tags */}
          {popularTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {popularTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => selectTag(tag.name)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    selectedTag === tag.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  style={selectedTag === tag.name ? {} : { borderColor: tag.color, borderWidth: 1 }}
                >
                  <Hash className="w-3 h-3" />
                  {tag.name}
                  <span className="text-xs opacity-70">({tag.video_count})</span>
                </button>
              ))}
              {selectedTag && (
                <button
                  onClick={() => selectTag('')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30"
                >
                  <X className="w-3 h-3" />
                  Clear filter
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400">{error}</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl text-white mb-2">No videos found</h2>
            <p className="text-gray-400">
              {searchQuery || selectedTag 
                ? 'Try adjusting your search or filters'
                : 'No videos have been uploaded yet'
              }
            </p>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-gray-400">
              {totalVideos} video{totalVideos !== 1 ? 's' : ''} found
            </div>
            
            {/* Video Grid - Netflix style */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {videos.map(video => (
                <div
                  key={video.id}
                  onClick={() => openVideo(video)}
                  className="group cursor-pointer"
                >
                  {/* Cover */}
                  <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden mb-2">
                    {video.cover_url ? (
                      <img
                        src={video.cover_url}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-10 h-10 text-gray-600" />
                      </div>
                    )}
                    
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                    
                    {/* Featured badge */}
                    {video.is_featured && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded">
                        Featured
                      </div>
                    )}
                    
                    {/* Video source badge */}
                    {video.video_source !== 'upload' && (
                      <div className={`absolute top-2 right-2 px-1.5 py-0.5 text-xs font-medium rounded ${
                        video.video_source === 'youtube' ? 'bg-red-600 text-white' :
                        video.video_source === 'twitch' ? 'bg-purple-600 text-white' :
                        video.video_source === 'kick' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                      }`}>
                        {video.video_source === 'youtube' ? 'YT' : 
                         video.video_source === 'twitch' ? 'TW' : 
                         video.video_source === 'kick' ? 'KK' : video.video_source}
                      </div>
                    )}
                    
                    {/* Stats overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <div className="flex items-center gap-3 text-xs text-white/80">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {formatNumber(video.view_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {formatNumber(video.like_count)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {video.title}
                  </h3>
                  
                  {/* Tags */}
                  {video.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {video.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag.id}
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: tag.color + '30', color: tag.color }}
                        >
                          #{tag.name}
                        </span>
                      ))}
                      {video.tags.length > 2 && (
                        <span className="text-xs text-gray-500">+{video.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-gray-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-10 h-10 rounded-lg font-medium ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-gray-800 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Video Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeVideo()}
        >
          <div className="w-full max-w-5xl max-h-[90vh] bg-gray-900 rounded-xl overflow-hidden flex flex-col">
            {/* Close button */}
            <button
              onClick={closeVideo}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Video Player */}
            <div className="relative aspect-video bg-black">
              {videoLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader className="w-12 h-12 text-blue-500 animate-spin" />
                </div>
              ) : selectedVideo.video_source === 'upload' && selectedVideo.video_url ? (
                <video
                  src={selectedVideo.video_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              ) : selectedVideo.video_source === 'youtube' && selectedVideo.embed_player_url ? (
                <iframe
                  src={selectedVideo.embed_player_url + '?autoplay=1'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={selectedVideo.title}
                />
              ) : selectedVideo.video_source === 'twitch' && selectedVideo.embed_player_url ? (
                <iframe
                  src={selectedVideo.embed_player_url.replace('{parent}', window.location.hostname)}
                  className="w-full h-full"
                  allowFullScreen
                  title={selectedVideo.title}
                />
              ) : selectedVideo.video_source === 'kick' && selectedVideo.embed_url ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-green-900/20 to-black/80">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="w-10 h-10 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Kick Video</h3>
                    <p className="text-gray-400 mb-4">Kick VODs cannot be embedded. Click to watch on Kick.</p>
                    <a 
                      href={selectedVideo.embed_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                      </svg>
                      Watch on Kick
                    </a>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-400">Video unavailable</p>
                </div>
              )}
            </div>
            
            {/* Video Info & Comments */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Title & Description */}
              <h2 className="text-2xl font-bold text-white mb-2">{selectedVideo.title}</h2>
              
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {formatNumber(selectedVideo.view_count)} views
                </span>
                <span>{formatDate(selectedVideo.created_at)}</span>
                <span className="flex items-center gap-1">
                  by {selectedVideo.uploader.nickname}
                </span>
              </div>
              
              {/* Reactions */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => handleReaction('like')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    selectedVideo.user_reaction === 'like'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <ThumbsUp className="w-5 h-5" />
                  {formatNumber(selectedVideo.like_count)}
                </button>
                <button
                  onClick={() => handleReaction('dislike')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                    selectedVideo.user_reaction === 'dislike'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <ThumbsDown className="w-5 h-5" />
                  {formatNumber(selectedVideo.dislike_count)}
                </button>
              </div>
              
              {/* Tags */}
              {selectedVideo.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedVideo.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="text-sm px-3 py-1 rounded-full"
                      style={{ backgroundColor: tag.color + '30', color: tag.color }}
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Description */}
              {selectedVideo.description && (
                <p className="text-gray-300 whitespace-pre-wrap mb-6">
                  {selectedVideo.description}
                </p>
              )}
              
              {/* Comments */}
              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Comments ({selectedVideo.comment_count})
                </h3>
                
                {/* New Comment Form */}
                <form onSubmit={submitComment} className="mb-6">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {user?.nickname?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                        maxLength={2000}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">{newComment.length}/2000</span>
                        <button
                          type="submit"
                          disabled={!newComment.trim() || submittingComment}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingComment ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
                
                {/* Comments List */}
                <div className="space-y-4">
                  {videoComments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-sm">
                        {comment.user.avatar ? (
                          <img src={comment.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          comment.user.nickname?.charAt(0).toUpperCase() || '?'
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{comment.user.nickname}</span>
                          <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-gray-300">{comment.content}</p>
                        
                        {/* Delete button for own comments or staff */}
                        {(comment.user.id === user?.id || user?.is_staff) && (
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="mt-1 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {videoComments.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No comments yet. Be the first to comment!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
