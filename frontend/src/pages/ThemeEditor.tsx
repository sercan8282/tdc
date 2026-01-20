import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, RefreshCw, Eye, Palette, Type, Layout, Box, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ThemeSettings {
  id?: number;
  name: string;
  is_active: boolean;
  
  // Colors - Primary
  primary_color: string;
  primary_hover: string;
  primary_text: string;
  
  // Colors - Secondary
  secondary_color: string;
  secondary_hover: string;
  secondary_text: string;
  
  // Colors - Background
  bg_primary: string;
  bg_secondary: string;
  bg_tertiary: string;
  
  // Colors - Text
  text_primary: string;
  text_secondary: string;
  text_tertiary: string;
  
  // Colors - Border
  border_color: string;
  border_hover: string;
  
  // Colors - Status
  success_color: string;
  warning_color: string;
  error_color: string;
  info_color: string;
  
  // Typography
  font_family_base: string;
  font_family_heading: string;
  font_family_mono: string;
  font_size_base: string;
  font_size_sm: string;
  font_size_lg: string;
  font_size_xl: string;
  
  // Spacing
  spacing_unit: string;
  border_radius_sm: string;
  border_radius_md: string;
  border_radius_lg: string;
  border_radius_xl: string;
  
  // Components
  navbar_bg: string;
  navbar_text: string;
  sidebar_bg: string;
  sidebar_text: string;
  button_radius: string;
  input_radius: string;
  card_radius: string;
  
  // Shadows
  shadow_sm: string;
  shadow_md: string;
  shadow_lg: string;
  
  // Custom CSS
  custom_css: string;
}

type TabType = 'colors' | 'typography' | 'spacing' | 'components' | 'custom';

