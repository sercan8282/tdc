import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, Camera, Save, Loader, AlertCircle, CheckCircle, 
  Lock, Eye, EyeOff, Gamepad2, X, Trash2, Plus, MessageSquare,
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface ProfileData {
  id: number;
  email: string;
  nickname: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar: string | null;
  favorite_games: string[];
  is_streamer: boolean;
  stream_url: string | null;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface RecentReply {
  id: number;
  content: string;
  created_at: string;
  is_edited: boolean;
  likes_count: number;
  topic: {
    id: number;
    title: string;
    slug: string;
    category: {
      name: string;
      slug: string;
    };
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const { token, isAuthenticated, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    nickname: '',
    first_name: '',
    last_name: '',
    is_streamer: false,
    stream_url: '',
    youtube_url: '',
    kick_url: '',
    discord_url: '',
  });
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // MFA reset state
  const [showMfaReset, setShowMfaReset] = useState(false);
  const [mfaResetPassword, setMfaResetPassword] = useState('');
  const [mfaResetError, setMfaResetError] = useState<string | null>(null);
  const [mfaResetSuccess, setMfaResetSuccess] = useState<string | null>(null);
  const [resettingMfa, setResettingMfa] = useState(false);
  
  // Favorite games state (tags)
  const [favoriteGames, setFavoriteGames] = useState<string[]>([]);
  const [newGameTag, setNewGameTag] = useState('');
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Recent replies state
  const [recentReplies, setRecentReplies] = useState<RecentReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [repliesTotalPages, setRepliesTotalPages] = useState(0);
  const [repliesCount, setRepliesCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchRecentReplies(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile/', {
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          nickname: data.nickname || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          is_streamer: data.is_streamer || false,
          stream_url: data.stream_url || '',
          youtube_url: data.youtube_url || '',
          kick_url: data.kick_url || '',
          discord_url: data.discord_url || '',
        });
        setFavoriteGames(data.favorite_games || []);
      } else {
        setError('Failed to load profile');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentReplies = async (page: number) => {
    setRepliesLoading(true);
    try {
      const response = await fetch(`/api/auth/profile/recent-replies/?page=${page}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecentReplies(data.results);
        setRepliesPage(data.current_page);
        setRepliesTotalPages(data.total_pages);
        setRepliesCount(data.count);
      }
    } catch (error) {
      console.error('Failed to load recent replies:', error);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/profile/', {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          favorite_games: favoriteGames,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || Object.values(data).flat().join(', '));
      }
    } catch {
      setError('Connection error');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch('/api/auth/profile/avatar/', {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setSuccess('Avatar uploaded successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to upload avatar');
      }
    } catch {
      setError('Connection error');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('Are you sure you want to delete your avatar?')) return;

    try {
      const response = await fetch('/api/auth/profile/avatar/delete/', {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });

      if (response.ok) {
        setProfile(prev => prev ? { ...prev, avatar: null } : null);
        setSuccess('Avatar deleted');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setError('Connection error');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match');
      setChangingPassword(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/profile/password/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('Password changed successfully. Please log in again.');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        // Token was invalidated, need to re-login
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch {
      setPasswordError('Connection error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleMfaReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResettingMfa(true);
    setMfaResetError(null);
    setMfaResetSuccess(null);

    try {
      const response = await fetch('/api/auth/mfa/reset/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: mfaResetPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMfaResetSuccess('MFA has been reset successfully. You can set it up again.');
        setMfaResetPassword('');
        setShowMfaReset(false);
        fetchProfile(); // Refresh profile to update MFA status
        setTimeout(() => setMfaResetSuccess(null), 5000);
      } else {
        setMfaResetError(data.error || 'Failed to reset MFA');
      }
    } catch {
      setMfaResetError('Connection error');
    } finally {
      setResettingMfa(false);
    }
  };

  const addGameTag = () => {
    const tag = newGameTag.trim();
    if (!tag) return;
    if (favoriteGames.length >= 10) return;
    // Check for duplicates (case insensitive)
    if (favoriteGames.some(g => g.toLowerCase() === tag.toLowerCase())) {
      setNewGameTag('');
      return;
    }
    setFavoriteGames(prev => [...prev, tag]);
    setNewGameTag('');
  };

  const removeGameTag = (index: number) => {
    setFavoriteGames(prev => prev.filter((_, i) => i !== index));
  };

  const handleGameTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addGameTag();
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
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-200">{success}</p>
          </div>
        )}

        {/* Avatar Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-slate-600">
                {profile?.avatar ? (
                  <img
                    src={`${profile.avatar}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition"
              >
                <Camera className="w-4 h-4" />
                Upload New Avatar
              </button>
              {profile?.avatar && (
                <button
                  onClick={handleDeleteAvatar}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Avatar
                </button>
              )}
              <p className="text-slate-500 text-xs">Max 2MB • JPEG, PNG, GIF, WebP</p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
              />
              <p className="text-slate-500 text-xs mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nickname *</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Streamer Section */}
          <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="is_streamer"
                checked={formData.is_streamer}
                onChange={(e) => setFormData(prev => ({ ...prev, is_streamer: e.target.checked, stream_url: e.target.checked ? prev.stream_url : '' }))}
                className="w-5 h-5 bg-slate-700 border-slate-600 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="is_streamer" className="text-sm font-medium text-slate-300 cursor-pointer">
                I am a streamer
              </label>
            </div>
            
            {formData.is_streamer && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Twitch URL</label>
                  <input
                    type="url"
                    value={formData.stream_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, stream_url: e.target.value }))}
                    placeholder="https://twitch.tv/yourname"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">YouTube URL</label>
                  <input
                    type="url"
                    value={formData.youtube_url || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                    placeholder="https://youtube.com/@yourname"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Kick URL</label>
                  <input
                    type="url"
                    value={formData.kick_url || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, kick_url: e.target.value }))}
                    placeholder="https://kick.com/yourname"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Discord URL */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Discord URL</label>
            <input
              type="url"
              value={formData.discord_url || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, discord_url: e.target.value }))}
              placeholder="https://discord.gg/yourserver"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-slate-500 text-xs mt-1">Share your Discord server or profile URL</p>
          </div>

          {/* Favorite Games */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Gamepad2 className="w-4 h-4 inline mr-2" />
              Favorite Games ({favoriteGames.length}/10)
            </label>
            
            {/* Tags Display */}
            <div className="flex flex-wrap gap-2 mb-3">
              {favoriteGames.map((game, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 border border-blue-600/50 text-blue-300 rounded-full text-sm"
                >
                  {game}
                  <button
                    type="button"
                    onClick={() => removeGameTag(index)}
                    className="hover:text-red-400 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add New Tag */}
            {favoriteGames.length < 10 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGameTag}
                  onChange={(e) => setNewGameTag(e.target.value)}
                  onKeyDown={handleGameTagKeyDown}
                  placeholder="Type a game name and press Enter..."
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={addGameTag}
                  disabled={!newGameTag.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            )}
            
            {favoriteGames.length === 0 && (
              <p className="text-slate-500 text-sm mt-2">Add your favorite games as tags</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition"
          >
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Password Change Section */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Change Password
            </h2>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-200 text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-green-900/20 border border-green-700 rounded text-green-200 text-sm">
                  {passwordSuccess}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                    className="w-full px-4 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                    className="w-full px-4 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-600 text-white rounded-lg transition"
              >
                {changingPassword ? <Loader className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          )}
        </div>

        {/* MFA Reset */}
        {profile?.mfa_enabled && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Two-Factor Authentication
            </h2>
            
            {mfaResetSuccess && (
              <div className="mb-4 p-4 bg-green-900/20 border border-green-700 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-green-200">{mfaResetSuccess}</p>
              </div>
            )}

            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">MFA is currently enabled</span>
              </div>
              <p className="text-slate-300 text-sm">
                Your account is protected with two-factor authentication.
              </p>
            </div>

            {!showMfaReset ? (
              <button
                onClick={() => setShowMfaReset(true)}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg transition"
              >
                <AlertCircle className="w-4 h-4" />
                Reset MFA
              </button>
            ) : (
              <form onSubmit={handleMfaReset} className="space-y-4">
                {mfaResetError && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-red-200 text-sm">{mfaResetError}</p>
                  </div>
                )}
                
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 font-semibold text-sm mb-1">Warning</p>
                      <p className="text-slate-300 text-sm">
                        Resetting MFA will disable two-factor authentication. You'll need to set it up again to re-enable it.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm your password
                  </label>
                  <input
                    type="password"
                    value={mfaResetPassword}
                    onChange={(e) => setMfaResetPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={resettingMfa || !mfaResetPassword}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 text-white rounded-lg transition"
                  >
                    {resettingMfa ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    {resettingMfa ? 'Resetting...' : 'Reset MFA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMfaReset(false);
                      setMfaResetPassword('');
                      setMfaResetError(null);
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Account Info */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">MFA Status</span>
              <span className={profile?.mfa_enabled ? 'text-green-400' : 'text-yellow-400'}>
                {profile?.mfa_enabled ? 'Enabled' : 'Not Enabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Member Since</span>
              <span className="text-white">
                {profile?.created_at && new Date(profile.created_at).toLocaleDateString('nl-NL', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Last Updated</span>
              <span className="text-white">
                {profile?.updated_at && new Date(profile.updated_at).toLocaleDateString('nl-NL', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Forum Replies */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Forum Replies
              {repliesCount > 0 && (
                <span className="text-sm text-slate-400">({repliesCount} total)</span>
              )}
            </h2>
          </div>

          {repliesLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : recentReplies.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No forum replies yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {recentReplies.map((reply) => (
                  <Link
                    key={reply.id}
                    to={`/forum/topic/${reply.topic.id}`}
                    className="block p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg border border-slate-600 transition group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-blue-400 group-hover:text-blue-300 font-medium truncate">
                          {reply.topic.title}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {reply.topic.category.name} • {formatTimeAgo(reply.created_at)}
                          {reply.is_edited && <span className="italic"> (edited)</span>}
                        </p>
                      </div>
                      {reply.likes_count > 0 && (
                        <span className="text-xs text-slate-400 flex items-center gap-1 ml-2">
                          <span>👍</span> {reply.likes_count}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm line-clamp-2">
                      {reply.content}
                    </p>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {repliesTotalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
                  <button
                    onClick={() => fetchRecentReplies(repliesPage - 1)}
                    disabled={!repliesPage || repliesPage === 1 || repliesLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  
                  <span className="text-slate-400 text-sm">
                    Page {repliesPage} of {repliesTotalPages}
                  </span>
                  
                  <button
                    onClick={() => fetchRecentReplies(repliesPage + 1)}
                    disabled={repliesPage >= repliesTotalPages || repliesLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
