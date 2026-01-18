import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import { Shield, Check, Ban, Trash2, Loader, Plus, Edit, Trash, ChevronDown, ChevronRight, Copy, Search } from 'lucide-react';

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
  created_at: string;
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
  created_at: string;
}

interface Attachment {
  id: number;
  name: string;
  weapon: number;
  weapon_name?: string;
  type: 'Muzzle' | 'Optic' | 'Stock' | 'Grip' | 'Magazine' | 'Underbarrel' | 'Ammunition' | 'Perk';
  image?: string;
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

type AdminTab = 'users' | 'games' | 'categories' | 'weapons' | 'attachments' | 'settings' | 'game-settings';

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
  
  // Games state
  const [games, setGames] = useState<Game[]>([]);
  const [gameSearch, setGameSearch] = useState('');
  const [gamePage, setGamePage] = useState(1);
  const [gameTotalPages, setGameTotalPages] = useState(1);
  const [gameForm, setGameForm] = useState<{ id: number | null; name: string; slug: string; description: string; is_active: boolean; image: File | null }>({ id: null, name: '', slug: '', description: '', is_active: true, image: null });
  const [showGameForm, setShowGameForm] = useState(false);
  const [gameImagePreview, setGameImagePreview] = useState<string | null>(null);
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryTotalPages, setCategoryTotalPages] = useState(1);
  const [categoryForm, setCategoryForm] = useState<{ id: number | null; name: string; game: number | null }>({ id: null, name: '', game: null });
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  
  // Weapons state
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [weaponSearch, setWeaponSearch] = useState('');
  const [weaponPage, setWeaponPage] = useState(1);
  const [weaponTotalPages, setWeaponTotalPages] = useState(1);
  const [weaponForm, setWeaponForm] = useState<{ 
    id: number | null; 
    name: string; 
    category: number | null; 
    image: File | null; 
    text_color: string; 
    image_size: 'small' | 'medium' | 'large';
  }>({ id: null, name: '', category: null, image: null, text_color: '#FFFFFF', image_size: 'medium' });
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
    type: Attachment['type'] | '';
    image: File | null;
  }>({ id: null, name: '', weapon: null, type: '', image: null });
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [attachmentImagePreview, setAttachmentImagePreview] = useState<string | null>(null);
  const [expandedWeaponsInAttachments, setExpandedWeaponsInAttachments] = useState<Set<number>>(new Set());
  const [weaponSearchQuery, setWeaponSearchQuery] = useState('');
  const [showWeaponDropdown, setShowWeaponDropdown] = useState(false);
  const weaponDropdownRef = useRef<HTMLDivElement>(null);
  
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
  }>({ id: null, name: '', description: '', processor_type: '', ram: '', graphic_card: '', values: {} });
  const [showProfileForm, setShowProfileForm] = useState(false);
  
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

      const response = await fetch(`http://localhost:8000/api/users/?${params}`, {
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

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: gameSearch,
        page: gamePage.toString(),
        page_size: itemsPerPage.toString(),
      });

      const response = await fetch(`http://localhost:8000/api/games/?${params}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGames(data.results || data);
        setGameTotalPages(Math.ceil((data.count || data.length) / itemsPerPage));
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  }, [gameSearch, gamePage, token]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: categorySearch,
        page: categoryPage.toString(),
        page_size: itemsPerPage.toString(),
      });

      const response = await fetch(`http://localhost:8000/api/categories/?${params}`, {
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
      });

      const response = await fetch(`http://localhost:8000/api/weapons/?${params}`, {
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
  }, [weaponSearch, weaponPage, token]);

  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: attachmentSearch,
        page: attachmentPage.toString(),
        page_size: itemsPerPage.toString(),
      });

      const response = await fetch(`http://localhost:8000/api/attachments/?${params}`, {
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

  // Fetch game setting definitions
  const fetchSettingDefinitions = useCallback(async (gameId?: number) => {
    try {
      const params = new URLSearchParams({ page_size: '200' });
      if (gameId) params.append('game', gameId.toString());

      const response = await fetch(`http://localhost:8000/api/game-setting-definitions/?${params}`, {
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

      const response = await fetch(`http://localhost:8000/api/game-setting-profiles/?${params}`, {
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
          fetch(`http://localhost:8000/api/games/?page_size=100`, {
            headers: { 'Authorization': `Token ${token}` },
          }),
          fetch(`http://localhost:8000/api/categories/?page_size=100`, {
            headers: { 'Authorization': `Token ${token}` },
          }),
          fetch(`http://localhost:8000/api/weapons/?page_size=100`, {
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
    }
  }, [attachmentSearch, attachmentPage, activeTab, fetchAttachments]);

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
          `http://localhost:8000/api/users/${user?.id}/${endpoint}/`,
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
        }
      } else if (action.startsWith('game_')) {
        const gameAction = action.replace('game_', '');
        
        if (gameAction === 'delete' && game) {
          const response = await fetch(
            `http://localhost:8000/api/games/${game.id}/`,
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
            `http://localhost:8000/api/games/${game.id}/`,
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
            `http://localhost:8000/api/categories/${category.id}/`,
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
            `http://localhost:8000/api/weapons/${weapon.id}/`,
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
            `http://localhost:8000/api/attachments/${attachment.id}/`,
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
        ? `http://localhost:8000/api/games/${gameForm.id}/`
        : `http://localhost:8000/api/games/`;
      
      const method = gameForm.id ? 'PATCH' : 'POST';
      
      const formData = new FormData();
      formData.append('name', gameForm.name);
      formData.append('slug', gameForm.slug || gameForm.name.toLowerCase().replace(/\s+/g, '-'));
      formData.append('description', gameForm.description);
      formData.append('is_active', gameForm.is_active.toString());
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
        setGameForm({ id: null, name: '', slug: '', description: '', is_active: true, image: null });
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
      image: null,
    });
    setGameImagePreview(game.image || null);
    setShowGameForm(true);
  };

  const handleCancelGameForm = () => {
    setShowGameForm(false);
    setGameForm({ id: null, name: '', slug: '', description: '', is_active: true, image: null });
    setGameImagePreview(null);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim() || !categoryForm.game) return;

    try {
      const url = categoryForm.id
        ? `http://localhost:8000/api/categories/${categoryForm.id}/`
        : `http://localhost:8000/api/categories/`;
      
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
      
      if (weaponForm.image instanceof File) {
        formData.append('image', weaponForm.image);
      }

      const url = weaponForm.id
        ? `http://localhost:8000/api/weapons/${weaponForm.id}/`
        : `http://localhost:8000/api/weapons/`;
      
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
        setWeaponForm({ id: null, name: '', category: null, image: null, text_color: '#FFFFFF', image_size: 'medium' });
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
    });
    setShowWeaponForm(true);
  };

  const handleCancelWeaponForm = () => {
    setShowWeaponForm(false);
    setWeaponForm({ id: null, name: '', category: null, image: null, text_color: '#FFFFFF', image_size: 'medium' });
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
      
      const weaponResponse = await fetch('http://localhost:8000/api/weapons/', {
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
      const attachmentsResponse = await fetch(`http://localhost:8000/api/attachments/?weapon=${originalWeapon.id}&page_size=100`, {
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
          attachmentFormData.append('type', attachment.type);
          
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
          
          await fetch('http://localhost:8000/api/attachments/', {
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
    if (!attachmentForm.name.trim() || !attachmentForm.weapon || !attachmentForm.type) return;
    setError(null);

    try {
      const url = attachmentForm.id
        ? `http://localhost:8000/api/attachments/${attachmentForm.id}/`
        : `http://localhost:8000/api/attachments/`;
      
      const method = attachmentForm.id ? 'PATCH' : 'POST';
      
      const formData = new FormData();
      formData.append('name', attachmentForm.name);
      formData.append('weapon', attachmentForm.weapon.toString());
      formData.append('type', attachmentForm.type);
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
        setAttachmentForm({ id: null, name: '', weapon: null, type: '', image: null });
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
      type: attachment.type,
      image: null,
    });
    setAttachmentImagePreview(attachment.image || null);
    setWeaponSearchQuery('');
    setShowWeaponDropdown(false);
    setShowAttachmentForm(true);
  };

  const handleCancelAttachmentForm = () => {
    setShowAttachmentForm(false);
    setAttachmentForm({ id: null, name: '', weapon: null, type: '', image: null });
    setAttachmentImagePreview(null);
    setWeaponSearchQuery('');
    setShowWeaponDropdown(false);
    setError(null);
  };

  // Game Settings Handlers
  const handleStartNewProfile = () => {
    if (!selectedGameForSettings) {
      setError('Please select a game first');
      return;
    }
    // Initialize values with defaults from definitions
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
    setProfileForm({ id: null, name: '', description: '', processor_type: '', ram: '', graphic_card: '', values: defaultValues });
    setShowProfileForm(true);
  };

  const handleEditProfile = (profile: GameSettingProfile) => {
    setProfileForm({
      id: profile.id,
      name: profile.name,
      description: profile.description || '',
      processor_type: profile.processor_type || '',
      ram: profile.ram || '',
      graphic_card: profile.graphic_card || '',
      values: profile.values,
    });
    setShowProfileForm(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedGameForSettings || !profileForm.name.trim()) {
      setError('Profile name is required');
      return;
    }
    setError(null);

    try {
      const url = profileForm.id
        ? `http://localhost:8000/api/game-setting-profiles/${profileForm.id}/`
        : 'http://localhost:8000/api/game-setting-profiles/';
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
          values: profileForm.values,
          is_active: true,
        }),
      });

      if (response.ok) {
        setShowProfileForm(false);
        setProfileForm({ id: null, name: '', description: '', processor_type: '', ram: '', graphic_card: '', values: {} });
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
      const response = await fetch(`http://localhost:8000/api/game-setting-profiles/${profile.id}/`, {
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
    setProfileForm({ id: null, name: '', description: '', processor_type: '', ram: '', graphic_card: '', values: {} });
    setError(null);
  };

  const handleActionClick = (action: string, user?: User, game?: Game, category?: Category, weapon?: Weapon, attachment?: Attachment) => {
    setConfirmAction({ action, user, game, category, weapon, attachment });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      user_verify_user: 'Verify',
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
    if (action.includes('block') || action.includes('remove') || action.includes('deactivate') || action.includes('delete')) {
      return 'text-red-400 hover:text-red-300';
    }
    if (action.includes('verify') || action.includes('make') || action.includes('activate')) {
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
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
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
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Nickname</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="px-6 py-4 text-sm text-white">{user.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-300">{user.nickname}</td>
                          <td className="px-6 py-4 text-sm">
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
                          <td className="px-6 py-4 text-sm">
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

        {activeTab === 'games' && (
          <div className="p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Games Management</h1>
                <p className="text-slate-400">Manage all games in the system</p>
              </div>
              <button
                onClick={() => setShowGameForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" /> Add Game
              </button>
            </div>

            <div className="mb-6">
              <SearchBar 
                value={gameSearch}
                onChange={handleGameSearchChange}
                placeholder="Search games..."
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
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Slug</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Created</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {games.map((game) => (
                        <tr key={game.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="px-6 py-4 text-sm text-white">{game.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-300">{game.slug}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                              game.is_active
                                ? 'bg-green-900/30 text-green-400'
                                : 'bg-red-900/30 text-red-400'
                            }`}>
                              {game.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {new Date(game.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditGame(game)}
                                className="text-blue-400 hover:text-blue-300 transition"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleActionClick('game_toggle', undefined, game)}
                                className={`transition ${
                                  game.is_active
                                    ? 'text-yellow-400 hover:text-yellow-300'
                                    : 'text-green-400 hover:text-green-300'
                                }`}
                                title={game.is_active ? 'Deactivate' : 'Activate'}
                              >
                                <Ban className="w-4 h-4" />
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
                      <label htmlFor="isActive" className="ml-2 text-sm text-slate-300">
                        Active
                      </label>
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
                          className="flex-1 text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-700 file:text-white hover:file:bg-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveGame}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Categories Management</h1>
                <p className="text-slate-400">Manage game categories</p>
              </div>
              <button
                onClick={() => setShowCategoryForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Game</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Created</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="px-6 py-4 text-sm text-white">{category.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-300">{getGameName(category.game)}</td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {new Date(category.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
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
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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
          <div className="p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Weapons Management</h1>
                <p className="text-slate-400">Manage weapon loadouts</p>
              </div>
              <button
                onClick={() => setShowWeaponForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" /> Add Weapon
              </button>
            </div>

            <div className="mb-6">
              <SearchBar 
                value={weaponSearch}
                onChange={handleWeaponSearchChange}
                placeholder="Search weapons..."
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
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Name</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Category</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Image</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Size</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Color</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Created</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weapons.map((weapon) => (
                        <tr key={weapon.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          <td className="px-6 py-4 text-sm text-white">{weapon.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-300">{getCategoryName(weapon.category)}</td>
                          <td className="px-6 py-4 text-sm">
                            {weapon.image && (
                              <img src={weapon.image} alt={weapon.name} className="w-10 h-10 rounded object-cover" />
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300 capitalize">{weapon.image_size}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded border border-slate-600"
                                style={{ backgroundColor: weapon.text_color }}
                              />
                              <span className="text-slate-400">{weapon.text_color}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {new Date(weapon.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
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
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveWeapon}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Attachments Management</h1>
                <p className="text-slate-400">Manage all weapon attachments in the system</p>
              </div>
              <button
                onClick={() => setShowAttachmentForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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
                      const weaponName = getWeaponName(weaponId);
                      const isExpanded = expandedWeaponsInAttachments.has(weaponId);

                      return (
                        <div key={weaponId} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                          {/* Weapon Header */}
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
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/50 transition"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-blue-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                              )}
                              <h3 className="text-lg font-medium text-white">{weaponName}</h3>
                              <span className="text-sm text-slate-400">
                                ({weaponAttachments.length} attachment{weaponAttachments.length !== 1 ? 's' : ''})
                              </span>
                            </div>
                          </button>

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
                                      <td className="px-6 py-3 text-sm text-white">{attachment.name}</td>
                                      <td className="px-6 py-3 text-sm">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-400/10 text-blue-400">
                                          {attachment.type}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3 text-sm text-slate-400">
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
                        value={attachmentForm.type}
                        onChange={(e) => setAttachmentForm({ ...attachmentForm, type: e.target.value as Attachment['type'] | '' })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select a type</option>
                        <option value="Muzzle">Muzzle</option>
                        <option value="Optic">Optic</option>
                        <option value="Stock">Stock</option>
                        <option value="Grip">Grip</option>
                        <option value="Magazine">Magazine</option>
                        <option value="Underbarrel">Underbarrel</option>
                        <option value="Ammunition">Ammunition</option>
                        <option value="Perk">Perk</option>
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
                          className="flex-1 text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-700 file:text-white hover:file:bg-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveAttachment}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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

        {activeTab === 'game-settings' && (
          <div className="p-8">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Game Settings</h1>
                <p className="text-slate-400">Create and manage graphics settings profiles for each game</p>
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
                  <h2 className="text-lg font-semibold text-white mb-4">
                    Available Settings for {games.find(g => g.id === selectedGameForSettings)?.name}
                  </h2>
                  <p className="text-slate-400 text-sm mb-4">
                    These are the graphics settings fields that will be available when creating a profile.
                  </p>
                  
                  {/* Group by category */}
                  {(['display', 'graphics', 'advanced', 'postprocess', 'view'] as const).map(category => {
                    const categorySettings = settingDefinitions.filter(s => s.category === category);
                    if (categorySettings.length === 0) return null;
                    
                    const categoryLabels: Record<string, string> = {
                      display: 'Display',
                      graphics: 'Graphics Quality',
                      advanced: 'Advanced Graphics',
                      postprocess: 'Post Processing',
                      view: 'View Settings',
                    };

                    return (
                      <div key={category} className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2">
                          {categoryLabels[category]}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {categorySettings.map(setting => (
                            <span
                              key={setting.id}
                              className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300"
                              title={`Type: ${setting.field_type}${setting.options ? `, Options: ${setting.options.join(', ')}` : ''}`}
                            >
                              {setting.display_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Profiles List */}
                <div className="mb-6 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white">Settings Profiles</h2>
                  <button
                    onClick={handleStartNewProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
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
                              <p className="text-sm text-slate-400 mt-1">{profile.description}</p>
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
                                <span className="text-sm text-white">
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

                        {/* Settings Fields by Category */}
                        {(['display', 'graphics', 'advanced', 'postprocess', 'view'] as const).map(category => {
                          const categorySettings = settingDefinitions.filter(s => s.category === category);
                          if (categorySettings.length === 0) return null;
                          
                          const categoryLabels: Record<string, string> = {
                            display: 'Display Settings',
                            graphics: 'Graphics Quality',
                            advanced: 'Advanced Graphics',
                            postprocess: 'Post Processing',
                            view: 'View Settings',
                          };

                          return (
                            <div key={category} className="border-t border-slate-700 pt-4">
                              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">
                                {categoryLabels[category]}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categorySettings.map(setting => (
                                  <div key={setting.id}>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                      {setting.display_name}
                                    </label>
                                    
                                    {setting.field_type === 'select' && setting.options && (
                                      <select
                                        value={profileForm.values[setting.name] as string || setting.default_value || ''}
                                        onChange={(e) => setProfileForm({
                                          ...profileForm,
                                          values: { ...profileForm.values, [setting.name]: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
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
                                        />
                                        <span className="text-white w-12 text-center">
                                          {profileForm.values[setting.name] || setting.default_value || 50}
                                        </span>
                                      </div>
                                    )}

                                    {setting.field_type === 'toggle' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentValue = profileForm.values[setting.name];
                                          const newValue = currentValue === undefined 
                                            ? setting.default_value !== 'On'
                                            : !currentValue;
                                          setProfileForm({
                                            ...profileForm,
                                            values: { ...profileForm.values, [setting.name]: newValue }
                                          });
                                        }}
                                        className={`px-4 py-2 rounded w-full ${
                                          (profileForm.values[setting.name] === undefined 
                                            ? setting.default_value === 'On' 
                                            : profileForm.values[setting.name])
                                            ? 'bg-green-600 text-white'
                                            : 'bg-slate-700 text-slate-400'
                                        }`}
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
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-2 mt-6">
                        <button
                          onClick={handleSaveProfile}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                          {profileForm.id ? 'Update Profile' : 'Create Profile'}
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
