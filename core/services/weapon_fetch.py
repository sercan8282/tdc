"""
Service for fetching weapons from shooter games.
Sources:
- GamesAtlas (primary)
- Game-specific wikis
"""
import os
import re
import time
import requests
from io import BytesIO
from PIL import Image
from bs4 import BeautifulSoup
from django.core.files.base import ContentFile
from django.utils.text import slugify
from core.models import Game, Category, Weapon


class WeaponFetchService:
    """Service to fetch weapons for shooter games."""
    
    # GamesAtlas base URLs
    GAMESATLAS_BASE = "https://www.gamesatlas.com"
    
    # Mapping of game slugs to GamesAtlas URLs
    GAME_SOURCES = {
        'call-of-duty-black-ops-6': {
            'url': 'https://www.gamesatlas.com/cod-black-ops-6/weapons',
            'source': 'gamesatlas',
        },
        'call-of-duty-warzone-2': {
            'url': 'https://www.gamesatlas.com/cod-warzone-2/weapons',
            'source': 'gamesatlas',
        },
        'call-of-duty-warzone': {
            'url': 'https://www.gamesatlas.com/cod-warzone-2/weapons',
            'source': 'gamesatlas',
        },
        'battlefield-2042': {
            'url': 'https://www.gamesatlas.com/battlefield-2042/weapons',
            'source': 'gamesatlas',
        },
        'apex-legends': {
            'url': 'https://www.gamesatlas.com/apex-legends/weapons',
            'source': 'gamesatlas',
        },
    }
    
    # Standard weapon categories for shooters
    DEFAULT_CATEGORIES = [
        'Assault Rifles',
        'Submachine Guns',
        'Shotguns',
        'Light Machine Guns',
        'Marksman Rifles',
        'Sniper Rifles',
        'Pistols',
        'Launchers',
        'Melee',
        'Special',
    ]
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
    
    def get_supported_games(self) -> list:
        """Return list of games that support automatic weapon fetching."""
        return list(self.GAME_SOURCES.keys())
    
    def can_fetch_weapons(self, game_slug: str) -> bool:
        """Check if weapons can be fetched for a game."""
        return game_slug in self.GAME_SOURCES
    
    def fetch_weapons_for_game(self, game: Game, download_images: bool = True) -> dict:
        """
        Fetch all weapons for a shooter game.
        Returns dict with stats about fetched/skipped weapons.
        """
        if not game.is_shooter:
            return {
                'success': False,
                'error': 'Game is not a shooter',
                'created': 0,
                'skipped': 0,
            }
        
        game_config = self.GAME_SOURCES.get(game.slug)
        if not game_config:
            return {
                'success': False,
                'error': f'No weapon source configured for {game.name}',
                'created': 0,
                'skipped': 0,
            }
        
        source = game_config.get('source')
        if source == 'gamesatlas':
            return self._fetch_from_gamesatlas(game, game_config['url'], download_images)
        
        return {
            'success': False,
            'error': 'Unknown source',
            'created': 0,
            'skipped': 0,
        }
    
    def _fetch_from_gamesatlas(self, game: Game, url: str, download_images: bool) -> dict:
        """Fetch weapons from GamesAtlas."""
        created = 0
        skipped = 0
        errors = []
        
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if not response.ok:
                return {
                    'success': False,
                    'error': f'Failed to fetch page: HTTP {response.status_code}',
                    'created': 0,
                    'skipped': 0,
                }
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Find weapon sections (categories)
            weapon_sections = soup.find_all('section', class_='category')
            
            if not weapon_sections:
                # Try alternative structure
                weapon_sections = soup.find_all('div', class_='weapon-category')
            
            if not weapon_sections:
                # Try to find weapons directly
                weapon_items = soup.find_all('a', class_='weapon-box')
                if weapon_items:
                    # Create default category
                    category, _ = Category.objects.get_or_create(
                        name='Weapons',
                        game=game
                    )
                    
                    for item in weapon_items:
                        result = self._process_weapon_item(item, category, download_images)
                        if result == 'created':
                            created += 1
                        elif result == 'skipped':
                            skipped += 1
            else:
                for section in weapon_sections:
                    # Get category name
                    category_header = section.find(['h2', 'h3', 'h4'])
                    category_name = category_header.get_text(strip=True) if category_header else 'Other'
                    
                    # Normalize category name
                    category_name = self._normalize_category_name(category_name)
                    
                    # Get or create category
                    category, _ = Category.objects.get_or_create(
                        name=category_name,
                        game=game
                    )
                    
                    # Find weapons in this section
                    weapon_items = section.find_all('a', class_='weapon-box')
                    if not weapon_items:
                        weapon_items = section.find_all('div', class_='weapon-item')
                    
                    for item in weapon_items:
                        result = self._process_weapon_item(item, category, download_images)
                        if result == 'created':
                            created += 1
                        elif result == 'skipped':
                            skipped += 1
                        
                        # Rate limiting
                        time.sleep(0.3)
            
            return {
                'success': True,
                'created': created,
                'skipped': skipped,
                'errors': errors,
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'created': created,
                'skipped': skipped,
            }
    
    def _process_weapon_item(self, item, category: Category, download_images: bool) -> str:
        """Process a single weapon item. Returns 'created', 'skipped', or 'error'."""
        try:
            # Get weapon name
            name_elem = item.find(['h3', 'h4', 'span', 'div'], class_=lambda x: x and 'name' in x.lower() if x else False)
            if not name_elem:
                name_elem = item.find(['h3', 'h4'])
            if not name_elem:
                # Try getting text directly
                name = item.get_text(strip=True)
            else:
                name = name_elem.get_text(strip=True)
            
            if not name or len(name) < 2:
                return 'error'
            
            # Clean up name
            name = re.sub(r'\s+', ' ', name).strip()
            
            # Check if weapon already exists (duplicate check)
            existing = Weapon.objects.filter(
                name__iexact=name,
                category__game=category.game
            ).exists()
            
            if existing:
                return 'skipped'
            
            # Create weapon
            weapon = Weapon.objects.create(
                name=name,
                category=category,
                is_active=False,  # Inactive by default
            )
            
            # Download image if requested
            if download_images:
                img_elem = item.find('img')
                if img_elem:
                    img_url = img_elem.get('src') or img_elem.get('data-src')
                    if img_url:
                        if not img_url.startswith('http'):
                            img_url = f"{self.GAMESATLAS_BASE}{img_url}"
                        
                        try:
                            self._download_weapon_image(weapon, img_url)
                        except Exception as e:
                            print(f"Failed to download image for {name}: {e}")
            
            return 'created'
            
        except Exception as e:
            print(f"Error processing weapon: {e}")
            return 'error'
    
    def _download_weapon_image(self, weapon: Weapon, url: str):
        """Download and save weapon image."""
        response = requests.get(url, headers=self.headers, timeout=30)
        
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P', 'LA'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                if img.mode == 'RGBA':
                    background.paste(img, mask=img.split()[-1])
                else:
                    background.paste(img)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize
            img.thumbnail((400, 300), Image.Resampling.LANCZOS)
            
            # Save
            output = BytesIO()
            img.save(output, format='PNG', quality=90)
            output.seek(0)
            
            filename = f"{slugify(weapon.name)}.png"
            weapon.image.save(filename, ContentFile(output.read()), save=True)
    
    def _normalize_category_name(self, name: str) -> str:
        """Normalize category name to standard format."""
        name = name.strip()
        
        # Common mappings
        mappings = {
            'ar': 'Assault Rifles',
            'assault rifle': 'Assault Rifles',
            'smg': 'Submachine Guns',
            'submachine gun': 'Submachine Guns',
            'lmg': 'Light Machine Guns',
            'light machine gun': 'Light Machine Guns',
            'sniper': 'Sniper Rifles',
            'sniper rifle': 'Sniper Rifles',
            'marksman': 'Marksman Rifles',
            'marksman rifle': 'Marksman Rifles',
            'dmr': 'Marksman Rifles',
            'shotgun': 'Shotguns',
            'pistol': 'Pistols',
            'handgun': 'Pistols',
            'launcher': 'Launchers',
            'rocket launcher': 'Launchers',
            'melee': 'Melee',
            'knife': 'Melee',
            'special': 'Special',
        }
        
        name_lower = name.lower()
        for key, value in mappings.items():
            if key in name_lower:
                return value
        
        return name
    
    def ensure_default_categories(self, game: Game) -> list:
        """Ensure default weapon categories exist for a shooter game."""
        if not game.is_shooter:
            return []
        
        created_categories = []
        for category_name in self.DEFAULT_CATEGORIES:
            category, created = Category.objects.get_or_create(
                name=category_name,
                game=game
            )
            if created:
                created_categories.append(category_name)
        
        return created_categories


# Singleton instance
weapon_fetch_service = WeaponFetchService()
