import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, User, MessageSquare, Heart, Loader } from 'lucide-react';

interface UserRank {
  id: number;
  name: string;
  slug: string;
  min_points: number;
  chevrons: number;
  icon: string;
  image_url: string | null;
  color: string;
}

interface LeaderboardUser {
  user: {
    id: number;
    nickname: string;
    avatar_url: string | null;
    rank: UserRank | null;
    stats: {
      total_topics: number;
      total_replies: number;
      points: number;
    };
    created_at: string;
  };
  points: number;
  rank: UserRank | null;
}

interface AllRank {
  id: number;
  name: string;
  slug: string;
  min_points: number;
  chevrons: number;
  icon: string;
  image_url: string | null;
  color: string;
}

const rankColorMap: Record<string, string> = {
  gray: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  green: 'text-green-400 bg-green-500/10 border-green-500/30',
  blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  red: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const podiumColors = [
  'from-yellow-500/20 to-yellow-600/10 border-yellow-500/50', // Gold
  'from-slate-400/20 to-slate-500/10 border-slate-400/50',    // Silver
  'from-amber-700/20 to-amber-800/10 border-amber-700/50',    // Bronze
];

const podiumIcons = [
  <Trophy className="w-8 h-8 text-yellow-500" />,
  <Medal className="w-8 h-8 text-slate-400" />,
  <Award className="w-8 h-8 text-amber-700" />,
];

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [allRanks, setAllRanks] = useState<AllRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'ranks'>('leaderboard');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [leaderRes, ranksRes] = await Promise.all([
        fetch('/api/forum/stats/leaderboard/?limit=20'),
        fetch('/api/forum/ranks/'),
      ]);

      if (leaderRes.ok) {
        const data = await leaderRes.json();
        setLeaderboard(data);
      }

      if (ranksRes.ok) {
        const data = await ranksRes.json();
        setAllRanks(data.results || data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChevrons = (count: number, color: string) => {
    const chevronColor = color === 'yellow' ? 'text-yellow-400' : 
                        color === 'orange' ? 'text-orange-400' :
                        color === 'red' ? 'text-red-400' :
                        color === 'purple' ? 'text-purple-400' :
                        color === 'blue' ? 'text-blue-400' :
                        color === 'green' ? 'text-green-400' : 'text-gray-400';
    
    return (
      <span className={`font-bold ${chevronColor}`}>
        {'▸'.repeat(count)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-white mb-2">🏆 Leaderboard</h1>
          <p className="text-slate-400">Top contributors in our community</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'leaderboard'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Top Members
          </button>
          <button
            onClick={() => setActiveTab('ranks')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'ranks'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Ranks
          </button>
        </div>

        {activeTab === 'leaderboard' ? (
          <>
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* 2nd Place */}
                <div className={`bg-gradient-to-b ${podiumColors[1]} rounded-xl border p-4 text-center mt-8`}>
                  <div className="flex justify-center mb-2">{podiumIcons[1]}</div>
                  <div className="text-lg md:text-2xl font-bold text-slate-300 mb-2">2</div>
                  <div className="w-16 h-16 rounded-full bg-slate-700 mx-auto mb-2 overflow-hidden">
                    {leaderboard[1]?.user.avatar_url ? (
                      <img src={leaderboard[1].user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="text-white font-semibold truncate">{leaderboard[1]?.user.nickname}</div>
                  <div className="text-slate-400 text-sm">{leaderboard[1]?.points} pts</div>
                </div>

                {/* 1st Place */}
                <div className={`bg-gradient-to-b ${podiumColors[0]} rounded-xl border p-4 text-center`}>
                  <div className="flex justify-center mb-2">{podiumIcons[0]}</div>
                  <div className="text-lg md:text-2xl font-bold text-yellow-400 mb-2">1</div>
                  <div className="w-20 h-20 rounded-full bg-slate-700 mx-auto mb-2 overflow-hidden ring-4 ring-yellow-500/50">
                    {leaderboard[0]?.user.avatar_url ? (
                      <img src={leaderboard[0].user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-10 h-10 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="text-white font-semibold truncate">{leaderboard[0]?.user.nickname}</div>
                  <div className="text-yellow-400 text-xs md:text-sm font-medium">{leaderboard[0]?.points} pts</div>
                </div>

                {/* 3rd Place */}
                <div className={`bg-gradient-to-b ${podiumColors[2]} rounded-xl border p-4 text-center mt-12`}>
                  <div className="flex justify-center mb-2">{podiumIcons[2]}</div>
                  <div className="text-lg md:text-2xl font-bold text-amber-600 mb-2">3</div>
                  <div className="w-14 h-14 rounded-full bg-slate-700 mx-auto mb-2 overflow-hidden">
                    {leaderboard[2]?.user.avatar_url ? (
                      <img src={leaderboard[2].user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-7 h-7 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="text-white font-semibold truncate">{leaderboard[2]?.user.nickname}</div>
                  <div className="text-slate-400 text-sm">{leaderboard[2]?.points} pts</div>
                </div>
              </div>
            )}

            {/* Rest of Leaderboard */}
            {leaderboard.length > 0 ? (
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                      <th className="px-4 py-3 w-16">#</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3 text-center hidden sm:table-cell">Topics</th>
                      <th className="px-4 py-3 text-center hidden sm:table-cell">Replies</th>
                      <th className="px-4 py-3 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {leaderboard.slice(3).map((entry, index) => (
                      <tr key={entry.user.id} className="hover:bg-slate-700/30 transition">
                        <td className="px-4 py-3 text-slate-500 font-medium">{index + 4}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                              {entry.user.avatar_url ? (
                                <img src={entry.user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-slate-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-white font-medium">{entry.user.nickname}</div>
                              {entry.rank && (
                                <div className={`text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 ${rankColorMap[entry.rank.color]}`}>
                                  {entry.rank.chevrons > 0 && renderChevrons(entry.rank.chevrons, entry.rank.color)}
                                  <span>{entry.rank.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400 hidden sm:table-cell">
                          <span className="flex items-center justify-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {entry.user.stats.total_topics}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400 hidden sm:table-cell">
                          <span className="flex items-center justify-center gap-1">
                            <Heart className="w-4 h-4" />
                            {entry.user.stats.total_replies}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-white font-semibold">{entry.points}</span>
                          <span className="text-slate-500 text-sm ml-1">pts</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
                <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No rankings yet</h3>
                <p className="text-slate-400 mb-4">Be the first to earn points by posting topics and replies!</p>
                <Link
                  to="/forum"
                  className="inline-flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                >
                  Go to Forum
                </Link>
              </div>
            )}

            {/* How to earn points */}
            <div className="mt-8 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">📊 How to earn points</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Create Topic</div>
                    <div className="text-sm text-slate-400">+10 points</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Post Reply</div>
                    <div className="text-sm text-slate-400">+5 points</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                  <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Receive Like</div>
                    <div className="text-sm text-slate-400">+2 points</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* All Ranks Tab */
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Military Ranks</h3>
              <p className="text-sm text-slate-400">Earn points to climb the ranks!</p>
            </div>
            <div className="divide-y divide-slate-700">
              {allRanks.map((rank, index) => (
                <div key={rank.id} className="p-4 flex items-center gap-4 hover:bg-slate-700/30 transition">
                  <div className="w-8 text-center text-slate-500 font-medium">{index + 1}</div>
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border ${rankColorMap[rank.color]} overflow-hidden`}>
                    {rank.image_url ? (
                      <img src={rank.image_url} alt={rank.name} className="w-10 h-10 object-contain" />
                    ) : (
                      <span className="text-2xl">{rank.icon}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{rank.name}</span>
                      {rank.chevrons > 0 && (
                        <span className="text-slate-500">
                          {renderChevrons(rank.chevrons, rank.color)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      {rank.min_points === 0 ? 'Starting rank' : `${rank.min_points}+ points required`}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs border ${rankColorMap[rank.color]}`}>
                    {rank.chevrons} chevron{rank.chevrons !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
