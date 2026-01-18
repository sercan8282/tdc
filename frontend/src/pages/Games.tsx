import { useState, useEffect } from 'react';
import { Loader, Gamepad2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: number;
  name: string;
  weapons: unknown[];
}

interface Game {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image?: string;
  is_active: boolean;
  categories: Category[];
  created_at: string;
}

export default function Games() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/games/');
      if (response.ok) {
        const data = await response.json();
        setGames(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGameClick = (gameSlug: string) => {
    // Navigeer naar weapons pagina met game filter
    navigate(`/weapons?game=${gameSlug}`);
  };

  const getTotalWeapons = (game: Game) => {
    return game.categories?.reduce((total, cat) => total + (cat.weapons?.length || 0), 0) || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Gamepad2 className="w-10 h-10 text-blue-500" />
            Games
          </h1>
          <p className="text-slate-400">Select a game to view weapons and loadouts</p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.filter(game => game.is_active !== false).map((game) => (
            <button
              key={game.id}
              onClick={() => handleGameClick(game.slug)}
              className="bg-slate-800 rounded-xl border border-slate-700 p-5 text-left hover:bg-slate-750 hover:border-blue-500/50 transition-all group"
            >
              <div className="flex gap-4">
                {/* Game Image */}
                <div className="w-20 h-20 bg-slate-700 rounded-lg overflow-hidden flex items-center justify-center group-hover:bg-blue-600/20 transition flex-shrink-0">
                  {game.image ? (
                    <img src={game.image} alt={game.name} className="w-full h-full object-cover" />
                  ) : (
                    <Gamepad2 className="w-10 h-10 text-slate-400 group-hover:text-blue-400 transition" />
                  )}
                </div>

                {/* Game Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition truncate">
                      {game.name}
                    </h3>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                  </div>
                  {game.description && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{game.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                    <span>{game.categories?.length || 0} categories</span>
                    <span>{getTotalWeapons(game)} weapons</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {games.length === 0 && (
          <div className="text-center py-12">
            <Gamepad2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No games available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
