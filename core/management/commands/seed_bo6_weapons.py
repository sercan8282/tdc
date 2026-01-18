from django.core.management.base import BaseCommand
from core.models import Game, Category, Weapon
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Seeds the database with all Black Ops 6 weapons'

    def handle(self, *args, **options):
        # Create or get Call of Duty: Black Ops 6 game
        game, created = Game.objects.get_or_create(
            name='Call of Duty: Black Ops 6',
            defaults={
                'slug': slugify('Call of Duty: Black Ops 6'),
                'description': 'Call of Duty: Black Ops 6 - Released 2024',
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created game: {game.name}'))
        else:
            self.stdout.write(f'Game already exists: {game.name}')

        # Black Ops 6 Weapons organized by category (Season 2 - 2025 complete list)
        weapons_data = {
            'Assault Rifles': [
                'XM4',
                'AK-74',
                'AMES 85',
                'GPR 91',
                'Model L',
                'Goblin Mk2',
                'AS VAL',
                'KRIG C',
                'Cypher 091',
                'Galil',
                'STG-44',
                'Kastov 545',
            ],
            'Submachine Guns': [
                'C9',
                'KSV',
                'Tanto .22',
                'PP-919',
                'Jackal PDW',
                'Kompakt 92',
                'Saug',
                'Peacekeeper',
                'MAC-10',
                'PPSh-41',
                'Vaznev-9K',
                'Minibak',
                'ISO 9mm',
            ],
            'Shotguns': [
                'Marine SP',
                'ASG-89',
                'Maelstrom',
                'Haymaker',
                'Ranger',
                'Lockwood 680',
            ],
            'Light Machine Guns': [
                'PU-21',
                'XMG',
                'GPMG-7',
                'Raal MG',
                'Bruen Mk9',
                'Holger 26',
            ],
            'Marksman Rifles': [
                'SWAT 5.56',
                'Tsarkov 7.62',
                'AEK-973',
                'DM-10',
                'EBR-14',
                'SOA Subverter',
                'Lockwood Mk2',
            ],
            'Sniper Rifles': [
                'LW3A1 Frostline',
                'SVD',
                'LR 7.62',
                'Katt AMR',
                'MCPR-300',
                'XRK Stalker',
            ],
            'Pistols': [
                '9mm PM',
                'Grekhova',
                'GS45',
                'Stryder .22',
                '.50 GS',
                'Renetti',
                'P890',
                'X12',
                'TYR',
                'Basilisk',
            ],
            'Launchers': [
                'CIGMA 2B',
                'HE-1',
                'Panzerfaust',
                'JOKR',
                'Strela-P',
            ],
            'Melee': [
                'Knife',
                'Baseball Bat',
                'Sword',
                'Karambit',
                'Sai',
                'Ice Pick',
                'Sledgehammer',
            ],
            'Special': [
                'Hand Cannon',
                'Sirin 9mm',
                'Crossbow',
                'Ballistic Knife',
            ],
        }

        total_weapons = 0
        for category_name, weapons in weapons_data.items():
            # Create or get category
            category, cat_created = Category.objects.get_or_create(
                name=category_name,
                game=game
            )
            
            if cat_created:
                self.stdout.write(f'  Created category: {category_name}')
            
            # Add weapons
            weapons_created = 0
            for weapon_name in weapons:
                _, was_created = Weapon.objects.get_or_create(
                    name=weapon_name,
                    category=category,
                    defaults={
                        'text_color': '#FFFFFF',
                        'image_size': 'medium'
                    }
                )
                if was_created:
                    weapons_created += 1
                    total_weapons += 1
            
            self.stdout.write(f'    Added {weapons_created} weapons to {category_name}')

        self.stdout.write(self.style.SUCCESS(f'\nBlack Ops 6 seeding complete! Total new weapons: {total_weapons}'))
