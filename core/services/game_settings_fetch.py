"""
Service for fetching game settings from various sources.
Sources:
- PCGamingWiki API (primary source for game settings)
- Fallback to basic templates if not found
"""
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote
from core.models import Game, GameSettingDefinition


class GameSettingsFetchService:
    """Service to fetch game settings definitions from PCGamingWiki."""
    
    PCGAMINGWIKI_API_URL = "https://www.pcgamingwiki.com/w/api.php"
    
    # Category mapping from PCGamingWiki sections to our categories
    CATEGORY_MAPPING = {
        'video': 'display',
        'display': 'display',
        'graphics': 'graphics',
        'visual': 'graphics',
        'input': 'controls',
        'mouse': 'controls',
        'keyboard': 'controls',
        'controller': 'controls',
        'audio': 'audio',
        'sound': 'audio',
        'network': 'advanced',
        'multiplayer': 'advanced',
        'gameplay': 'advanced',
    }
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'TDC-GameSettings/1.0 (https://github.com/example; contact@example.com) Python-requests',
            'Accept': 'application/json',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def _search_pcgamingwiki(self, game_name: str) -> str | None:
        """Search PCGamingWiki for the game and return the page title."""
        try:
            params = {
                'action': 'opensearch',
                'search': game_name,
                'limit': 5,
                'namespace': 0,
                'format': 'json',
            }
            response = self.session.get(self.PCGAMINGWIKI_API_URL, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if len(data) >= 2 and data[1]:
                    return data[1][0]
        except Exception as e:
            print(f"PCGamingWiki search error: {e}")
        return None
    
    def _get_wiki_content(self, page_title: str) -> str | None:
        """Get the wikitext content of a PCGamingWiki page via API."""
        try:
            params = {
                'action': 'parse',
                'page': page_title,
                'prop': 'wikitext',
                'format': 'json',
            }
            response = self.session.get(self.PCGAMINGWIKI_API_URL, params=params, timeout=15)
            if response.status_code == 200:
                data = response.json()
                if 'parse' in data and 'wikitext' in data['parse']:
                    return data['parse']['wikitext']['*']
        except Exception as e:
            print(f"PCGamingWiki content fetch error: {e}")
        return None
    
    def _parse_wikitext_settings(self, wikitext: str) -> list:
        """Parse settings from PCGamingWiki wikitext format.
        
        We extract actual configurable settings, not just support info.
        PCGamingWiki has limited actual setting values, so we supplement
        with common settings when specific features are supported.
        """
        settings = []
        seen_names = set()
        
        # Check what features are supported to determine which settings to add
        wikitext_lower = wikitext.lower()
        
        # Display Settings - always useful
        settings.extend([
            {'name': 'resolution', 'display_name': 'Resolution', 'field_type': 'select', 
             'category': 'display', 'options': ['1280x720', '1920x1080', '2560x1440', '3840x2160']},
            {'name': 'display_mode', 'display_name': 'Display Mode', 'field_type': 'select',
             'category': 'display', 'options': ['Fullscreen', 'Windowed', 'Borderless Windowed']},
        ])
        seen_names.update(['resolution', 'display_mode'])
        
        # V-Sync
        if '|vsync' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'vsync', 'display_name': 'V-Sync', 'field_type': 'toggle', 
                           'category': 'display', 'options': None})
            seen_names.add('vsync')
        
        # Frame Rate
        if '|120 fps' in wikitext_lower or '|60 fps' in wikitext_lower:
            settings.append({'name': 'fps_limit', 'display_name': 'FPS Limit', 'field_type': 'select',
                           'category': 'display', 'options': ['30', '60', '120', '144', '240', 'Unlimited']})
            seen_names.add('fps_limit')
        
        # FOV
        if '|fov' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'fov', 'display_name': 'Field of View', 'field_type': 'number',
                           'category': 'display', 'options': None, 'default_value': '90'})
            seen_names.add('fov')
        
        # HDR
        if '|hdr' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'hdr', 'display_name': 'HDR', 'field_type': 'toggle',
                           'category': 'display', 'options': None})
            seen_names.add('hdr')
        
        # Brightness (almost all games have this)
        settings.append({'name': 'brightness', 'display_name': 'Brightness', 'field_type': 'number',
                        'category': 'display', 'options': None, 'default_value': '50'})
        seen_names.add('brightness')
        
        # Graphics Settings
        settings.extend([
            {'name': 'graphics_quality', 'display_name': 'Graphics Quality', 'field_type': 'select',
             'category': 'graphics', 'options': ['Low', 'Medium', 'High', 'Ultra']},
            {'name': 'texture_quality', 'display_name': 'Texture Quality', 'field_type': 'select',
             'category': 'graphics', 'options': ['Low', 'Medium', 'High', 'Ultra']},
            {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'field_type': 'select',
             'category': 'graphics', 'options': ['Off', 'Low', 'Medium', 'High', 'Ultra']},
        ])
        seen_names.update(['graphics_quality', 'texture_quality', 'shadow_quality'])
        
        # Anti-Aliasing
        if '|antialiasing' in wikitext_lower and '= true' in wikitext_lower:
            # Try to extract AA options from notes
            aa_options = ['Off', 'FXAA', 'TAA', 'SMAA']
            if 'msaa' in wikitext_lower:
                aa_options.extend(['MSAA 2x', 'MSAA 4x'])
            settings.append({'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'field_type': 'select',
                           'category': 'graphics', 'options': aa_options})
            seen_names.add('anti_aliasing')
        
        # Anisotropic Filtering
        if '|anisotropic' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'anisotropic_filtering', 'display_name': 'Anisotropic Filtering', 
                           'field_type': 'select', 'category': 'graphics', 
                           'options': ['Off', '2x', '4x', '8x', '16x']})
            seen_names.add('anisotropic_filtering')
        
        # DLSS/FSR
        if '|upscaling' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'upscaling', 'display_name': 'Upscaling', 'field_type': 'select',
                           'category': 'graphics', 'options': ['Off', 'Quality', 'Balanced', 'Performance', 'Ultra Performance']})
            seen_names.add('upscaling')
        
        # Ray Tracing
        if '|ray tracing' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'ray_tracing', 'display_name': 'Ray Tracing', 'field_type': 'toggle',
                           'category': 'graphics', 'options': None})
            seen_names.add('ray_tracing')
        
        # Motion Blur (common setting)
        settings.append({'name': 'motion_blur', 'display_name': 'Motion Blur', 'field_type': 'toggle',
                        'category': 'graphics', 'options': None})
        seen_names.add('motion_blur')
        
        # Audio Settings
        settings.extend([
            {'name': 'master_volume', 'display_name': 'Master Volume', 'field_type': 'number',
             'category': 'audio', 'options': None, 'default_value': '100'},
            {'name': 'music_volume', 'display_name': 'Music Volume', 'field_type': 'number',
             'category': 'audio', 'options': None, 'default_value': '100'},
            {'name': 'effects_volume', 'display_name': 'Effects Volume', 'field_type': 'number',
             'category': 'audio', 'options': None, 'default_value': '100'},
        ])
        seen_names.update(['master_volume', 'music_volume', 'effects_volume'])
        
        # Dialogue/Voice
        if '|separate volume' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'dialogue_volume', 'display_name': 'Dialogue Volume', 'field_type': 'number',
                           'category': 'audio', 'options': None, 'default_value': '100'})
            seen_names.add('dialogue_volume')
        
        # Surround Sound
        if '|surround' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'audio_output', 'display_name': 'Audio Output', 'field_type': 'select',
                           'category': 'audio', 'options': ['Stereo', 'Headphones', 'Surround 5.1', 'Surround 7.1']})
            seen_names.add('audio_output')
        
        # Subtitles
        if '|subtitles' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'subtitles', 'display_name': 'Subtitles', 'field_type': 'toggle',
                           'category': 'audio', 'options': None})
            seen_names.add('subtitles')
        
        # Controls Settings
        if '|mouse sensitivity' in wikitext_lower or '|mouse input' in wikitext_lower:
            settings.extend([
                {'name': 'mouse_sensitivity', 'display_name': 'Mouse Sensitivity', 'field_type': 'number',
                 'category': 'controls', 'options': None, 'default_value': '5'},
            ])
            seen_names.add('mouse_sensitivity')
        
        if '|mouse input raw' in wikitext_lower and '= true' in wikitext_lower:
            settings.append({'name': 'raw_mouse_input', 'display_name': 'Raw Mouse Input', 'field_type': 'toggle',
                           'category': 'controls', 'options': None})
            seen_names.add('raw_mouse_input')
        
        # Controller
        if '|controller support' in wikitext_lower and '= true' in wikitext_lower:
            settings.extend([
                {'name': 'controller_sensitivity', 'display_name': 'Controller Sensitivity', 'field_type': 'number',
                 'category': 'controls', 'options': None, 'default_value': '5'},
                {'name': 'invert_y_axis', 'display_name': 'Invert Y-Axis', 'field_type': 'toggle',
                 'category': 'controls', 'options': None},
            ])
            seen_names.update(['controller_sensitivity', 'invert_y_axis'])
        
        # Add default_value to all settings that don't have it
        for setting in settings:
            if 'default_value' not in setting:
                setting['default_value'] = ''
        
        return settings
    
    def _create_setting_from_name(self, name: str, value: str, category: str) -> dict | None:
        """Create a setting dict from a name and value."""
        # Clean name
        name = re.sub(r'<[^>]+>', '', name)  # Remove HTML
        name = re.sub(r'\{\{[^}]+\}\}', '', name)  # Remove templates
        name = name.strip(' |-!')
        
        if not name or len(name) < 2:
            return None
        
        # Generate slug
        slug = name.lower()
        slug = re.sub(r'[^a-z0-9\s]', '', slug)
        slug = slug.replace(' ', '_')
        slug = re.sub(r'_+', '_', slug).strip('_')
        
        if not slug or len(slug) < 2:
            return None
        
        # Determine field type
        field_type = 'text'
        options = None
        
        value_lower = value.lower() if value else ''
        name_lower = name.lower()
        
        # Toggle types
        if any(x in value_lower for x in ['true', 'false', 'on/off', 'yes/no', 'enabled', 'disabled']):
            field_type = 'toggle'
        elif any(x in name_lower for x in ['vsync', 'v-sync', 'blur', 'bloom', 'hdr', 'ray tracing']):
            field_type = 'toggle'
        
        # Select types
        elif any(x in name_lower for x in ['quality', 'preset', 'mode', 'filtering']):
            field_type = 'select'
            if 'quality' in name_lower:
                options = ['Low', 'Medium', 'High', 'Ultra']
            elif 'mode' in name_lower:
                options = ['Fullscreen', 'Windowed', 'Borderless']
        
        # Number types
        elif any(x in name_lower for x in ['volume', 'sensitivity', 'fov', 'brightness', 'gamma', 'fps', 'limit']):
            field_type = 'number'
        
        return {
            'name': slug[:50],
            'display_name': name[:100],
            'field_type': field_type,
            'category': category,
            'options': options,
            'default_value': '',
        }
    
    def fetch_settings_for_game(self, game: Game) -> dict:
        """
        Fetch and create setting definitions for a game from PCGamingWiki.
        Returns dict with stats about created/skipped settings.
        """
        created = 0
        skipped = 0
        source = 'template'
        
        settings_to_create = []
        
        print(f"Searching PCGamingWiki for: {game.name}")
        page_title = self._search_pcgamingwiki(game.name)
        
        if page_title:
            print(f"Found page: {page_title}")
            wikitext = self._get_wiki_content(page_title)
            
            if wikitext:
                print(f"Got wikitext ({len(wikitext)} chars)")
                settings_to_create = self._parse_wikitext_settings(wikitext)
                if settings_to_create:
                    source = 'pcgamingwiki'
                    print(f"Extracted {len(settings_to_create)} settings from PCGamingWiki")
        
        # If no settings found, use minimal fallback
        if not settings_to_create:
            print("No settings found on PCGamingWiki, using minimal template")
            settings_to_create = self._get_minimal_template(game)
            source = 'template'
        
        # Create setting definitions
        for order, setting in enumerate(settings_to_create, 1):
            existing = GameSettingDefinition.objects.filter(
                game=game,
                name=setting['name']
            ).exists()
            
            if existing:
                skipped += 1
                continue
            
            category = setting.get('category', 'graphics')
            if category not in ['display', 'graphics', 'advanced', 'postprocess', 'view', 'audio', 'controls']:
                category = 'graphics'
            
            GameSettingDefinition.objects.create(
                game=game,
                name=setting['name'],
                display_name=setting['display_name'],
                field_type=setting.get('field_type', 'text'),
                category=category,
                options=setting.get('options'),
                default_value=setting.get('default_value', ''),
                order=order,
            )
            created += 1
        
        return {
            'settings_created': created,
            'skipped': skipped,
            'source': source,
            'total_found': len(settings_to_create),
        }
    
    def _get_minimal_template(self, game: Game) -> list:
        """Get minimal template settings when PCGamingWiki has no data."""
        return [
            {'name': 'resolution', 'display_name': 'Resolution', 'field_type': 'select', 
             'category': 'display', 'options': ['1920x1080', '2560x1440', '3840x2160']},
            {'name': 'display_mode', 'display_name': 'Display Mode', 'field_type': 'select',
             'category': 'display', 'options': ['Fullscreen', 'Windowed', 'Borderless']},
            {'name': 'vsync', 'display_name': 'V-Sync', 'field_type': 'toggle', 'category': 'display'},
            {'name': 'graphics_quality', 'display_name': 'Graphics Quality', 'field_type': 'select',
             'category': 'graphics', 'options': ['Low', 'Medium', 'High', 'Ultra']},
            {'name': 'master_volume', 'display_name': 'Master Volume', 'field_type': 'number',
             'category': 'audio', 'default_value': '100'},
        ]


# Singleton instance
game_settings_fetch_service = GameSettingsFetchService()
