import requests
import re
import os
from bs4 import BeautifulSoup

BASE_URL = 'https://www.gamesatlas.com'
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

def get_weapon_images():
    """Fetch all weapon images from GamesAtlas"""
    url = f'{BASE_URL}/cod-black-ops-6/weapons'
    print(f"Fetching {url}...")
    r = requests.get(url, headers=headers, timeout=15)
    
    if r.status_code != 200:
        print(f"Failed: {r.status_code}")
        return {}
    
    soup = BeautifulSoup(r.text, 'lxml')
    weapons = {}
    
    # Find all weapon links and their images
    weapon_cards = soup.find_all('a', href=re.compile(r'/cod-black-ops-6/weapons/[^/]+$'))
    
    for card in weapon_cards:
        href = card.get('href', '')
        img = card.find('img')
        if img:
            img_src = img.get('src') or img.get('data-src')
            if img_src and '/weapons/' in img_src:
                # Extract weapon name from URL
                weapon_slug = href.split('/')[-1]
                weapon_name = weapon_slug.replace('-', ' ').title()
                
                # Get full image URL (not resized)
                full_img = img_src.replace('/resized/', '/').replace('_400x225', '')
                if not full_img.startswith('http'):
                    full_img = BASE_URL + full_img
                
                weapons[weapon_name] = full_img
    
    return weapons

weapons = get_weapon_images()
print(f"\nFound {len(weapons)} weapons with images:")
for name, url in list(weapons.items())[:20]:
    print(f"  {name}: {url}")
