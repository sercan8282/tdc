"""Refresh all game settings from PCGamingWiki."""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warzone_loadout.settings')
django.setup()

from core.models import GameSettingDefinition, Game
from core.services.game_settings_fetch import game_settings_fetch_service

# Verwijder ALLE oude settings
print('=== Verwijderen alle oude settings ===')
deleted, _ = GameSettingDefinition.objects.all().delete()
print(f'Verwijderd: {deleted} settings')

# Activeer alle games
Game.objects.all().update(is_active=True)

# Haal settings op voor alle games
print('\n=== Ophalen nieuwe settings ===')
games = Game.objects.all()
print(f'Aantal games: {games.count()}\n')

for game in games:
    result = game_settings_fetch_service.fetch_settings_for_game(game)
    print(f'{game.name}: {result["settings_created"]} settings ({result["source"]})')

print('\n=== Klaar ===')
total = GameSettingDefinition.objects.count()
print(f'Totaal nieuwe settings: {total}')
