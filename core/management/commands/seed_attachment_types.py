from django.core.management.base import BaseCommand
from core.models import AttachmentType, Attachment


class Command(BaseCommand):
    help = 'Seeds default attachment types and migrates existing attachments'

    def handle(self, *args, **options):
        # Default attachment types
        default_types = [
            {'name': 'muzzle', 'display_name': 'Muzzle', 'order': 1},
            {'name': 'optic', 'display_name': 'Optic', 'order': 2},
            {'name': 'stock', 'display_name': 'Stock', 'order': 3},
            {'name': 'grip', 'display_name': 'Grip', 'order': 4},
            {'name': 'magazine', 'display_name': 'Magazine', 'order': 5},
            {'name': 'underbarrel', 'display_name': 'Underbarrel', 'order': 6},
            {'name': 'ammunition', 'display_name': 'Ammunition', 'order': 7},
            {'name': 'perk', 'display_name': 'Perk', 'order': 8},
            {'name': 'barrel', 'display_name': 'Barrel', 'order': 9},
            {'name': 'laser', 'display_name': 'Laser', 'order': 10},
            {'name': 'rear_grip', 'display_name': 'Rear Grip', 'order': 11},
            {'name': 'trigger_action', 'display_name': 'Trigger Action', 'order': 12},
        ]

        # Create or update attachment types
        for type_data in default_types:
            obj, created = AttachmentType.objects.update_or_create(
                name=type_data['name'],
                defaults={
                    'display_name': type_data['display_name'],
                    'order': type_data['order']
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created attachment type: {obj.display_name}'))
            else:
                self.stdout.write(f'Updated attachment type: {obj.display_name}')

        # Migrate existing attachments from legacy type field to new FK
        attachments_to_migrate = Attachment.objects.filter(
            attachment_type__isnull=True, 
            type__isnull=False
        ).exclude(type='')
        
        migrated_count = 0
        for attachment in attachments_to_migrate:
            # Try to find matching type by name (case-insensitive)
            attachment_type = AttachmentType.objects.filter(
                name__iexact=attachment.type.lower()
            ).first()
            
            if not attachment_type:
                # Try by display_name
                attachment_type = AttachmentType.objects.filter(
                    display_name__iexact=attachment.type
                ).first()
            
            if attachment_type:
                attachment.attachment_type = attachment_type
                attachment.save()
                migrated_count += 1

        if migrated_count > 0:
            self.stdout.write(self.style.SUCCESS(f'Migrated {migrated_count} attachments to new type system'))
        
        self.stdout.write(self.style.SUCCESS('Done!'))
