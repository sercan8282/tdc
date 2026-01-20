import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, Upload, Globe } from 'lucide-react';

interface SiteSettings {
  id: number;
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  updated_at: string;
}

export default function AdminSettings() {
  const { user, token } = useAuth();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/site-settings/');
      const data = await res.json();
      setSettings(data);
      setSiteName(data.site_name);
      setLogoPreview(data.logo_url);
      setFaviconPreview(data.favicon_url);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!token || !user?.is_superuser) {
      setMessage('Only superusers can update settings');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('site_name', siteName);
      
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      if (faviconFile) {
        formData.append('favicon', faviconFile);
      }

      const res = await fetch(`/api/site-settings/${settings?.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setLogoFile(null);
        setFaviconFile(null);
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await res.json();
        setMessage(error.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.is_superuser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <h2 className="text-lg md:text-2xl font-bold text-red-400 mb-2">Access Denied</h2>
            <p className="text-slate-300">Only superusers can access site settings.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 px-4 pb-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl md:text-3xl font-bold text-white">Site Settings</h1>
          </div>
          <p className="text-slate-400">Manage your website configuration</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('success') 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-8 space-y-8">
          {/* Site Name */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
              Site Name
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition"
              placeholder="TDC Gaming"
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
              Logo (max 200x60px)
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg cursor-pointer transition">
                  <Upload className="w-5 h-5" />
                  <span className="text-white">Choose Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                {logoFile && (
                  <p className="text-sm text-slate-400 mt-2">Selected: {logoFile.name}</p>
                )}
              </div>
              {logoPreview && (
                <div className="bg-white p-3 rounded-lg">
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    className="max-h-16 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Favicon Upload */}
          <div>
            <label className="block text-xs md:text-sm font-medium text-slate-300 mb-2">
              Favicon (32x32px)
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg cursor-pointer transition">
                  <Upload className="w-5 h-5" />
                  <span className="text-white">Choose Favicon</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFaviconChange}
                    className="hidden"
                  />
                </label>
                {faviconFile && (
                  <p className="text-sm text-slate-400 mt-2">Selected: {faviconFile.name}</p>
                )}
              </div>
              {faviconPreview && (
                <div className="bg-white p-3 rounded-lg">
                  <img 
                    src={faviconPreview} 
                    alt="Favicon preview" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-slate-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> Logo will be automatically resized to max 200x60px. Favicon will be resized to 32x32px.
          </p>
        </div>
      </div>
    </div>
  );
}
