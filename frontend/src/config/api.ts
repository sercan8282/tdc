// API Configuration
// Uses VITE_API_URL from environment, or falls back to relative URLs for production

const isDevelopment = import.meta.env.DEV;

// In production, VITE_API_URL should be set during build (e.g., https://turkdostclan.online)
// In development, use localhost:8000
// If no VITE_API_URL is set in production, use relative URLs (same origin)
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:8000' 
  : (import.meta.env.VITE_API_URL || '');

export const getApiUrl = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

// For media URLs (images, avatars, etc.)
export const getMediaUrl = (path: string): string => {
  if (!path) return '';
  // If already a full URL, return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
