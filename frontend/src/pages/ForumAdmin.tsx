import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit, Trash2, GripVertical, Save, X, Loader, MessageSquare, ArrowLeft, Star, Upload, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  is_active: boolean;
  topics_count: number;
  replies_count: number;
}

interface UserRank {
  id: number;
  name: string;
  slug: string;
  min_points: number;
  chevrons: number;
  icon: string;
  image_url: string | null;
  color: string;
}

const colorOptions = [
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
];

const iconOptions = ['🎮', '🖥️', '💻', '🔧', '⚙️', '🎯', '🏆', '💬', '❓', '📢', '🔥', '⚡', '🛡️', '🎪'];

export default function ForumAdmin() {
  const { token, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'categories' | 'ranks'>('categories');
  const [loading, setLoading] = useState(true);
  
  // Categories state
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [editingCategory, setEditingCategory] = useState<ForumCategory | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '💬',
    color: 'blue',
    is_active: true,
  });
  
  // Ranks state
  const [ranks, setRanks] = useState<UserRank[]>([]);
  const [editingRank, setEditingRank] = useState<UserRank | null>(null);
  const [newRank, setNewRank] = useState(false);
  const [rankForm, setRankForm] = useState({
    name: '',
    min_points: 0,
    chevrons: 0,
    icon: '🎖️',
    color: 'gray',
  });
  const [rankImageFile, setRankImageFile] = useState<File | null>(null);
  const [rankImagePreview, setRankImagePreview] = useState<string | null>(null);
  const rankImageInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/forum/categories/', {
        headers: token ? { 'Authorization': `Token ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.results || data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [token]);

  const fetchRanks = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/forum/ranks/', {
        headers: token ? { 'Authorization': `Token ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setRanks(data.results || data);
      }
    } catch (err) {
      console.error('Failed to fetch ranks:', err);
    }
  }, [token]);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchRanks()]).then(() => setLoading(false));
  }, [fetchCategories, fetchRanks]);

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setError('Category name is required');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const url = editingCategory
        ? `http://localhost:8000/api/forum/categories/${editingCategory.id}/`
        : 'http://localhost:8000/api/forum/categories/';
      
      const response = await fetch(url, {
        method: editingCategory ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryForm),
      });

      if (response.ok) {
        await fetchCategories();
        setEditingCategory(null);
        setNewCategory(false);
        setCategoryForm({
          name: '',
          description: '',
          icon: '💬',
          color: 'blue',
          is_active: true,
        });
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to save category');
      }
    } catch {
      setError('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/forum/categories/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });

      if (response.ok) {
        await fetchCategories();
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const handleEditCategory = (category: ForumCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      is_active: category.is_active,
    });
    setNewCategory(false);
  };

  const handleSaveRank = async () => {
    if (!rankForm.name.trim()) {
      setError('Rank name is required');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      const url = editingRank
        ? `http://localhost:8000/api/forum/ranks/${editingRank.id}/`
        : 'http://localhost:8000/api/forum/ranks/';
      
      // Use FormData if there's an image, otherwise use JSON
      let response;
      
      if (rankImageFile) {
        const formData = new FormData();
        formData.append('name', rankForm.name);
        formData.append('min_points', rankForm.min_points.toString());
        formData.append('chevrons', rankForm.chevrons.toString());
        formData.append('icon', rankForm.icon);
        formData.append('color', rankForm.color);
        formData.append('image', rankImageFile);
        
        response = await fetch(url, {
          method: editingRank ? 'PATCH' : 'POST',
          headers: {
            'Authorization': `Token ${token}`,
          },
          body: formData,
        });
      } else {
        response = await fetch(url, {
          method: editingRank ? 'PATCH' : 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rankForm),
        });
      }

      if (response.ok) {
        await fetchRanks();
        setEditingRank(null);
        setNewRank(false);
        setRankForm({
          name: '',
          min_points: 0,
          chevrons: 0,
          icon: '🎖️',
          color: 'gray',
        });
        setRankImageFile(null);
        setRankImagePreview(null);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to save rank');
      }
    } catch {
      setError('Failed to save rank');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRank = async (id: number) => {
    if (!confirm('Are you sure you want to delete this rank?')) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/forum/ranks/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });

      if (response.ok) {
        await fetchRanks();
      }
    } catch (err) {
      console.error('Failed to delete rank:', err);
    }
  };

  const handleEditRank = (rank: UserRank) => {
    setEditingRank(rank);
    setRankForm({
      name: rank.name,
      min_points: rank.min_points,
      chevrons: rank.chevrons,
      icon: rank.icon,
      color: rank.color,
    });
    setRankImageFile(null);
    setRankImagePreview(rank.image_url);
    setNewRank(false);
  };
  
  const handleRankImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be smaller than 5MB');
        return;
      }
      
      setRankImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setRankImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveRankImage = async () => {
    if (editingRank && editingRank.image_url) {
      // Remove image from server
      try {
        const response = await fetch(`http://localhost:8000/api/forum/ranks/${editingRank.id}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: null }),
        });
        
        if (response.ok) {
          await fetchRanks();
        }
      } catch (err) {
        console.error('Failed to remove image:', err);
      }
    }
    setRankImageFile(null);
    setRankImagePreview(null);
    if (rankImageInputRef.current) {
      rankImageInputRef.current.value = '';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/forum" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Forum Administration</h1>
              <p className="text-slate-400 text-sm">Manage categories and user ranks</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('ranks')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'ranks'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4" />
            Ranks ({ranks.length})
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-4">
            {/* Add New Category Button */}
            <button
              onClick={() => {
                setNewCategory(true);
                setEditingCategory(null);
                setCategoryForm({
                  name: '',
                  description: '',
                  icon: '💬',
                  color: 'blue',
                  is_active: true,
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>

            {/* Category Form */}
            {(newCategory || editingCategory) && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Category name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                    <input
                      type="text"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Short description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Icon</label>
                    <div className="flex flex-wrap gap-2">
                      {iconOptions.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, icon })}
                          className={`w-10 h-10 text-xl rounded-lg border transition ${
                            categoryForm.icon === icon
                              ? 'bg-blue-600 border-blue-500'
                              : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, color: color.value })}
                          className={`w-8 h-8 rounded-lg ${color.class} transition ring-2 ${
                            categoryForm.color === color.value ? 'ring-white' : 'ring-transparent'
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={categoryForm.is_active}
                      onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm text-slate-300">Active</label>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveCategory}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setNewCategory(false);
                      setEditingCategory(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Categories List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-center">Topics</th>
                    <th className="px-4 py-3 text-center">Replies</th>
                    <th className="px-4 py-3 text-center">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3">
                        <GripVertical className="w-4 h-4 text-slate-500 cursor-grab" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{category.icon}</span>
                          <span className="text-white font-medium">{category.name}</span>
                          <span className={`w-3 h-3 rounded-full bg-${category.color}-500`}></span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{category.description}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{category.topics_count}</td>
                      <td className="px-4 py-3 text-center text-slate-300">{category.replies_count}</td>
                      <td className="px-4 py-3 text-center">
                        {category.is_active ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-red-400">✗</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
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
          </div>
        )}

        {activeTab === 'ranks' && (
          <div className="space-y-4">
            {/* Add New Rank Button */}
            <button
              onClick={() => {
                setNewRank(true);
                setEditingRank(null);
                setRankForm({
                  name: '',
                  min_points: 0,
                  chevrons: 0,
                  icon: '🎖️',
                  color: 'gray',
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Add Rank
            </button>

            {/* Rank Form */}
            {(newRank || editingRank) && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {editingRank ? 'Edit Rank' : 'New Rank'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                    <input
                      type="text"
                      value={rankForm.name}
                      onChange={(e) => setRankForm({ ...rankForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Rank name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Min Points</label>
                    <input
                      type="number"
                      value={rankForm.min_points}
                      onChange={(e) => setRankForm({ ...rankForm, min_points: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Chevrons (0-5)</label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={rankForm.chevrons}
                      onChange={(e) => setRankForm({ ...rankForm, chevrons: Math.max(0, Math.min(5, parseInt(e.target.value) || 0)) })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">Preview: {'▸'.repeat(rankForm.chevrons) || '(none)'}</p>
                  </div>
                  
                  {/* Custom Image Upload */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Custom Image (optional)</label>
                    <p className="text-xs text-slate-400 mb-3">Upload a custom image for this rank. Image will be automatically resized to 64x64 pixels.</p>
                    
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="w-20 h-20 rounded-lg bg-slate-700 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden">
                        {rankImagePreview ? (
                          <img src={rankImagePreview} alt="Preview" className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-slate-500" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <input
                          ref={rankImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleRankImageChange}
                          className="hidden"
                          id="rank-image-input"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => rankImageInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Image
                          </button>
                          {rankImagePreview && (
                            <button
                              type="button"
                              onClick={handleRemoveRankImage}
                              className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Supports PNG, JPG, GIF. Max 5MB.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Emoji Icon (fallback)</label>
                    <div className="flex flex-wrap gap-2">
                      {['🎖️', '⭐', '🏅', '🎗️', '👑', '💎', '🔰', '🛡️'].map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setRankForm({ ...rankForm, icon })}
                          className={`w-10 h-10 text-xl rounded-lg border transition ${
                            rankForm.icon === icon
                              ? 'bg-blue-600 border-blue-500'
                              : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Used when no custom image is set</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setRankForm({ ...rankForm, color: color.value })}
                          className={`w-8 h-8 rounded-lg ${color.class} transition ring-2 ${
                            rankForm.color === color.value ? 'ring-white' : 'ring-transparent'
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveRank}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                  >
                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setNewRank(false);
                      setEditingRank(null);
                      setRankImageFile(null);
                      setRankImagePreview(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Ranks List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                    <th className="px-4 py-3">Icon/Image</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Min Points</th>
                    <th className="px-4 py-3">Chevrons</th>
                    <th className="px-4 py-3">Color</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {ranks.map((rank) => (
                    <tr key={rank.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-4 py-3">
                        {rank.image_url ? (
                          <img 
                            src={rank.image_url} 
                            alt={rank.name} 
                            className="w-10 h-10 object-contain rounded"
                          />
                        ) : (
                          <span className="text-2xl">{rank.icon}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{rank.name}</td>
                      <td className="px-4 py-3 text-slate-300">{rank.min_points}</td>
                      <td className="px-4 py-3 text-yellow-400">{'▸'.repeat(rank.chevrons)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs bg-${rank.color}-500/20 text-${rank.color}-400 border border-${rank.color}-500/30`}>
                          {rank.color}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditRank(rank)}
                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRank(rank.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
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
          </div>
        )}
      </div>
    </div>
  );
}
