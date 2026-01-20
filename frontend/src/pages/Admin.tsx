import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { Shield, Check, Ban, Trash2, Loader, Plus, Edit, Trash, ChevronDown, ChevronRight, Copy, Search, X } from 'lucide-react';

interface User {
  id: number;
  email: string;
  nickname: string;
  is_blocked: boolean;
  is_verified: boolean;
  is_staff: boolean;
  is_active: boolean;
  created_at: string;
}

interface Game {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  is_active: boolean;
  game_type: 'shooter' | 'racing' | 'sports' | 'rpg' | 'strategy' | 'simulation' | 'adventure' | 'other';
  is_shooter?: boolean;
  can_fetch_weapons?: boolean;
  created_at: string;
}

interface ImageSearchResult {
  url: string;
  source: string;
  thumbnail?: string;
}

interface Category {
  id: number;
  name: string;
  game: number;
  game_name?: string;
  created_at: string;
}

interface Weapon {
  id: number;
  name: string;
  category: number;
  category_name?: string;
  image: string;
  text_color: string;
  image_size: 'small' | 'medium' | 'large';
  is_active: boolean;
  created_at: string;
}

interface Attachment {
  id: number;
  name: string;
  weapon: number;
  weapon_name?: string;
  attachment_type: number | null;
  attachment_type_name?: string;
  type?: string;
  type_name?: string;
  image?: string;
  created_at: string;
}

interface AttachmentType {
  id: number;
  name: string;
  display_name: string;
  order: number;
  created_at: string;
}

