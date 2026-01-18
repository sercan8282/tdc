import { useState } from 'react';
import { X } from 'lucide-react';

interface ContentRendererProps {
  content: string;
}

export default function ContentRenderer({ content }: ContentRendererProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const renderContent = () => {
    // Split content by newlines
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for image markdown: ![alt](thumbnail|full)
      const imageMatch = line.match(/!\[([^\]]*)\]\(([^|]+)\|([^)]+)\)/);
      
      if (imageMatch) {
        const [, alt, thumbnail, fullUrl] = imageMatch;
        elements.push(
          <div key={i} className="my-4">
            <img
              src={thumbnail}
              alt={alt || 'Image'}
              className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              style={{ maxWidth: '200px', maxHeight: '130px', objectFit: 'cover' }}
              onClick={() => setLightboxImage(fullUrl)}
            />
          </div>
        );
      } else {
        // Process text formatting
        let processedLine = line;
        
        // Bold: **text**
        processedLine = processedLine.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        
        // Italic: *text*
        processedLine = processedLine.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Code: `text`
        processedLine = processedLine.replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-slate-700 rounded text-sm">$1</code>');
        
        // Links: [text](url)
        processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">$1</a>');

        elements.push(
          <p key={i} className="mb-2" dangerouslySetInnerHTML={{ __html: processedLine || '&nbsp;' }} />
        );
      }
    }

    return elements;
  };

  return (
    <>
      <div className="text-slate-200 whitespace-pre-wrap break-words">
        {renderContent()}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
