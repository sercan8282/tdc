from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Post, Notification
from django.contrib.contenttypes.models import ContentType
import re


@receiver(post_save, sender=Post)
def detect_mentions(sender, instance, created, **kwargs):
    if created:
        # Pattern to detect @username mentions
        mentions = re.findall(r'@(\w+)', instance.content)
        
        for mention in mentions:
            try:
                mentioned_user = instance.thread.category.game.objects.model._meta.app_config.models['customuser'].objects.get(nickname=mention)
                
                # Create notification
                Notification.objects.create(
                    user=mentioned_user,
                    notifier=instance.author,
                    notification_type='mention',
                    content_type=ContentType.objects.get_for_model(Post),
                    object_id=instance.id
                )
            except:
                pass
