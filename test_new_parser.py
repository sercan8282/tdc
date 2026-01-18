"""Test the new parser with real settings."""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warzone_loadout.settings')
django.setup()

from core.services.game_settings_fetch import GameSettingsFetchService

service = GameSettingsFetchService()

# Test met Valorant
print('=== Testing Valorant ===')
page = service._search_pcgamingwiki('Valorant')
if page:
    wikitext = service._get_wiki_content(page)
    settings = service._parse_wikitext_settings(wikitext)
    print(f'Found {len(settings)} settings:')
    for s in settings:
        opts = f' - options: {s["options"]}' if s.get('options') else ''
        print(f'  [{s["category"]}] {s["display_name"]} ({s["field_type"]}){opts}')
else:
    print('Page not found')

print('\n=== Testing Counter-Strike 2 ===')
page = service._search_pcgamingwiki('Counter-Strike 2')
if page:
    wikitext = service._get_wiki_content(page)
    settings = service._parse_wikitext_settings(wikitext)
    print(f'Found {len(settings)} settings:')
    for s in settings:
        opts = f' - options: {s["options"]}' if s.get('options') else ''
        print(f'  [{s["category"]}] {s["display_name"]} ({s["field_type"]}){opts}')
else:
    print('Page not found')