export default function ThemeEditor() {
  const { token, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('colors');
  const [theme, setTheme] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    fetchTheme();
  }, [isAdmin, token]);

  const fetchTheme = async () => {
    try {
      const res = await fetch('/api/theme-settings/active/', {
        headers: token ? { 'Authorization': `Token ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setTheme(data);
        if (preview) {
          applyThemePreview(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch theme:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyThemePreview = (themeData: ThemeSettings) => {
    const root = document.documentElement;
    
    // Apply all CSS variables
    root.style.setProperty('--color-primary', themeData.primary_color);
    root.style.setProperty('--color-primary-hover', themeData.primary_hover);
    root.style.setProperty('--color-secondary', themeData.secondary_color);
    root.style.setProperty('--bg-primary', themeData.bg_primary);
    root.style.setProperty('--bg-secondary', themeData.bg_secondary);
    root.style.setProperty('--bg-tertiary', themeData.bg_tertiary);
    root.style.setProperty('--text-primary', themeData.text_primary);
    root.style.setProperty('--text-secondary', themeData.text_secondary);
    root.style.setProperty('--border-color', themeData.border_color);
    root.style.setProperty('--radius-md', themeData.border_radius_md);
    
    // Apply to body
    document.body.style.backgroundColor = themeData.bg_primary;
    document.body.style.color = themeData.text_primary;
  };

  const handleSave = async () => {
    if (!theme) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const url = theme.id 
        ? `/api/theme-settings/${theme.id}/`
        : '/api/theme-settings/';
      
      const res = await fetch(url, {
        method: theme.id ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(theme),
      });

      if (res.ok) {
        const data = await res.json();
        setTheme(data);
        setMessage('Theme saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save theme');
      }
    } catch (err) {
      console.error('Save error:', err);
      setMessage('Error saving theme');
    } finally {
      setSaving(false);
    }
  };

  const togglePreview = () => {
    setPreview(!preview);
    if (!preview && theme) {
      applyThemePreview(theme);
    } else {
      // Reset to default
      window.location.reload();
    }
  };

  const handleChange = (field: keyof ThemeSettings, value: string | boolean) => {
    if (!theme) return;
    
    const updated = { ...theme, [field]: value };
    setTheme(updated);
    
    if (preview) {
      applyThemePreview(updated);
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Access denied. Admin only.</p>
      </div>
    );
  }

  if (loading || !theme) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Palette className="w-8 h-8" />
              Theme Editor
            </h1>
            <p className="text-gray-400 mt-1">Customize your site's appearance</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={togglePreview}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              preview 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Eye className="w-4 h-4" />
            {preview ? 'Preview On' : 'Preview Off'}
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Theme
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.includes('success') ? 'bg-green-900/50 text-green-200' : 'bg-red-900/50 text-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {[
          { id: 'colors', label: 'Colors', icon: Palette },
          { id: 'typography', label: 'Typography', icon: Type },
          { id: 'spacing', label: 'Spacing', icon: Layout },
          { id: 'components', label: 'Components', icon: Box },
          { id: 'custom', label: 'Custom CSS', icon: Box },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-gray-800 rounded-lg p-6">
        {activeTab === 'colors' && (
          <div className="space-y-6">
            <ColorSection
              title="Primary Colors"
              fields={[
                { label: 'Primary', key: 'primary_color', value: theme.primary_color },
                { label: 'Primary Hover', key: 'primary_hover', value: theme.primary_hover },
                { label: 'Primary Text', key: 'primary_text', value: theme.primary_text },
              ]}
              onChange={handleChange}
            />
            
            <ColorSection
              title="Secondary Colors"
              fields={[
                { label: 'Secondary', key: 'secondary_color', value: theme.secondary_color },
                { label: 'Secondary Hover', key: 'secondary_hover', value: theme.secondary_hover },
                { label: 'Secondary Text', key: 'secondary_text', value: theme.secondary_text },
              ]}
              onChange={handleChange}
            />
            
            <ColorSection
              title="Background Colors"
              fields={[
                { label: 'Primary Background', key: 'bg_primary', value: theme.bg_primary },
                { label: 'Secondary Background', key: 'bg_secondary', value: theme.bg_secondary },
                { label: 'Tertiary Background', key: 'bg_tertiary', value: theme.bg_tertiary },
              ]}
              onChange={handleChange}
            />
            
            <ColorSection
              title="Text Colors"
              fields={[
                { label: 'Primary Text', key: 'text_primary', value: theme.text_primary },
                { label: 'Secondary Text', key: 'text_secondary', value: theme.text_secondary },
                { label: 'Tertiary Text', key: 'text_tertiary', value: theme.text_tertiary },
              ]}
              onChange={handleChange}
            />
            
            <ColorSection
              title="Border Colors"
              fields={[
                { label: 'Border', key: 'border_color', value: theme.border_color },
                { label: 'Border Hover', key: 'border_hover', value: theme.border_hover },
              ]}
              onChange={handleChange}
            />
            
            <ColorSection
              title="Status Colors"
              fields={[
                { label: 'Success', key: 'success_color', value: theme.success_color },
                { label: 'Warning', key: 'warning_color', value: theme.warning_color },
                { label: 'Error', key: 'error_color', value: theme.error_color },
                { label: 'Info', key: 'info_color', value: theme.info_color },
              ]}
              onChange={handleChange}
            />
          </div>
        )}

        {activeTab === 'typography' && (
          <div className="space-y-4">
            <InputField
              label="Base Font Family"
              value={theme.font_family_base}
              onChange={(v) => handleChange('font_family_base', v)}
            />
            <InputField
              label="Heading Font Family"
              value={theme.font_family_heading}
              onChange={(v) => handleChange('font_family_heading', v)}
            />
            <InputField
              label="Monospace Font Family"
              value={theme.font_family_mono}
              onChange={(v) => handleChange('font_family_mono', v)}
            />
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <InputField
                label="Base Font Size"
                value={theme.font_size_base}
                onChange={(v) => handleChange('font_size_base', v)}
              />
              <InputField
                label="Small Font Size"
                value={theme.font_size_sm}
                onChange={(v) => handleChange('font_size_sm', v)}
              />
              <InputField
                label="Large Font Size"
                value={theme.font_size_lg}
                onChange={(v) => handleChange('font_size_lg', v)}
              />
              <InputField
                label="XL Font Size"
                value={theme.font_size_xl}
                onChange={(v) => handleChange('font_size_xl', v)}
              />
            </div>
          </div>
        )}

        {activeTab === 'spacing' && (
          <div className="space-y-4">
            <InputField
              label="Spacing Unit"
              value={theme.spacing_unit}
              onChange={(v) => handleChange('spacing_unit', v)}
              help="Base spacing unit (e.g., 4px)"
            />
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <InputField
                label="Small Radius"
                value={theme.border_radius_sm}
                onChange={(v) => handleChange('border_radius_sm', v)}
              />
              <InputField
                label="Medium Radius"
                value={theme.border_radius_md}
                onChange={(v) => handleChange('border_radius_md', v)}
              />
              <InputField
                label="Large Radius"
                value={theme.border_radius_lg}
                onChange={(v) => handleChange('border_radius_lg', v)}
              />
              <InputField
                label="XL Radius"
                value={theme.border_radius_xl}
                onChange={(v) => handleChange('border_radius_xl', v)}
              />
            </div>
          </div>
        )}

        {activeTab === 'components' && (
          <div className="space-y-6">
            <ColorSection
              title="Navbar"
              fields={[
                { label: 'Background', key: 'navbar_bg', value: theme.navbar_bg },
                { label: 'Text', key: 'navbar_text', value: theme.navbar_text },
              ]}
              onChange={handleChange}
            />
            
            <ColorSection
              title="Sidebar"
              fields={[
                { label: 'Background', key: 'sidebar_bg', value: theme.sidebar_bg },
                { label: 'Text', key: 'sidebar_text', value: theme.sidebar_text },
              ]}
              onChange={handleChange}
            />
            
            <div className="grid grid-cols-3 gap-4">
              <InputField
                label="Button Radius"
                value={theme.button_radius}
                onChange={(v) => handleChange('button_radius', v)}
              />
              <InputField
                label="Input Radius"
                value={theme.input_radius}
                onChange={(v) => handleChange('input_radius', v)}
              />
              <InputField
                label="Card Radius"
                value={theme.card_radius}
                onChange={(v) => handleChange('card_radius', v)}
              />
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom CSS
            </label>
            <textarea
              value={theme.custom_css}
              onChange={(e) => handleChange('custom_css', e.target.value)}
              className="w-full h-96 bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="/* Add your custom CSS here */"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function ColorSection({ title, fields, onChange }: {
  title: string;
  fields: Array<{ label: string; key: string; value: string }>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fields.map((field) => (
          <ColorPicker
            key={field.key}
            label={field.label}
            value={field.value}
            onChange={(v) => onChange(field.key, v)}
          />
        ))}
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-gray-900 text-gray-100 rounded px-3 py-2 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, help }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-900 text-gray-100 rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
      {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
    </div>
  );
}
