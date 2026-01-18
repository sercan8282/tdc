import { useState, useRef } from 'react';
import { Image as ImageIcon, Loader } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  token: string;
}

export default function RichTextEditor({ value, onChange, placeholder, token }: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large (max 10MB)');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('http://localhost:8000/api/forum/images/upload/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Insert image markdown at cursor position
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const imageMarkdown = `\n![image](${data.thumbnail}|${data.url})\n`;
          const newValue = value.substring(0, start) + imageMarkdown + value.substring(end);
          onChange(newValue);
          
          // Set cursor position after inserted image
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + imageMarkdown.length;
            textarea.focus();
          }, 0);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] resize-y"
        style={{ paddingBottom: '50px' }}
      />
      
      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
          <span className="text-sm">Upload Image</span>
        </button>
      </div>
      
      <div className="mt-2 text-xs text-slate-400">
        Tip: You can use <strong>**bold**</strong>, <em>*italic*</em>, and upload images (max 10MB)
      </div>
    </div>
  );
}
