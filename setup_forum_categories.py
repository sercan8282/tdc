#!/usr/bin/env python
"""
Script to create default forum categories.
Run with: python manage.py shell < setup_forum_categories.py
Or: python setup_forum_categories.py (after setting DJANGO_SETTINGS_MODULE)
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warzone_loadout.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from forum.models import ForumCategory

# Default forum categories to create
CATEGORIES = [
    {
        'name': 'Warzone 2.0',
        'description': 'Discuss Call of Duty: Warzone 2.0 strategies, loadouts, and updates.',
        'icon': 'Crosshair',
        'color': 'green',
        'order': 1,
    },
    {
        'name': 'Battlefield 6',
        'description': 'All things Battlefield 6 - maps, weapons, tactics, and more.',
        'icon': 'Target',
        'color': 'orange',
        'order': 2,
    },
    {
        'name': 'Hardware Issues',
        'description': 'Get help with hardware problems, upgrades, and recommendations.',
        'icon': 'Cpu',
        'color': 'red',
        'order': 3,
    },
    {
        'name': 'Software Issues',
        'description': 'Troubleshoot software problems, drivers, and game crashes.',
        'icon': 'Bug',
        'color': 'yellow',
        'order': 4,
    },
    {
        'name': 'Share Your Build',
        'description': 'Show off your PC build, gaming setup, or loadouts.',
        'icon': 'Monitor',
        'color': 'purple',
        'order': 5,
    },
    {
        'name': 'FC 26',
        'description': 'EA Sports FC 26 discussions - tactics, teams, and gameplay.',
        'icon': 'Trophy',
        'color': 'blue',
        'order': 6,
    },
    {
        'name': 'Forza Horizon 5',
        'description': 'Forza Horizon 5 racing tips, car builds, and events.',
        'icon': 'Car',
        'color': 'cyan',
        'order': 7,
    },
]


def create_categories():
    """Create or update forum categories."""
    print("Creating forum categories...")
    print("-" * 50)
    
    created_count = 0
    updated_count = 0
    
    for cat_data in CATEGORIES:
        category, created = ForumCategory.objects.update_or_create(
            name=cat_data['name'],
            defaults={
                'description': cat_data['description'],
                'icon': cat_data['icon'],
                'color': cat_data['color'],
                'order': cat_data['order'],
                'is_active': True,
            }
        )
        
        if created:
            print(f"✓ Created: {category.name}")
            created_count += 1
        else:
            print(f"↻ Updated: {category.name}")
            updated_count += 1
    
    print("-" * 50)
    print(f"Done! Created: {created_count}, Updated: {updated_count}")
    print(f"Total categories: {ForumCategory.objects.count()}")


if __name__ == '__main__':
    create_categories()
