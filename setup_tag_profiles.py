"""
Script to create sample tag profiles from existing tags.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warzone_loadout.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from videos.models import VideoTag, TagProfile

# Sample profiles with their tags
SAMPLE_PROFILES = [
    {
        'name': 'Gaming Content',
        'description': 'Tags voor gaming-gerelateerde video\'s zoals gameplay, setups en esports',
        'color': '#EF4444',
        'tags': ['gaming', 'setup', 'tech', 'rgb']
    },
    {
        'name': 'Nature & Landscape',
        'description': 'Tags voor natuur- en landschapsvideo\'s',
        'color': '#22C55E',
        'tags': ['nature', 'mountains', 'landscape', 'forest', 'ocean', 'aerial']
    },
    {
        'name': 'City Life',
        'description': 'Tags voor stedelijke content en timelapse video\'s',
        'color': '#F59E0B',
        'tags': ['city', 'urban', 'timelapse', 'night']
    },
    {
        'name': 'Sports & Fitness',
        'description': 'Tags voor sport en fitness video\'s',
        'color': '#3B82F6',
        'tags': ['sports', 'fitness', 'workout', 'motivation', 'racing']
    },
    {
        'name': 'Food & Cooking',
        'description': 'Tags voor kook- en food content',
        'color': '#F97316',
        'tags': ['cooking', 'food', 'tutorial', 'italian']
    },
    {
        'name': 'Tech & Drones',
        'description': 'Tags voor technologie en drone video\'s',
        'color': '#8B5CF6',
        'tags': ['tech', 'drone', 'aerial', 'rgb']
    },
    {
        'name': 'Relaxing Content',
        'description': 'Tags voor relaxerende en kalme video\'s',
        'color': '#06B6D4',
        'tags': ['relaxing', 'peaceful', 'nature', 'ocean', 'sunset']
    },
    {
        'name': 'Futuristic & Cyberpunk',
        'description': 'Tags voor futuristische en cyberpunk content',
        'color': '#EC4899',
        'tags': ['cyberpunk', 'neon', 'night', 'urban', 'city']
    },
]


def create_profiles():
    """Create sample tag profiles."""
    print("=== Creating Tag Profiles ===\n")
    
    created = 0
    for profile_data in SAMPLE_PROFILES:
        name = profile_data['name']
        
        # Check if profile already exists
        if TagProfile.objects.filter(name=name).exists():
            print(f"  [SKIP] Profile exists: {name}")
            continue
        
        # Get tags
        tag_names = profile_data['tags']
        tags = VideoTag.objects.filter(name__in=tag_names, is_active=True)
        
        if not tags.exists():
            print(f"  [SKIP] No tags found for: {name}")
            continue
        
        # Create profile
        profile = TagProfile.objects.create(
            name=name,
            description=profile_data['description'],
            color=profile_data['color'],
            is_active=True
        )
        profile.tags.set(tags)
        
        print(f"  [OK] Created: {name}")
        print(f"       Tags: {', '.join(tags.values_list('name', flat=True))}")
        created += 1
    
    print(f"\n=== Complete ===")
    print(f"Profiles created: {created}")
    print(f"Total profiles: {TagProfile.objects.count()}")


if __name__ == '__main__':
    create_profiles()
