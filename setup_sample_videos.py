"""
Script to download and setup sample videos with tags and covers.
"""
import os
import sys
import django
import requests
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warzone_loadout.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from videos.models import Video, VideoTag

User = get_user_model()

# Sample video sources - using reliable public domain videos
# Videos from archive.org and covers from picsum.photos
SAMPLE_VIDEOS = [
    {
        'title': 'Epic Mountain Landscape',
        'description': 'Stunning aerial footage of snow-capped mountains with dramatic clouds rolling through valleys. Perfect for nature lovers and adventure seekers.',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/mountains/800/450',
        'tags': ['nature', 'mountains', 'landscape', 'aerial']
    },
    {
        'title': 'City Night Timelapse',
        'description': 'Mesmerizing timelapse of a bustling city at night with cars streaming by and lights twinkling across the skyline.',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/citynight/800/450',
        'tags': ['city', 'timelapse', 'night', 'urban']
    },
    {
        'title': 'Ocean Waves at Sunset',
        'description': 'Relaxing footage of gentle ocean waves washing onto the shore during a beautiful golden sunset. Great for meditation.',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/oceanwaves/800/450',
        'tags': ['ocean', 'sunset', 'nature', 'relaxing']
    },
    {
        'title': 'Gaming Setup Tour',
        'description': 'Check out this amazing RGB gaming setup with dual monitors, mechanical keyboard, and the ultimate cable management!',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/gaming/800/450',
        'tags': ['gaming', 'setup', 'tech', 'rgb']
    },
    {
        'title': 'Forest Walking Path',
        'description': 'Peaceful walk through an enchanted forest with sunlight filtering through the trees. Experience nature at its finest.',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/forest/800/450',
        'tags': ['forest', 'nature', 'walking', 'peaceful']
    },
    {
        'title': 'Drone Racing Competition',
        'description': 'High-speed FPV drone racing through an obstacle course. Feel the adrenaline as pilots push their limits!',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/drone/800/450',
        'tags': ['drone', 'racing', 'tech', 'sports']
    },
    {
        'title': 'Cooking Tutorial: Pasta',
        'description': 'Learn how to make authentic Italian pasta from scratch. Step by step guide with tips from professional chefs.',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/cooking/800/450',
        'tags': ['cooking', 'tutorial', 'food', 'italian']
    },
    {
        'title': 'Workout Motivation',
        'description': 'Get motivated with this intense workout compilation. Push your limits and achieve your fitness goals!',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/workout/800/450',
        'tags': ['fitness', 'workout', 'motivation', 'sports']
    },
    {
        'title': 'Northern Lights Aurora',
        'description': 'Breathtaking footage of the Aurora Borealis dancing across the Arctic sky. A once in a lifetime natural phenomenon.',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/aurora/800/450',
        'tags': ['aurora', 'nature', 'night', 'arctic']
    },
    {
        'title': 'Cyberpunk City Walk',
        'description': 'Immersive walk through a neon-lit cyberpunk cityscape. Experience the future of urban environments.',
        'video_url': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        'cover_url': 'https://picsum.photos/seed/cyberpunk/800/450',
        'tags': ['cyberpunk', 'city', 'neon', 'urban']
    },
]

# Tag definitions with colors
TAG_COLORS = {
    'nature': '#22C55E',      # Green
    'mountains': '#6366F1',   # Indigo
    'landscape': '#14B8A6',   # Teal
    'aerial': '#8B5CF6',      # Purple
    'city': '#F59E0B',        # Amber
    'timelapse': '#EC4899',   # Pink
    'night': '#1E3A8A',       # Dark Blue
    'urban': '#78716C',       # Stone
    'ocean': '#0EA5E9',       # Sky
    'sunset': '#F97316',      # Orange
    'relaxing': '#A855F7',    # Purple
    'gaming': '#EF4444',      # Red
    'setup': '#6B7280',       # Gray
    'tech': '#3B82F6',        # Blue
    'rgb': '#F472B6',         # Pink
    'forest': '#16A34A',      # Green
    'walking': '#84CC16',     # Lime
    'peaceful': '#5EEAD4',    # Teal
    'drone': '#7C3AED',       # Violet
    'racing': '#DC2626',      # Red
    'sports': '#2563EB',      # Blue
    'cooking': '#FB923C',     # Orange
    'tutorial': '#0D9488',    # Teal
    'food': '#FACC15',        # Yellow
    'italian': '#22C55E',     # Green
    'fitness': '#F43F5E',     # Rose
    'workout': '#0891B2',     # Cyan
    'motivation': '#A3E635',  # Lime
    'aurora': '#8B5CF6',      # Purple
    'arctic': '#38BDF8',      # Sky
    'cyberpunk': '#F0ABFC',   # Fuchsia
    'neon': '#FB7185',        # Rose
}


