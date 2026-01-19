"""
Private messaging models for secure user-to-user communication.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class PrivateMessage(models.Model):
    """
    Private messages between users.
    
    Security features:
    - Only sender and recipient can see the message
    - Admins cannot see message content (only metadata)
    - Messages are automatically deleted 24 hours after being read
    """
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='received_messages'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'recipient', '-created_at']),
            models.Index(fields=['recipient', 'read_at']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender.nickname} to {self.recipient.nickname}"
    
    def mark_as_read(self):
        """Mark message as read"""
        if not self.read_at:
            self.read_at = timezone.now()
            self.save(update_fields=['read_at'])
    
    def should_be_deleted(self):
        """Check if message should be auto-deleted (read + 24 hours old)"""
        if self.read_at:
            delete_after = self.read_at + timedelta(days=1)
            return timezone.now() >= delete_after
        return False
    
    @staticmethod
    def get_conversations_for_user(user):
        """
        Get all users this user has had conversations with,
        with last message timestamp and unread count.
        """
        from django.db.models import Q, Max, Count, Case, When, IntegerField
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Get all users involved in conversations
        sent_to = PrivateMessage.objects.filter(sender=user).values_list('recipient', flat=True).distinct()
        received_from = PrivateMessage.objects.filter(recipient=user).values_list('sender', flat=True).distinct()
        
        conversation_user_ids = set(sent_to) | set(received_from)
        
        conversations = []
        for other_user_id in conversation_user_ids:
            other_user = User.objects.get(id=other_user_id)
            
            # Get last message timestamp
            last_message = PrivateMessage.objects.filter(
                Q(sender=user, recipient=other_user) | Q(sender=other_user, recipient=user)
            ).order_by('-created_at').first()
            
            # Count unread messages from other user
            unread_count = PrivateMessage.objects.filter(
                sender=other_user,
                recipient=user,
                read_at__isnull=True
            ).count()
            
            conversations.append({
                'user': other_user,
                'last_message_at': last_message.created_at if last_message else None,
                'unread_count': unread_count,
                'last_message_preview': last_message.content[:50] if last_message else '',
            })
        
        # Sort by last message timestamp
        conversations.sort(key=lambda x: x['last_message_at'] or timezone.now(), reverse=True)
        
        return conversations