interface GameSettingDefinition {
  id: number;
  game: number;
  game_name: string;
  name: string;
  display_name: string;
  field_type: 'select' | 'number' | 'toggle' | 'text';
  category: 'display' | 'graphics' | 'advanced' | 'postprocess' | 'view' | 'audio' | 'controls';
  options?: string[];
  min_value?: number;
  max_value?: number;
  default_value?: string;
  order: number;
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

type AdminTab = 'users' | 'pending-users' | 'games' | 'categories' | 'weapons' | 'attachments' | 'attachment-types' | 'settings' | 'game-settings';

export default function Admin({ initialTab = 'users' }: { initialTab?: string | AdminTab }) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  
  // Effect to update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab as AdminTab);
  }, [initialTab]);
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  
  // Pending Users state
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingUserSearch, setPendingUserSearch] = useState('');
  const [pendingUserPage, setPendingUserPage] = useState(1);
  const [pendingUserTotalPages, setPendingUserTotalPages] = useState(1);
  const [pendingLoading, setPendingLoading] = useState(false);
  
  // Games state
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGames, setSelectedGames] = useState<Set<number>>(new Set());
  const [gameSearch, setGameSearch] = useState('');
  const [gamePage, setGamePage] = useState(1);
  const [gameTotalPages, setGameTotalPages] = useState(1);
  const [gameForm, setGameForm] = useState<{ id: number | null; name: string; slug: string; description: string; is_active: boolean; game_type: string; image: File | null }>({ id: null, name: '', slug: '', description: '', is_active: false, game_type: 'other', image: null });
  const [showGameForm, setShowGameForm] = useState(false);
  const [gameImagePreview, setGameImagePreview] = useState<string | null>(null);
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchResult[]>([]);
  const [showImageSearchModal, setShowImageSearchModal] = useState(false);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [imageSearchGame, setImageSearchGame] = useState<Game | null>(null);
  const [gameImageFilter, setGameImageFilter] = useState<'all' | 'with' | 'without'>('all');
  const [fetchingWeapons, setFetchingWeapons] = useState<number | null>(null);
  const [fetchingSettings, setFetchingSettings] = useState<number | null>(null);
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryTotalPages, setCategoryTotalPages] = useState(1);
  const [categoryForm, setCategoryForm] = useState<{ id: number | null; name: string; game: number | null }>({ id: null, name: '', game: null });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  
  // Weapons state
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedWeapons, setSelectedWeapons] = useState<Set<number>>(new Set());
  const [weaponSearch, setWeaponSearch] = useState('');
  const [weaponPage, setWeaponPage] = useState(1);
  const [weaponTotalPages, setWeaponTotalPages] = useState(1);
  const [weaponImageFilter, setWeaponImageFilter] = useState<'all' | 'with' | 'without'>('all');
  const [weaponForm, setWeaponForm] = useState<{ 
    id: number | null; 
    name: string; 
    category: number | null; 
    image: File | null; 
    text_color: string; 
    image_size: 'small' | 'medium' | 'large';
    is_active: boolean;
  }>({ id: null, name: '', category: null, image: null, text_color: '#FFFFFF', image_size: 'medium', is_active: false });
  const [showWeaponForm, setShowWeaponForm] = useState(false);
  const [showCopyWeaponModal, setShowCopyWeaponModal] = useState(false);
  const [copyWeaponData, setCopyWeaponData] = useState<{ weapon: Weapon | null; newName: string }>({ weapon: null, newName: '' });
  
  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentSearch, setAttachmentSearch] = useState('');
  const [attachmentPage, setAttachmentPage] = useState(1);
  const [attachmentTotalPages, setAttachmentTotalPages] = useState(1);
  const [attachmentForm, setAttachmentForm] = useState<{ 
    id: number | null; 
    name: string; 
    weapon: number | null; 
    attachment_type: number | null;
    image: File | null;
  }>({ id: null, name: '', weapon: null, attachment_type: null, image: null });
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [attachmentImagePreview, setAttachmentImagePreview] = useState<string | null>(null);
  const [expandedWeaponsInAttachments, setExpandedWeaponsInAttachments] = useState<Set<number>>(new Set());
  const [weaponSearchQuery, setWeaponSearchQuery] = useState('');
  const [showWeaponDropdown, setShowWeaponDropdown] = useState(false);
  const weaponDropdownRef = useRef<HTMLDivElement>(null);
  
  // Attachment Types state
  const [attachmentTypes, setAttachmentTypes] = useState<AttachmentType[]>([]);
  const [attachmentTypeForm, setAttachmentTypeForm] = useState<{
    id: number | null;
    name: string;
    display_name: string;
    order: number;
  }>({ id: null, name: '', display_name: '', order: 0 });
  const [showAttachmentTypeForm, setShowAttachmentTypeForm] = useState(false);
  
  // Click outside handler for weapon dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (weaponDropdownRef.current && !weaponDropdownRef.current.contains(event.target as Node)) {
        setShowWeaponDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Game Settings state
  const [settingDefinitions, setSettingDefinitions] = useState<GameSettingDefinition[]>([]);
  const [settingProfiles, setSettingProfiles] = useState<GameSettingProfile[]>([]);
  const [selectedGameForSettings, setSelectedGameForSettings] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState<{
    id: number | null;
    name: string;
    description: string;
    processor_type: string;
    ram: string;
    graphic_card: string;
    values: Record<string, string | number | boolean>;
    enabledSettings: Set<string>;
  }>({ id: null, name: '', description: '', processor_type: '', ram: '', graphic_card: '', values: {}, enabledSettings: new Set() });
  const [showProfileForm, setShowProfileForm] = useState(false);
  
  // Setting Definition Form state
  const [showSettingDefinitionForm, setShowSettingDefinitionForm] = useState(false);
  const [settingDefinitionForm, setSettingDefinitionForm] = useState<{
    id: number | null;
    name: string;
    display_name: string;
    field_type: 'select' | 'number' | 'toggle' | 'text';
    category: 'display' | 'graphics' | 'advanced' | 'postprocess' | 'view' | 'audio' | 'controls';
    options: string[];
    min_value: number;
    max_value: number;
    default_value: string;
    order: number;
  }>({ 
    id: null, 
    name: '', 
    display_name: '', 
    field_type: 'select', 
    category: 'graphics', 
    options: [], 
    min_value: 0, 
    max_value: 100, 
    default_value: '', 
    order: 0 
  });
  const [newOptionInput, setNewOptionInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    action: string;
    user?: User;
    game?: Game;
    category?: Category;
    weapon?: Weapon;
    attachment?: Attachment;
    profile?: GameSettingProfile;
  } | null>(null);

  const itemsPerPage = 10;

  // Fetch functions with useCallback
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: userSearch,
        page: userPage.toString(),
        page_size: itemsPerPage.toString(),
      });

      const response = await fetch(`/api/users/?${params}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.results || data);
        setUserTotalPages(Math.ceil((data.count || data.length) / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [userSearch, userPage, token]);

  const fetchPendingUsers = useCallback(async () => {
    setPendingLoading(true);
    try {
      const params = new URLSearchParams({
        search: pendingUserSearch,
        page: pendingUserPage.toString(),
        page_size: itemsPerPage.toString(),
        pending: 'true', // Filter for unverified users only
      });

      const response = await fetch(`/api/users/?${params}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingUsers(data.results || data);
        setPendingUserTotalPages(Math.ceil((data.count || data.length) / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
    } finally {
      setPendingLoading(false);
    }
  }, [pendingUserSearch, pendingUserPage, token]);

  const fetchGames = useCallback(async () => {
    console.log('=== FETCH GAMES CALLED ===');
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: gameSearch,
        page: gamePage.toString(),
        page_size: itemsPerPage.toString(),
        all: 'true',
      });
      
      // Add has_image filter
      if (gameImageFilter === 'with') {
        params.append('has_image', 'true');
      } else if (gameImageFilter === 'without') {
        params.append('has_image', 'false');
      }

      console.log('Fetching games with token:', token ? 'present' : 'missing', 'URL:', `/api/games/?${params}`);
      
      const response = await fetch(`/api/games/?${params}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Games received:', data.count || data.length);
        setGames(data.results || data);
        setGameTotalPages(Math.ceil((data.count || data.length) / itemsPerPage));
        setSelectedGames(new Set());
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  }, [gameSearch, gamePage, gameImageFilter, token]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: categorySearch,
        page: categoryPage.toString(),
        page_size: itemsPerPage.toString(),
      });

      const response = await fetch(`/api/categories/?${params}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.results || data);
        setCategoryTotalPages(Math.ceil((data.count || data.length) / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, [categorySearch, categoryPage, token]);

  const fetchWeapons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: weaponSearch,
        page: weaponPage.toString(),
        page_size: itemsPerPage.toString(),
        all: 'true', // Admin sees all weapons including inactive
      });
      
      // Add has_image filter
      if (weaponImageFilter === 'with') {
        params.append('has_image', 'true');
      } else if (weaponImageFilter === 'without') {
        params.append('has_image', 'false');
      }

      const response = await fetch(`/api/weapons/?${params}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setWeapons(data.results || data);
        setWeaponTotalPages(Math.ceil((data.count || data.length) / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to fetch weapons:', error);
    } finally {
      setLoading(false);
    }
  }, [weaponSearch, weaponPage, weaponImageFilter, token]);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: attachmentSearch,
        page: attachmentPage.toString(),
        page_size: itemsPerPage.toString(),
      });

      const response = await fetch(`/api/attachments/?${params}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.results || data);
        setAttachmentTotalPages(Math.ceil((data.count || data.length) / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    } finally {
      setLoading(false);
    }
  }, [attachmentSearch, attachmentPage, token]);

  // Fetch attachment types
  const fetchAttachmentTypes = useCallback(async () => {
    try {
      const response = await fetch(`/api/attachment-types/?page_size=100`, {
        headers: { 'Authorization': `Token ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAttachmentTypes(data.results || data);
      }
    } catch (error) {
      console.error('Failed to fetch attachment types:', error);
    }
  }, [token]);

  // Fetch game setting definitions
  const fetchSettingDefinitions = useCallback(async (gameId?: number) => {
    try {
      const params = new URLSearchParams({ page_size: '200' });
      if (gameId) params.append('game', gameId.toString());

      const response = await fetch(`/api/game-setting-definitions/?${params}`, {
        headers: { 'Authorization': `Token ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const definitions = data.results || data;
        console.log('Loaded settings definitions:', definitions.length, 'for game:', gameId);
        console.log('Categories:', [...new Set(definitions.map((d: GameSettingDefinition) => d.category))]);
        setSettingDefinitions(definitions);
      }
    } catch (error) {
      console.error('Failed to fetch setting definitions:', error);
    }
  }, [token]);

  // Fetch game setting profiles
  const fetchSettingProfiles = useCallback(async (gameId?: number) => {
    try {
      const params = new URLSearchParams({ page_size: '100' });
      if (gameId) params.append('game', gameId.toString());

      const response = await fetch(`/api/game-setting-profiles/?${params}`, {
        headers: { 'Authorization': `Token ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSettingProfiles(data.results || data);
      }
    } catch (error) {
      console.error('Failed to fetch setting profiles:', error);
    }
  }, [token]);

  // Effect to update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab as AdminTab);
  }, [initialTab]);

  // Load games and categories on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [gamesRes, categoriesRes, weaponsRes] = await Promise.all([
          fetch(`/api/games/?page_size=100`, {
            headers: { 'Authorization': `Token ${token}` },
          }),
          fetch(`/api/categories/?page_size=100`, {
            headers: { 'Authorization': `Token ${token}` },
          }),
          fetch(`/api/weapons/?page_size=100`, {
            headers: { 'Authorization': `Token ${token}` },
          }),
        ]);

        if (gamesRes.ok) {
          const data = await gamesRes.json();
          setGames(data.results || data);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data.results || data);
        }

        if (weaponsRes.ok) {
          const data = await weaponsRes.json();
          setWeapons(data.results || data);
        }
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };

    if (token) {
      loadInitialData();
    }
  }, [token]);

  // Users Effects
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [userSearch, userPage, activeTab, fetchUsers]);

  // Pending Users Effects
  useEffect(() => {
    if (activeTab === 'pending-users') {
      fetchPendingUsers();
    }
  }, [pendingUserSearch, pendingUserPage, activeTab, fetchPendingUsers]);

  // Games Effects
  useEffect(() => {
    if (activeTab === 'games') {
      fetchGames();
    }
  }, [gameSearch, gamePage, activeTab, fetchGames]);

  // Categories Effects
  useEffect(() => {
    if (activeTab === 'categories') {
      fetchCategories();
    }
  }, [categorySearch, categoryPage, activeTab, fetchCategories]);

  // Weapons Effects
  useEffect(() => {
    if (activeTab === 'weapons') {
      fetchWeapons();
    }
  }, [weaponSearch, weaponPage, activeTab, fetchWeapons]);

  // Attachments Effects
  useEffect(() => {
    if (activeTab === 'attachments') {
      fetchAttachments();
      fetchAttachmentTypes();
      fetchWeapons(); // Needed for weapon name lookups
    }
  }, [attachmentSearch, attachmentPage, activeTab, fetchAttachments, fetchAttachmentTypes, fetchWeapons]);

  // Attachment Types Effects
  useEffect(() => {
    if (activeTab === 'attachment-types') {
      fetchAttachmentTypes();
    }
  }, [activeTab, fetchAttachmentTypes]);

  // Game Settings Effects
  useEffect(() => {
    if (activeTab === 'game-settings') {
      fetchSettingDefinitions();
      fetchSettingProfiles();
    }
  }, [activeTab, fetchSettingDefinitions, fetchSettingProfiles]);

  // When selected game changes, filter definitions and profiles
  useEffect(() => {
    if (selectedGameForSettings) {
      fetchSettingDefinitions(selectedGameForSettings);
      fetchSettingProfiles(selectedGameForSettings);
    }
  }, [selectedGameForSettings, fetchSettingDefinitions, fetchSettingProfiles]);

  const performAction = async (action: string, user?: User, game?: Game, category?: Category, weapon?: Weapon, attachment?: Attachment) => {
    try {
      if (action.startsWith('user_')) {
        const endpoint = action.replace('user_', '');
        const response = await fetch(
          `/api/users/${user?.id}/${endpoint}/`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          setConfirmAction(null);
          fetchUsers();
          fetchPendingUsers(); // Also refresh pending users list
        }
      } else if (action.startsWith('game_')) {
        const gameAction = action.replace('game_', '');
        
        if (gameAction === 'delete' && game) {
          const response = await fetch(
            `/api/games/${game.id}/`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Token ${token}`,
              },
            }
          );

          if (response.ok) {
            setConfirmAction(null);
            fetchGames();
          }
        } else if (gameAction === 'toggle' && game) {
          const response = await fetch(
            `/api/games/${game.id}/`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ is_active: !game.is_active }),
            }
          );

          if (response.ok) {
            setConfirmAction(null);
            fetchGames();
          }
        }
      } else if (action.startsWith('category_')) {
        const categoryAction = action.replace('category_', '');
        
        if (categoryAction === 'delete' && category) {
          const response = await fetch(
            `/api/categories/${category.id}/`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Token ${token}`,
              },
            }
          );

          if (response.ok) {
            setConfirmAction(null);
            fetchCategories();
          }
        }
      } else if (action.startsWith('weapon_')) {
        const weaponAction = action.replace('weapon_', '');
        
        if (weaponAction === 'delete' && weapon) {
          const response = await fetch(
            `/api/weapons/${weapon.id}/`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Token ${token}`,
              },
            }
          );

          if (response.ok) {
            setConfirmAction(null);
            fetchWeapons();
          }
        }
      } else if (action.startsWith('attachment_')) {
        const attachmentAction = action.replace('attachment_', '');
        
        if (attachmentAction === 'delete' && attachment) {
          const response = await fetch(
            `/api/attachments/${attachment.id}/`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Token ${token}`,
              },
            }
          );

          if (response.ok) {
            setConfirmAction(null);
            fetchAttachments();
          }
        }
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    }
  };

  const handleSaveGame = async () => {
    if (!gameForm.name.trim()) return;

    try {
      const url = gameForm.id
        ? `/api/games/${gameForm.id}/`
        : `/api/games/`;
      
      const method = gameForm.id ? 'PATCH' : 'POST';
      
      const formData = new FormData();
      formData.append('name', gameForm.name);
      // Generate slug: lowercase, replace spaces with dashes, remove special characters
      const generatedSlug = gameForm.slug || gameForm.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and dashes
        .replace(/\s+/g, '-')          // Replace spaces with dashes
        .replace(/-+/g, '-')           // Replace multiple dashes with single dash
        .replace(/^-|-$/g, '');        // Remove leading/trailing dashes
      formData.append('slug', generatedSlug);
      formData.append('description', gameForm.description);
      formData.append('is_active', gameForm.is_active.toString());
      formData.append('game_type', gameForm.game_type);
      if (gameForm.image) {
        formData.append('image', gameForm.image);
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setShowGameForm(false);
        setGameForm({ id: null, name: '', slug: '', description: '', is_active: false, game_type: 'other', image: null });
        setGameImagePreview(null);
        fetchGames();
      }
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  };

  const handleEditGame = (game: Game) => {
    setGameForm({
      id: game.id,
      name: game.name,
      slug: game.slug,
      description: game.description || '',
      is_active: game.is_active,
      game_type: game.game_type || 'other',
      image: null,
    });
    setGameImagePreview(game.image || null);
    setShowGameForm(true);
  };

  const handleCancelGameForm = () => {
    setShowGameForm(false);
    setGameForm({ id: null, name: '', slug: '', description: '', is_active: false, game_type: 'other', image: null });
    setGameImagePreview(null);
  };

  const handleToggleGameActive = async (game: Game) => {
    try {
      const endpoint = game.is_active ? 'deactivate' : 'activate';
      const response = await fetch(`/api/games/${game.id}/${endpoint}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        setGames(prev => prev.map(g => 
          g.id === game.id ? { ...g, is_active: !g.is_active } : g
        ));
      }
    } catch (err) {
      console.error('Failed to toggle game active status:', err);
    }
  };

  const handleBulkActivateGames = async () => {
    const gameIds = selectedGames.size > 0 
      ? Array.from(selectedGames) 
      : games.map(g => g.id);
    
    if (gameIds.length === 0) return;
    
    try {
      const response = await fetch(`/api/games/bulk_activate/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: gameIds }),
      });

      if (response.ok) {
        setGames(prev => prev.map(g => 
          gameIds.includes(g.id) ? { ...g, is_active: true } : g
        ));
        setSelectedGames(new Set());
      } else {
        console.error('Failed to bulk activate games');
      }
    } catch (err) {
      console.error('Failed to bulk activate games:', err);
    }
  };

  const handleBulkDeactivateGames = async () => {
    const gameIds = selectedGames.size > 0 
      ? Array.from(selectedGames) 
      : games.map(g => g.id);
    
    if (gameIds.length === 0) return;
    
    try {
      const response = await fetch(`/api/games/bulk_deactivate/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: gameIds }),
      });

      if (response.ok) {
        setGames(prev => prev.map(g => 
          gameIds.includes(g.id) ? { ...g, is_active: false } : g
        ));
        setSelectedGames(new Set());
      } else {
        console.error('Failed to bulk deactivate games');
      }
    } catch (err) {
      console.error('Failed to bulk deactivate games:', err);
    }
  };

  // Image search functions
  const handleSearchImages = async (game: Game) => {
    setImageSearchGame(game);
    setImageSearchLoading(true);
    setShowImageSearchModal(true);
    setImageSearchResults([]);

    try {
      const response = await fetch(
        `/api/games/search_images/?name=${encodeURIComponent(game.name)}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setImageSearchResults(data.results || []);
      } else {
        console.error('Failed to search images');
      }
    } catch (error) {
      console.error('Failed to search images:', error);
    } finally {
      setImageSearchLoading(false);
    }
  };

  const handleSelectImage = async (imageUrl: string) => {
    if (!imageSearchGame) return;

    try {
      const response = await fetch(
        `/api/games/${imageSearchGame.id}/set_image_from_url/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: imageUrl }),
        }
      );

      if (response.ok) {
        setShowImageSearchModal(false);
        setImageSearchGame(null);
        setImageSearchResults([]);
        fetchGames();
      } else {
        const error = await response.json();
        console.error('Failed to set image:', error);
        alert('Failed to set image: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to set image:', error);
    }
  };

  // Fetch weapons for shooter games
  const handleFetchWeapons = async (game: Game) => {
    if (!game.is_shooter) {
      alert('Weapons can only be fetched for shooter games');
      return;
    }

    setFetchingWeapons(game.id);
    try {
      const response = await fetch(
        `/api/games/${game.id}/fetch_weapons/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert(`Weapons fetched successfully!\n\nCategories created: ${data.categories_created}\nWeapons created: ${data.weapons_created}\nSkipped (duplicates): ${data.skipped}`);
        fetchCategories();
        fetchWeapons();
      } else {
        alert('Failed to fetch weapons: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch weapons:', error);
      alert('Failed to fetch weapons');
    } finally {
      setFetchingWeapons(null);
    }
  };

  // Fetch settings for game
  const handleFetchSettings = async (game: Game) => {
    setFetchingSettings(game.id);
    try {
      const response = await fetch(
        `/api/games/${game.id}/fetch_settings/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        alert(`Settings fetched successfully!\n\nSettings created: ${data.settings_created}\nSkipped (existing): ${data.skipped}`);
        // Refresh settings if we're viewing them for this game
        if (selectedGameForSettings === game.id) {
          fetchSettingDefinitions(game.id);
        }
      } else {
        alert('Failed to fetch settings: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      alert('Failed to fetch settings');
    } finally {
      setFetchingSettings(null);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.game) return;

    try {
      const url = categoryForm.id
        ? `/api/categories/${categoryForm.id}/`
        : `/api/categories/`;
      
      const method = categoryForm.id ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: categoryForm.name,
          game: categoryForm.game,
        }),
      });

      if (response.ok) {
        setShowCategoryForm(false);
        setCategoryForm({ id: null, name: '', game: null });
        fetchCategories();
      }
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const handleEditCategory = (category: Category) => {
    setCategoryForm({
      id: category.id,
      name: category.name,
      game: category.game,
    });
    setShowCategoryForm(true);
  };

  const handleCancelCategoryForm = () => {
    setShowCategoryForm(false);
    setCategoryForm({ id: null, name: '', game: null });
  };

  const handleSaveWeapon = async () => {
    if (!weaponForm.name.trim() || !weaponForm.category) return;
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', weaponForm.name);
      formData.append('category', weaponForm.category.toString());
      formData.append('text_color', weaponForm.text_color);
      formData.append('image_size', weaponForm.image_size);
      formData.append('is_active', weaponForm.is_active.toString());
      
      if (weaponForm.image instanceof File) {
        formData.append('image', weaponForm.image);
      }

      const url = weaponForm.id
        ? `/api/weapons/${weaponForm.id}/`
        : `/api/weapons/`;
      
      const method = weaponForm.id ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setShowWeaponForm(false);
        setWeaponForm({ id: null, name: '', category: null, image: null, text_color: '#FFFFFF', image_size: 'medium', is_active: false });
        fetchWeapons();
      } else {
        const errorData = await response.json();
        if (errorData.non_field_errors) {
          setError(errorData.non_field_errors[0]);
        } else if (errorData.name) {
          setError(errorData.name[0]);
        } else {
          setError('Failed to save weapon');
        }
      }
    } catch (err) {
      console.error('Failed to save weapon:', err);
      setError('Failed to save weapon');
    }
  };

  const handleEditWeapon = (weapon: Weapon) => {
    setWeaponForm({
      id: weapon.id,
      name: weapon.name,
      category: weapon.category,
      image: null,
      text_color: weapon.text_color,
      image_size: weapon.image_size,
      is_active: weapon.is_active,
    });
    setShowWeaponForm(true);
  };

  const handleToggleWeaponActive = async (weapon: Weapon) => {
    try {
      const action = weapon.is_active ? 'deactivate' : 'activate';
      const response = await fetch(`/api/weapons/${weapon.id}/${action}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        // Update the weapon in the local state
        setWeapons(prev => prev.map(w => 
          w.id === weapon.id ? { ...w, is_active: !weapon.is_active } : w
        ));
      } else {
        console.error('Failed to toggle weapon active status');
      }
    } catch (err) {
      console.error('Failed to toggle weapon active status:', err);
    }
  };

  const handleBulkActivateWeapons = async () => {
    const weaponIds = selectedWeapons.size > 0 
      ? Array.from(selectedWeapons) 
      : weapons.map(w => w.id);
    
    if (weaponIds.length === 0) return;
    
    try {
      const response = await fetch(`/api/weapons/bulk_activate/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: weaponIds }),
      });

      if (response.ok) {
        // Update weapons in the local state
        setWeapons(prev => prev.map(w => 
          weaponIds.includes(w.id) ? { ...w, is_active: true } : w
        ));
        setSelectedWeapons(new Set());
      } else {
        console.error('Failed to bulk activate weapons');
      }
    } catch (err) {
      console.error('Failed to bulk activate weapons:', err);
    }
  };

  const handleBulkDeactivateWeapons = async () => {
    const weaponIds = selectedWeapons.size > 0 
      ? Array.from(selectedWeapons) 
      : weapons.map(w => w.id);
    
    if (weaponIds.length === 0) return;
    
    try {
      const response = await fetch(`/api/weapons/bulk_deactivate/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: weaponIds }),
      });

      if (response.ok) {
        // Update weapons in the local state
        setWeapons(prev => prev.map(w => 
          weaponIds.includes(w.id) ? { ...w, is_active: false } : w
        ));
        setSelectedWeapons(new Set());
      } else {
        console.error('Failed to bulk deactivate weapons');
      }
    } catch (err) {
      console.error('Failed to bulk deactivate weapons:', err);
    }
  };

  const handleCancelWeaponForm = () => {
    setShowWeaponForm(false);
    setWeaponForm({ id: null, name: '', category: null, image: null, text_color: '#FFFFFF', image_size: 'medium', is_active: false });
    setError(null);
  };

  // Search handlers that reset page to 1
  const handleUserSearchChange = (value: string) => {
    setUserSearch(value);
    setUserPage(1);
  };

  const handleGameSearchChange = (value: string) => {
    setGameSearch(value);
    setGamePage(1);
  };

  const handleCategorySearchChange = (value: string) => {
    setCategorySearch(value);
    setCategoryPage(1);
  };

  const handleWeaponSearchChange = (value: string) => {
    setWeaponSearch(value);
    setWeaponPage(1);
  };

  const handleAttachmentSearchChange = (value: string) => {
    setAttachmentSearch(value);
    setAttachmentPage(1);
  };

  const handleStartCopyWeapon = (weapon: Weapon) => {
    setCopyWeaponData({ weapon, newName: `${weapon.name} (Copy)` });
    setShowCopyWeaponModal(true);
  };

  const handleCopyWeapon = async () => {
    if (!copyWeaponData.weapon || !copyWeaponData.newName.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const originalWeapon = copyWeaponData.weapon;
      
      // 1. Create new weapon with new name
      const weaponFormData = new FormData();
      weaponFormData.append('name', copyWeaponData.newName);
      weaponFormData.append('category', originalWeapon.category.toString());
      weaponFormData.append('text_color', originalWeapon.text_color);
      weaponFormData.append('image_size', originalWeapon.image_size);
      
      // If original weapon has image, fetch it and re-upload
      if (originalWeapon.image) {
        try {
          const imageResponse = await fetch(originalWeapon.image);
          const imageBlob = await imageResponse.blob();
          const imageName = originalWeapon.image.split('/').pop() || 'weapon.png';
          const imageFile = new File([imageBlob], imageName, { type: imageBlob.type });
          weaponFormData.append('image', imageFile);
        } catch (imgError) {
          console.warn('Could not copy weapon image:', imgError);
        }
      }
      
      const weaponResponse = await fetch('/api/weapons/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: weaponFormData,
      });

      if (!weaponResponse.ok) {
        const errorData = await weaponResponse.json();
        if (errorData.non_field_errors) {
          setError(errorData.non_field_errors[0]);
        } else if (errorData.name) {
          setError(errorData.name[0]);
        } else {
          setError('Failed to copy weapon');
        }
        setLoading(false);
        return;
      }

      const newWeapon = await weaponResponse.json();

      // 2. Get all attachments for the original weapon
      const attachmentsResponse = await fetch(`/api/attachments/?weapon=${originalWeapon.id}&page_size=100`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (attachmentsResponse.ok) {
        const attachmentsData = await attachmentsResponse.json();
        const originalAttachments = attachmentsData.results || attachmentsData;

        // 3. Copy each attachment to the new weapon (including images)
        for (const attachment of originalAttachments) {
          const attachmentFormData = new FormData();
          attachmentFormData.append('name', attachment.name);
          attachmentFormData.append('weapon', newWeapon.id.toString());
          if (attachment.attachment_type) {
            attachmentFormData.append('attachment_type', attachment.attachment_type.toString());
          }
          
          // Copy attachment image if exists
          if (attachment.image) {
            try {
              const attachmentImageResponse = await fetch(attachment.image);
              const attachmentImageBlob = await attachmentImageResponse.blob();
              const attachmentImageName = attachment.image.split('/').pop() || 'attachment.png';
              const attachmentImageFile = new File([attachmentImageBlob], attachmentImageName, { type: attachmentImageBlob.type });
              attachmentFormData.append('image', attachmentImageFile);
            } catch (imgError) {
              console.warn('Could not copy attachment image:', imgError);
            }
          }
          
          await fetch('/api/attachments/', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${token}`,
            },
            body: attachmentFormData,
          });
        }
      }

      // 4. Refresh data and close modal
      setShowCopyWeaponModal(false);
      setCopyWeaponData({ weapon: null, newName: '' });
      fetchWeapons();
      fetchAttachments();
    } catch (err) {
      console.error('Failed to copy weapon:', err);
      setError('Failed to copy weapon');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAttachment = async () => {
    if (!attachmentForm.name.trim() || !attachmentForm.weapon || !attachmentForm.attachment_type) return;
    setError(null);

    try {
      const url = attachmentForm.id
        ? `/api/attachments/${attachmentForm.id}/`
        : `/api/attachments/`;
      
      const method = attachmentForm.id ? 'PATCH' : 'POST';
      
      const formData = new FormData();
      formData.append('name', attachmentForm.name);
      formData.append('weapon', attachmentForm.weapon.toString());
      formData.append('attachment_type', attachmentForm.attachment_type.toString());
      if (attachmentForm.image) {
        formData.append('image', attachmentForm.image);
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setShowAttachmentForm(false);
        setAttachmentForm({ id: null, name: '', weapon: null, attachment_type: null, image: null });
        setAttachmentImagePreview(null);
        setWeaponSearchQuery('');
        setShowWeaponDropdown(false);
        fetchAttachments();
      } else {
        const errorData = await response.json();
        if (errorData.non_field_errors) {
          setError(errorData.non_field_errors[0]);
        } else if (errorData.name) {
          setError(errorData.name[0]);
        } else {
          setError('Failed to save attachment');
        }
      }
    } catch (err) {
      console.error('Failed to save attachment:', err);
      setError('Failed to save attachment');
    }
  };

  const handleEditAttachment = (attachment: Attachment) => {
    setAttachmentForm({
      id: attachment.id,
      name: attachment.name,
      weapon: attachment.weapon,
      attachment_type: attachment.attachment_type,
      image: null,
    });
    setAttachmentImagePreview(attachment.image || null);
    setWeaponSearchQuery('');
    setShowWeaponDropdown(false);
    setShowAttachmentForm(true);
  };

  const handleCancelAttachmentForm = () => {
    setShowAttachmentForm(false);
    setAttachmentForm({ id: null, name: '', weapon: null, attachment_type: null, image: null });
    setAttachmentImagePreview(null);
    setWeaponSearchQuery('');
    setShowWeaponDropdown(false);
    setError(null);
  };

  const handleDeleteAllAttachmentsForWeapon = async (weaponId: number, weaponName: string) => {
    const weaponAttachments = attachments.filter(a => a.weapon === weaponId);
    if (!confirm(`Are you sure you want to delete all ${weaponAttachments.length} attachments for "${weaponName}"? This action cannot be undone.`)) return;
    
    try {
      setError(null);
      const token = localStorage.getItem('token');
      
      // Delete all attachments for this weapon
      for (const attachment of weaponAttachments) {
        await fetch(`/api/attachments/${attachment.id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
          },
        });
      }
      
      // Refresh attachments list
      fetchAttachments();
    } catch (err) {
      console.error('Failed to delete attachments:', err);
      setError('Failed to delete attachments');
    }
  };

  // Attachment Type Handlers
  const handleSaveAttachmentType = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('authToken');
      const data = {
        name: attachmentTypeForm.name,
        display_name: attachmentTypeForm.display_name,
        order: attachmentTypeForm.order
      };

      const url = attachmentTypeForm.id
        ? `/api/attachment-types/${attachmentTypeForm.id}/`
        : '/api/attachment-types/';
      
      const response = await fetch(url, {
        method: attachmentTypeForm.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.message || 'Failed to save attachment type');
      }

      setShowAttachmentTypeForm(false);
      setAttachmentTypeForm({ id: null, name: '', display_name: '', order: 0 });
      fetchAttachmentTypes();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save attachment type');
      }
    }
  };

  const handleEditAttachmentType = (attachmentType: AttachmentType) => {
    setAttachmentTypeForm({
      id: attachmentType.id,
      name: attachmentType.name,
      display_name: attachmentType.display_name,
      order: attachmentType.order
    });
    setShowAttachmentTypeForm(true);
  };

  const handleDeleteAttachmentType = async (id: number) => {
    if (!confirm('Are you sure you want to delete this attachment type? This may affect existing attachments.')) return;
    try {
      setError(null);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/attachment-types/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete attachment type');
      }
      
      fetchAttachmentTypes();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete attachment type');
      }
    }
  };

  const handleCancelAttachmentTypeForm = () => {
    setShowAttachmentTypeForm(false);
    setAttachmentTypeForm({ id: null, name: '', display_name: '', order: 0 });
    setError(null);
  };

  // Game Settings Handlers
  const handleStartNewProfile = () => {
    if (!selectedGameForSettings) {
      setError('Please select a game first');
      return;
    }
    // Initialize values with defaults from definitions, but nothing enabled by default
    const defaultValues: Record<string, string | number | boolean> = {};
    settingDefinitions.forEach(def => {
      if (def.default_value) {
        if (def.field_type === 'toggle') {
          defaultValues[def.name] = def.default_value === 'On';
        } else if (def.field_type === 'number') {
          defaultValues[def.name] = parseInt(def.default_value) || 0;
        } else {
          defaultValues[def.name] = def.default_value;
        }
      }
    });
    setProfileForm({ id: null, name: '', description: '', processor_type: '', ram: '', graphic_card: '', values: defaultValues, enabledSettings: new Set() });
    setShowProfileForm(true);
  };

  const handleEditProfile = (profile: GameSettingProfile) => {
    // When editing, enable all settings that have values
    const enabledSettings = new Set(Object.keys(profile.values));
    setProfileForm({
      id: profile.id,
      name: profile.name,
      description: profile.description || '',
      processor_type: profile.processor_type || '',
      ram: profile.ram || '',
      graphic_card: profile.graphic_card || '',
      values: profile.values,
      enabledSettings,
    });
    setShowProfileForm(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedGameForSettings || !profileForm.name.trim()) {
      setError('Profile name is required');
      return;
    }
    setError(null);

    // Only save values for enabled settings
    const filteredValues: Record<string, string | number | boolean> = {};
    profileForm.enabledSettings.forEach(settingName => {
      if (profileForm.values[settingName] !== undefined) {
        filteredValues[settingName] = profileForm.values[settingName];
      }
    });

    try {
      const url = profileForm.id
        ? `/api/game-setting-profiles/${profileForm.id}/`
        : '/api/game-setting-profiles/';
      const method = profileForm.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game: selectedGameForSettings,
          name: profileForm.name,
          description: profileForm.description,
          processor_type: profileForm.processor_type,
          ram: profileForm.ram,
          graphic_card: profileForm.graphic_card,
          values: filteredValues,
          is_active: true,
        }),
      });

      if (response.ok) {
        setShowProfileForm(false);
        setProfileForm({ id: null, name: '', description: '', processor_type: '', ram: '', graphic_card: '', values: {}, enabledSettings: new Set() });
        fetchSettingProfiles(selectedGameForSettings);
      } else {
        const errorData = await response.json();
        setError(errorData.name?.[0] || errorData.non_field_errors?.[0] || 'Failed to save profile');
      }
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile');
    }
  };

  const handleDeleteProfile = async (profile: GameSettingProfile) => {
    try {
      const response = await fetch(`/api/game-setting-profiles/${profile.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });

      if (response.ok) {
        fetchSettingProfiles(selectedGameForSettings || undefined);
      }
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };

  const handleCancelProfileForm = () => {
    setShowProfileForm(false);
    setProfileForm({ id: null, name: '', description: '', processor_type: '', ram: '', graphic_card: '', values: {}, enabledSettings: new Set() });
    setError(null);
  };

  const toggleSettingEnabled = (settingName: string) => {
    setProfileForm(prev => {
      const newEnabled = new Set(prev.enabledSettings);
      if (newEnabled.has(settingName)) {
        newEnabled.delete(settingName);
      } else {
        newEnabled.add(settingName);
      }
      return { ...prev, enabledSettings: newEnabled };
    });
  };

  // Setting Definition Handlers
  const handleStartNewSettingDefinition = () => {
    if (!selectedGameForSettings) {
      setError('Please select a game first');
      return;
    }
    const maxOrder = settingDefinitions.length > 0 
      ? Math.max(...settingDefinitions.map(d => d.order)) + 1 
      : 0;
    setSettingDefinitionForm({
      id: null,
      name: '',
      display_name: '',
      field_type: 'select',
      category: 'graphics',
      options: [],
      min_value: 0,
      max_value: 100,
      default_value: '',
      order: maxOrder,
    });
    setNewOptionInput('');
    setShowSettingDefinitionForm(true);
  };

  const handleEditSettingDefinition = (definition: GameSettingDefinition) => {
    setSettingDefinitionForm({
      id: definition.id,
      name: definition.name,
      display_name: definition.display_name,
      field_type: definition.field_type,
      category: definition.category,
      options: definition.options || [],
      min_value: definition.min_value || 0,
      max_value: definition.max_value || 100,
      default_value: definition.default_value || '',
      order: definition.order,
    });
    setNewOptionInput('');
    setShowSettingDefinitionForm(true);
  };

  const handleSaveSettingDefinition = async () => {
    if (!selectedGameForSettings || !settingDefinitionForm.name.trim() || !settingDefinitionForm.display_name.trim()) {
      setError('Name and display name are required');
      return;
    }

    if (settingDefinitionForm.field_type === 'select' && settingDefinitionForm.options.length === 0) {
      setError('Dropdown settings need at least one option');
      return;
    }

    setError(null);

    try {
      const url = settingDefinitionForm.id
        ? `/api/game-setting-definitions/${settingDefinitionForm.id}/`
        : '/api/game-setting-definitions/';
      const method = settingDefinitionForm.id ? 'PUT' : 'POST';

      const payload: Record<string, unknown> = {
        game: selectedGameForSettings,
        name: settingDefinitionForm.name.toLowerCase().replace(/\s+/g, '_'),
        display_name: settingDefinitionForm.display_name,
        field_type: settingDefinitionForm.field_type,
        category: settingDefinitionForm.category,
        order: settingDefinitionForm.order,
        default_value: settingDefinitionForm.default_value,
      };

      if (settingDefinitionForm.field_type === 'select') {
        payload.options = settingDefinitionForm.options;
      } else if (settingDefinitionForm.field_type === 'number') {
        payload.min_value = settingDefinitionForm.min_value;
        payload.max_value = settingDefinitionForm.max_value;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowSettingDefinitionForm(false);
        setSettingDefinitionForm({
          id: null, name: '', display_name: '', field_type: 'select', category: 'graphics',
          options: [], min_value: 0, max_value: 100, default_value: '', order: 0
        });
        fetchSettingDefinitions(selectedGameForSettings);
      } else {
        const errorData = await response.json();
        setError(errorData.name?.[0] || errorData.non_field_errors?.[0] || 'Failed to save setting definition');
      }
    } catch (err) {
      console.error('Failed to save setting definition:', err);
      setError('Failed to save setting definition');
    }
  };

  const handleDeleteSettingDefinition = async (definition: GameSettingDefinition) => {
    if (!confirm(`Are you sure you want to delete "${definition.display_name}"?`)) return;
    
    try {
      const response = await fetch(`/api/game-setting-definitions/${definition.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Token ${token}` },
      });

      if (response.ok) {
        fetchSettingDefinitions(selectedGameForSettings || undefined);
      }
    } catch (err) {
      console.error('Failed to delete setting definition:', err);
    }
  };

  const handleCancelSettingDefinitionForm = () => {
    setShowSettingDefinitionForm(false);
    setSettingDefinitionForm({
      id: null, name: '', display_name: '', field_type: 'select', category: 'graphics',
      options: [], min_value: 0, max_value: 100, default_value: '', order: 0
    });
    setNewOptionInput('');
    setError(null);
  };

  const addOption = () => {
    if (newOptionInput.trim() && !settingDefinitionForm.options.includes(newOptionInput.trim())) {
      setSettingDefinitionForm(prev => ({
        ...prev,
        options: [...prev.options, newOptionInput.trim()]
      }));
      setNewOptionInput('');
    }
  };

  const removeOption = (optionToRemove: string) => {
    setSettingDefinitionForm(prev => ({
      ...prev,
      options: prev.options.filter(opt => opt !== optionToRemove)
    }));
  };

  const handleActionClick = (action: string, user?: User, game?: Game, category?: Category, weapon?: Weapon, attachment?: Attachment) => {
    setConfirmAction({ action, user, game, category, weapon, attachment });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      user_verify_user: 'Approve',
      user_reject_user: 'Reject Registration',
      user_block_user: 'Block',
      user_unblock_user: 'Unblock',
      user_make_staff: 'Make Staff',
      user_remove_staff: 'Remove Staff',
      user_deactivate_user: 'Deactivate',
      user_activate_user: 'Activate',
      game_delete: 'Delete',
      game_toggle: 'Toggle Status',
      category_delete: 'Delete',
      weapon_delete: 'Delete',
      attachment_delete: 'Delete',
    };
    return labels[action] || action;
  };

  const getActionColor = (action: string) => {
    if (action.includes('block') || action.includes('remove') || action.includes('deactivate') || action.includes('delete') || action.includes('reject')) {
      return 'text-red-400 hover:text-red-300';
    }
    if (action.includes('verify') || action.includes('make') || action.includes('activate') || action.includes('approve')) {
      return 'text-green-400 hover:text-green-300';
    }
    return 'text-blue-400 hover:text-blue-300';
  };

  // Helper functions for lookups (to avoid re-fetching)
  const getGameName = (gameId: number) => games.find(g => g.id === gameId)?.name || 'Unknown';
  const getCategoryName = (categoryId: number) => categories.find(c => c.id === categoryId)?.name || 'Unknown';
  const getWeaponName = (weaponId: number) => weapons.find(w => w.id === weaponId)?.name || 'Unknown';

  return (
    <>
      <div className="flex-1 overflow-auto">
        {activeTab === 'users' && (
          <div className="p-3 md:p-8">
            <div className="mb-4 md:mb-8">
              <h1 className="text-xl md:text-3xl font-bold text-white mb-2">User Management</h1>
              <p className="text-slate-400">Manage all users and permissions</p>
            </div>

            <div className="mb-6">
              <SearchBar 
                value={userSearch}
                onChange={handleUserSearchChange}
                placeholder="Search by email or nickname..."
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900">
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Email</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Nickname</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Status</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-white">{user.email}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-300">{user.nickname}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <div className="flex gap-2">
                              {user.is_verified && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">
                                  <Check className="w-3 h-3" /> Verified
                                </span>
                              )}
                              {user.is_staff && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs">
                                  <Shield className="w-3 h-3" /> Staff
                                </span>
                              )}
                              {user.is_blocked && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs">
                                  <Ban className="w-3 h-3" /> Blocked
                                </span>
                              )}
                              {!user.is_active && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-900/30 text-gray-400 rounded text-xs">
                                  <Trash2 className="w-3 h-3" /> Inactive
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <div className="flex gap-2 flex-wrap">
                              {!user.is_verified && (
                                <button
                                  onClick={() => handleActionClick('user_verify_user', user)}
                                  className={`text-xs px-2 py-1 rounded border border-current ${getActionColor('user_verify_user')}`}
                                >
                                  Verify
                                </button>
                              )}
                              {!user.is_staff && (
                                <button
                                  onClick={() => handleActionClick('user_make_staff', user)}
                                  className={`text-xs px-2 py-1 rounded border border-current ${getActionColor('user_make_staff')}`}
                                >
                                  Make Staff
                                </button>
                              )}
                              {user.is_staff && (
                                <button
                                  onClick={() => handleActionClick('user_remove_staff', user)}
                                  className={`text-xs px-2 py-1 rounded border border-current ${getActionColor('user_remove_staff')}`}
                                >
                                  Remove Staff
                                </button>
                              )}
                              {!user.is_blocked && (
                                <button
                                  onClick={() => handleActionClick('user_block_user', user)}
                                  className={`text-xs px-2 py-1 rounded border border-current ${getActionColor('user_block_user')}`}
                                >
                                  Block
                                </button>
                              )}
                              {user.is_blocked && (
                                <button
                                  onClick={() => handleActionClick('user_unblock_user', user)}
                                  className={`text-xs px-2 py-1 rounded border border-current ${getActionColor('user_unblock_user')}`}
                                >
                                  Unblock
                                </button>
                              )}
                              {user.is_active && (
                                <button
                                  onClick={() => handleActionClick('user_deactivate_user', user)}
                                  className={`text-xs px-2 py-1 rounded border border-current ${getActionColor('user_deactivate_user')}`}
                                >
                                  Deactivate
                                </button>
                              )}
                              {!user.is_active && (
                                <button
                                  onClick={() => handleActionClick('user_activate_user', user)}
                                  className={`text-xs px-2 py-1 rounded border border-current ${getActionColor('user_activate_user')}`}
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {users.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>No users found</p>
                  </div>
                )}

                {userTotalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={userPage}
                      totalPages={userTotalPages}
                      onPageChange={setUserPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'pending-users' && (
          <div className="p-3 md:p-8">
            <div className="mb-4 md:mb-8">
              <h1 className="text-xl md:text-3xl font-bold text-white mb-2">Pending User Registrations</h1>
              <p className="text-slate-400">Review and approve new user registrations</p>
            </div>

            <div className="mb-6">
              <SearchBar 
                value={pendingUserSearch}
                onChange={(value) => {
                  setPendingUserSearch(value);
                  setPendingUserPage(1);
                }}
                placeholder="Search by email or nickname..."
              />
            </div>

            {pendingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900">
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Email</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Nickname</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Registered</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-white">{user.email}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-300">{user.nickname}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-400">
                            {new Date(user.created_at).toLocaleDateString('nl-NL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleActionClick('user_verify_user', user)}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white transition"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleActionClick('user_reject_user', user)}
                                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white transition"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pendingUsers.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <Check className="w-12 h-12 text-green-500" />
                      <p>No pending registrations to review</p>
                      <p className="text-sm">All user registrations have been processed</p>
                    </div>
                  </div>
                )}

                {pendingUserTotalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={pendingUserPage}
                      totalPages={pendingUserTotalPages}
                      onPageChange={setPendingUserPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'games' && (
          <div className="p-3 md:p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white mb-2">Games Management</h1>
                <p className="text-slate-400">Manage all games in the system - Games are inactive by default</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkActivateGames}
                  className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                  title={selectedGames.size > 0 ? `Activate ${selectedGames.size} selected games` : "Activate all games on current page"}
                >
                  <Check className="w-4 h-4" /> {selectedGames.size > 0 ? `Activate (${selectedGames.size})` : 'Activate All'}
                </button>
                <button
                  onClick={handleBulkDeactivateGames}
                  className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                  title={selectedGames.size > 0 ? `Deactivate ${selectedGames.size} selected games` : "Deactivate all games on current page"}
                >
                  <Ban className="w-4 h-4" /> {selectedGames.size > 0 ? `Deactivate (${selectedGames.size})` : 'Deactivate All'}
                </button>
                <button
                  onClick={() => setShowGameForm(true)}
                  className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" /> Add Game
                </button>
              </div>
            </div>

            <div className="mb-6 flex gap-4 items-center">
              <div className="flex-1">
                <SearchBar 
                  value={gameSearch}
                  onChange={handleGameSearchChange}
                  placeholder="Search games..."
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs md:text-sm text-slate-400">Image:</label>
                <select
                  value={gameImageFilter}
                  onChange={(e) => setGameImageFilter(e.target.value as 'all' | 'with' | 'without')}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All</option>
                  <option value="with">With Image</option>
                  <option value="without">No Image</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900">
                        <th className="px-4 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={games.length > 0 && selectedGames.size === games.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedGames(new Set(games.map(g => g.id)));
                              } else {
                                setSelectedGames(new Set());
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                          />
                        </th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Image</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Name</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Type</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Slug</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Active</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Created</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {games.map((game) => (
                        <tr key={game.id} className={`border-b border-slate-700 hover:bg-slate-700/50 ${!game.is_active ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedGames.has(game.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedGames);
                                if (e.target.checked) {
                                  newSelected.add(game.id);
                                } else {
                                  newSelected.delete(game.id);
                                }
                                setSelectedGames(newSelected);
                              }}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                            />
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            {game.image ? (
                              <img src={game.image} alt={game.name} className="w-12 h-12 rounded object-cover" />
                            ) : (
                              <div className="w-12 h-12 rounded bg-slate-700 flex items-center justify-center">
                                <span className="text-xs text-slate-500">No img</span>
                              </div>
                            )}
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-white">{game.name}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              game.game_type === 'shooter' ? 'bg-orange-900/30 text-orange-400' :
                              game.game_type === 'racing' ? 'bg-blue-900/30 text-blue-400' :
                              game.game_type === 'sports' ? 'bg-green-900/30 text-green-400' :
                              game.game_type === 'rpg' ? 'bg-purple-900/30 text-purple-400' :
                              'bg-slate-900/30 text-slate-400'
                            }`}>
                              {game.game_type || 'other'}
                            </span>
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-300">{game.slug}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <button
                              onClick={() => handleToggleGameActive(game)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                game.is_active
                                  ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                  : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                              }`}
                            >
                              {game.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-400">
                            {new Date(game.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSearchImages(game)}
                                className="text-purple-400 hover:text-purple-300 transition"
                                title="Search Images"
                              >
                                <Search className="w-4 h-4" />
                              </button>
                              {game.is_shooter && game.can_fetch_weapons && (
                                <button
                                  onClick={() => handleFetchWeapons(game)}
                                  disabled={fetchingWeapons === game.id}
                                  className="text-orange-400 hover:text-orange-300 transition disabled:opacity-50"
                                  title="Fetch Weapons"
                                >
                                  {fetchingWeapons === game.id ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <span className="text-xs font-bold">W</span>
                                  )}
                                </button>
                              )}
                              <button
                                onClick={() => handleFetchSettings(game)}
                                disabled={fetchingSettings === game.id}
                                className="text-cyan-400 hover:text-cyan-300 transition disabled:opacity-50"
                                title="Fetch Settings"
                              >
                                {fetchingSettings === game.id ? (
                                  <Loader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <span className="text-xs font-bold">S</span>
                                )}
                              </button>
                              <button
                                onClick={() => handleEditGame(game)}
                                className="text-blue-400 hover:text-blue-300 transition"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleActionClick('game_delete', undefined, game)}
                                className="text-red-400 hover:text-red-300 transition"
                                title="Delete"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {games.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>No games found</p>
                  </div>
                )}

                {gameTotalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={gamePage}
                      totalPages={gameTotalPages}
                      onPageChange={setGamePage}
                    />
                  </div>
                )}
              </>
            )}

            {showGameForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-96 max-h-screen overflow-y-auto">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {gameForm.id ? 'Edit Game' : 'Add New Game'}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Game Name *
                      </label>
                      <input
                        type="text"
                        value={gameForm.name}
                        onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="e.g., Warzone 2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Slug
                      </label>
                      <input
                        type="text"
                        value={gameForm.slug}
                        onChange={(e) => setGameForm({ ...gameForm, slug: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="Auto-generated if empty"
                      />
                      <p className="text-xs text-slate-400 mt-1">Leave empty to auto-generate</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        value={gameForm.description}
                        onChange={(e) => setGameForm({ ...gameForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none"
                        placeholder="Brief description of the game..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={gameForm.is_active}
                        onChange={(e) => setGameForm({ ...gameForm, is_active: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 text-xs md:text-sm text-slate-300">
                        Active
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Game Type *
                      </label>
                      <select
                        value={gameForm.game_type}
                        onChange={(e) => setGameForm({ ...gameForm, game_type: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="shooter">Shooter</option>
                        <option value="racing">Racing</option>
                        <option value="sports">Sports</option>
                        <option value="rpg">RPG</option>
                        <option value="strategy">Strategy</option>
                        <option value="simulation">Simulation</option>
                        <option value="adventure">Adventure</option>
                        <option value="other">Other</option>
                      </select>
                      <p className="text-xs text-slate-400 mt-1">Shooter games can have weapons auto-fetched</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Image (optional)
                      </label>
                      <div className="flex items-center gap-4">
                        {(gameImagePreview || gameForm.image) && (
                          <div className="w-16 h-16 rounded bg-slate-700 overflow-hidden flex-shrink-0">
                            <img
                              src={gameForm.image ? URL.createObjectURL(gameForm.image) : gameImagePreview || ''}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setGameForm({ ...gameForm, image: file });
                            if (file) {
                              setGameImagePreview(URL.createObjectURL(file));
                            }
                          }}
                          className="flex-1 text-xs md:text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-700 file:text-white hover:file:bg-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveGame}
                      className="flex-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      {gameForm.id ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={handleCancelGameForm}
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Image Search Modal */}
            {showImageSearchModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-[600px] max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">
                      Search Images for: {imageSearchGame?.name}
                    </h2>
                    <button
                      onClick={() => {
                        setShowImageSearchModal(false);
                        setImageSearchGame(null);
                        setImageSearchResults([]);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {imageSearchLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                      <p className="text-slate-400">Searching for images...</p>
                    </div>
                  ) : imageSearchResults.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <p>No images found</p>
                      <p className="text-sm mt-2">Try editing the game name or upload an image manually</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {imageSearchResults.map((result, index) => (
                        <div
                          key={index}
                          className="relative group cursor-pointer rounded-lg overflow-hidden bg-slate-700"
                          onClick={() => handleSelectImage(result.url)}
                        >
                          <img
                            src={result.url}
                            alt={`Option ${index + 1}`}
                            className="w-full h-32 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/50 transition flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 font-medium">
                              Select
                            </span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                            <span className="text-xs text-slate-300">{result.source}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="p-3 md:p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white mb-2">Categories Management</h1>
                <p className="text-slate-400">Manage game categories</p>
              </div>
              <button
                onClick={() => setShowCategoryForm(true)}
                className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </div>

            <div className="mb-6">
              <SearchBar 
                value={categorySearch}
                onChange={handleCategorySearchChange}
                placeholder="Search categories..."
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900">
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Name</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Game</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Created</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-white">{category.name}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-300">{getGameName(category.game)}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-400">
                            {new Date(category.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditCategory(category)}
                                className="text-blue-400 hover:text-blue-300 transition"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleActionClick('category_delete', undefined, undefined, category)}
                                className="text-red-400 hover:text-red-300 transition"
                                title="Delete"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {categories.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>No categories found</p>
                  </div>
                )}

                {categoryTotalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={categoryPage}
                      totalPages={categoryTotalPages}
                      onPageChange={setCategoryPage}
                    />
                  </div>
                )}
              </>
            )}

            {showCategoryForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-96 max-h-screen overflow-y-auto">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {categoryForm.id ? 'Edit Category' : 'Add New Category'}
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="e.g., Assault Rifles"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Game *
                      </label>
                      <select
                        value={categoryForm.game || ''}
                        onChange={(e) => setCategoryForm({ ...categoryForm, game: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select a game</option>
                        {games.map((game) => (
                          <option key={game.id} value={game.id}>
                            {game.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveCategory}
                      className="flex-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      {categoryForm.id ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={handleCancelCategoryForm}
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'weapons' && (
          <div className="p-3 md:p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white mb-2">Weapons Management</h1>
                <p className="text-slate-400">Manage weapon loadouts - Only shows shooter games - Weapons inactive by default</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkActivateWeapons}
                  className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                  title={selectedWeapons.size > 0 ? `Activate ${selectedWeapons.size} selected weapons` : "Activate all weapons on current page"}
                >
                  <Check className="w-4 h-4" /> {selectedWeapons.size > 0 ? `Activate (${selectedWeapons.size})` : 'Activate All'}
                </button>
                <button
                  onClick={handleBulkDeactivateWeapons}
                  className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                  title={selectedWeapons.size > 0 ? `Deactivate ${selectedWeapons.size} selected weapons` : "Deactivate all weapons on current page"}
                >
                  <Ban className="w-4 h-4" /> {selectedWeapons.size > 0 ? `Deactivate (${selectedWeapons.size})` : 'Deactivate All'}
                </button>
                <button
                  onClick={() => setShowWeaponForm(true)}
                  className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  <Plus className="w-4 h-4" /> Add Weapon
                </button>
              </div>
            </div>

            <div className="mb-6 flex gap-4 items-center">
              <div className="flex-1">
                <SearchBar 
                  value={weaponSearch}
                  onChange={handleWeaponSearchChange}
                  placeholder="Search weapons..."
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs md:text-sm text-slate-400">Image:</label>
                <select
                  value={weaponImageFilter}
                  onChange={(e) => setWeaponImageFilter(e.target.value as 'all' | 'with' | 'without')}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All</option>
                  <option value="with">With Image</option>
                  <option value="without">No Image</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900">
                        <th className="px-4 py-4 text-left">
                          <input
                            type="checkbox"
                            checked={weapons.length > 0 && selectedWeapons.size === weapons.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedWeapons(new Set(weapons.map(w => w.id)));
                              } else {
                                setSelectedWeapons(new Set());
                              }
                            }}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                          />
                        </th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Name</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Category</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Image</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Size</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Color</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Active</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Created</th>
                        <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weapons.map((weapon) => (
                        <tr key={weapon.id} className={`border-b border-slate-700 hover:bg-slate-700/50 ${!weapon.is_active ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedWeapons.has(weapon.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedWeapons);
                                if (e.target.checked) {
                                  newSelected.add(weapon.id);
                                } else {
                                  newSelected.delete(weapon.id);
                                }
                                setSelectedWeapons(newSelected);
                              }}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                            />
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-white">{weapon.name}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-300">{getCategoryName(weapon.category)}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            {weapon.image && (
                              <img src={weapon.image} alt={weapon.name} className="w-10 h-10 rounded object-cover" />
                            )}
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-300 capitalize">{weapon.image_size}</td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded border border-slate-600"
                                style={{ backgroundColor: weapon.text_color }}
                              />
                              <span className="text-slate-400">{weapon.text_color}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <button
                              onClick={() => handleToggleWeaponActive(weapon)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                weapon.is_active
                                  ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                  : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                              }`}
                            >
                              {weapon.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-xs md:text-sm text-slate-400">
                            {new Date(weapon.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2 md:px-6 md:py-4 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditWeapon(weapon)}
                                className="text-blue-400 hover:text-blue-300 transition"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStartCopyWeapon(weapon)}
                                className="text-green-400 hover:text-green-300 transition"
                                title="Copy weapon with attachments"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleActionClick('weapon_delete', undefined, undefined, undefined, weapon)}
                                className="text-red-400 hover:text-red-300 transition"
                                title="Delete"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {weapons.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p>No weapons found</p>
                  </div>
                )}

                {weaponTotalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={weaponPage}
                      totalPages={weaponTotalPages}
                      onPageChange={setWeaponPage}
                    />
                  </div>
                )}
              </>
            )}

            {showWeaponForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-96 max-h-screen overflow-y-auto">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {weaponForm.id ? 'Edit Weapon' : 'Add New Weapon'}
                  </h2>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Weapon Name *
                      </label>
                      <input
                        type="text"
                        value={weaponForm.name}
                        onChange={(e) => setWeaponForm({ ...weaponForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="e.g., M4A1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Category *
                      </label>
                      <select
                        value={weaponForm.category || ''}
                        onChange={(e) => setWeaponForm({ ...weaponForm, category: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name} ({getGameName(category.game)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setWeaponForm({ ...weaponForm, image: e.target.files?.[0] || null })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Text Color
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={weaponForm.text_color}
                          onChange={(e) => setWeaponForm({ ...weaponForm, text_color: e.target.value })}
                          className="w-12 h-10 bg-slate-700 border border-slate-600 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={weaponForm.text_color}
                          onChange={(e) => setWeaponForm({ ...weaponForm, text_color: e.target.value })}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                          placeholder="#FFFFFF"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Image Size
                      </label>
                      <select
                        value={weaponForm.image_size}
                        onChange={(e) => setWeaponForm({ ...weaponForm, image_size: e.target.value as 'small' | 'medium' | 'large' })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-300">
                        Active
                      </label>
                      <button
                        type="button"
                        onClick={() => setWeaponForm({ ...weaponForm, is_active: !weaponForm.is_active })}
                        className={`px-3 py-1 rounded text-xs font-medium transition ${
                          weaponForm.is_active
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        {weaponForm.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveWeapon}
                      className="flex-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      {weaponForm.id ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={handleCancelWeaponForm}
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Copy Weapon Modal */}
            {showCopyWeaponModal && copyWeaponData.weapon && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-96">
                  <h2 className="text-xl font-semibold text-white mb-4">Copy Weapon</h2>
                  <p className="text-slate-400 mb-4">
                    Copying: <span className="text-white font-medium">{copyWeaponData.weapon.name}</span>
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      New Weapon Name *
                    </label>
                    <input
                      type="text"
                      value={copyWeaponData.newName}
                      onChange={(e) => setCopyWeaponData({ ...copyWeaponData, newName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      placeholder="Enter new weapon name"
                    />
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    All attachments will also be copied to the new weapon.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyWeapon}
                      disabled={!copyWeaponData.newName.trim()}
                      className="flex-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Copy Weapon
                    </button>
                    <button
                      onClick={() => {
                        setShowCopyWeaponModal(false);
                        setCopyWeaponData({ weapon: null, newName: '' });
                      }}
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="p-3 md:p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white mb-2">Attachments Management</h1>
                <p className="text-slate-400">Manage all weapon attachments in the system</p>
              </div>
              <button
                onClick={() => setShowAttachmentForm(true)}
                className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" /> Add Attachment
              </button>
            </div>

            <div className="mb-6">
              <SearchBar 
                value={attachmentSearch}
                onChange={handleAttachmentSearchChange}
                placeholder="Search attachments..."
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {/* Grouped by Weapon */}
                <div className="space-y-3">
                  {(() => {
                    // Group attachments by weapon
                    const groupedByWeapon = attachments.reduce((acc, attachment) => {
                      const weaponId = attachment.weapon;
                      if (!acc[weaponId]) {
                        acc[weaponId] = [];
                      }
                      acc[weaponId].push(attachment);
                      return acc;
                    }, {} as Record<number, Attachment[]>);

                    // Get unique weapon IDs
                    const weaponIds = Object.keys(groupedByWeapon).map(Number);

                    if (weaponIds.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400">
                          No attachments found.
                        </div>
                      );
                    }

                    return weaponIds.map(weaponId => {
                      const weaponAttachments = groupedByWeapon[weaponId];
                      // Use weapon_name from attachment if available, otherwise fall back to lookup
                      const weaponName = weaponAttachments[0]?.weapon_name || getWeaponName(weaponId);
                      const isExpanded = expandedWeaponsInAttachments.has(weaponId);

                      return (
                        <div key={weaponId} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                          {/* Weapon Header */}
                          <div className="flex items-center justify-between px-6 py-4 hover:bg-slate-700/50 transition">
                            <button
                              onClick={() => {
                                setExpandedWeaponsInAttachments(prev => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(weaponId)) {
                                    newSet.delete(weaponId);
                                  } else {
                                    newSet.add(weaponId);
                                  }
                                  return newSet;
                                });
                              }}
                              className="flex-1 flex items-center gap-3 text-left"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-blue-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                              )}
                              <h3 className="text-lg font-medium text-white">{weaponName}</h3>
                              <span className="text-xs md:text-sm text-slate-400">
                                ({weaponAttachments.length} attachment{weaponAttachments.length !== 1 ? 's' : ''})
                              </span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAllAttachmentsForWeapon(weaponId, weaponName);
                              }}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition"
                              title={`Delete all attachments for ${weaponName}`}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Attachments List */}
                          {isExpanded && (
                            <div className="border-t border-slate-700">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-slate-900/50">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Created</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {weaponAttachments.map((attachment) => (
                                    <tr key={attachment.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                                      <td className="px-6 py-3 text-xs md:text-sm text-white">{attachment.name}</td>
                                      <td className="px-6 py-3 text-sm">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-400/10 text-blue-400">
                                          {attachment.attachment_type_name || attachment.type || 'Unknown'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3 text-xs md:text-sm text-slate-400">
                                        {new Date(attachment.created_at).toLocaleDateString()}
                                      </td>
                                      <td className="px-6 py-3 text-sm">
                                        <div className="flex gap-2">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleEditAttachment(attachment); }}
                                            className="text-blue-400 hover:text-blue-300 transition"
                                            title="Edit"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleActionClick('attachment_delete', undefined, undefined, undefined, undefined, attachment); }}
                                            className="text-red-400 hover:text-red-300 transition"
                                            title="Delete"
                                          >
                                            <Trash className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                <div className="mt-4">
                  <Pagination
                    currentPage={attachmentPage}
                    totalPages={attachmentTotalPages}
                    onPageChange={setAttachmentPage}
                  />
                </div>
              </>
            )}

            {showAttachmentForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-96">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {attachmentForm.id ? 'Edit Attachment' : 'Add New Attachment'}
                  </h2>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Attachment Name *
                      </label>
                      <input
                        type="text"
                        value={attachmentForm.name}
                        onChange={(e) => setAttachmentForm({ ...attachmentForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        placeholder="e.g., Monolithic Suppressor"
                      />
                    </div>

                    <div className="relative" ref={weaponDropdownRef}>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Weapon *
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={weaponSearchQuery}
                          onChange={(e) => {
                            setWeaponSearchQuery(e.target.value);
                            setShowWeaponDropdown(true);
                          }}
                          onFocus={() => setShowWeaponDropdown(true)}
                          placeholder={attachmentForm.weapon ? weapons.find(w => w.id === attachmentForm.weapon)?.name + ' (' + getCategoryName(weapons.find(w => w.id === attachmentForm.weapon)?.category || 0) + ')' : "Search for a weapon..."}
                          className="w-full pl-10 pr-8 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        />
                        {attachmentForm.weapon && !weaponSearchQuery && (
                          <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none">
                            <span className="text-white">{weapons.find(w => w.id === attachmentForm.weapon)?.name} ({getCategoryName(weapons.find(w => w.id === attachmentForm.weapon)?.category || 0)})</span>
                          </div>
                        )}
                        {attachmentForm.weapon && (
                          <button
                            type="button"
                            onClick={() => {
                              setAttachmentForm({ ...attachmentForm, weapon: null });
                              setWeaponSearchQuery('');
                            }}
                            className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-white"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      
                      {/* Searchable Dropdown */}
                      {showWeaponDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {weapons
                            .filter(weapon => 
                              weapon.name.toLowerCase().includes(weaponSearchQuery.toLowerCase()) ||
                              getCategoryName(weapon.category).toLowerCase().includes(weaponSearchQuery.toLowerCase())
                            )
                            .slice(0, 50) // Limit to 50 results for performance
                            .map((weapon) => (
                              <button
                                key={weapon.id}
                                type="button"
                                onClick={() => {
                                  setAttachmentForm({ ...attachmentForm, weapon: weapon.id });
                                  setWeaponSearchQuery('');
                                  setShowWeaponDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-slate-600 flex justify-between items-center ${
                                  attachmentForm.weapon === weapon.id ? 'bg-blue-600' : ''
                                }`}
                              >
                                <span className="text-white">{weapon.name}</span>
                                <span className="text-xs text-slate-400">{getCategoryName(weapon.category)}</span>
                              </button>
                            ))}
                          {weapons.filter(weapon => 
                            weapon.name.toLowerCase().includes(weaponSearchQuery.toLowerCase()) ||
                            getCategoryName(weapon.category).toLowerCase().includes(weaponSearchQuery.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-2 text-slate-400 text-center">No weapons found</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Type *
                      </label>
                      <select
                        value={attachmentForm.attachment_type || ''}
                        onChange={(e) => setAttachmentForm({ ...attachmentForm, attachment_type: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select a type</option>
                        {attachmentTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.display_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Image (optional)
                      </label>
                      <div className="flex items-center gap-4">
                        {(attachmentImagePreview || attachmentForm.image) && (
                          <div className="w-16 h-16 rounded bg-slate-700 overflow-hidden flex-shrink-0">
                            <img
                              src={attachmentForm.image ? URL.createObjectURL(attachmentForm.image) : attachmentImagePreview || ''}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setAttachmentForm({ ...attachmentForm, image: file });
                            if (file) {
                              setAttachmentImagePreview(URL.createObjectURL(file));
                            }
                          }}
                          className="flex-1 text-xs md:text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-700 file:text-white hover:file:bg-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveAttachment}
                      className="flex-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      {attachmentForm.id ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={handleCancelAttachmentForm}
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attachment-types' && (
          <div className="p-3 md:p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white mb-2">Attachment Types</h1>
                <p className="text-slate-400">Manage attachment type categories and their display names</p>
              </div>
              <button
                onClick={() => setShowAttachmentTypeForm(true)}
                className="px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Attachment Type
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900">
                      <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Order</th>
                      <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Internal Name</th>
                      <th className="px-2 py-2 md:px-6 md:py-4 text-left text-xs md:text-sm font-semibold text-slate-300">Display Name</th>
                      <th className="px-2 py-2 md:px-6 md:py-4 text-right text-xs md:text-sm font-semibold text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attachmentTypes.map((type) => (
                      <tr key={type.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-2 py-2 md:px-6 md:py-4 text-slate-300">{type.order}</td>
                        <td className="px-2 py-2 md:px-6 md:py-4 text-slate-300 font-mono text-sm">{type.name}</td>
                        <td className="px-2 py-2 md:px-6 md:py-4 text-white font-medium">{type.display_name}</td>
                        <td className="px-2 py-2 md:px-6 md:py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEditAttachmentType(type)}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAttachmentType(type.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {attachmentTypes.length === 0 && !loading && (
              <div className="text-center py-12 text-slate-400">
                <p>No attachment types found</p>
              </div>
            )}

            {/* Attachment Type Form Modal */}
            {showAttachmentTypeForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {attachmentTypeForm.id ? 'Edit Attachment Type' : 'Add Attachment Type'}
                  </h2>

                  {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Internal Name *
                      </label>
                      <input
                        type="text"
                        value={attachmentTypeForm.name}
                        onChange={(e) => setAttachmentTypeForm({ ...attachmentTypeForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., muzzle"
                      />
                      <p className="text-xs text-slate-500 mt-1">Used internally, should be lowercase with no spaces</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Display Name *
                      </label>
                      <input
                        type="text"
                        value={attachmentTypeForm.display_name}
                        onChange={(e) => setAttachmentTypeForm({ ...attachmentTypeForm, display_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Muzzle"
                      />
                      <p className="text-xs text-slate-500 mt-1">The name shown to users in the UI</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Order
                      </label>
                      <input
                        type="number"
                        value={attachmentTypeForm.order}
                        onChange={(e) => setAttachmentTypeForm({ ...attachmentTypeForm, order: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">Controls the display order (lower numbers appear first)</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveAttachmentType}
                      className="flex-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      {attachmentTypeForm.id ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={handleCancelAttachmentTypeForm}
                      className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'game-settings' && (
          <div className="p-3 md:p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white mb-2">Game Settings</h1>
                <p className="text-slate-400">Create and manage graphics settings definitions and profiles for each game</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
                {error}
              </div>
            )}

            {/* Game Selection */}
            <div className="mb-6 bg-slate-800 rounded-lg border border-slate-700 p-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Select Game
              </label>
              <select
                value={selectedGameForSettings || ''}
                onChange={(e) => setSelectedGameForSettings(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full md:w-64 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Select a Game --</option>
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedGameForSettings && (
              <>
                {/* Available Settings for this Game */}
                <div className="mb-6 bg-slate-800 rounded-lg border border-slate-700 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        Setting Definitions for {games.find(g => g.id === selectedGameForSettings)?.name}
                      </h2>
                      <p className="text-slate-400 text-sm">
                        Define which settings are available for profiles. Click on a setting to edit or delete it.
                      </p>
                    </div>
                    <button
                      onClick={handleStartNewSettingDefinition}
                      className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                    >
                      <Plus className="w-4 h-4" /> New Setting
                    </button>
                  </div>
                  
                  {/* Group by category */}
                  {(['display', 'graphics', 'advanced', 'postprocess', 'view', 'audio', 'controls'] as const).map(category => {
                    const categorySettings = settingDefinitions.filter(s => s.category === category);
                    if (categorySettings.length === 0) return null;
                    
                    const categoryLabels: Record<string, string> = {
                      display: 'Display',
                      graphics: 'Graphics Quality',
                      advanced: 'Advanced Graphics',
                      postprocess: 'Post Processing',
                      view: 'View Settings',
                      audio: 'Audio',
                      controls: 'Controls',
                    };

                    const fieldTypeLabels: Record<string, string> = {
                      select: 'Dropdown',
                      number: 'Slider',
                      toggle: 'On/Off',
                      text: 'Text',
                    };

                    return (
                      <div key={category} className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">
                          {categoryLabels[category]}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {categorySettings.map(setting => (
                            <div
                              key={setting.id}
                              className="group relative px-3 py-2 bg-slate-700 rounded text-xs md:text-sm text-slate-300 hover:bg-slate-600 cursor-pointer flex items-center gap-2"
                              onClick={() => handleEditSettingDefinition(setting)}
                            >
                              <span>{setting.display_name}</span>
                              <span className="text-xs text-slate-500">({fieldTypeLabels[setting.field_type]})</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSettingDefinition(setting);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-1"
                                title="Delete"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {settingDefinitions.length === 0 && (
                    <p className="text-slate-500 text-center py-4">No settings defined yet. Click "New Setting" to create one.</p>
                  )}
                </div>

                {/* Profiles List */}
                <div className="mb-6 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white">Settings Profiles</h2>
                  <button
                    onClick={handleStartNewProfile}
                    className="flex items-center gap-2 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    <Plus className="w-4 h-4" /> New Profile
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : settingProfiles.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    No profiles created yet. Click "New Profile" to create one.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {settingProfiles.map(profile => (
                      <div
                        key={profile.id}
                        className="bg-slate-800 rounded-lg border border-slate-700 p-4"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{profile.name}</h3>
                            {profile.description && (
                              <p className="text-xs md:text-sm text-slate-400 mt-1">{profile.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditProfile(profile)}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-700 rounded transition"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProfile(profile)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Show some key settings */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(profile.values).slice(0, 8).map(([key, value]) => {
                            const def = settingDefinitions.find(d => d.name === key);
                            return (
                              <div key={key} className="bg-slate-700/50 rounded px-2 py-1">
                                <span className="text-xs text-slate-400 block">{def?.display_name || key}</span>
                                <span className="text-xs md:text-sm text-white">
                                  {typeof value === 'boolean' ? (value ? 'On' : 'Off') : value}
                                </span>
                              </div>
                            );
                          })}
                          {Object.keys(profile.values).length > 8 && (
                            <div className="bg-slate-700/50 rounded px-2 py-1 flex items-center justify-center">
                              <span className="text-xs text-slate-400">+{Object.keys(profile.values).length - 8} more</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Setting Definition Form Modal */}
                {showSettingDefinitionForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-xl mx-4">
                      <h2 className="text-xl font-semibold text-white mb-4">
                        {settingDefinitionForm.id ? 'Edit Setting Definition' : 'New Setting Definition'}
                      </h2>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Display Name *
                            </label>
                            <input
                              type="text"
                              value={settingDefinitionForm.display_name}
                              onChange={(e) => {
                                const displayName = e.target.value;
                                const name = displayName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                setSettingDefinitionForm({ ...settingDefinitionForm, display_name: displayName, name });
                              }}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                              placeholder="e.g., Texture Quality"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Internal Name
                            </label>
                            <input
                              type="text"
                              value={settingDefinitionForm.name}
                              onChange={(e) => setSettingDefinitionForm({ ...settingDefinitionForm, name: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-400 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                              placeholder="texture_quality"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Field Type *
                            </label>
                            <select
                              value={settingDefinitionForm.field_type}
                              onChange={(e) => setSettingDefinitionForm({ 
                                ...settingDefinitionForm, 
                                field_type: e.target.value as 'select' | 'number' | 'toggle' | 'text'
                              })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                            >
                              <option value="select">Dropdown (keuzemenu)</option>
                              <option value="number">Slider (schuifbalk)</option>
                              <option value="toggle">Toggle (On/Off)</option>
                              <option value="text">Text (vrije tekst)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Category
                            </label>
                            <select
                              value={settingDefinitionForm.category}
                              onChange={(e) => setSettingDefinitionForm({ 
                                ...settingDefinitionForm, 
                                category: e.target.value as 'display' | 'graphics' | 'advanced' | 'postprocess' | 'view' | 'audio' | 'controls'
                              })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                            >
                              <option value="display">Display</option>
                              <option value="graphics">Graphics Quality</option>
                              <option value="advanced">Advanced Graphics</option>
                              <option value="postprocess">Post Processing</option>
                              <option value="view">View Settings</option>
                              <option value="audio">Audio</option>
                              <option value="controls">Controls</option>
                            </select>
                          </div>
                        </div>

                        {/* Dropdown Options */}
                        {settingDefinitionForm.field_type === 'select' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Dropdown Options *
                            </label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={newOptionInput}
                                onChange={(e) => setNewOptionInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addOption();
                                  }
                                }}
                                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                placeholder="Type an option and press Enter or click Add"
                              />
                              <button
                                onClick={addOption}
                                className="px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                              >
                                Add
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-900 rounded border border-slate-600">
                              {settingDefinitionForm.options.length === 0 ? (
                                <span className="text-slate-500 text-sm">No options added yet</span>
                              ) : (
                                settingDefinitionForm.options.map((option, index) => (
                                  <span
                                    key={index}
                                    className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs md:text-sm text-white"
                                  >
                                    {option}
                                    <button
                                      onClick={() => removeOption(option)}
                                      className="text-slate-400 hover:text-red-400"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* Slider Min/Max */}
                        {settingDefinitionForm.field_type === 'number' && (
                          <div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                  Minimum Value
                                </label>
                                <input
                                  type="number"
                                  value={settingDefinitionForm.min_value}
                                  onChange={(e) => setSettingDefinitionForm({ ...settingDefinitionForm, min_value: parseInt(e.target.value) || 0 })}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                  Maximum Value
                                </label>
                                <input
                                  type="number"
                                  value={settingDefinitionForm.max_value}
                                  onChange={(e) => setSettingDefinitionForm({ ...settingDefinitionForm, max_value: parseInt(e.target.value) || 100 })}
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                            {/* Slider Preview */}
                            <div className="p-3 bg-slate-900 rounded border border-slate-600">
                              <label className="block text-xs font-medium text-slate-400 mb-2">
                                Preview
                              </label>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 text-sm w-10">{settingDefinitionForm.min_value}</span>
                                <input
                                  type="range"
                                  min={settingDefinitionForm.min_value}
                                  max={settingDefinitionForm.max_value}
                                  value={parseInt(settingDefinitionForm.default_value) || Math.round((settingDefinitionForm.min_value + settingDefinitionForm.max_value) / 2)}
                                  onChange={(e) => setSettingDefinitionForm({ ...settingDefinitionForm, default_value: e.target.value })}
                                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="text-slate-500 text-sm w-10 text-right">{settingDefinitionForm.max_value}</span>
                                <span className="text-white font-medium w-16 text-center bg-slate-700 rounded px-2 py-1">
                                  {settingDefinitionForm.default_value || Math.round((settingDefinitionForm.min_value + settingDefinitionForm.max_value) / 2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Toggle Preview */}
                        {settingDefinitionForm.field_type === 'toggle' && (
                          <div className="p-3 bg-slate-900 rounded border border-slate-600">
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                              Preview & Default Value (klik om te wisselen)
                            </label>
                            <button
                              type="button"
                              onClick={() => setSettingDefinitionForm({ 
                                ...settingDefinitionForm, 
                                default_value: settingDefinitionForm.default_value === 'On' ? 'Off' : 'On' 
                              })}
                              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                                settingDefinitionForm.default_value === 'On'
                                  ? 'bg-green-600'
                                  : 'bg-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                  settingDefinitionForm.default_value === 'On' ? 'translate-x-9' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="ml-3 text-white font-medium">
                              {settingDefinitionForm.default_value === 'On' ? 'On' : 'Off'}
                            </span>
                          </div>
                        )}

                        {/* Dropdown Preview */}
                        {settingDefinitionForm.field_type === 'select' && settingDefinitionForm.options.length > 0 && (
                          <div className="p-3 bg-slate-900 rounded border border-slate-600">
                            <label className="block text-xs font-medium text-slate-400 mb-2">
                              Preview & Default Value
                            </label>
                            <select
                              value={settingDefinitionForm.default_value}
                              onChange={(e) => setSettingDefinitionForm({ ...settingDefinitionForm, default_value: e.target.value })}
                              className="w-full max-w-xs px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                            >
                              <option value="">-- Select default --</option>
                              {settingDefinitionForm.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Text Field Default Value */}
                        {settingDefinitionForm.field_type === 'text' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                              Default Value
                            </label>
                            <input
                              type="text"
                              value={settingDefinitionForm.default_value}
                              onChange={(e) => setSettingDefinitionForm({ ...settingDefinitionForm, default_value: e.target.value })}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                              placeholder="Default value (optional)"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Order (sortering)
                          </label>
                          <input
                            type="number"
                            value={settingDefinitionForm.order}
                            onChange={(e) => setSettingDefinitionForm({ ...settingDefinitionForm, order: parseInt(e.target.value) || 0 })}
                            className="w-full max-w-[120px] px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 mt-6">
                        <button
                          onClick={handleSaveSettingDefinition}
                          className="flex-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                        >
                          {settingDefinitionForm.id ? 'Update Setting' : 'Create Setting'}
                        </button>
                        <button
                          onClick={handleCancelSettingDefinitionForm}
                          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Profile Form Modal */}
                {showProfileForm && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                      <h2 className="text-xl font-semibold text-white mb-4">
                        {profileForm.id ? 'Edit Profile' : 'New Profile'}
                      </h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Profile Name *
                          </label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            placeholder="e.g., Competitive Settings, High FPS Build"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1">
                            Description
                          </label>
                          <textarea
                            value={profileForm.description}
                            onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                            rows={2}
                            placeholder="Optional description for this profile"
                          />
                        </div>

                        {/* Hardware Specifications */}
                        <div className="border-t border-slate-600 pt-4 mt-4">
                          <h3 className="text-lg font-medium text-white mb-3">Hardware Specifications</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                Processor Type
                              </label>
                              <input
                                type="text"
                                value={profileForm.processor_type}
                                onChange={(e) => setProfileForm({ ...profileForm, processor_type: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                placeholder="e.g., Intel Core i7-13700K"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                RAM
                              </label>
                              <input
                                type="text"
                                value={profileForm.ram}
                                onChange={(e) => setProfileForm({ ...profileForm, ram: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                placeholder="e.g., 32GB DDR5"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-1">
                                Graphic Card
                              </label>
                              <input
                                type="text"
                                value={profileForm.graphic_card}
                                onChange={(e) => setProfileForm({ ...profileForm, graphic_card: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                placeholder="e.g., NVIDIA RTX 4080"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Info about checkboxes */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-4">
                          <p className="text-blue-400 text-sm">
                            💡 <strong>Tip:</strong> Only check the settings you want to include in this profile. 
                            Unchecked settings will not be saved.
                          </p>
                        </div>

                        {/* Settings Fields by Category with Checkboxes */}
                        {(['display', 'graphics', 'advanced', 'postprocess', 'view', 'audio', 'controls'] as const).map(category => {
                          const categorySettings = settingDefinitions.filter(s => s.category === category);
                          if (categorySettings.length === 0) return null;
                          
                          const categoryLabels: Record<string, string> = {
                            display: 'Display Settings',
                            graphics: 'Graphics Quality',
                            advanced: 'Advanced Graphics',
                            postprocess: 'Post Processing',
                            view: 'View Settings',
                            audio: 'Audio',
                            controls: 'Controls',
                          };

                          const enabledCount = categorySettings.filter(s => profileForm.enabledSettings.has(s.name)).length;

                          return (
                            <div key={category} className="border-t border-slate-700 pt-4">
                              <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase">
                                  {categoryLabels[category]}
                                </h3>
                                <span className="text-xs text-slate-500">
                                  {enabledCount} / {categorySettings.length} geselecteerd
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categorySettings.map(setting => {
                                  const isEnabled = profileForm.enabledSettings.has(setting.name);
                                  return (
                                    <div 
                                      key={setting.id} 
                                      className={`p-3 rounded-lg border transition ${
                                        isEnabled 
                                          ? 'bg-slate-700/50 border-blue-500/50' 
                                          : 'bg-slate-900/50 border-slate-700 opacity-60'
                                      }`}
                                    >
                                      {/* Checkbox header */}
                                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isEnabled}
                                          onChange={() => toggleSettingEnabled(setting.name)}
                                          className="w-4 h-4 rounded border-slate-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
                                        />
                                        <span className={`text-sm font-medium ${isEnabled ? 'text-slate-200' : 'text-slate-500'}`}>
                                          {setting.display_name}
                                        </span>
                                      </label>
                                      
                                      {/* Setting input (only interactive when enabled) */}
                                      <div className={!isEnabled ? 'pointer-events-none' : ''}>
                                        {setting.field_type === 'select' && setting.options && (
                                          <select
                                            value={profileForm.values[setting.name] as string || setting.default_value || ''}
                                            onChange={(e) => setProfileForm({
                                              ...profileForm,
                                              values: { ...profileForm.values, [setting.name]: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 text-sm"
                                            disabled={!isEnabled}
                                          >
                                            {setting.options.map(opt => (
                                              <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                          </select>
                                        )}

                                        {setting.field_type === 'number' && (
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="range"
                                              min={setting.min_value || 0}
                                              max={setting.max_value || 100}
                                              value={profileForm.values[setting.name] as number || parseInt(setting.default_value || '50')}
                                              onChange={(e) => setProfileForm({
                                                ...profileForm,
                                                values: { ...profileForm.values, [setting.name]: parseInt(e.target.value) }
                                              })}
                                              className="flex-1"
                                              disabled={!isEnabled}
                                            />
                                            <span className="text-white w-12 text-center text-sm">
                                              {profileForm.values[setting.name] ?? setting.default_value ?? 50}
                                            </span>
                                          </div>
                                        )}

                                        {setting.field_type === 'toggle' && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!isEnabled) return;
                                              const currentValue = profileForm.values[setting.name];
                                              const newValue = currentValue === undefined 
                                                ? setting.default_value !== 'On'
                                                : !currentValue;
                                              setProfileForm({
                                                ...profileForm,
                                                values: { ...profileForm.values, [setting.name]: newValue }
                                              });
                                            }}
                                            className={`px-4 py-2 rounded w-full text-sm ${
                                              (profileForm.values[setting.name] === undefined 
                                                ? setting.default_value === 'On' 
                                                : profileForm.values[setting.name])
                                                ? 'bg-green-600 text-white'
                                                : 'bg-slate-600 text-slate-400'
                                            }`}
                                            disabled={!isEnabled}
                                          >
                                            {(profileForm.values[setting.name] === undefined 
                                              ? setting.default_value === 'On' 
                                              : profileForm.values[setting.name]) ? 'On' : 'Off'}
                                          </button>
                                        )}

                                        {setting.field_type === 'text' && (
                                          <input
                                            type="text"
                                            value={profileForm.values[setting.name] as string || setting.default_value || ''}
                                            onChange={(e) => setProfileForm({
                                              ...profileForm,
                                              values: { ...profileForm.values, [setting.name]: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500 text-sm"
                                            disabled={!isEnabled}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 mt-6 sticky bottom-0 bg-slate-800 pt-4 border-t border-slate-700">
                        <button
                          onClick={handleSaveProfile}
                          className="flex-1 px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                          {profileForm.id ? 'Update Profile' : 'Create Profile'} ({profileForm.enabledSettings.size} settings)
                        </button>
                        <button
                          onClick={handleCancelProfileForm}
                          className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {confirmAction && (
          <ConfirmDialog
            title={`${getActionLabel(confirmAction.action)}?`}
            message={confirmAction.user 
              ? `Are you sure you want to ${getActionLabel(confirmAction.action).toLowerCase()} ${confirmAction.user.email}?`
              : confirmAction.game
              ? `Are you sure you want to ${getActionLabel(confirmAction.action).toLowerCase()} "${confirmAction.game.name}"?`
              : confirmAction.category
              ? `Are you sure you want to ${getActionLabel(confirmAction.action).toLowerCase()} "${confirmAction.category.name}"?`
              : confirmAction.weapon
              ? `Are you sure you want to ${getActionLabel(confirmAction.action).toLowerCase()} "${confirmAction.weapon.name}"?`
              : confirmAction.attachment
              ? `Are you sure you want to ${getActionLabel(confirmAction.action).toLowerCase()} "${confirmAction.attachment.name}"?`
              : 'Are you sure?'
            }
            onConfirm={() => performAction(
              confirmAction.action, 
              confirmAction.user,
              confirmAction.game,
              confirmAction.category,
              confirmAction.weapon,
              confirmAction.attachment
            )}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </div>
    </>
  );
}