def download_file(url, destination):
    """Download a file from URL to destination."""
    print(f"  Downloading: {url[:50]}...")
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        with open(destination, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"  Error downloading: {e}")
        return False


def create_tags():
    """Create all video tags."""
    print("\n=== Creating Video Tags ===")
    
    created = 0
    for tag_name, color in TAG_COLORS.items():
        tag, was_created = VideoTag.objects.get_or_create(
            name=tag_name,
            defaults={
                'color': color,
                'description': f'Videos related to {tag_name}',
                'is_active': True
            }
        )
        if was_created:
            created += 1
            print(f"  Created tag: #{tag_name}")
        else:
            print(f"  Tag exists: #{tag_name}")
    
    print(f"\nTotal tags created: {created}")
    return VideoTag.objects.all()


def setup_sample_videos():
    """Download and setup sample videos."""
    print("\n=== Setting Up Sample Videos ===")
    
    # Get admin user
    admin = User.objects.filter(is_staff=True).first()
    if not admin:
        print("ERROR: No admin user found! Please create an admin user first.")
        return
    
    print(f"Using uploader: {admin.email}")
    
    # Create media directories
    video_dir = Path('media/videos/files')
    cover_dir = Path('media/videos/covers')
    video_dir.mkdir(parents=True, exist_ok=True)
    cover_dir.mkdir(parents=True, exist_ok=True)
    
    # Create tags first
    tags = create_tags()
    tag_dict = {t.name: t for t in tags}
    
    print("\n=== Downloading and Creating Videos ===")
    
    created_count = 0
    for i, video_data in enumerate(SAMPLE_VIDEOS, 1):
        title = video_data['title']
        
        # Check if video already exists
        if Video.objects.filter(title=title).exists():
            print(f"\n[{i}/10] Video exists: {title}")
            continue
        
        print(f"\n[{i}/10] Processing: {title}")
        
        # Generate unique filenames
        safe_title = title.lower().replace(' ', '_').replace(':', '')[:30]
        video_filename = f"{safe_title}_{i}.mp4"
        cover_filename = f"{safe_title}_{i}.jpg"
        
        video_path = video_dir / video_filename
        cover_path = cover_dir / cover_filename
        
        # Download video
        if not download_file(video_data['video_url'], video_path):
            print(f"  Skipping: Could not download video")
            continue
        
        # Download cover
        if not download_file(video_data['cover_url'], cover_path):
            print(f"  Skipping: Could not download cover")
            video_path.unlink(missing_ok=True)
            continue
        
        # Create video record
        try:
            video = Video.objects.create(
                title=title,
                description=video_data['description'],
                video_file=f"videos/files/{video_filename}",
                cover_image=f"videos/covers/{cover_filename}",
                uploader=admin,
                is_active=True,
                is_featured=(i <= 3)  # First 3 are featured
            )
            
            # Add tags
            for tag_name in video_data['tags']:
                if tag_name in tag_dict:
                    video.tags.add(tag_dict[tag_name])
            
            print(f"  Created: {title}")
            print(f"  Tags: {', '.join(video_data['tags'])}")
            created_count += 1
            
        except Exception as e:
            print(f"  Error creating video: {e}")
            video_path.unlink(missing_ok=True)
            cover_path.unlink(missing_ok=True)
    
    print(f"\n=== Complete ===")
    print(f"Videos created: {created_count}")
    print(f"Total videos: {Video.objects.count()}")
    print(f"Total tags: {VideoTag.objects.count()}")


if __name__ == '__main__':
    setup_sample_videos()
