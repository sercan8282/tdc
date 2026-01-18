import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, Camera, Save, Loader, AlertCircle, CheckCircle, 
  Lock, Eye, EyeOff, Gamepad2, X, Trash2, Plus
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
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
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
  
  // Favorite games state (tags)
  const [favoriteGames, setFavoriteGames] = useState<string[]>([]);
  const [newGameTag, setNewGameTag] = useState('');
  
  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/profile/', {
        headers: { 'Authorization': `Token ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          nickname: data.nickname || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:8000/api/auth/profile/', {
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
      const response = await fetch('http://localhost:8000/api/auth/profile/avatar/', {
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
      const response = await fetch('http://localhost:8000/api/auth/profile/avatar/delete/', {
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
      const response = await fetch('http://localhost:8000/api/auth/profile/password/', {
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
                    src={`http://localhost:8000${profile.avatar}`}
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
      </div>
    </div>
  );
}
