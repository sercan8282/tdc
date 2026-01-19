import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Search, X, UserPlus } from 'lucide-react';

interface User {
  id: number;
  nickname: string;
  avatar: string | null;
}

interface Message {
  id: number;
  sender: number;
  recipient: number;
  sender_info: User;
  recipient_info: User;
  content: string;
  created_at: string;
  read_at: string | null;
  is_read: boolean;
}

interface Conversation {
  user: User;
  last_message_at: string;
  unread_count: number;
  last_message_preview: string;
}

export default function Messages() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New Message Modal
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchConversations();
    
    // Check if starting conversation from location state
    if (location.state?.startConversationWith) {
      const userId = location.state.startConversationWith;
      // Try to find existing conversation or start new one
      fetchConversations().then(() => {
        const conversation = conversations.find(c => c.user.id === userId);
        if (conversation) {
          selectConversation(conversation.user);
        } else {
          // No existing conversation, fetch user info and start new
          startNewConversationWithUser(userId);
        }
      });
      // Clear state
      window.history.replaceState({}, document.title);
    }
    
    // Check if user_id param is present (from notification click)
    const userId = searchParams.get('user_id');
    if (userId) {
      // Find and select that user's conversation
      const numUserId = parseInt(userId);
      fetchConversations().then(() => {
        const conversation = conversations.find(c => c.user.id === numUserId);
        if (conversation) {
          selectConversation(conversation.user);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:8000/api/users/profile/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.id);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:8000/api/auth/messages/conversations/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (user: User) => {
    setSelectedConversation(user);
    
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:8000/api/auth/messages/with_user/?user_id=${user.id}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        // Refresh conversations to update unread count
        fetchConversations();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('http://localhost:8000/api/auth/messages/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: selectedConversation.id,
          content: newMessage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data]);
        setNewMessage('');
        fetchConversations(); // Update conversation list
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };
  
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:8000/api/users/search/?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };
  
  const startNewConversationWithUser = async (userId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`http://localhost:8000/api/users/${userId}/profile/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (res.ok) {
        const userData = await res.json();
        const user: User = {
          id: userData.id,
          nickname: userData.nickname,
          avatar: userData.avatar
        };
        setSelectedConversation(user);
        setMessages([]);
        setShowNewMessageModal(false);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };
  
  const startConversation = (user: User) => {
    setSelectedConversation(user);
    setMessages([]);
    setShowNewMessageModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="p-6 text-white">Loading messages...</div>;
  }

  return (
    <div className="h-[calc(100vh-80px)] flex bg-gray-900">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-700 bg-gray-800 overflow-y-auto">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Messages</h2>
          <button
            onClick={() => setShowNewMessageModal(true)}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            title="New Message"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="divide-y divide-gray-700">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.user.id}
                className={`p-4 hover:bg-gray-700 transition-colors ${
                  selectedConversation?.id === conv.user.id ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar - clickable to profile */}
                  <div
                    className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/user/${conv.user.id}`);
                    }}
                    title="View profile"
                  >
                    {conv.user.avatar ? (
                      <img
                        src={`http://localhost:8000${conv.user.avatar}`}
                        alt={conv.user.nickname}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
                        {conv.user.nickname[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* User info - clickable to open conversation */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => selectConversation(conv.user)}
                  >
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-white font-semibold truncate hover:text-blue-400 transition-colors">
                        {conv.user.nickname}
                      </h3>
                      <span className="text-xs text-gray-400">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {conv.last_message_preview || 'No messages yet'}
                    </p>
                  </div>
                  
                  {/* Unread badge */}
                  {conv.unread_count > 0 && (
                    <div className="flex-shrink-0">
                      <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center space-x-3">
                <div
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/user/${selectedConversation.id}`)}
                  title="View profile"
                >
                  {selectedConversation.avatar ? (
                    <img
                      src={`http://localhost:8000${selectedConversation.avatar}`}
                      alt={selectedConversation.nickname}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
                      {selectedConversation.nickname[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <h3
                  className="text-white font-semibold cursor-pointer hover:text-blue-400 transition-colors"
                  onClick={() => navigate(`/user/${selectedConversation.id}`)}
                  title="View profile"
                >
                  {selectedConversation.nickname}
                </h3>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isSent = message.sender === currentUserId;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isSent
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <div
                        className={`text-xs mt-1 ${
                          isSent ? 'text-blue-200' : 'text-gray-400'
                        }`}
                      >
                        {formatTime(message.created_at)}
                        {isSent && message.is_read && (
                          <span className="ml-2">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
      
      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">New Message</h3>
              <button
                onClick={() => {
                  setShowNewMessageModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="Search users by nickname or email..."
                className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            
            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {searching ? (
                <div className="text-center text-gray-400 py-4">Searching...</div>
              ) : searchResults.length === 0 && searchQuery ? (
                <div className="text-center text-gray-400 py-4">No users found</div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => startConversation(user)}
                      className="flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-650 rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                            {user.nickname.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{user.nickname}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
