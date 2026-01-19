import { useState, useEffect } from 'react';
import { 
  Film, Plus, Edit, Trash2, Eye, ThumbsUp, ThumbsDown, MessageSquare,
  Upload, X, Loader, Hash, Check, Search, ChevronLeft, ChevronRight, Layers, Play, ExternalLink, Save, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface VideoTag {
  id: number;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  video_count: number;
}

interface TagProfile {
  id: number;
  name: string;
  description: string;
  color: string;
  tags: VideoTag[];
  tag_count: number;
  tag_names: string[];
  is_active: boolean;
}

interface VideoComment {
  id: number;
  user: { id: number; nickname: string };
  content: string;
  created_at: string;
  replies: VideoComment[];
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
  uploader: { id: number; nickname: string };
  tags: VideoTag[];
  view_count: number;
  unique_view_count: number;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  comments?: VideoComment[];
}

export default function VideoAdmin() {
  const { token, user } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'videos' | 'tags' | 'profiles'>('videos');
  
  // Videos state
  const [videos, setVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videoSearch, setVideoSearch] = useState('');
  const [videoPage, setVideoPage] = useState(1);
  const [totalVideoPages, setTotalVideoPages] = useState(1);
  
  // Tags state
  const [tags, setTags] = useState<VideoTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  
  // Profiles state
  const [profiles, setProfiles] = useState<TagProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  
  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    video_file: null as File | null,
    cover_image: null as File | null,
    embed_url: '',
    upload_type: 'file' as 'file' | 'embed',
    tag_ids: [] as number[],
    is_active: true,
    is_featured: false
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  
  // Tag modal
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<VideoTag | null>(null);
  const [tagForm, setTagForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    is_active: true
  });
  const [savingTag, setSavingTag] = useState(false);
  const [tagError, setTagError] = useState('');
  
  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<TagProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
    tag_ids: [] as number[],
    is_active: true
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  
  // Apply profile modal
  const [showApplyProfileModal, setShowApplyProfileModal] = useState(false);
  const [applyingToVideo, setApplyingToVideo] = useState<Video | null>(null);
  const [applyMode, setApplyMode] = useState<'add' | 'replace'>('add');
  
  // Edit video modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    tag_ids: [] as number[],
    is_active: true,
    is_featured: false
  });
  const [savingVideo, setSavingVideo] = useState(false);
  const [editError, setEditError] = useState('');
  
  // View video modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<Video | null>(null);
  const [videoComments, setVideoComments] = useState<VideoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Fetch videos (admin endpoint - 20 per page)
  const fetchVideos = async () => {
    setVideosLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', videoPage.toString());
      if (videoSearch) params.set('search', videoSearch);
      
      const response = await axios.get(
        `/api/videos/admin/?${params.toString()}`,
        { headers: { Authorization: `Token ${token}` } }
      );
      
      setVideos(response.data.results);
      setTotalVideoPages(Math.ceil(response.data.count / 20));
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setVideosLoading(false);
    }
  };

  // Fetch tags
  const fetchTags = async () => {
    setTagsLoading(true);
    try {
      const response = await axios.get(
        '/api/videos/tags/',
        { headers: { Authorization: `Token ${token}` } }
      );
      setTags(response.data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    } finally {
      setTagsLoading(false);
    }
  };
  
  // Fetch profiles
  const fetchProfiles = async () => {
    setProfilesLoading(true);
    try {
      const response = await axios.get(
        '/api/videos/profiles/',
        { headers: { Authorization: `Token ${token}` } }
      );
      setProfiles(response.data);
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    } finally {
      setProfilesLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [videoPage, videoSearch]);

  useEffect(() => {
    fetchTags();
    fetchProfiles();
  }, []);

  // Upload video
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on upload type
    if (uploadForm.upload_type === 'file') {
      if (!uploadForm.video_file) {
        setUploadError('Video file is required');
        return;
      }
    } else {
      if (!uploadForm.embed_url) {
        setUploadError('Embed URL is required');
        return;
      }
    }

    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      
      if (uploadForm.upload_type === 'file' && uploadForm.video_file) {
        formData.append('video_file', uploadForm.video_file);
      } else if (uploadForm.embed_url) {
        formData.append('embed_url', uploadForm.embed_url);
      }
      
      if (uploadForm.cover_image) {
        formData.append('cover_image', uploadForm.cover_image);
      }
      
      uploadForm.tag_ids.forEach(id => formData.append('tag_ids', id.toString()));

      await axios.post(
        '/api/videos/upload/',
        formData,
        {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setUploadProgress(progress);
          }
        }
      );

      setShowUploadModal(false);
      setUploadForm({
        title: '',
        description: '',
        video_file: null,
        cover_image: null,
        embed_url: '',
        upload_type: 'file',
        tag_ids: [],
        is_active: true,
        is_featured: false
      });
      fetchVideos();
    } catch (err: any) {
      setUploadError(err.response?.data?.error || err.response?.data?.embed_url?.[0] || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Save tag
  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTag(true);
    setTagError('');

    try {
      if (editingTag) {
        await axios.put(
          `/api/videos/tags/${editingTag.id}/`,
          tagForm,
          { headers: { Authorization: `Token ${token}` } }
        );
      } else {
        await axios.post(
          '/api/videos/tags/',
          tagForm,
          { headers: { Authorization: `Token ${token}` } }
        );
      }

      setShowTagModal(false);
      setEditingTag(null);
      setTagForm({ name: '', description: '', color: '#3B82F6', is_active: true });
      fetchTags();
    } catch (err: any) {
      setTagError(err.response?.data?.error || err.response?.data?.name?.[0] || 'Failed to save tag');
    } finally {
      setSavingTag(false);
    }
  };

  // Delete tag
  const handleDeleteTag = async (tagId: number) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      await axios.delete(
        `/api/videos/tags/${tagId}/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      fetchTags();
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  // Delete video
  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This cannot be undone.')) return;

    try {
      await axios.delete(
        `/api/videos/${videoId}/delete/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      fetchVideos();
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };
  
  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError('');

    try {
      if (editingProfile) {
        await axios.put(
          `/api/videos/profiles/${editingProfile.id}/`,
          profileForm,
          { headers: { Authorization: `Token ${token}` } }
        );
      } else {
        await axios.post(
          '/api/videos/profiles/',
          profileForm,
          { headers: { Authorization: `Token ${token}` } }
        );
      }

      setShowProfileModal(false);
      setEditingProfile(null);
      setProfileForm({ name: '', description: '', color: '#8B5CF6', tag_ids: [], is_active: true });
      fetchProfiles();
    } catch (err: any) {
      setProfileError(err.response?.data?.error || err.response?.data?.name?.[0] || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };
  
  // Delete profile
  const handleDeleteProfile = async (profileId: number) => {
    if (!confirm('Are you sure you want to delete this tag profile?')) return;

    try {
      await axios.delete(
        `/api/videos/profiles/${profileId}/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      fetchProfiles();
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };
  
  // Apply profile to video
  const handleApplyProfile = async (profileId: number) => {
    if (!applyingToVideo) return;
    
    try {
      await axios.post(
        `/api/videos/${applyingToVideo.id}/apply-profile/${profileId}/`,
        { mode: applyMode },
        { headers: { Authorization: `Token ${token}` } }
      );
      setShowApplyProfileModal(false);
      setApplyingToVideo(null);
      fetchVideos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to apply profile');
    }
  };

  // Open edit modal
  const openEditModal = (video: Video) => {
    setEditingVideo(video);
    setEditForm({
      title: video.title || '',
      description: video.description || '',
      tag_ids: video.tags?.map(t => t.id) || [],
      is_active: video.is_active ?? true,
      is_featured: video.is_featured ?? false
    });
    setEditError('');
    setShowEditModal(true);
  };

  // Save edited video
  const handleSaveVideo = async () => {
    if (!editingVideo) return;
    
    setSavingVideo(true);
    setEditError('');
    
    try {
      await axios.put(
        `/api/videos/${editingVideo.id}/update/`,
        editForm,
        { headers: { Authorization: `Token ${token}` } }
      );
      
      setShowEditModal(false);
      setEditingVideo(null);
      fetchVideos();
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Failed to save video');
    } finally {
      setSavingVideo(false);
    }
  };

  // Open view modal with video and comments
  const openViewModal = async (video: Video) => {
    setViewingVideo(video);
    setShowViewModal(true);
    setLoadingComments(true);
    
    try {
      const response = await axios.get(
        `/api/videos/${video.id}/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      setViewingVideo(response.data);
      setVideoComments(response.data.comments || []);
    } catch (err) {
      console.error('Failed to fetch video details:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Toggle video active status
  const toggleVideoActive = async (video: Video) => {
    const newStatus = !video.is_active;
    
    // Optimistically update the UI
    setVideos(prev => prev.map(v => 
      v.id === video.id ? { ...v, is_active: newStatus } : v
    ));
    
    try {
      await axios.put(
        `/api/videos/${video.id}/update/`,
        { is_active: newStatus },
        { headers: { Authorization: `Token ${token}` } }
      );
    } catch (err) {
      console.error('Failed to toggle video status:', err);
      // Revert on error
      setVideos(prev => prev.map(v => 
        v.id === video.id ? { ...v, is_active: !newStatus } : v
      ));
      alert('Failed to update video status');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await axios.delete(
        `/api/videos/comments/${commentId}/`,
        { headers: { Authorization: `Token ${token}` } }
      );
      // Refresh comments
      if (viewingVideo) {
        const response = await axios.get(
          `/api/videos/${viewingVideo.id}/`,
          { headers: { Authorization: `Token ${token}` } }
        );
        setViewingVideo(response.data);
        setVideoComments(response.data.comments || []);
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!user?.is_staff) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You need staff permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Film className="w-8 h-8 text-blue-500" />
              Video Management
            </h1>
            <p className="text-gray-400 mt-1">Upload and manage videos</p>
          </div>
          
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Upload className="w-5 h-5" />
            Upload Video
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'videos'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Film className="w-4 h-4 inline mr-2" />
            Videos ({videos.length})
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'tags'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Hash className="w-4 h-4 inline mr-2" />
            Tags ({tags.length})
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'profiles'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            Tag Profiles ({profiles.length})
          </button>
        </div>

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={videoSearch}
                  onChange={(e) => { setVideoSearch(e.target.value); setVideoPage(1); }}
                  placeholder="Search videos..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Videos List */}
            {videosLoading ? (
              <div className="flex justify-center py-12">
                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No videos found</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Video</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Tags</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Stats</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Date</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {videos.map(video => (
                      <tr key={video.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-12 bg-gray-700 rounded overflow-hidden flex-shrink-0 relative">
                              {video.cover_url ? (
                                <img src={video.cover_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="w-6 h-6 text-gray-500" />
                                </div>
                              )}
                              {/* Video source badge */}
                              {video.video_source !== 'upload' && (
                                <span className={`absolute bottom-0 left-0 text-xs px-1 py-0.5 rounded-tr font-medium ${
                                  video.video_source === 'youtube' ? 'bg-red-600 text-white' :
                                  video.video_source === 'twitch' ? 'bg-purple-600 text-white' :
                                  video.video_source === 'kick' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                                }`}>
                                  {video.video_source === 'youtube' ? 'YT' : 
                                   video.video_source === 'twitch' ? 'TW' : 
                                   video.video_source === 'kick' ? 'KK' : video.video_source}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">{video.title}</p>
                              <p className="text-gray-500 text-sm">{video.uploader.nickname}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {video.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag.id}
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ backgroundColor: tag.color + '30', color: tag.color }}
                              >
                                #{tag.name}
                              </span>
                            ))}
                            {video.tags.length > 3 && (
                              <span className="text-xs text-gray-500">+{video.tags.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {video.view_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-4 h-4" />
                              {video.like_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-4 h-4" />
                              {video.comment_count}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleVideoActive(video)}
                              className={`p-1.5 rounded transition ${
                                video.is_active 
                                  ? 'text-green-400 hover:text-green-300 hover:bg-green-600/20' 
                                  : 'text-red-400 hover:text-red-300 hover:bg-red-600/20'
                              }`}
                              title={video.is_active ? 'Click to deactivate' : 'Click to activate'}
                            >
                              {video.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>
                            <div className="flex flex-col gap-1">
                              {video.is_active ? (
                                <span className="text-xs px-2 py-0.5 bg-green-600/20 text-green-400 rounded">Active</span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 bg-red-600/20 text-red-400 rounded">Inactive</span>
                              )}
                              {video.is_featured && (
                                <span className="text-xs px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded">Featured</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {formatDate(video.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openViewModal(video)}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-600/20 rounded transition"
                              title="View Video"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <a
                              href={`/videos?watch=${video.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-600/20 rounded transition"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => openEditModal(video)}
                              className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-600/20 rounded transition"
                              title="Edit Video"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setApplyingToVideo(video);
                                setShowApplyProfileModal(true);
                              }}
                              className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-600/20 rounded transition"
                              title="Apply Tag Profile"
                            >
                              <Layers className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(video.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded transition"
                              title="Delete Video"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalVideoPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setVideoPage(p => Math.max(1, p - 1))}
                  disabled={videoPage === 1}
                  className="p-2 bg-gray-800 rounded-lg text-white disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-gray-400">
                  Page {videoPage} of {totalVideoPages}
                </span>
                <button
                  onClick={() => setVideoPage(p => Math.min(totalVideoPages, p + 1))}
                  disabled={videoPage === totalVideoPages}
                  className="p-2 bg-gray-800 rounded-lg text-white disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tags Tab */}
        {activeTab === 'tags' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => {
                  setEditingTag(null);
                  setTagForm({ name: '', description: '', color: '#3B82F6', is_active: true });
                  setShowTagModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <Plus className="w-5 h-5" />
                Add Tag
              </button>
            </div>

            {tagsLoading ? (
              <div className="flex justify-center py-12">
                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <Hash className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No tags created yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tags.map(tag => (
                  <div
                    key={tag.id}
                    className="bg-gray-800 rounded-lg p-4 border-l-4"
                    style={{ borderColor: tag.color }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded text-sm"
                            style={{ backgroundColor: tag.color + '30', color: tag.color }}
                          >
                            #{tag.name}
                          </span>
                          {!tag.is_active && (
                            <span className="text-xs px-2 py-0.5 bg-red-600/20 text-red-400 rounded">Inactive</span>
                          )}
                        </h3>
                        {tag.description && (
                          <p className="text-gray-400 text-sm mt-2">{tag.description}</p>
                        )}
                        <p className="text-gray-500 text-sm mt-2">
                          {tag.video_count} video{tag.video_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTag(tag);
                            setTagForm({
                              name: tag.name,
                              description: tag.description,
                              color: tag.color,
                              is_active: tag.is_active
                            });
                            setShowTagModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Tag Profiles Tab */}
        {activeTab === 'profiles' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => {
                  setEditingProfile(null);
                  setProfileForm({ name: '', description: '', color: '#8B5CF6', tag_ids: [], is_active: true });
                  setShowProfileModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Plus className="w-5 h-5" />
                New Profile
              </button>
            </div>

            {profilesLoading ? (
              <div className="flex justify-center py-12">
                <Loader className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No tag profiles created yet</p>
                <p className="text-gray-500 text-sm mt-1">Create a profile to quickly assign tags to videos</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map(profile => (
                  <div
                    key={profile.id}
                    className="bg-gray-800 rounded-lg p-4 border-l-4"
                    style={{ borderColor: profile.color }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                          <Layers className="w-5 h-5" style={{ color: profile.color }} />
                          {profile.name}
                          {!profile.is_active && (
                            <span className="text-xs px-2 py-0.5 bg-red-600/20 text-red-400 rounded">Inactive</span>
                          )}
                        </h3>
                        {profile.description && (
                          <p className="text-gray-400 text-sm mt-2">{profile.description}</p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {profile.tags.slice(0, 5).map(tag => (
                            <span
                              key={tag.id}
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ backgroundColor: tag.color + '30', color: tag.color }}
                            >
                              #{tag.name}
                            </span>
                          ))}
                          {profile.tags.length > 5 && (
                            <span className="text-xs text-gray-500">+{profile.tags.length - 5} meer</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-2">
                          {profile.tag_count} tag{profile.tag_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingProfile(profile);
                            setProfileForm({
                              name: profile.name,
                              description: profile.description,
                              color: profile.color,
                              tag_ids: profile.tags.map(t => t.id),
                              is_active: profile.is_active
                            });
                            setShowProfileModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Upload Video</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  required
                  maxLength={200}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={4}
                  maxLength={5000}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{uploadForm.description.length}/5000</p>
              </div>

              {/* Video Source Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Video Source *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="upload_type"
                      value="file"
                      checked={uploadForm.upload_type === 'file'}
                      onChange={() => setUploadForm({ ...uploadForm, upload_type: 'file', embed_url: '' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-300">Upload File</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="upload_type"
                      value="embed"
                      checked={uploadForm.upload_type === 'embed'}
                      onChange={() => setUploadForm({ ...uploadForm, upload_type: 'embed', video_file: null })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-300">Embed URL (YouTube, Twitch, Kick)</span>
                  </label>
                </div>
              </div>

              {/* Video File Input - shown when upload_type is 'file' */}
              {uploadForm.upload_type === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Video File * (max 500MB)</label>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
                    onChange={(e) => setUploadForm({ ...uploadForm, video_file: e.target.files?.[0] || null })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                  {uploadForm.video_file && (
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {uploadForm.video_file.name} ({(uploadForm.video_file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              )}

              {/* Embed URL Input - shown when upload_type is 'embed' */}
              {uploadForm.upload_type === 'embed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Embed URL *</label>
                  <input
                    type="url"
                    value={uploadForm.embed_url}
                    onChange={(e) => setUploadForm({ ...uploadForm, embed_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=... or https://www.twitch.tv/videos/... or https://kick.com/..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported: YouTube, Twitch (videos, clips, channels), Kick
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cover Image {uploadForm.upload_type === 'file' ? '(optional, max 5MB)' : '(optional, max 5MB)'}
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setUploadForm({ ...uploadForm, cover_image: e.target.files?.[0] || null })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tags (select up to 50)</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-700 rounded-lg max-h-40 overflow-y-auto">
                  {tags.filter(t => t.is_active).map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (uploadForm.tag_ids.includes(tag.id)) {
                          setUploadForm({
                            ...uploadForm,
                            tag_ids: uploadForm.tag_ids.filter(id => id !== tag.id)
                          });
                        } else if (uploadForm.tag_ids.length < 50) {
                          setUploadForm({
                            ...uploadForm,
                            tag_ids: [...uploadForm.tag_ids, tag.id]
                          });
                        }
                      }}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition ${
                        uploadForm.tag_ids.includes(tag.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {uploadForm.tag_ids.includes(tag.id) && <Check className="w-3 h-3" />}
                      #{tag.name}
                    </button>
                  ))}
                  {tags.filter(t => t.is_active).length === 0 && (
                    <p className="text-gray-500 text-sm">No tags available. Create tags first.</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadForm.tag_ids.length}/50 selected</p>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">Uploading...</span>
                    <span className="text-gray-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {uploading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingTag ? 'Edit Tag' : 'Add Tag'}
              </h2>
              <button onClick={() => setShowTagModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveTag} className="p-6 space-y-4">
              {tagError && (
                <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400">
                  {tagError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tag Name *</label>
                <input
                  type="text"
                  value={tagForm.name}
                  onChange={(e) => setTagForm({ ...tagForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  required
                  maxLength={50}
                  placeholder="gaming"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Only letters, numbers and underscores</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={tagForm.description}
                  onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={tagForm.color}
                    onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <span
                    className="px-3 py-1 rounded text-sm font-medium"
                    style={{ backgroundColor: tagForm.color + '30', color: tagForm.color }}
                  >
                    #{tagForm.name || 'preview'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tag-active"
                  checked={tagForm.is_active}
                  onChange={(e) => setTagForm({ ...tagForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="tag-active" className="text-gray-300">Active (visible for selection)</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTagModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTag}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {savingTag && <Loader className="w-4 h-4 animate-spin" />}
                  {editingTag ? 'Save Changes' : 'Create Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-6 h-6 text-purple-500" />
                {editingProfile ? 'Edit Profile' : 'New Profile'}
              </h2>
              <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {profileError && (
                <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400">
                  {profileError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profile Name *</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                  maxLength={100}
                  placeholder="Gaming Content"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={profileForm.description}
                  onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                  rows={2}
                  placeholder="Describe this profile..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Kleur</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={profileForm.color}
                    onChange={(e) => setProfileForm({ ...profileForm, color: e.target.value })}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <span
                    className="flex items-center gap-1 px-3 py-1 rounded text-sm font-medium"
                    style={{ backgroundColor: profileForm.color + '30', color: profileForm.color }}
                  >
                    <Layers className="w-4 h-4" />
                    {profileForm.name || 'Preview'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags in this profile ({profileForm.tag_ids.length} selected)
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-700 rounded-lg max-h-48 overflow-y-auto">
                  {tags.filter(t => t.is_active).map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (profileForm.tag_ids.includes(tag.id)) {
                          setProfileForm({
                            ...profileForm,
                            tag_ids: profileForm.tag_ids.filter(id => id !== tag.id)
                          });
                        } else {
                          setProfileForm({
                            ...profileForm,
                            tag_ids: [...profileForm.tag_ids, tag.id]
                          });
                        }
                      }}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition ${
                        profileForm.tag_ids.includes(tag.id)
                          ? ''
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                      style={profileForm.tag_ids.includes(tag.id) ? {
                        backgroundColor: tag.color + '30',
                        color: tag.color
                      } : {}}
                    >
                      {profileForm.tag_ids.includes(tag.id) && <Check className="w-3 h-3" />}
                      #{tag.name}
                    </button>
                  ))}
                  {tags.filter(t => t.is_active).length === 0 && (
                    <p className="text-gray-500 text-sm">No tags available. Create tags first.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="profile-active"
                  checked={profileForm.is_active}
                  onChange={(e) => setProfileForm({ ...profileForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="profile-active" className="text-gray-300">Active (available for selection)</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || profileForm.tag_ids.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  {savingProfile && <Loader className="w-4 h-4 animate-spin" />}
                  {editingProfile ? 'Save' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Apply Profile Modal */}
      {showApplyProfileModal && applyingToVideo && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Apply Tag Profile</h2>
              <button onClick={() => { setShowApplyProfileModal(false); setApplyingToVideo(null); }} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-300 mb-4">
                Choose a profile to apply to: <span className="text-white font-medium">{applyingToVideo.title}</span>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="radio"
                      name="applyMode"
                      value="add"
                      checked={applyMode === 'add'}
                      onChange={() => setApplyMode('add')}
                      className="w-4 h-4"
                    />
                    Add tags to existing
                  </label>
                  <label className="flex items-center gap-2 text-gray-300">
                    <input
                      type="radio"
                      name="applyMode"
                      value="replace"
                      checked={applyMode === 'replace'}
                      onChange={() => setApplyMode('replace')}
                      className="w-4 h-4"
                    />
                    Replace all tags
                  </label>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {profiles.filter(p => p.is_active).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No active profiles available</p>
                ) : (
                  profiles.filter(p => p.is_active).map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => handleApplyProfile(profile.id)}
                      className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5" style={{ color: profile.color }} />
                        <span className="text-white font-medium">{profile.name}</span>
                        <span className="text-gray-500 text-sm">({profile.tag_count} tags)</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {profile.tags.slice(0, 6).map(tag => (
                          <span
                            key={tag.id}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ backgroundColor: tag.color + '30', color: tag.color }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                        {profile.tags.length > 6 && (
                          <span className="text-xs text-gray-500">+{profile.tags.length - 6}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => { setShowApplyProfileModal(false); setApplyingToVideo(null); }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      {showEditModal && editingVideo && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800">
              <h2 className="text-xl font-bold text-white">Edit Video</h2>
              <button onClick={() => { setShowEditModal(false); setEditingVideo(null); }} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                <div className="w-24 h-16 bg-gray-600 rounded overflow-hidden flex-shrink-0">
                  {editingVideo.cover_url ? (
                    <img src={editingVideo.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Uploader: {editingVideo.uploader.nickname}</p>
                  <p className="text-gray-400 text-sm">Posted: {formatDate(editingVideo.created_at)}</p>
                </div>
              </div>

              {editError && (
                <div className="p-3 bg-red-600/20 border border-red-500 rounded-lg text-red-400 text-sm">
                  {editError}
                </div>
              )}
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-700 rounded-lg max-h-40 overflow-y-auto">
                  {tags.filter(t => t.is_active).map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setEditForm(prev => ({
                          ...prev,
                          tag_ids: prev.tag_ids.includes(tag.id)
                            ? prev.tag_ids.filter(id => id !== tag.id)
                            : [...prev.tag_ids, tag.id]
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition flex items-center gap-1 ${
                        editForm.tag_ids.includes(tag.id)
                          ? 'ring-2 ring-white'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: tag.color + '30', color: tag.color }}
                    >
                      {editForm.tag_ids.includes(tag.id) && <Check className="w-3 h-3" />}
                      #{tag.name}
                    </button>
                  ))}
                </div>
                <p className="text-gray-500 text-sm mt-1">{editForm.tag_ids.length} tags selected</p>
              </div>
              
              {/* Status checkboxes */}
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  Active (visible to users)
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={editForm.is_featured}
                    onChange={(e) => setEditForm({ ...editForm, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  Featured
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowEditModal(false); setEditingVideo(null); }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVideo}
                disabled={savingVideo || !editForm.title.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {savingVideo ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Video Modal */}
      {showViewModal && viewingVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
              <h2 className="text-xl font-bold text-white truncate">{viewingVideo.title}</h2>
              <button onClick={() => { setShowViewModal(false); setViewingVideo(null); setVideoComments([]); }} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* Video Player */}
              <div className="aspect-video bg-black">
                {viewingVideo.video_source === 'upload' && viewingVideo.video_url ? (
                  <video
                    src={viewingVideo.video_url}
                    controls
                    className="w-full h-full"
                    poster={viewingVideo.cover_url}
                  />
                ) : viewingVideo.video_source === 'youtube' && viewingVideo.embed_player_url ? (
                  <iframe
                    src={viewingVideo.embed_player_url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={viewingVideo.title}
                  />
                ) : viewingVideo.video_source === 'twitch' && viewingVideo.embed_player_url ? (
                  <iframe
                    src={viewingVideo.embed_player_url.replace('{parent}', window.location.hostname)}
                    className="w-full h-full"
                    allowFullScreen
                    title={viewingVideo.title}
                  />
                ) : viewingVideo.video_source === 'kick' && viewingVideo.embed_url ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-green-900/20 to-black/80">
                    <div className="text-center p-8">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Play className="w-10 h-10 text-green-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Kick Video</h3>
                      <p className="text-gray-400 mb-4">Kick VODs cannot be embedded.</p>
                      <a 
                        href={viewingVideo.embed_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Watch on Kick
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Film className="w-16 h-16 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500">Video not available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Video Details */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{viewingVideo.title}</h3>
                    <p className="text-gray-400 mt-1">By {viewingVideo.uploader.nickname} • {formatDate(viewingVideo.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-gray-400">
                      <Eye className="w-4 h-4" /> {viewingVideo.view_count} views
                    </span>
                    <span className="flex items-center gap-1 text-green-400">
                      <ThumbsUp className="w-4 h-4" /> {viewingVideo.like_count}
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <ThumbsDown className="w-4 h-4" /> {viewingVideo.dislike_count}
                    </span>
                  </div>
                </div>
                
                {/* Status badges */}
                <div className="flex gap-2 mb-4">
                  {viewingVideo.is_active ? (
                    <span className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded">Active</span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded">Inactive</span>
                  )}
                  {viewingVideo.is_featured && (
                    <span className="text-xs px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded">Featured</span>
                  )}
                  {/* Video source badge */}
                  <span className={`text-xs px-2 py-1 rounded ${
                    viewingVideo.video_source === 'upload' ? 'bg-blue-600/20 text-blue-400' :
                    viewingVideo.video_source === 'youtube' ? 'bg-red-600/20 text-red-400' :
                    viewingVideo.video_source === 'twitch' ? 'bg-purple-600/20 text-purple-400' :
                    viewingVideo.video_source === 'kick' ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-400'
                  }`}>
                    {viewingVideo.video_source === 'upload' ? 'Uploaded' : 
                     viewingVideo.video_source === 'youtube' ? 'YouTube' : 
                     viewingVideo.video_source === 'twitch' ? 'Twitch' : 
                     viewingVideo.video_source === 'kick' ? 'Kick' : viewingVideo.video_source}
                  </span>
                </div>
                
                {/* Description */}
                {viewingVideo.description && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Description</h4>
                    <p className="text-gray-300 whitespace-pre-wrap">{viewingVideo.description}</p>
                  </div>
                )}
                
                {/* Tags */}
                {viewingVideo.tags.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingVideo.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="px-3 py-1 rounded-full text-sm"
                          style={{ backgroundColor: tag.color + '30', color: tag.color }}
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Comments */}
                <div>
                  <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Comments ({viewingVideo.comment_count})
                  </h4>
                  
                  {loadingComments ? (
                    <div className="flex justify-center py-8">
                      <Loader className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  ) : videoComments.length === 0 ? (
                    <div className="text-center py-8 bg-gray-700/50 rounded-lg">
                      <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500">No comments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {videoComments.map(comment => (
                        <div key={comment.id} className="bg-gray-700/50 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-white">{comment.user.nickname}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded transition"
                                title="Delete comment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-300">{comment.content}</p>
                          
                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-600 space-y-3">
                              {comment.replies.map(reply => (
                                <div key={reply.id}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-white text-sm">{reply.user.nickname}</span>
                                    <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
                                    <button
                                      onClick={() => handleDeleteComment(reply.id)}
                                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded transition"
                                      title="Delete reply"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <p className="text-gray-400 text-sm">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer actions */}
            <div className="p-4 border-t border-gray-700 flex justify-between items-center bg-gray-800">
              <a
                href={`/videos?watch=${viewingVideo.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Open in new tab
              </a>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(viewingVideo);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => { setShowViewModal(false); setViewingVideo(null); setVideoComments([]); }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
