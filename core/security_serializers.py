"""
Serializers for security models.
"""
from rest_framework import serializers
from core.security_models import SecurityEvent, IPBlock, RateLimitTracker


class SecurityEventSerializer(serializers.ModelSerializer):
    """Serializer for security events."""
    user_email = serializers.CharField(source='user.email', read_only=True, allow_null=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = SecurityEvent
        fields = [
            'id', 'event_type', 'event_type_display', 'severity', 'severity_display',
            'ip_address', 'user_agent', 'user', 'user_email', 'endpoint', 'method',
            'details', 'timestamp'
        ]
        read_only_fields = fields


class IPBlockSerializer(serializers.ModelSerializer):
    """Serializer for IP blocks."""
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    blocked_by_email = serializers.CharField(source='blocked_by.email', read_only=True, allow_null=True)
    is_currently_blocked = serializers.SerializerMethodField()
    
    class Meta:
        model = IPBlock
        fields = [
            'id', 'ip_address', 'reason', 'reason_display', 'details',
            'blocked_at', 'blocked_until', 'is_permanent', 'blocked_by',
            'blocked_by_email', 'attempt_count', 'last_attempt', 'is_currently_blocked'
        ]
        read_only_fields = ['blocked_at', 'attempt_count', 'last_attempt']
    
    def get_is_currently_blocked(self, obj):
        return obj.is_blocked()


class IPBlockCreateSerializer(serializers.Serializer):
    """Serializer for manually blocking an IP."""
    ip_address = serializers.IPAddressField()
    reason = serializers.ChoiceField(choices=IPBlock.BLOCK_REASONS, default='manual')
    details = serializers.CharField(required=False, allow_blank=True)
    duration_hours = serializers.IntegerField(required=False, min_value=1, max_value=8760)  # Max 1 year
    is_permanent = serializers.BooleanField(default=False)
    
    def create(self, validated_data):
        user = self.context['request'].user
        return IPBlock.block_ip(
            ip_address=validated_data['ip_address'],
            reason=validated_data.get('reason', 'manual'),
            details=validated_data.get('details', ''),
            duration_hours=validated_data.get('duration_hours'),
            permanent=validated_data.get('is_permanent', False),
            blocked_by=user
        )


class SecurityDashboardSerializer(serializers.Serializer):
    """Serializer for security dashboard statistics."""
    total_events_today = serializers.IntegerField()
    failed_logins_today = serializers.IntegerField()
    blocked_ips_count = serializers.IntegerField()
    critical_events_today = serializers.IntegerField()
    recent_attacks = serializers.ListField()
    top_blocked_ips = serializers.ListField()
    event_types_breakdown = serializers.DictField()
