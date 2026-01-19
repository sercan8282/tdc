"""
Serializers for private messaging.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .messaging_models import PrivateMessage

User = get_user_model()


class MessageRecipientSerializer(serializers.ModelSerializer):
    """Minimal user info for message recipients/senders"""
    class Meta:
        model = User
        fields = ('id', 'nickname', 'avatar')


class PrivateMessageSerializer(serializers.ModelSerializer):
    """
    Serializer for private messages.
    
    Security:
    - Content is only included for sender and recipient
    - Admins see metadata only (no content)
    """
    sender_info = MessageRecipientSerializer(source='sender', read_only=True)
    recipient_info = MessageRecipientSerializer(source='recipient', read_only=True)
    is_read = serializers.SerializerMethodField()
    
    class Meta:
        model = PrivateMessage
        fields = (
            'id', 'sender', 'recipient', 'sender_info', 'recipient_info',
            'content', 'created_at', 'read_at', 'is_read'
        )
        read_only_fields = ('sender', 'created_at', 'read_at')
    
    def get_is_read(self, obj):
        return obj.read_at is not None
    
    def to_representation(self, instance):
        """
        Hide content from admins who are not sender or recipient.
        Users can only see their own messages.
        """
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        if request and request.user.is_authenticated:
            # Only sender and recipient can see content
            if request.user != instance.sender and request.user != instance.recipient:
                data['content'] = '[HIDDEN - Privacy Protected]'
        
        return data
    
    def validate_recipient(self, value):
        """Validate recipient"""
        request = self.context.get('request')
        
        # Cannot send to yourself
        if request and value == request.user:
            raise serializers.ValidationError("Cannot send messages to yourself")
        
        # Recipient must be verified
        if not value.is_verified:
            raise serializers.ValidationError("Cannot send messages to unverified users")
        
        # Recipient must not be blocked
        if value.is_blocked:
            raise serializers.ValidationError("Cannot send messages to blocked users")
        
        return value
    
    def create(self, validated_data):
        """Create message with sender from request"""
        request = self.context.get('request')
        validated_data['sender'] = request.user
        return super().create(validated_data)


class ConversationSerializer(serializers.Serializer):
    """Serializer for conversation list"""
    user = MessageRecipientSerializer()
    last_message_at = serializers.DateTimeField()
    unread_count = serializers.IntegerField()
    last_message_preview = serializers.CharField()


class MessageStatsSerializer(serializers.Serializer):
    """Admin-only statistics (no content access)"""
    total_messages = serializers.IntegerField()
    messages_today = serializers.IntegerField()
    active_conversations = serializers.IntegerField()
    # Note: Admins cannot see message content, only metadata
