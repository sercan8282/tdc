import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Loader, Search, Settings, Monitor, Cpu, Filter } from 'lucide-react';

interface GameSettingDefinition {
  id: number;
  name: string;
  display_name: string;
  category: string;
  field_type: 'select' | 'toggle' | 'slider' | 'number';
  options?: string;
  min_value?: number;
  max_value?: number;
  default_value?: string;
  description?: string;
}

interface GameSettingProfile {
  id: number;
  game: number;
  game_name: string;
  name: string;
  description?: string;
  processor_type?: string;
  ram?: string;
  graphic_card?: string;
  values: Record<string, string | number | boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Game {
  id: number;
  name: string;
  slug: string;
}

export default function GameSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<GameSettingProfile[]>([]);
  const [settingDefinitions, setSettingDefinitions] = useState<GameSettingDefinition[]>([]);
  const [expandedProfiles, setExpandedProfiles] = useState<Set<number>>(new Set());
  
  // Hardware filters
  const [processorFilter, setProcessorFilter] = useState<string>('');
  const [ramFilter, setRamFilter] = useState<string>('');
  const [graphicCardFilter, setGraphicCardFilter] = useState<string>('');

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    const gameParam = searchParams.get('game');
    if (gameParam && games.length > 0) {
      const game = games.find(g => g.slug === gameParam);
      if (game) {
        setSelectedGame(gameParam);
      }
    }
  }, [searchParams, games]);

  useEffect(() => {
    if (selectedGame) {
      const game = games.find(g => g.slug === selectedGame);
      if (game) {
        fetchProfiles(game.id);
        fetchSettingDefinitions(game.id);
      }
    }
  }, [selectedGame, games]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      // Fetch all games (no pagination limit)
      const response = await fetch('http://localhost:8000/api/games/?page_size=1000');
      if (response.ok) {
        const data = await response.json();
        const gamesData = data.results || data;
        // Sort games alphabetically
        const sortedGames = gamesData.sort((a: Game, b: Game) => a.name.localeCompare(b.name));
        setGames(sortedGames);
        
        const gameParam = searchParams.get('game');
        if (gameParam) {
          const game = sortedGames.find((g: Game) => g.slug === gameParam);
          if (game) {
            setSelectedGame(gameParam);
          } else if (sortedGames.length > 0) {
            setSelectedGame(sortedGames[0].slug);
          }
        } else if (sortedGames.length > 0 && !selectedGame) {
          setSelectedGame(sortedGames[0].slug);
        }
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async (gameId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/game-setting-profiles/?game=${gameId}`);
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchSettingDefinitions = async (gameId: number) => {
    try {
      // Fetch all settings (no pagination limit)
      const response = await fetch(`http://localhost:8000/api/game-setting-definitions/?game=${gameId}&page_size=1000`);
      if (response.ok) {
        const data = await response.json();
        setSettingDefinitions(data.results || data);
      }
    } catch (error) {
      console.error('Error fetching setting definitions:', error);
    }
  };

  const handleGameChange = (gameSlug: string) => {
    setSelectedGame(gameSlug);
    setSearchParams({ game: gameSlug });
    setExpandedProfiles(new Set());
    // Reset filters when changing game
    setSearchQuery('');
    setProcessorFilter('');
    setRamFilter('');
    setGraphicCardFilter('');
  };

  const toggleProfile = (profileId: number) => {
    setExpandedProfiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(profileId)) {
        newSet.delete(profileId);
      } else {
        newSet.add(profileId);
      }
      return newSet;
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'display': 'Display',
      'graphics': 'Graphics Quality',
      'advanced': 'Advanced',
      'postprocess': 'Post Processing',
      'view': 'View'
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'display': return <Monitor className="w-4 h-4" />;
      case 'graphics': return <Settings className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const groupSettingsByCategory = (definitions: GameSettingDefinition[]) => {
    return definitions.reduce((acc, def) => {
      if (!acc[def.category]) {
        acc[def.category] = [];
      }
      acc[def.category].push(def);
      return acc;
    }, {} as Record<string, GameSettingDefinition[]>);
  };

  const formatValue = (value: string | number | boolean) => {
    if (typeof value === 'boolean') {
      return value ? 'On' : 'Off';
    }
    return String(value);
  };

  // Extract unique filter options from profiles
  const filterOptions = useMemo(() => {
    // Get processor brands (Intel/AMD)
    const processorBrands = new Set<string>();
    profiles.forEach(p => {
      if (p.processor_type) {
        const lower = p.processor_type.toLowerCase();
        if (lower.includes('intel')) processorBrands.add('Intel');
        if (lower.includes('amd') || lower.includes('ryzen')) processorBrands.add('AMD');
      }
    });

    // Get unique RAM values
    const ramValues = new Set<string>();
    profiles.forEach(p => {
      if (p.ram) ramValues.add(p.ram);
    });

    // Get unique graphic cards
    const graphicCards = new Set<string>();
    profiles.forEach(p => {
      if (p.graphic_card) graphicCards.add(p.graphic_card);
    });

    return {
      processors: Array.from(processorBrands).sort(),
      ram: Array.from(ramValues).sort((a, b) => {
        // Sort by GB number if possible
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      }),
      graphicCards: Array.from(graphicCards).sort()
    };
  }, [profiles]);

  const filteredProfiles = profiles.filter(profile => {
    // Text search filter
    const matchesSearch = 
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (profile.description && profile.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (profile.processor_type && profile.processor_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (profile.graphic_card && profile.graphic_card.toLowerCase().includes(searchQuery.toLowerCase()));

    // Processor filter (Intel/AMD)
    const matchesProcessor = !processorFilter || (
      profile.processor_type && (
        (processorFilter === 'Intel' && profile.processor_type.toLowerCase().includes('intel')) ||
        (processorFilter === 'AMD' && (profile.processor_type.toLowerCase().includes('amd') || profile.processor_type.toLowerCase().includes('ryzen')))
      )
    );

    // RAM filter
    const matchesRam = !ramFilter || profile.ram === ramFilter;

    // Graphic card filter
    const matchesGraphicCard = !graphicCardFilter || profile.graphic_card === graphicCardFilter;

    return matchesSearch && matchesProcessor && matchesRam && matchesGraphicCard;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setProcessorFilter('');
    setRamFilter('');
    setGraphicCardFilter('');
  };

  const hasActiveFilters = searchQuery || processorFilter || ramFilter || graphicCardFilter;

  const categoryOrder = ['display', 'graphics', 'advanced', 'postprocess', 'view'];

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
            <Settings className="w-10 h-10 text-blue-500" />
            Game Settings
          </h1>
          <p className="text-slate-400">Browse graphics settings profiles shared by the community</p>
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

        {/* Search Bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search profiles by name, hardware..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Hardware Filters */}
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          <Filter className="w-5 h-5 text-slate-400" />
          
          {/* Processor Filter (Intel/AMD) */}
          <select
            value={processorFilter}
            onChange={(e) => setProcessorFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Processors</option>
            {filterOptions.processors.map(proc => (
              <option key={proc} value={proc}>{proc}</option>
            ))}
          </select>

          {/* RAM Filter */}
          <select
            value={ramFilter}
            onChange={(e) => setRamFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All RAM</option>
            {filterOptions.ram.map(ram => (
              <option key={ram} value={ram}>{ram}</option>
            ))}
          </select>

          {/* Graphic Card Filter */}
          <select
            value={graphicCardFilter}
            onChange={(e) => setGraphicCardFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Graphics Cards</option>
            {filterOptions.graphicCards.map(card => (
              <option key={card} value={card}>{card}</option>
            ))}
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="mb-4 text-slate-400">
          {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''} found
        </div>

        {/* Profiles List */}
        {filteredProfiles.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">
              {searchQuery ? 'No profiles found matching your search.' : 'No profiles available for this game yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProfiles.map(profile => (
              <div key={profile.id} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                {/* Profile Header */}
                <button
                  onClick={() => toggleProfile(profile.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-700/50 transition"
                >
                  {/* Profile Icon */}
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Settings className="w-6 h-6 text-blue-400" />
                  </div>

                  {/* Profile Info */}
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-medium text-white">
                      {profile.name}
                    </h3>
                    {profile.description && (
                      <p className="text-sm text-slate-400">{profile.description}</p>
                    )}
                    {/* Hardware Specs Summary */}
                    {(profile.processor_type || profile.ram || profile.graphic_card) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {profile.processor_type && (
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1">
                            <Cpu className="w-3 h-3" /> {profile.processor_type}
                          </span>
                        )}
                        {profile.ram && (
                          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                            {profile.ram}
                          </span>
                        )}
                        {profile.graphic_card && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                            {profile.graphic_card}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Settings Count & Expand Icon */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm text-slate-400">
                      {Object.keys(profile.values).length} settings
                    </span>
                    {expandedProfiles.has(profile.id) ? (
                      <ChevronDown className="w-6 h-6 text-blue-400" />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Settings Panel */}
                {expandedProfiles.has(profile.id) && (
                  <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700">
                    {/* Hardware Specs Full */}
                    {(profile.processor_type || profile.ram || profile.graphic_card) && (
                      <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                        <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <Cpu className="w-4 h-4" /> Hardware Specifications
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {profile.processor_type && (
                            <div>
                              <span className="text-xs text-slate-500">Processor</span>
                              <p className="text-white">{profile.processor_type}</p>
                            </div>
                          )}
                          {profile.ram && (
                            <div>
                              <span className="text-xs text-slate-500">RAM</span>
                              <p className="text-white">{profile.ram}</p>
                            </div>
                          )}
                          {profile.graphic_card && (
                            <div>
                              <span className="text-xs text-slate-500">Graphics Card</span>
                              <p className="text-white">{profile.graphic_card}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Settings by Category */}
                    {categoryOrder
                      .filter(cat => {
                        const defs = groupSettingsByCategory(settingDefinitions)[cat];
                        return defs && defs.some(def => profile.values[def.name] !== undefined);
                      })
                      .map(category => {
                        const categoryDefs = groupSettingsByCategory(settingDefinitions)[category] || [];
                        const activeSettings = categoryDefs.filter(def => profile.values[def.name] !== undefined);
                        
                        if (activeSettings.length === 0) return null;

                        return (
                          <div key={category} className="mb-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                              {getCategoryIcon(category)}
                              {getCategoryLabel(category)}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {activeSettings.map(def => {
                                const value = profile.values[def.name];
                                
                                return (
                                  <div 
                                    key={def.id}
                                    className="bg-slate-800 rounded-lg px-4 py-3 border border-slate-700"
                                  >
                                    <span className="text-xs text-slate-400 block mb-2">{def.display_name}</span>
                                    
                                    {/* Slider visualization for number fields */}
                                    {def.field_type === 'number' && (
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-blue-500 rounded-full"
                                              style={{ 
                                                width: `${((Number(value) - (def.min_value || 0)) / ((def.max_value || 100) - (def.min_value || 0))) * 100}%` 
                                              }}
                                            />
                                          </div>
                                        </div>
                                        <span className="text-white font-medium min-w-[3rem] text-right">
                                          {value}
                                        </span>
                                      </div>
                                    )}

                                    {/* Toggle visualization */}
                                    {def.field_type === 'toggle' && (
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            value === true || value === 'On' ? 'bg-green-600' : 'bg-slate-600'
                                          }`}
                                        >
                                          <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                              value === true || value === 'On' ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                          />
                                        </div>
                                        <span className={`font-medium ${value === true || value === 'On' ? 'text-green-400' : 'text-slate-400'}`}>
                                          {value === true || value === 'On' ? 'On' : 'Off'}
                                        </span>
                                      </div>
                                    )}

                                    {/* Dropdown/Select visualization */}
                                    {def.field_type === 'select' && (
                                      <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-slate-700 rounded text-white font-medium">
                                          {String(value)}
                                        </span>
                                      </div>
                                    )}

                                    {/* Text field visualization */}
                                    {def.field_type === 'text' && (
                                      <span className="text-white font-medium">
                                        {String(value)}
                                      </span>
                                    )}

                                    {/* Fallback for unknown types */}
                                    {!['number', 'toggle', 'select', 'text'].includes(def.field_type) && (
                                      <span className="text-white font-medium">
                                        {formatValue(value)}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                    {Object.keys(profile.values).length === 0 && (
                      <p className="text-slate-400 text-center py-4">No settings configured for this profile.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
