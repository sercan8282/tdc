import os
import re
import requests
import urllib.parse
import json
from io import BytesIO
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from bs4 import BeautifulSoup
from core.models import Weapon


class Command(BaseCommand):
    help = 'Download weapon images from various sources'

    def add_arguments(self, parser):
        parser.add_argument(
            '--game',
            type=str,
            help='Filter by game name (partial match)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only show what would be downloaded, without actually downloading',
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing images',
        )

    def handle(self, *args, **options):
        game_filter = options.get('game')
        dry_run = options.get('dry_run', False)
        overwrite = options.get('overwrite', False)

        weapons = Weapon.objects.select_related('category__game').all()
        
        if game_filter:
            weapons = weapons.filter(category__game__name__icontains=game_filter)

        self.stdout.write(f'Found {weapons.count()} weapons to process')

        # Fetch available images from sources
        self.stdout.write('Fetching available images from GamesAtlas...')
        gamesatlas_images = self.fetch_gamesatlas_images()
        self.stdout.write(f'  Found {len(gamesatlas_images)} images from GamesAtlas')

        success_count = 0
        skip_count = 0
        fail_count = 0

        for weapon in weapons:
            if weapon.image and not overwrite:
                skip_count += 1
                continue

            game_name = weapon.category.game.name
            
            self.stdout.write(f'Processing: {weapon.name} ({game_name})')

            if dry_run:
                self.stdout.write(self.style.WARNING(f'  [DRY RUN] Would search for: {weapon.name}'))
                continue

            image_downloaded = False
            
            # Try GamesAtlas for Black Ops and Warzone games
            if 'Black Ops' in game_name or 'Warzone' in game_name or 'Call of Duty' in game_name:
                img_url = self.find_matching_image(weapon.name, gamesatlas_images)
                if img_url:
                    try:
                        image_data = self.download_image(img_url)
                        if image_data:
                            ext = 'jpg' if '.jpg' in img_url.lower() else 'png'
                            filename = f"{self.sanitize_filename(weapon.name)}.{ext}"
                            weapon.image.save(filename, ContentFile(image_data), save=True)
                            self.stdout.write(self.style.SUCCESS(f'  ✓ Downloaded image for {weapon.name}'))
                            image_downloaded = True
                            success_count += 1
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'  Download failed: {str(e)[:50]}'))

            if not image_downloaded:
                self.stdout.write(self.style.ERROR(f'  ✗ Could not find image for {weapon.name}'))
                fail_count += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Summary:'))
        self.stdout.write(f'  Downloaded: {success_count}')
        self.stdout.write(f'  Skipped (has image): {skip_count}')
        self.stdout.write(f'  Failed: {fail_count}')

    def fetch_gamesatlas_images(self):
        """Fetch weapon images from GamesAtlas (multiple game pages)"""
        BASE_URL = 'https://www.gamesatlas.com'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        weapons = {}
        
        # List of game pages to fetch from
        game_pages = [
            'cod-black-ops-6',
            'cod-black-ops-7',
            'cod-warzone-2',
        ]
        
        for game_slug in game_pages:
            try:
                url = f'{BASE_URL}/{game_slug}/weapons'
                self.stdout.write(f'  Fetching from {url}...')
                r = requests.get(url, headers=headers, timeout=15)
                
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, 'lxml')
                    
                    # Method 1: Find weapon cards with links
                    weapon_cards = soup.find_all('a', href=re.compile(rf'/{game_slug}/weapons/[^/]+$'))
                    
                    count = 0
                    for card in weapon_cards:
                        href = card.get('href', '')
                        img = card.find('img')
                        if img:
                            img_src = img.get('src') or img.get('data-src')
                            if img_src and '/weapons/' in img_src:
                                weapon_slug = href.split('/')[-1]
                                # Store multiple name variations
                                weapon_name = weapon_slug.replace('-', ' ').lower()
                                
                                full_img = img_src.replace('/resized/', '/').replace('_400x225', '')
                                if not full_img.startswith('http'):
                                    full_img = BASE_URL + full_img
                                
                                # Only add if not already present (first source wins)
                                if weapon_name not in weapons:
                                    weapons[weapon_name] = full_img
                                if weapon_slug not in weapons:
                                    weapons[weapon_slug] = full_img
                                count += 1
                    
                    # Method 2: For Warzone 2 page, also extract MW2-specific images from all img tags
                    if game_slug == 'cod-warzone-2':
                        all_imgs = soup.find_all('img', src=True)
                        for img in all_imgs:
                            src = img.get('src', '')
                            # Look for MW2 weapon images in the optimized path
                            if 'cod-modern-warfare-2' in src and 'weapons' in src:
                                # Extract weapon slug from path like: images_cod-modern-warfare-2_weapons_resized_m4-3__400x225.webp
                                match = re.search(r'weapons_resized_([^_]+?)(?:-\d+)?__', src)
                                if match:
                                    weapon_slug = match.group(1)
                                    weapon_name = weapon_slug.replace('-', ' ').lower()
                                    
                                    # Build full URL
                                    full_img = src if src.startswith('http') else BASE_URL + src
                                    
                                    if weapon_name not in weapons:
                                        weapons[weapon_name] = full_img
                                        count += 1
                                    if weapon_slug not in weapons:
                                        weapons[weapon_slug] = full_img
                    
                    self.stdout.write(f'    Found {count} weapons from {game_slug}')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  Error fetching {game_slug}: {e}'))
        
        return weapons

    def find_matching_image(self, weapon_name, image_dict):
        """Find matching image URL for a weapon name"""
        name_lower = weapon_name.lower()
        
        # Direct match
        if name_lower in image_dict:
            return image_dict[name_lower]
        
        # Slug match
        slug = name_lower.replace(' ', '-').replace('.', '').replace('_', '-')
        if slug in image_dict:
            return image_dict[slug]
        
        # Mapping for known name differences between our DB and GamesAtlas
        name_mappings = {
            # Assault Rifles
            'xm4': 'xm4',
            'ak-74': 'ak-74',
            'as val': 'as-val',
            'ames 85': 'ames-85',
            'gpr 91': 'gpr-91',
            'model l': 'model-l',
            'goblin mk2': 'goblin-mk-2',
            'krig c': 'krig-c',
            'galil': 'ffar-1',  # FFAR is the Galil in BO6
            'stg-44': 'stg-44',
            'kastov 545': 'sokol-545',  # Similar weapon
            
            # SMGs
            'c9': 'c9',
            'pp-919': 'pp-919',
            'mac-10': 'kompakt-92',  # Similar weapon (MAC-10 style)
            'ppsh-41': 'ppsh-41',
            'cypher 091': 'cypher-091',
            'ksv': 'ksv',
            'tanto .22': 'tanto-22',
            'jackal pdw': 'jackal-pdw',
            'kompakt 92': 'kompakt-92',
            'saug': 'saug',
            'iso 9mm': 'sirin-9mm',  # Similar weapon
            'minibak': 'pp-919',  # Similar weapon
            'vaznev-9k': 'kogot-7',  # Similar weapon
            
            # Shotguns
            'marine sp': 'marine-sp',
            'asg-89': 'asg-89',
            'maelstrom': 'maelstrom',
            'haymaker': 'echo-12',  # Similar auto-shotgun
            'lockwood 680': 'marine-sp',  # Similar pump shotgun
            
            # LMGs
            'pu-21': 'pu-21',
            'xmg': 'xmg',
            'gpmg-7': 'gpmg-7',
            'raal mg': 'gpmg-7',  # Similar LMG
            'holger 26': 'xmg',  # Similar LMG
            'bruen mk9': 'xmg',  # Similar LMG
            
            # Marksman Rifles
            'swat 5.56': 'swat-5-56',
            'tsarkov 7.62': 'tsarkov-7-62',
            'aek-973': 'aek-973',
            'dm-10': 'dm-10',
            'ebr-14': 'dm-10',  # Similar DMR
            'soa subverter': 'dm-10',  # Similar DMR
            'lockwood mk2': 'dm-10',  # Similar DMR
            
            # Sniper Rifles
            'lw3a1 frostline': 'lw3a1-frostline',
            'lr 7.62': 'lr-7-62',
            'svd': 'svd',
            'katt amr': 'amr-mod-4',  # Similar AMR
            'mcpr-300': 'lw3a1-frostline',  # Similar bolt-action
            'xrk stalker': 'svd',  # Similar semi-auto sniper
            
            # Pistols
            '9mm pm': '9mm-pm',
            'gs45': 'gs45',
            'stryder .22': 'stryder-22',
            'grekhova': 'grekhova',
            'he-1': 'he-1',
            '.50 gs': 'grekhova',  # Similar heavy pistol
            '50 gs': 'grekhova',  # Without dot
            'p890': 'gs45',  # Similar pistol
            'x12': 'gs45',  # Similar pistol
            'renetti': 'gs45',  # Similar pistol
            'basilisk': 'grekhova',  # Similar revolver
            'tyr': 'grekhova',  # Similar revolver
            'ranger': 'grekhova',  # Similar revolver
            
            # Launchers
            'cigma 2b': 'cigma-2b',
            'panzerfaust': 'cigma-2b',  # Similar launcher
            'jokr': 'cigma-2b',  # Similar launcher
            'strela-p': 'cigma-2b',  # Similar launcher
            
            # Melee
            'crossbow': 'ballistic-knife',  # Special weapon
            'ballistic knife': 'ballistic-knife',
            'knife': 'combat-knife',
            'combat knife': 'combat-knife',
            'baseball bat': 'baseball-bat',
            'sword': 'katanas',
            'sledgehammer': 'baseball-bat',  # Similar melee
            'ice pick': 'cleaver',  # Similar melee
            'karambit': 'combat-knife',  # Similar knife
            'hand cannon': 'grekhova',  # Heavy pistol
            
            # Other common mappings
            'peacekeeper': 'peacekeeper-mk1',
            
            # MW2/Warzone 2 specific mappings
            'm4': 'm4',
            'taq-56': 'taq-56',
            'kastov 762': 'kastov-762',
            'kastov-74u': 'kastov-74u',
            'lachmann-556': 'lachmann-556',
            'stb 556': 'stb-556',
            'm16': 'm16',
            'm13b': 'm13b',
            'chimera': 'chimera',
            'iso hemlock': 'iso-hemlock',
            'tempus razorback': 'tempus-razorback',
            'fr avancer': 'fr-avancer',
            'tr-76 geist': 'tr-76-geist',
            'm13c': 'm13c',
            'lachmann sub (mp5)': 'lachmann-sub-mp5',
            'fss hurricane': 'fss-hurricane',
            'pdsw 528': 'pdsw-528',
            'vel 46 (mp7)': 'vel-46',
            'fennec 45': 'fennec-45',
            'mx9 (aug)': 'mx9',
            'bas-p': 'bas-p',
            'lachmann shroud': 'lachmann-shroud',
            'iso 45': 'iso-45',
            'expedite 12': 'expedite-12',
            'bryson 800': 'bryson-800',
            'bryson 890': 'bryson-890',
            'lockwood 300': 'lockwood-300',
            'mx guardian': 'mx-guardian',
            'kv broadside': 'kv-broadside',
            '556 icarus': '556-icarus',
            'rapp h': 'rapp-h',
            'sakin mg38': 'sakin-mg38',
            'rpk': 'rpk',
            'hcr 56': 'hcr-56',
            'lachmann-762': 'lachmann-762',
            'so-14': 'so-14',
            'taq-v': 'taq-v',
            'ftac recon': 'ftac-recon',
            'cronen squall': 'cronen-squall',
            'bas-b': 'bas-b',
            'sp-r 208': 'sp-r-208',
            'taq-m': 'taq-m',
            'sa-b 50': 'sa-b-50',
            'tempus torrent': 'tempus-torrent',
            'lm-s': 'lm-s',
            'signal 50': 'signal-50',
            'la-b 330': 'la-b-330',
            'sp-x 80': 'sp-x-80',
            'victus xmr': 'victus-xmr',
            'fjx imperium': 'fjx-imperium',
            'carrack .300': 'carrack-300',
            'longbow': 'longbow',
            'kv inhibitor': 'kv-inhibitor',
            'x13 auto': 'x13-auto',
            'gs magna': 'gs-magna',
            'ftac siege': 'ftac-siege',
            '9mm daemon': '9mm-daemon',
            'cor-45': 'cor-45',
            'wsp stinger': 'wsp-stinger',
            'pila': 'pila',
            'rpg-7': 'rpg-7',
            'rgl-80': 'rgl-80',
            'riot shield': 'riot-shield',
            'dual kodachis': 'dual-kodachis',
            'tonfa': 'tonfa',
            'dual kamas': 'dual-kamas',
            'gutter knife': 'gutter-knife',
        }
        
        mapped_name = name_mappings.get(name_lower)
        if mapped_name and mapped_name in image_dict:
            return image_dict[mapped_name]
        
        # Try removing numbers and special characters for partial match
        clean_name = re.sub(r'[^a-z]', '', name_lower)
        for key, url in image_dict.items():
            clean_key = re.sub(r'[^a-z]', '', key)
            if clean_name == clean_key:
                return url
        
        # Partial match - try to find weapon name in keys
        for key, url in image_dict.items():
            # Check if the weapon name appears in the key
            name_parts = name_lower.replace('-', ' ').replace('.', '').split()
            if len(name_parts) > 0:
                main_part = name_parts[0]
                if main_part in key and len(main_part) > 2:
                    return url
        
        return None

    def download_image(self, url):
        """Download image from URL"""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            return response.content
        return None

    def sanitize_filename(self, name):
        """Sanitize filename to remove invalid characters"""
        name = re.sub(r'[<>:"/\\|?*]', '_', name)
        name = name.replace(' ', '_')
        name = re.sub(r'_+', '_', name)
        return name.strip('_')
