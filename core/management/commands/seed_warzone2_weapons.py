from django.core.management.base import BaseCommand
from core.models import Game, Category, Weapon
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Seeds the database with Call of Duty: Warzone 2 (Modern Warfare 2) weapons'

    def handle(self, *args, **options):
        # Create or get Call of Duty: Warzone 2 game
        game, created = Game.objects.get_or_create(
            name='Call of Duty: Warzone 2',
            defaults={
                'slug': slugify('Call of Duty: Warzone 2'),
                'description': 'Call of Duty: Warzone 2 / Modern Warfare II - Released 2022',
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created game: {game.name}'))
        else:
            self.stdout.write(f'Game already exists: {game.name}')

        # Warzone 2 / Modern Warfare 2 Weapons (MW2 launch weapons)
        weapons_data = {
            'Assault Rifles': [
                'M4',
                'TAQ-56',
                'Kastov 762',
                'Kastov-74u',
                'Kastov 545',
                'Lachmann-556',
                'STB 556',
                'M16',
                'M13B',
                'Chimera',
                'ISO Hemlock',
                'Tempus Razorback',
                'FR Avancer',
                'TR-76 Geist',
                'M13C',
            ],
            'Submachine Guns': [
                'Lachmann Sub (MP5)',
                'Vaznev-9K',
                'FSS Hurricane',
                'PDSW 528',
                'Vel 46 (MP7)',
                'Fennec 45',
                'Minibak',
                'MX9 (AUG)',
                'BAS-P',
                'Lachmann Shroud',
                'ISO 45',
                'ISO 9mm',
            ],
            'Shotguns': [
                'Expedite 12',
                'Bryson 800',
                'Bryson 890',
                'Lockwood 300',
                'MX Guardian',
                'KV Broadside',
            ],
            'Light Machine Guns': [
                '556 Icarus',
                'RAPP H',
                'SAKIN MG38',
                'RPK',
                'HCR 56',
                'RAAL MG',
            ],
            'Battle Rifles': [
                'Lachmann-762',
                'SO-14',
                'TAQ-V',
                'FTac Recon',
                'Cronen Squall',
                'BAS-B',
            ],
            'Marksman Rifles': [
                'EBR-14',
                'SP-R 208',
                'Lockwood MK2',
                'TAQ-M',
                'SA-B 50',
                'Tempus Torrent',
                'Crossbow',
                'LM-S',
            ],
            'Sniper Rifles': [
                'MCPR-300',
                'Signal 50',
                'LA-B 330',
                'SP-X 80',
                'Victus XMR',
                'FJX Imperium',
                'Carrack .300',
                'Longbow',
                'KV Inhibitor',
            ],
            'Handguns': [
                'X12',
                'X13 Auto',
                'P890',
                '.50 GS',
                'Basilisk',
                'GS Magna',
                'FTac Siege',
                '9mm Daemon',
                'Renetti',
                'COR-45',
                'WSP Stinger',
            ],
            'Launchers': [
                'PILA',
                'JOKR',
                'RPG-7',
                'Strela-P',
                'RGL-80',
            ],
            'Melee': [
                'Combat Knife',
                'Riot Shield',
                'Dual Kodachis',
                'Tonfa',
                'Pickaxe',
                'Dual Kamas',
                'Karambit',
                'Gutter Knife',
            ],
        }

        total_created = 0
        total_existing = 0

        for category_name, weapons in weapons_data.items():
            # Create or get category for this game
            category, cat_created = Category.objects.get_or_create(
                name=category_name,
                game=game
            )
            
            if cat_created:
                self.stdout.write(self.style.SUCCESS(f'  Created category: {category_name}'))

            for weapon_name in weapons:
                weapon, wp_created = Weapon.objects.get_or_create(
                    name=weapon_name,
                    category=category
                )
                
                if wp_created:
                    total_created += 1
                    self.stdout.write(f'    + {weapon_name}')
                else:
                    total_existing += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Summary:'))
        self.stdout.write(f'  New weapons created: {total_created}')
        self.stdout.write(f'  Existing weapons: {total_existing}')
        self.stdout.write(f'  Total Warzone 2 weapons: {Weapon.objects.filter(category__game=game).count()}')
