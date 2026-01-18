"""
Service for searching and fetching game images from multiple sources.
Sources:
- Steam Store API
- RAWG API (free game database)
- Google Custom Search (requires API key)
"""
import os
import re
import time
import requests
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile
from django.conf import settings
from urllib.parse import quote_plus


class ImageSearchService:
    """Service to search for game/weapon images from multiple sources."""
    
    STEAM_SEARCH_URL = "https://store.steampowered.com/api/storesearch/"
    STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails"
    RAWG_API_URL = "https://api.rawg.io/api/games"
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        }
        # RAWG API key (free tier available)
        self.rawg_api_key = getattr(settings, 'RAWG_API_KEY', None)
    
    def search_game_images(self, game_name: str, max_results: int = 5) -> list:
        """
        Search for game images from multiple sources.
        Returns a list of image options with source, url, and preview.
        """
        results = []
        
        # Search Steam first
        steam_results = self._search_steam(game_name)
        results.extend(steam_results[:max_results])
        
        # Search RAWG if we have API key
        if self.rawg_api_key:
            rawg_results = self._search_rawg(game_name)
            results.extend(rawg_results[:max_results])
        
        # Generate direct Steam CDN URLs based on common naming patterns
        cdn_results = self._generate_steam_cdn_urls(game_name)
        results.extend(cdn_results[:max_results])
        
        return results[:max_results * 2]  # Return up to 10 results
    
    def _search_steam(self, game_name: str) -> list:
        """Search Steam Store for game images."""
        results = []
        try:
            params = {
                'term': game_name,
                'l': 'english',
                'cc': 'US',
            }
            response = requests.get(self.STEAM_SEARCH_URL, params=params, headers=self.headers, timeout=10)
            
            if response.ok:
                data = response.json()
                items = data.get('items', [])
                
                for item in items[:5]:
                    app_id = item.get('id')
                    name = item.get('name', '')
                    
                    if app_id:
                        # Steam header image (460x215)
                        header_url = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"
                        # Steam capsule image (231x87)
                        capsule_url = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/capsule_231x87.jpg"
                        # Steam library hero (600x900)
                        library_url = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/library_600x900.jpg"
                        
                        results.append({
                            'source': 'Steam',
                            'name': name,
                            'url': header_url,
                            'preview_url': header_url,
                            'type': 'header',
                            'app_id': app_id,
                        })
                        
                        results.append({
                            'source': 'Steam',
                            'name': name,
                            'url': library_url,
                            'preview_url': library_url,
                            'type': 'library',
                            'app_id': app_id,
                        })
        except Exception as e:
            print(f"Steam search error: {e}")
        
        return results
    
    def _search_rawg(self, game_name: str) -> list:
        """Search RAWG API for game images."""
        results = []
        if not self.rawg_api_key:
            return results
            
        try:
            params = {
                'key': self.rawg_api_key,
                'search': game_name,
                'page_size': 5,
            }
            response = requests.get(self.RAWG_API_URL, params=params, headers=self.headers, timeout=10)
            
            if response.ok:
                data = response.json()
                games = data.get('results', [])
                
                for game in games:
                    name = game.get('name', '')
                    background_image = game.get('background_image')
                    
                    if background_image:
                        results.append({
                            'source': 'RAWG',
                            'name': name,
                            'url': background_image,
                            'preview_url': background_image,
                            'type': 'background',
                        })
        except Exception as e:
            print(f"RAWG search error: {e}")
        
        return results
    
    def _generate_steam_cdn_urls(self, game_name: str) -> list:
        """Generate possible Steam CDN URLs based on game name patterns."""
        results = []
        
        # Known Steam App IDs for common games
        known_apps = {
            'call of duty': '1938090',
            'black ops': '2933620',
            'warzone': '1962663',
            'modern warfare': '1938090',
            'battlefield': '1517290',
            'apex legends': '1172470',
            'counter-strike': '730',
            'cs2': '730',
            'valorant': '438100',
            'fortnite': '1665460',
        }
        
        game_lower = game_name.lower()
        for keyword, app_id in known_apps.items():
            if keyword in game_lower:
                header_url = f"https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"
                results.append({
                    'source': 'Steam CDN',
                    'name': f'Steam App {app_id}',
                    'url': header_url,
                    'preview_url': header_url,
                    'type': 'header',
                    'app_id': app_id,
                })
                break
        
        return results
    
    def download_and_process_image(self, url: str, max_width: int = 600, max_height: int = 400) -> bytes:
        """
        Download image from URL and process it (resize, convert to JPEG).
        Returns processed image bytes.
        """
        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                img = Image.open(BytesIO(response.content))
                
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'P', 'LA'):
                    # Create white background for transparent images
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Resize maintaining aspect ratio
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                
                # Save to bytes
                output = BytesIO()
                img.save(output, format='JPEG', quality=90)
                output.seek(0)
                
                return output.read()
        except Exception as e:
            print(f"Image download error: {e}")
            raise
        
        return None
    
    def validate_image_url(self, url: str) -> bool:
        """Check if an image URL is valid and accessible."""
        try:
            response = requests.head(url, headers=self.headers, timeout=10)
            content_type = response.headers.get('content-type', '')
            return response.status_code == 200 and 'image' in content_type
        except:
            return False


# Singleton instance
image_search_service = ImageSearchService()
