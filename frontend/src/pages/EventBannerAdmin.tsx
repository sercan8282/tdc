import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, Eye, EyeOff, Calendar, Clock, Image, Link as LinkIcon, Loader, X, Save } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

interface EventBanner {
  id: number;
  title: string;
  subtitle: string | null;
  banner_type: 'event' | 'announcement' | 'maintenance' | 'update' | 'stream';
  color_scheme: 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'pink' | 'gradient';
  image: string | null;
  image_url: string | null;
  event_date: string | null;
  show_countdown: boolean;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  is_dismissible: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

const bannerTypes = [
  { value: 'event', label: 'Event', emoji: '🎮' },
  { value: 'announcement', label: 'Announcement', emoji: '📢' },
  { value: 'maintenance', label: 'Maintenance', emoji: '🔧' },
  { value: 'update', label: 'Update', emoji: '🆕' },
  { value: 'stream', label: 'Stream', emoji: '🔴' },
];

const colorSchemes = [
  { value: 'blue', label: 'Blue', class: 'bg-gradient-to-r from-blue-600 to-blue-800' },
  { value: 'purple', label: 'Purple', class: 'bg-gradient-to-r from-purple-600 to-purple-800' },
  { value: 'green', label: 'Green', class: 'bg-gradient-to-r from-green-600 to-green-800' },
  { value: 'red', label: 'Red', class: 'bg-gradient-to-r from-red-600 to-red-800' },
  { value: 'orange', label: 'Orange', class: 'bg-gradient-to-r from-orange-500 to-orange-700' },
  { value: 'pink', label: 'Pink', class: 'bg-gradient-to-r from-pink-500 to-pink-700' },
  { value: 'gradient', label: 'Rainbow', class: 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600' },
];

const emptyBanner: Partial<EventBanner> = {
  title: '',
  subtitle: '',
  banner_type: 'event',
  color_scheme: 'blue',
  event_date: '',
  show_countdown: true,
  link_url: '',
  link_text: '',
  is_active: false,
  is_dismissible: true,
  priority: 0,
  start_date: '',
  end_date: '',
};

export default function EventBannerAdmin() {
  const { token, user } = useAuth();
  const [banners, setBanners] = useState<EventBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<EventBanner> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const res = await fetch('/api/event-banners/', {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setBanners(data.results || data);
        }
      } catch (error) {
        console.error('Failed to fetch banners:', error);
        setMessage({ type: 'error', text: 'Failed to load banners' });
      } finally {
        setLoading(false);
      }
    };
    loadBanners();
  }, [token]);

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/event-banners/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data.results || data);
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error);
      showMessage('error', 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: string, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    setEditingBanner({ ...emptyBanner });
    setIsCreating(true);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleEdit = (banner: EventBanner) => {
    setEditingBanner({ ...banner });
    setIsCreating(false);
    setImageFile(null);
    setImagePreview(banner.image_url);
  };

  const handleCancel = () => {
    setEditingBanner(null);
    setIsCreating(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSave = async () => {
    if (!editingBanner?.title) {
      showMessage('error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', editingBanner.title || '');
      formData.append('subtitle', editingBanner.subtitle || '');
      formData.append('banner_type', editingBanner.banner_type || 'event');
      formData.append('color_scheme', editingBanner.color_scheme || 'blue');
      formData.append('show_countdown', String(editingBanner.show_countdown ?? true));
      formData.append('is_active', String(editingBanner.is_active ?? false));
      formData.append('is_dismissible', String(editingBanner.is_dismissible ?? true));
      formData.append('priority', String(editingBanner.priority ?? 0));
      
      if (editingBanner.event_date) {
        formData.append('event_date', editingBanner.event_date);
      }
      if (editingBanner.link_url) {
        formData.append('link_url', editingBanner.link_url);
      }
      if (editingBanner.link_text) {
        formData.append('link_text', editingBanner.link_text);
      }
      if (editingBanner.start_date) {
        formData.append('start_date', editingBanner.start_date);
      }
      if (editingBanner.end_date) {
        formData.append('end_date', editingBanner.end_date);
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const url = isCreating 
        ? '/api/event-banners/'
        : `/api/event-banners/${editingBanner.id}/`;
      
      const res = await fetch(url, {
        method: isCreating ? 'POST' : 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        showMessage('success', isCreating ? 'Banner created!' : 'Banner updated!');
        fetchBanners();
        handleCancel();
      } else {
        const error = await res.json();
        showMessage('error', error.detail || 'Failed to save banner');
      }
    } catch (error) {
      console.error('Failed to save banner:', error);
      showMessage('error', 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/event-banners/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        showMessage('success', 'Banner deleted!');
        fetchBanners();
      } else {
        showMessage('error', 'Failed to delete banner');
      }
    } catch (error) {
      console.error('Failed to delete banner:', error);
      showMessage('error', 'Failed to delete banner');
    }
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (banner: EventBanner) => {
    try {
      const res = await fetch(`/api/event-banners/${banner.id}/toggle_active/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        fetchBanners();
        showMessage('success', `Banner ${banner.is_active ? 'deactivated' : 'activated'}!`);
      }
    } catch (error) {
      console.error('Failed to toggle banner:', error);
      showMessage('error', 'Failed to toggle banner status');
    }
  };

  const getStatusBadge = (banner: EventBanner) => {
    const now = new Date();
    
    if (!banner.is_active) {
      return <span className="px-2 py-1 text-xs rounded-full bg-slate-600 text-slate-300">Inactive</span>;
    }
    
    if (banner.start_date && new Date(banner.start_date) > now) {
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-600 text-yellow-100">Scheduled</span>;
    }
    
    if (banner.end_date && new Date(banner.end_date) < now) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-600 text-red-100">Expired</span>;
    }
    
    return <span className="px-2 py-1 text-xs rounded-full bg-green-600 text-green-100">Live</span>;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user?.is_staff) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <p className="text-red-400">You don't have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4 pb-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white flex items-center gap-3">
              📢 Event Banner Management
            </h1>
            <p className="text-slate-400 mt-1">Create and manage announcement banners shown above the navigation</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            New Banner
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' :
            'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Edit/Create Form */}
        {editingBanner && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {isCreating ? 'Create New Banner' : 'Edit Banner'}
              </h2>
              <button onClick={handleCancel} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={editingBanner.title || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Event Title"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                    Subtitle
                  </label>
                  <input
                    type="text"
                    value={editingBanner.subtitle || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Additional description"
                  />
                </div>

                {/* Banner Type */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                    Banner Type
                  </label>
                  <select
                    value={editingBanner.banner_type || 'event'}
                    onChange={(e) => setEditingBanner({ ...editingBanner, banner_type: e.target.value as EventBanner['banner_type'] })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {bannerTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.emoji} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Color Scheme */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                    Color Scheme
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorSchemes.map((scheme) => (
                      <button
                        key={scheme.value}
                        onClick={() => setEditingBanner({ ...editingBanner, color_scheme: scheme.value as EventBanner['color_scheme'] })}
                        className={`p-3 rounded-lg ${scheme.class} ${
                          editingBanner.color_scheme === scheme.value 
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' 
                            : 'opacity-60 hover:opacity-100'
                        } transition`}
                        title={scheme.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                    <Image className="w-4 h-4 inline mr-1" />
                    Banner Image
                  </label>
                  <div className="flex items-center gap-4">
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Event Date */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Event Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editingBanner.event_date?.slice(0, 16) || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, event_date: e.target.value ? e.target.value + ':00Z' : '' })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Link URL */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                    <LinkIcon className="w-4 h-4 inline mr-1" />
                    Link URL
                  </label>
                  <input
                    type="url"
                    value={editingBanner.link_url || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, link_url: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>

                {/* Link Text */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                    Link Text
                  </label>
                  <input
                    type="text"
                    value={editingBanner.link_text || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, link_text: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Join Now →"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                    Priority (higher = shown first)
                  </label>
                  <input
                    type="number"
                    value={editingBanner.priority || 0}
                    onChange={(e) => setEditingBanner({ ...editingBanner, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Scheduling */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Start Showing
                    </label>
                    <input
                      type="datetime-local"
                      value={editingBanner.start_date?.slice(0, 16) || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, start_date: e.target.value ? e.target.value + ':00Z' : '' })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-slate-300 mb-1">
                      Stop Showing
                    </label>
                    <input
                      type="datetime-local"
                      value={editingBanner.end_date?.slice(0, 16) || ''}
                      onChange={(e) => setEditingBanner({ ...editingBanner, end_date: e.target.value ? e.target.value + ':00Z' : '' })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBanner.show_countdown ?? true}
                      onChange={(e) => setEditingBanner({ ...editingBanner, show_countdown: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">Show Countdown</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBanner.is_dismissible ?? true}
                      onChange={(e) => setEditingBanner({ ...editingBanner, is_dismissible: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">Dismissible</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingBanner.is_active ?? false}
                      onChange={(e) => setEditingBanner({ ...editingBanner, is_active: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-300">Active</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Preview */}
            {editingBanner.title && (
              <div className="mt-6">
                <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">Preview</label>
                <div className={`relative bg-gradient-to-r ${
                  colorSchemes.find(s => s.value === editingBanner.color_scheme)?.class || colorSchemes[0].class
                } text-white rounded-lg overflow-hidden`}>
                  <div className="relative px-4 py-3">
                    <div className="flex items-center gap-4">
                      {imagePreview && (
                        <img src={imagePreview} alt="" className="w-12 h-12 object-cover rounded-lg" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{bannerTypes.find(t => t.value === editingBanner.banner_type)?.emoji}</span>
                          <span className="font-bold">{editingBanner.title}</span>
                        </div>
                        {editingBanner.subtitle && (
                          <p className="text-sm text-white/80">{editingBanner.subtitle}</p>
                        )}
                      </div>
                      {editingBanner.event_date && editingBanner.show_countdown && (
                        <div className="flex gap-2 text-center">
                          <div className="bg-black/30 px-2 py-1 rounded">
                            <div className="text-xl font-bold">00</div>
                            <div className="text-xs text-white/70">DAYS</div>
                          </div>
                          <div className="bg-black/30 px-2 py-1 rounded">
                            <div className="text-xl font-bold">00</div>
                            <div className="text-xs text-white/70">HRS</div>
                          </div>
                          <div className="bg-black/30 px-2 py-1 rounded">
                            <div className="text-xl font-bold">00</div>
                            <div className="text-xs text-white/70">MIN</div>
                          </div>
                          <div className="bg-black/30 px-2 py-1 rounded">
                            <div className="text-xl font-bold">00</div>
                            <div className="text-xs text-white/70">SEC</div>
                          </div>
                        </div>
                      )}
                      {editingBanner.link_url && (
                        <span className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs md:text-sm font-medium">
                          {editingBanner.link_text || 'Learn More →'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-slate-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Banner'}
              </button>
            </div>
          </div>
        )}

        {/* Banners List */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">All Banners</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : banners.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No event banners yet</p>
              <p className="text-sm mt-1">Create your first banner to announce events and updates!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {banners.map((banner) => (
                <div key={banner.id} className="p-4 hover:bg-slate-700/30 transition">
                  <div className="flex items-center gap-4">
                    {/* Preview Image/Color */}
                    <div className={`w-16 h-16 rounded-lg flex-shrink-0 ${
                      banner.image_url 
                        ? '' 
                        : `bg-gradient-to-r ${colorSchemes.find(s => s.value === banner.color_scheme)?.class || 'from-blue-600 to-blue-800'}`
                    } flex items-center justify-center`}>
                      {banner.image_url ? (
                        <img src={banner.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-2xl">{bannerTypes.find(t => t.value === banner.banner_type)?.emoji}</span>
                      )}
                    </div>

                    {/* Banner Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{banner.title}</span>
                        {getStatusBadge(banner)}
                      </div>
                      {banner.subtitle && (
                        <p className="text-sm text-slate-400 truncate">{banner.subtitle}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          {bannerTypes.find(t => t.value === banner.banner_type)?.emoji}
                          {bannerTypes.find(t => t.value === banner.banner_type)?.label}
                        </span>
                        {banner.event_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(banner.event_date)}
                          </span>
                        )}
                        <span>Priority: {banner.priority}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(banner)}
                        className={`p-2 rounded-lg transition ${
                          banner.is_active 
                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' 
                            : 'bg-slate-600/30 text-slate-400 hover:bg-slate-600/50'
                        }`}
                        title={banner.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleEdit(banner)}
                        className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(banner.id)}
                        className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition"
                        title="Delete"
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

        {/* Delete Confirmation */}
        {deleteConfirm !== null && (
          <ConfirmDialog
            title="Delete Banner"
            message="Are you sure you want to delete this banner? This action cannot be undone."
            onConfirm={() => handleDelete(deleteConfirm)}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}
      </div>
    </div>
  );
}
