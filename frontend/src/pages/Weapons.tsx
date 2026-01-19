import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Loader, Search, Crosshair, Filter } from 'lucide-react';
import Pagination from '../components/Pagination';

interface Attachment {
  id: number;
  name: string;
  type: string;
  image?: string;
}

interface Weapon {
  id: number;
  name: string;
  image: string;
  text_color: string;
  image_size: 'small' | 'medium' | 'large';
  attachments: Attachment[];
  category: number;
  game_slug: string;
  category_slug: string;
}

interface Category {
  id: number;
  name: string;
  weapons: Weapon[];
  game: number;
}

interface Game {
  id: number;
  name: string;
  slug: string;
  categories: Category[];
}

export default function Weapons() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [expandedWeapons, setExpandedWeapons] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    fetchGames();
  }, []);

  // Handle URL parameters for game selection
  useEffect(() => {
    const gameParam = searchParams.get('game');
    if (gameParam && games.length > 0) {
      const game = games.find(g => g.slug === gameParam);
      if (game) {
        setSelectedGame(gameParam);
      }
    }
  }, [searchParams, games]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/games/');
      
      if (response.ok) {
        const data = await response.json();
        const gamesData = data.results || data;
        setGames(gamesData);
        
        // Check URL param first, otherwise select first game
        const gameParam = searchParams.get('game');
        if (gameParam) {
          const game = gamesData.find((g: Game) => g.slug === gameParam);
          if (game) {
            setSelectedGame(gameParam);
          } else if (gamesData.length > 0) {
            setSelectedGame(gamesData[0].slug);
          }
        } else if (gamesData.length > 0 && !selectedGame) {
          setSelectedGame(gamesData[0].slug);
        }
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGameChange = (gameSlug: string) => {
    setSelectedGame(gameSlug);
    setSelectedCategory(null); // Reset category filter when switching games
    setSearchParams({ game: gameSlug });
  };

  const toggleWeapon = (weaponId: number) => {
    setExpandedWeapons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weaponId)) {
        newSet.delete(weaponId);
      } else {
        newSet.add(weaponId);
      }
      return newSet;
    });
  };

  const selectedGameData = games.find(g => g.slug === selectedGame);
  const categories = selectedGameData?.categories || [];

  // Filter weapons by category and search query
  const filteredWeapons = categories
    .filter(cat => selectedCategory === null || cat.id === selectedCategory)
    .flatMap(cat => cat.weapons?.map(w => ({ ...w, categoryName: cat.name })) || [])
    .filter(weapon => weapon.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Pagination calculations
  const totalPages = Math.ceil(filteredWeapons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWeapons = filteredWeapons.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedGame, itemsPerPage]);

  const getImageSizeClass = (size: string) => {
    switch (size) {
      case 'small': return 'w-24 h-16';
      case 'large': return 'w-48 h-32';
      default: return 'w-36 h-24';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Crosshair className="w-10 h-10 text-blue-500" />
            Weapons Database
          </h1>
          <p className="text-slate-400">Browse all weapons and their attachments</p>
        </div>

        {/* Game Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {games.map(game => (
            <button
              key={game.id}
              onClick={() => handleGameChange(game.slug)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedGame === game.slug
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {game.name}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedCategory ?? ''}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.weapons?.length || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search weapons..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Results count and items per page */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-slate-400">
            Showing {filteredWeapons.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, filteredWeapons.length)} of {filteredWeapons.length} weapon{filteredWeapons.length !== 1 ? 's' : ''}
            {selectedCategory !== null && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
            </select>
            <span className="text-slate-400 text-sm">per page</span>
          </div>
        </div>

        {/* Weapons Grid */}
        {filteredWeapons.length === 0 ? (
          <div className="text-center py-12">
            <Crosshair className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">
              {searchQuery ? 'No weapons found matching your search.' : 'No weapons available.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedWeapons.map(weapon => (
              <div key={weapon.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                {/* Weapon Header */}
                <button
                  onClick={() => toggleWeapon(weapon.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-700/50 transition"
                >
                  {/* Weapon Image */}
                  <div className={`${getImageSizeClass(weapon.image_size)} bg-slate-700/50 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center p-1`}>
                    {weapon.image ? (
                      <img
                        src={weapon.image}
                        alt={weapon.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Crosshair className="w-8 h-8 text-slate-500" />
                      </div>
                    )}
                  </div>

                  {/* Weapon Info */}
                  <div className="flex-1 text-left">
                    <h3 
                      className="text-lg font-medium"
                      style={{ color: weapon.text_color || '#FFFFFF' }}
                    >
                      {weapon.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {weapon.categoryName}
                      {weapon.attachments && weapon.attachments.length > 0 && (
                        <span className="ml-2">• {weapon.attachments.length} attachments</span>
                      )}
                    </p>
                  </div>

                  {/* Expand Icon */}
                  {weapon.attachments && weapon.attachments.length > 0 && (
                    <div className="flex-shrink-0">
                      {expandedWeapons.has(weapon.id) ? (
                        <ChevronDown className="w-6 h-6 text-blue-400" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                  )}
                </button>

                {/* Attachments Panel */}
                {expandedWeapons.has(weapon.id) && weapon.attachments && weapon.attachments.length > 0 && (
                  <div className="px-6 py-3 bg-slate-900/50 border-t border-slate-700">
                    <div className="flex flex-wrap gap-2">
                      {weapon.attachments.map(attachment => (
                        <div 
                          key={attachment.id} 
                          className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700"
                        >
                          {attachment.image ? (
                            <div className="w-8 h-6 bg-slate-700/50 rounded flex items-center justify-center">
                              <img 
                                src={attachment.image} 
                                alt={attachment.name}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-slate-600" />
                            </div>
                          )}
                          <span className="text-slate-300 text-sm whitespace-nowrap">{attachment.name}</span>
                          <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{attachment.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
