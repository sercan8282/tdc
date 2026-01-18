from django.core.management.base import BaseCommand
from core.models import Game, Category, Weapon
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Seeds the database with all Battlefield 2042 weapons'

    def handle(self, *args, **options):
        # Create or get Battlefield 2042 game
        game, created = Game.objects.get_or_create(
            name='Battlefield 2042',
            defaults={
                'slug': slugify('Battlefield 2042'),
                'description': 'Battlefield 2042 (also known as Battlefield 6) - Released 2021',
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created game: {game.name}'))
        else:
            self.stdout.write(f'Game already exists: {game.name}')

        # Battlefield 2042 Weapons organized by category (2024 Season 7 complete list)
        weapons_data = {
            'Assault Rifles': [
                'M5A3',
                'AK-24',
                'SFAR-M GL',
                'AC-42',
                'M16A3',
                'AEK-971',
                'A-91',
                'AUG A3',
                'MTAR-21',
                'Kel-Tec RDB',
                'AM40',
                'RM68',
                'Ghostmaker R10',
                'XCE BAR',
                'ACW-R',
                'M416',
                'AK-5C',
            ],
            'Submachine Guns': [
                'PBX-45',
                'PP-29',
                'MP9',
                'K30',
                'Vector',
                'P90',
                'MP7',
                'PDW-R',
                'JS2',
                'MWS-10',
            ],
            'Light Machine Guns': [
                'LCMG',
                'PKP-BP',
                'Avancys',
                'RPK-74M',
                'M60E4',
                'L86A2',
                'MG3',
                'XM8 LMG',
                'Type 88',
            ],
            'Marksman Rifles': [
                'DM7',
                'SVK',
                'VCAR',
                'BSV-M',
                'SKS',
                'M39 EMR',
                'QBU-88',
                'Mk 14 EBR',
            ],
            'Sniper Rifles': [
                'SWS-10',
                'DXR-1',
                'NTW-50',
                'GOL Magnum',
                'M98B',
                'SV-98',
                'JNG-90',
                'CS-LR4',
            ],
            'Shotguns': [
                '12M Auto',
                'MCS-880',
                'GVT 45-70',
                'SPAS-12',
                'M1014',
                'DAO-12',
                '870 MCS',
                'Saiga 12K',
            ],
            'Pistols': [
                'G57',
                'M44',
                'MP28',
                'M1911',
                'P226',
                'MP443',
                '.44 Magnum',
                'M9',
                'M93R',
                'G18',
                'Deagle',
            ],
            'Utility': [
                'RPG-7V2',
                'FXM-33 AA Missile',
                'M5 Recoilless',
                'Carl Gustaf M4',
                'SMAW',
                'FGM-148 Javelin',
                'Repair Tool',
                'C5 Explosive',
                'EOD Bot',
                'Insertion Beacon',
                'Ammo Box',
                'Med Pen',
            ],
            'Gadgets': [
                'Grappling Hook',
                'Wingsuit',
                'Medical Crate',
                'Syrette Pistol',
                'Smoke Grenade Launcher',
                'Soflam',
                'Spawn Beacon',
                'Anti-Tank Mine',
                'Claymore',
                'Prox Sensor',
                'Incendiary Grenade',
                'Frag Grenade',
                'Smoke Grenade',
                'EMP Grenade',
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

        self.stdout.write(self.style.SUCCESS(f'\nBattlefield 2042 seeding complete! Total new weapons: {total_weapons}'))
