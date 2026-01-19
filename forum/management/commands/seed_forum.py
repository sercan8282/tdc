from django.core.management.base import BaseCommand
from forum.models import UserRank, ForumCategory


class Command(BaseCommand):
    help = 'Seed forum with default ranks and categories'

    def handle(self, *args, **options):
        self.seed_ranks()
        self.seed_categories()
        self.stdout.write(self.style.SUCCESS('Forum seeded successfully!'))

    def seed_ranks(self):
        """Create military-style ranks."""
        ranks = [
            {'name': 'Recruit', 'slug': 'recruit', 'min_points': 0, 'chevrons': 0, 'color': 'gray', 'icon': '🔰', 'order': 1},
            {'name': 'Private', 'slug': 'private', 'min_points': 10, 'chevrons': 1, 'color': 'green', 'icon': '▸', 'order': 2},
            {'name': 'Private First Class', 'slug': 'private-first-class', 'min_points': 50, 'chevrons': 1, 'color': 'green', 'icon': '▸', 'order': 3},
            {'name': 'Corporal', 'slug': 'corporal', 'min_points': 100, 'chevrons': 2, 'color': 'blue', 'icon': '▸▸', 'order': 4},
            {'name': 'Sergeant', 'slug': 'sergeant', 'min_points': 250, 'chevrons': 3, 'color': 'blue', 'icon': '▸▸▸', 'order': 5},
            {'name': 'Staff Sergeant', 'slug': 'staff-sergeant', 'min_points': 500, 'chevrons': 3, 'color': 'purple', 'icon': '▸▸▸', 'order': 6},
            {'name': 'Sergeant First Class', 'slug': 'sergeant-first-class', 'min_points': 1000, 'chevrons': 4, 'color': 'purple', 'icon': '▸▸▸▸', 'order': 7},
            {'name': 'Master Sergeant', 'slug': 'master-sergeant', 'min_points': 2000, 'chevrons': 4, 'color': 'yellow', 'icon': '▸▸▸▸', 'order': 8},
            {'name': 'First Sergeant', 'slug': 'first-sergeant', 'min_points': 3500, 'chevrons': 5, 'color': 'yellow', 'icon': '▸▸▸▸▸', 'order': 9},
            {'name': 'Sergeant Major', 'slug': 'sergeant-major', 'min_points': 5000, 'chevrons': 5, 'color': 'orange', 'icon': '★', 'order': 10},
            {'name': 'Command Sergeant Major', 'slug': 'command-sergeant-major', 'min_points': 7500, 'chevrons': 5, 'color': 'orange', 'icon': '★★', 'order': 11},
            {'name': 'Lieutenant', 'slug': 'lieutenant', 'min_points': 10000, 'chevrons': 5, 'color': 'red', 'icon': '★★★', 'order': 12},
            {'name': 'Captain', 'slug': 'captain', 'min_points': 15000, 'chevrons': 5, 'color': 'red', 'icon': '★★★★', 'order': 13},
            {'name': 'Major', 'slug': 'major', 'min_points': 25000, 'chevrons': 5, 'color': 'red', 'icon': '★★★★★', 'order': 14},
            {'name': 'General', 'slug': 'general', 'min_points': 50000, 'chevrons': 5, 'color': 'red', 'icon': '⭐', 'order': 15},
        ]

        for rank_data in ranks:
            rank, created = UserRank.objects.update_or_create(
                slug=rank_data['slug'],
                defaults=rank_data
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(f"  {status}: {rank.name} ({rank.min_points}+ pts)")

    def seed_categories(self):
        """Create default forum categories."""
        categories = [
            {
                'name': 'Games',
                'slug': 'games',
                'description': 'Discuss your favorite games, strategies, and gaming news.',
                'icon': 'Gamepad2',
                'color': 'blue',
                'order': 1,
            },
            {
                'name': 'Computer Builds',
                'slug': 'computer-builds',
                'description': 'Share your PC builds, get advice on components, and discuss hardware configurations.',
                'icon': 'Cpu',
                'color': 'purple',
                'order': 2,
            },
            {
                'name': 'Hardware Problems',
                'slug': 'hardware-problems',
                'description': 'Having hardware issues? Get help troubleshooting your PC components.',
                'icon': 'Wrench',
                'color': 'red',
                'order': 3,
            },
            {
                'name': 'Software Problems',
                'slug': 'software-problems',
                'description': 'Software not working? Discuss solutions for drivers, OS issues, and applications.',
                'icon': 'Bug',
                'color': 'orange',
                'order': 4,
            },
            {
                'name': 'Controller & Settings',
                'slug': 'controller-settings',
                'description': 'Share your controller configurations, keybinds, and optimal game settings.',
                'icon': 'Settings',
                'color': 'green',
                'order': 5,
            },
            {
                'name': 'General Discussion',
                'slug': 'general-discussion',
                'description': 'Off-topic conversations and community discussions.',
                'icon': 'MessageSquare',
                'color': 'slate',
                'order': 6,
            },
        ]

        for cat_data in categories:
            cat, created = ForumCategory.objects.update_or_create(
                slug=cat_data['slug'],
                defaults=cat_data
            )
            status = 'Created' if created else 'Updated'
            self.stdout.write(f"  {status}: {cat.name}")
