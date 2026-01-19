"""
ViewSets for security management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta

from core.security_models import SecurityEvent, IPBlock, RateLimitTracker
from core.security_serializers import (
    SecurityEventSerializer,
    IPBlockSerializer,
    IPBlockCreateSerializer,
    SecurityDashboardSerializer
)


class SecurityEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing security events.
    Only accessible by admin users.
    """
    queryset = SecurityEvent.objects.all()
    serializer_class = SecurityEventSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ['event_type', 'severity', 'ip_address']
    search_fields = ['ip_address', 'user_agent', 'endpoint']
    ordering_fields = ['timestamp', 'severity']
    ordering = ['-timestamp']
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get security dashboard statistics."""
        today = timezone.now().date()
        today_start = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time()))
        
        # Calculate statistics
        total_events_today = SecurityEvent.objects.filter(timestamp__gte=today_start).count()
        
        failed_logins_today = SecurityEvent.objects.filter(
            event_type='login_fail',
            timestamp__gte=today_start
        ).count()
        
        blocked_ips_count = IPBlock.objects.filter(
            Q(is_permanent=True) | Q(blocked_until__gt=timezone.now())
        ).count()
        
        critical_events_today = SecurityEvent.objects.filter(
            severity='critical',
            timestamp__gte=today_start
        ).count()
        
        # Recent attacks (brute force, DDoS, etc.)
        recent_attacks = SecurityEvent.objects.filter(
            event_type__in=['brute_force', 'ddos', 'suspicious'],
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).values('event_type', 'ip_address', 'timestamp', 'details')[:10]
        
        # Top blocked IPs
        top_blocked_ips = IPBlock.objects.filter(
            Q(is_permanent=True) | Q(blocked_until__gt=timezone.now())
        ).order_by('-attempt_count')[:10].values('ip_address', 'attempt_count', 'reason', 'blocked_at')
        
        # Event types breakdown for today
        event_breakdown = SecurityEvent.objects.filter(
            timestamp__gte=today_start
        ).values('event_type').annotate(count=Count('id'))
        event_types_breakdown = {item['event_type']: item['count'] for item in event_breakdown}
        
        data = {
            'total_events_today': total_events_today,
            'failed_logins_today': failed_logins_today,
            'blocked_ips_count': blocked_ips_count,
            'critical_events_today': critical_events_today,
            'recent_attacks': list(recent_attacks),
            'top_blocked_ips': list(top_blocked_ips),
            'event_types_breakdown': event_types_breakdown
        }
        
        serializer = SecurityDashboardSerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_ip(self, request):
        """Get all events for a specific IP address."""
        ip_address = request.query_params.get('ip')
        if not ip_address:
            return Response({'error': 'IP address parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        events = SecurityEvent.objects.filter(ip_address=ip_address).order_by('-timestamp')
        page = self.paginate_queryset(events)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(events, many=True)
        return Response(serializer.data)


class IPBlockViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing IP blocks.
    Only accessible by admin users.
    """
    queryset = IPBlock.objects.all()
    permission_classes = [IsAdminUser]
    filterset_fields = ['reason', 'is_permanent']
    search_fields = ['ip_address', 'details']
    ordering_fields = ['blocked_at', 'attempt_count']
    ordering = ['-blocked_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return IPBlockCreateSerializer
        return IPBlockSerializer
    
    @action(detail=True, methods=['post'])
    def unblock(self, request, pk=None):
        """Unblock an IP address."""
        ip_block = self.get_object()
        ip_address = ip_block.ip_address
        
        # Log the unblock action
        SecurityEvent.objects.create(
            event_type='suspicious',
            severity='low',
            ip_address=ip_address,
            user=request.user,
            details={
                'action': 'ip_unblocked',
                'unblocked_by': request.user.email,
                'previous_reason': ip_block.get_reason_display()
            }
        )
        
        ip_block.delete()
        
        return Response({
            'message': f'IP {ip_address} has been unblocked',
            'ip_address': ip_address
        })
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all currently active (blocked) IPs."""
        active_blocks = IPBlock.objects.filter(
            Q(is_permanent=True) | Q(blocked_until__gt=timezone.now())
        )
        
        page = self.paginate_queryset(active_blocks)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(active_blocks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_unblock(self, request):
        """Unblock multiple IP addresses at once."""
        ip_addresses = request.data.get('ip_addresses', [])
        
        if not ip_addresses:
            return Response({'error': 'No IP addresses provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        unblocked = []
        not_found = []
        
        for ip in ip_addresses:
            if IPBlock.unblock_ip(ip):
                unblocked.append(ip)
                SecurityEvent.objects.create(
                    event_type='suspicious',
                    severity='low',
                    ip_address=ip,
                    user=request.user,
                    details={'action': 'bulk_unblock', 'unblocked_by': request.user.email}
                )
            else:
                not_found.append(ip)
        
        return Response({
            'message': f'Unblocked {len(unblocked)} IP(s)',
            'unblocked': unblocked,
            'not_found': not_found
        })
