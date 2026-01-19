"""
Management command to delete read messages older than 24 hours.
Run this daily via cron: python manage.py cleanup_old_messages
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from users.messaging_models import PrivateMessage


class Command(BaseCommand):
    help = 'Delete read messages that are older than 24 hours (privacy protection)'

    def handle(self, *args, **options):
        cutoff_time = timezone.now() - timedelta(days=1)
        
        # Find read messages older than 24 hours
        old_messages = PrivateMessage.objects.filter(
            read_at__isnull=False,
            read_at__lt=cutoff_time
        )
        
        count = old_messages.count()
        old_messages.delete()
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully deleted {count} old read messages')
        )
