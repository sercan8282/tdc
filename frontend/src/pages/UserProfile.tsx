import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Twitch, Trophy, MessageSquare, Youtube } from 'lucide-react';
import axios from 'axios';

// Kick icon component (custom SVG since lucide doesn't have it)
const KickIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.87-.95-7-5.5-7-10V8.3l7-3.5 7 3.5V10c0 4.5-3.13 9.05-7 10z"/>
  </svg>
);

interface Game {
  id: number;
  name: string;
  image: string;
}

interface ForumPost {
  id: number;
  title: string;
  content: string;
  created_at: string;
  topic_id: number;
  topic_title: string;
}

interface UserProfileData {
  id: number;
  nickname: string;
  name: string;
  avatar: string | null;
  favorite_games: Game[];
  is_streamer: boolean;
  stream_url: string;
  youtube_url?: string;
  kick_url?: string;
  discord_url?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  forum_stats?: {
    post_count: number;
    recent_posts: ForumPost[];
  };
}

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/api/auth/${userId}/profile/`, {
        headers: {
          Authorization: `Token ${localStorage.getItem('authToken')}`
        }
      });
      setProfile(response.data);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (profile) {
      navigate('/messages', { state: { startConversationWith: profile.id } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error || 'User not found'}</div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.nickname}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl font-bold">
                    {profile.nickname ? profile.nickname.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>

              {/* Name and Info */}
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{profile.nickname || 'Unknown User'}</h1>
                {profile.name && profile.name !== profile.nickname && (
                  <p className="text-gray-400 text-lg">{profile.name}</p>
                )}
                
                {/* Badges */}
                <div className="mt-2 flex items-center space-x-2">
                  {/* Administrator Badge */}
                  {(profile.is_staff || profile.is_superuser) && (
                    <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full flex items-center space-x-1">
                      <Trophy className="w-4 h-4" />
                      <span>Administrator</span>
                    </span>
                  )}
                  
                  {/* Streamer Badge */}
                  {profile.is_streamer && (
                    <span className="px-3 py-1 bg-purple-600 text-white text-sm font-semibold rounded-full flex items-center space-x-1">
                      <Twitch className="w-4 h-4" />
                      <span>Streamer</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Send Message Button */}
            <button
              onClick={handleSendMessage}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Mail className="w-5 h-5" />
              <span>Send Message</span>
            </button>
          </div>

          {/* Social Links */}
          {(profile.stream_url || profile.youtube_url || profile.kick_url || profile.discord_url) && (
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
              {/* Twitch/Stream URL */}
              {profile.stream_url && (
                <a
                  href={profile.stream_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <Twitch className="w-5 h-5" />
                  <span className="font-medium">{profile.stream_url}</span>
                </a>
              )}

              {/* YouTube URL */}
              {profile.youtube_url && (
                <a
                  href={profile.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Youtube className="w-5 h-5" />
                  <span className="font-medium">{profile.youtube_url}</span>
                </a>
              )}

              {/* Kick URL */}
              {profile.kick_url && (
                <a
                  href={profile.kick_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-green-400 hover:text-green-300 transition-colors"
                >
                  <KickIcon className="w-5 h-5" />
                  <span className="font-medium">{profile.kick_url}</span>
                </a>
              )}

              {/* Discord URL */}
              {profile.discord_url && (
                <a
                  href={profile.discord_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span className="font-medium">{profile.discord_url}</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Favorite Games */}
        {profile.favorite_games && profile.favorite_games.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span>Favorite Games</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {profile.favorite_games.map((game) => (
                <div
                  key={game.id}
                  className="bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                  onClick={() => navigate(`/games/${game.id}`)}
                >
                  {game.image && (
                    <img
                      src={game.image}
                      alt={game.name}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <div className="p-3">
                    <p className="text-white font-medium text-sm truncate">{game.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forum Activity */}
        {profile.forum_stats && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-green-500" />
              <span>Forum Activity</span>
            </h2>
            
            <div className="mb-4">
              <p className="text-gray-400">
                Total Posts: <span className="text-white font-semibold">{profile.forum_stats.post_count}</span>
              </p>
            </div>

            {profile.forum_stats.recent_posts && profile.forum_stats.recent_posts.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white mb-2">Recent Posts</h3>
                {profile.forum_stats.recent_posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors cursor-pointer"
                    onClick={() => navigate(`/forum/topic/${post.topic_id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">{post.topic_title}</h4>
                      <span className="text-gray-400 text-sm">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm line-clamp-2">{post.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
