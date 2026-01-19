import { useState, useRef, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Loader } from 'lucide-react';

interface MentionUser {
  id: number;
  nickname: string;
  avatar_url: string | null;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  token: string;
}

export default function RichTextEditor({ value, onChange, placeholder, token }: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  // Search for users when mention query changes
  useEffect(() => {
    if (mentionQuery.length >= 1) {
      const searchUsers = async () => {
        try {
          const response = await fetch(
            `/api/forum/users/?q=${encodeURIComponent(mentionQuery)}`,
            {
              headers: { 'Authorization': `Token ${token}` },
            }
          );
          if (response.ok) {
            const users = await response.json();
            setMentionUsers(users);
            setShowMentions(users.length > 0);
            setSelectedMentionIndex(0);
          }
        } catch (error) {
          console.error('Failed to search users:', error);
        }
      };
      searchUsers();
    } else {
      setMentionUsers([]);
      setShowMentions(false);
    }
  }, [mentionQuery, token]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    
    // Check for @ mention
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStartPos(cursorPos - atMatch[0].length);
      
      // Calculate position for dropdown
      const textarea = textareaRef.current;
      if (textarea) {
        // Simple positioning - could be improved with a library
        const lines = textBeforeCursor.split('\n');
        const lineHeight = 24; // approximate
        const top = Math.min(lines.length * lineHeight, 150);
        setMentionPosition({ top: top + 10, left: 10 });
      }
    } else {
      setMentionQuery('');
      setShowMentions(false);
      setMentionStartPos(null);
    }
  };

  const insertMention = useCallback((user: MentionUser) => {
    if (mentionStartPos === null) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const beforeMention = value.substring(0, mentionStartPos);
    const afterMention = value.substring(cursorPos);
    const newValue = `${beforeMention}@${user.nickname} ${afterMention}`;
    
    onChange(newValue);
    setShowMentions(false);
    setMentionQuery('');
    setMentionStartPos(null);
    
    // Set cursor position after mention
    setTimeout(() => {
      const newCursorPos = mentionStartPos + user.nickname.length + 2; // +2 for @ and space
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);
  }, [mentionStartPos, value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || mentionUsers.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < mentionUsers.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : mentionUsers.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        if (showMentions) {
          e.preventDefault();
          insertMention(mentionUsers[selectedMentionIndex]);
        }
        break;
      case 'Escape':
        setShowMentions(false);
        setMentionQuery('');
        break;
    }
  };

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

      const response = await fetch('/api/forum/images/upload/', {
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
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] resize-y"
        style={{ paddingBottom: '50px' }}
      />
      
      {/* Mention dropdown */}
      {showMentions && mentionUsers.length > 0 && (
        <div 
          ref={mentionRef}
          className="absolute z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto"
          style={{ top: mentionPosition.top, left: mentionPosition.left, minWidth: '200px' }}
        >
          {mentionUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-700 transition ${
                index === selectedMentionIndex ? 'bg-slate-700' : ''
              }`}
            >
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.nickname} 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
                  <span className="text-sm text-slate-300">{user.nickname[0].toUpperCase()}</span>
                </div>
              )}
              <span className="text-white font-medium">@{user.nickname}</span>
            </button>
          ))}
        </div>
      )}
      
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
        Tip: Use <span className="text-blue-400">@username</span> to mention someone, <strong>**bold**</strong>, <em>*italic*</em>, and upload images (max 10MB)
      </div>
    </div>
  );
}
