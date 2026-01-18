import { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id: number;
  notification_type: string;
  notifier: {
    id: number;
    nickname: string;
    avatar_url: string | null;
  };
  message: string;
  is_read: boolean;
  created_at: string;
  topic_id: number | null;
  topic_title: string | null;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/forum/notifications/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both paginated and non-paginated responses
        const notificationList = Array.isArray(data) ? data : (data.results || []);
        setNotifications(notificationList);
        setUnreadCount(notificationList.filter((n: Notification) => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [token]);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/forum/notifications/unread_count/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [token, fetchNotifications, fetchUnreadCount]);

  const markAsRead = async (notificationId: number) => {
    if (!token) return;
    
    try {
      await fetch(`http://localhost:8000/api/forum/notifications/${notificationId}/mark_read/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      await fetch('http://localhost:8000/api/forum/notifications/mark_all_read/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.topic_id) {
      setShowDropdown(false);
      navigate(`/forum/topic/${notification.topic_id}`);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '💬';
      case 'reply':
        return '↩️';
      case 'like':
        return '❤️';
      default:
        return '🔔';
    }
  };

  if (!token) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-300 hover:text-white transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-[500px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 text-2xl mt-1">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold">{notification.notifier.nickname}</span>
                          {' '}
                          {notification.notification_type === 'mention' && 'mentioned you'}
                          {notification.notification_type === 'reply' && 'replied'}
                          {notification.notification_type === 'like' && 'liked your post'}
                        </p>
                        {notification.topic_title && (
                          <p className="text-sm text-gray-600 mt-1 truncate">
                            in "{notification.topic_title}"
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {getTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      
                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="flex-shrink-0 mt-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
