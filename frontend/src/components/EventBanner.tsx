import { useState, useEffect } from 'react';
import { X, ExternalLink, Clock } from 'lucide-react';

interface TimeRemaining {
  expired: boolean;
  total_seconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  banner_type: string;
  color_scheme: string;
  image_url: string | null;
  event_date: string | null;
  show_countdown: boolean;
  time_remaining: TimeRemaining | null;
  link_url: string | null;
  link_text: string | null;
  is_dismissible: boolean;
}

const colorSchemes: Record<string, string> = {
  blue: 'from-blue-600 to-blue-800',
  purple: 'from-purple-600 to-purple-800',
  green: 'from-green-600 to-green-800',
  red: 'from-red-600 to-red-800',
  orange: 'from-orange-500 to-orange-700',
  pink: 'from-pink-500 to-pink-700',
  gradient: 'from-blue-600 via-purple-600 to-pink-600',
};

const bannerTypeIcons: Record<string, string> = {
  event: '🎮',
  announcement: '📢',
  maintenance: '🔧',
  update: '🆕',
  stream: '🔴',
};

export default function EventBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    const fetchActiveBanner = async () => {
      try {
        // Check if banner was dismissed in this session
        const dismissedBanners = JSON.parse(sessionStorage.getItem('dismissedBanners') || '[]');
        console.log('Dismissed banners:', dismissedBanners);
        
        const response = await fetch('http://localhost:8000/api/event-banners/active/');
        console.log('Response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Banner data:', data);
          if (data && !dismissedBanners.includes(data.id)) {
            console.log('Setting banner:', data);
            setBanner(data);
            if (data.time_remaining) {
              setCountdown(data.time_remaining);
            }
          } else {
            console.log('Banner dismissed or no data');
          }
        }
      } catch (error) {
        console.error('Failed to fetch event banner:', error);
      }
    };
    
    fetchActiveBanner();
  }, []);

  useEffect(() => {
    if (!banner?.event_date || !banner?.show_countdown) return;

    // Update countdown every second
    const interval = setInterval(() => {
      const eventDate = new Date(banner.event_date!);
      const now = new Date();
      const diff = eventDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown({ expired: true, total_seconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({
        expired: false,
        total_seconds: Math.floor(diff / 1000),
        days,
        hours,
        minutes,
        seconds,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [banner]);

  const handleDismiss = () => {
    if (banner) {
      const dismissedBanners = JSON.parse(sessionStorage.getItem('dismissedBanners') || '[]');
      dismissedBanners.push(banner.id);
      sessionStorage.setItem('dismissedBanners', JSON.stringify(dismissedBanners));
    }
    setDismissed(true);
  };

  if (!banner || dismissed) return null;

  const gradientClass = colorSchemes[banner.color_scheme] || colorSchemes.blue;

  return (
    <div className={`relative bg-gradient-to-r ${gradientClass} text-white overflow-hidden`}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Image + Content */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Image */}
            {banner.image_url && (
              <div className="hidden sm:block flex-shrink-0">
                <img 
                  src={banner.image_url} 
                  alt={banner.title}
                  className="h-12 w-12 rounded-lg object-cover shadow-lg"
                />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{bannerTypeIcons[banner.banner_type] || '📢'}</span>
                <h3 className="font-bold text-sm sm:text-base truncate">{banner.title}</h3>
              </div>
              {banner.subtitle && (
                <p className="text-xs sm:text-sm text-white/80 truncate">{banner.subtitle}</p>
              )}
            </div>
          </div>

          {/* Center: Countdown */}
          {banner.show_countdown && countdown && !countdown.expired && (
            <div className="hidden md:flex items-center gap-1 bg-black/20 rounded-lg px-3 py-1.5">
              <Clock className="w-4 h-4 mr-1" />
              <CountdownUnit value={countdown.days} label="D" />
              <span className="text-white/60">:</span>
              <CountdownUnit value={countdown.hours} label="H" />
              <span className="text-white/60">:</span>
              <CountdownUnit value={countdown.minutes} label="M" />
              <span className="text-white/60">:</span>
              <CountdownUnit value={countdown.seconds} label="S" />
            </div>
          )}

          {/* Mobile countdown */}
          {banner.show_countdown && countdown && !countdown.expired && (
            <div className="md:hidden flex items-center gap-1 bg-black/20 rounded-lg px-2 py-1 text-xs">
              <span className="font-mono">
                {countdown.days > 0 && `${countdown.days}d `}
                {String(countdown.hours).padStart(2, '0')}:
                {String(countdown.minutes).padStart(2, '0')}:
                {String(countdown.seconds).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Countdown expired */}
          {banner.show_countdown && countdown?.expired && (
            <div className="flex items-center gap-1 bg-green-500/30 rounded-lg px-3 py-1.5 text-sm font-semibold">
              🎉 LIVE NOW!
            </div>
          )}

          {/* Right: Link + Dismiss */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {banner.link_url && (
              <a
                href={banner.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium transition"
              >
                {banner.link_text || 'Learn More'}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {banner.is_dismissible && (
              <button
                onClick={handleDismiss}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[28px]">
      <span className="font-mono font-bold text-base leading-none">{String(value).padStart(2, '0')}</span>
      <span className="text-[10px] text-white/60 uppercase">{label}</span>
    </div>
  );
}
