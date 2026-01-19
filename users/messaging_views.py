"""
ViewSets for private messaging with security controls.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from .messaging_models import PrivateMessage
from .messaging_serializers import (
    PrivateMessageSerializer,
    ConversationSerializer,
    MessageStatsSerializer
)

User = get_user_model()


class IsMessageParticipant(permissions.BasePermission):
    """
    Only sender and recipient can view message.
    Admins CANNOT view message content (privacy protection).
    """
    def has_object_permission(self, request, view, obj):
        # Only sender and recipient can access
        return request.user == obj.sender or request.user == obj.recipient


class PrivateMessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for private messages.
    
    Security features:
    - Users can only see messages they sent or received
    - Cannot read other people's messages
    - Admins cannot see message content (only metadata for moderation)
    - Messages auto-delete after 24h of being read
    """
    serializer_class = PrivateMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Users can only see their own messages (sent or received).
        Admins see metadata only, not content.
        """
        user = self.request.user
        
        # Users see only their own conversations
        return PrivateMessage.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).select_related('sender', 'recipient').order_by('-created_at')
    
    def get_permissions(self):
        """Add object-level permission for retrieve/update/delete"""
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsMessageParticipant()]
        return [permissions.IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """Send a new message"""
        # Check if sender is blocked or unverified
        if request.user.is_blocked:
            return Response(
                {'error': 'Blocked users cannot send messages'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not request.user.is_verified:
            return Response(
                {'error': 'Only verified users can send messages'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().create(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """
        Get all conversations for the current user.
        Returns list of users with last message time and unread count.
        """
        conversations = PrivateMessage.get_conversations_for_user(request.user)
        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def with_user(self, request):
        """
        Get all messages with a specific user.
        Query param: user_id
        """
        other_user_id = request.query_params.get('user_id')
        if not other_user_id:
            return Response(
                {'error': 'user_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all messages between these two users
        messages = PrivateMessage.objects.filter(
            Q(sender=request.user, recipient=other_user) |
            Q(sender=other_user, recipient=request.user)
        ).select_related('sender', 'recipient').order_by('created_at')
        
        # Mark received messages as read
        unread_messages = messages.filter(
            recipient=request.user,
            read_at__isnull=True
        )
        for msg in unread_messages:
            msg.mark_as_read()
        
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread messages"""
        count = PrivateMessage.objects.filter(
            recipient=request.user,
            read_at__isnull=True
        ).count()
        return Response({'unread_count': count})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a message as read"""
        message = self.get_object()
        
        # Only recipient can mark as read
        if message.recipient != request.user:
            return Response(
                {'error': 'Only recipient can mark message as read'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.mark_as_read()
        return Response({'status': 'message marked as read'})
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def cleanup_old_messages(self, request):
        """
        Admin action to manually trigger cleanup of read messages older than 24h.
        Note: Admins still cannot see message content.
        """
        cutoff_time = timezone.now() - timedelta(days=1)
        old_messages = PrivateMessage.objects.filter(
            read_at__isnull=False,
            read_at__lt=cutoff_time
        )
        count = old_messages.count()
        old_messages.delete()
        
        return Response({
            'status': 'cleanup completed',
            'messages_deleted': count
        })
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def stats(self, request):
        """
        Admin statistics (metadata only, no content access).
        Admins can see how many messages exist but cannot read them.
        """
        total_messages = PrivateMessage.objects.count()
        messages_today = PrivateMessage.objects.filter(
            created_at__gte=timezone.now().replace(hour=0, minute=0, second=0)
        ).count()
        
        # Count unique conversation pairs
        from django.db.models import Count
        active_conversations = PrivateMessage.objects.values('sender', 'recipient').distinct().count()
        
        stats_data = {
            'total_messages': total_messages,
            'messages_today': messages_today,
            'active_conversations': active_conversations,
        }
        
        serializer = MessageStatsSerializer(stats_data)
        return Response(serializer.data)
