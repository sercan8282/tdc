"""
Management command to download game cover images from various sources.
"""
import os
import re
import time
import requests
from io import BytesIO
from PIL import Image
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.conf import settings
from core.models import Game

# IGDB alternative: Use Steam/store images with known game IDs
GAME_IMAGES = {
    'apex-legends': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg',
    'arc-raiders': 'https://cdn.akamai.steamstatic.com/steam/apps/1723630/header.jpg',
    'assassins-creed-valhalla': 'https://cdn.cloudflare.steamstatic.com/steam/apps/2208920/header.jpg',
    'baldurs-gate-3': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg',
    'battlefield': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1238840/header.jpg',
    'battlefield-2042': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1517290/header.jpg',
    'call-of-duty': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1938090/header.jpg',
    'call-of-duty-black-ops-6': 'https://cdn.cloudflare.steamstatic.com/steam/apps/2933620/header.jpg',
    'call-of-duty-warzone': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1962663/header.jpg',
    'call-of-duty-warzone-2': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1962663/header.jpg',
    'counter-strike-2': 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
    'cyberpunk-2077': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
    'diablo-iv': 'https://cdn.cloudflare.steamstatic.com/steam/apps/2344520/header.jpg',
    'ea-sports-fc-25': 'https://cdn.cloudflare.steamstatic.com/steam/apps/2669320/header.jpg',
    'elden-ring': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg',
    'f1-24': 'https://cdn.cloudflare.steamstatic.com/steam/apps/2488620/header.jpg',
    'fortnite': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1665460/header.jpg',
    'forza-horizon-5': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg',
    'grand-theft-auto-v': 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
    'hogwarts-legacy': 'https://cdn.cloudflare.steamstatic.com/steam/apps/990080/header.jpg',
    'microsoft-flight-simulator': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1250410/header.jpg',
    'need-for-speed-unbound': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1846380/header.jpg',
    'red-dead-redemption-2': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
    'starfield': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg',
    'the-witcher-3-wild-hunt': 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
    'valorant': 'https://cdn.cloudflare.steamstatic.com/steam/apps/438100/header.jpg',
    'warzone': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1962663/header.jpg',
}

# Alternative Steam CDN URLs (header images are 460x215)
STEAM_APP_IDS = {
    'apex-legends': '1172470',
    'arc-raiders': '1723630',
    'assassins-creed-valhalla': '2208920',
    'baldurs-gate-3': '1086940',
    'battlefield-2042': '1517290',
    'counter-strike-2': '730',
    'cyberpunk-2077': '1091500',
    'elden-ring': '1245620',
    'forza-horizon-5': '1551360',
    'grand-theft-auto-v': '271590',
    'hogwarts-legacy': '990080',
    'microsoft-flight-simulator': '1250410',
    'need-for-speed-unbound': '1846380',
    'red-dead-redemption-2': '1174180',
    'starfield': '1716740',
    'the-witcher-3-wild-hunt': '292030',
}


class Command(BaseCommand):
    help = 'Download game cover images from various sources'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Overwrite existing images',
        )
        parser.add_argument(
            '--game',
            type=str,
            help='Download image for a specific game slug only',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        specific_game = options.get('game')

        if specific_game:
            games = Game.objects.filter(slug=specific_game)
        else:
            games = Game.objects.all()

        self.stdout.write(f'Processing {games.count()} games...')
        
        success_count = 0
        skip_count = 0
        fail_count = 0

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
        }

        for game in games:
            if game.image and not force:
                self.stdout.write(f'  Skipping {game.name} (already has image)')
                skip_count += 1
                continue

            # Try to get image URL
            image_url = GAME_IMAGES.get(game.slug)
            
            # If not in predefined list, try Steam
            if not image_url and game.slug in STEAM_APP_IDS:
                app_id = STEAM_APP_IDS[game.slug]
                image_url = f'https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg'

            if not image_url:
                self.stdout.write(self.style.WARNING(f'  No image URL for {game.name}'))
                fail_count += 1
                continue

            try:
                self.stdout.write(f'  Downloading image for {game.name}...')
                
                response = requests.get(image_url, headers=headers, timeout=30)
                
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', '')
                    
                    # Handle SVG separately
                    if 'svg' in content_type or image_url.endswith('.svg'):
                        self.stdout.write(self.style.WARNING(f'    SVG format not supported for {game.name}'))
                        fail_count += 1
                        continue
                    
                    # Convert to JPEG for consistency
                    try:
                        img = Image.open(BytesIO(response.content))
                        
                        # Convert to RGB if necessary (for PNG with transparency)
                        if img.mode in ('RGBA', 'P'):
                            img = img.convert('RGB')
                        
                        # Resize to consistent size (600x900 for portrait, or 900x600 for landscape)
                        # Keep original aspect ratio
                        img.thumbnail((600, 900), Image.Resampling.LANCZOS)
                        
                        # Save to BytesIO
                        output = BytesIO()
                        img.save(output, format='JPEG', quality=90)
                        output.seek(0)
                        
                        # Generate filename
                        filename = f'{game.slug}.jpg'
                        
                        # Save to model
                        game.image.save(filename, ContentFile(output.read()), save=True)
                        
                        self.stdout.write(self.style.SUCCESS(f'    Saved: {filename}'))
                        success_count += 1
                        
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'    Error processing image: {e}'))
                        fail_count += 1
                else:
                    self.stdout.write(self.style.ERROR(f'    HTTP {response.status_code}'))
                    fail_count += 1
                
                # Rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'    Error downloading: {e}'))
                fail_count += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Downloaded: {success_count}'))
        self.stdout.write(f'Skipped: {skip_count}')
        self.stdout.write(self.style.WARNING(f'Failed: {fail_count}'))
