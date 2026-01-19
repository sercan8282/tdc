"""
Security models for tracking security events and IP blocking.
"""
from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings


class SecurityEvent(models.Model):
    """Log security-related events for monitoring."""
    
    EVENT_TYPES = (
        ('login_fail', 'Failed Login'),
        ('login_success', 'Successful Login'),
        ('register_attempt', 'Registration Attempt'),
        ('register_success', 'Successful Registration'),
        ('rate_limit', 'Rate Limit Exceeded'),
        ('ip_blocked', 'IP Blocked'),
        ('suspicious', 'Suspicious Activity'),
        ('brute_force', 'Brute Force Detected'),
        ('ddos', 'Potential DDoS'),
    )
    
    SEVERITY_LEVELS = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES, db_index=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='low', db_index=True)
    ip_address = models.GenericIPAddressField(db_index=True)
    user_agent = models.TextField(blank=True)
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='security_events'
    )
    endpoint = models.CharField(max_length=255, blank=True)
    method = models.CharField(max_length=10, blank=True)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp', 'event_type']),
            models.Index(fields=['ip_address', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_event_type_display()} - {self.ip_address} - {self.timestamp}"


class IPBlock(models.Model):
    """Track blocked IP addresses."""
    
    BLOCK_REASONS = (
        ('auto', 'Automatic - Too Many Failures'),
        ('manual', 'Manual - Admin Action'),
        ('brute_force', 'Brute Force Attack'),
        ('ddos', 'DDoS Attack'),
        ('suspicious', 'Suspicious Activity'),
    )
    
    ip_address = models.GenericIPAddressField(unique=True, db_index=True)
    reason = models.CharField(max_length=20, choices=BLOCK_REASONS, default='auto')
    details = models.TextField(blank=True)
    blocked_at = models.DateTimeField(auto_now_add=True)
    blocked_until = models.DateTimeField(null=True, blank=True)
    is_permanent = models.BooleanField(default=False)
    blocked_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='blocked_ips'
    )
    attempt_count = models.IntegerField(default=0)
    last_attempt = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-blocked_at']
        verbose_name = 'IP Block'
        verbose_name_plural = 'IP Blocks'
    
    def __str__(self):
        return f"{self.ip_address} - {self.get_reason_display()}"
    
    def is_blocked(self):
        """Check if the IP is currently blocked."""
        if self.is_permanent:
            return True
        if self.blocked_until and timezone.now() < self.blocked_until:
            return True
        return False
    
    def increment_attempts(self):
        """Increment the attempt counter."""
        self.attempt_count += 1
        self.last_attempt = timezone.now()
        self.save(update_fields=['attempt_count', 'last_attempt'])
    
    @classmethod
    def block_ip(cls, ip_address, reason='auto', duration_hours=None, permanent=False, blocked_by=None, details=''):
        """Block an IP address."""
        from django.conf import settings
        
        if duration_hours is None:
            duration_hours = settings.BLOCK_DURATION_HOURS
        
        blocked_until = None if permanent else timezone.now() + timedelta(hours=duration_hours)
        
        ip_block, created = cls.objects.update_or_create(
            ip_address=ip_address,
            defaults={
                'reason': reason,
                'details': details,
                'blocked_until': blocked_until,
                'is_permanent': permanent,
                'blocked_by': blocked_by,
            }
        )
        
        if not created:
            ip_block.increment_attempts()
        
        # Log the blocking event
        SecurityEvent.objects.create(
            event_type='ip_blocked',
            severity='high',
            ip_address=ip_address,
            details={
                'reason': reason,
                'permanent': permanent,
                'duration_hours': duration_hours if not permanent else None,
            }
        )
        
        return ip_block
    
    @classmethod
    def is_ip_blocked(cls, ip_address):
        """Check if an IP is currently blocked."""
        try:
            ip_block = cls.objects.get(ip_address=ip_address)
            return ip_block.is_blocked()
        except cls.DoesNotExist:
            return False
    
    @classmethod
    def unblock_ip(cls, ip_address):
        """Unblock an IP address."""
        try:
            ip_block = cls.objects.get(ip_address=ip_address)
            ip_block.delete()
            return True
        except cls.DoesNotExist:
            return False


class RateLimitTracker(models.Model):
    """Track rate limiting per IP and endpoint."""
    
    ip_address = models.GenericIPAddressField(db_index=True)
    endpoint = models.CharField(max_length=255, db_index=True)
    request_count = models.IntegerField(default=0)
    window_start = models.DateTimeField(auto_now_add=True)
    last_request = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['ip_address', 'endpoint', 'window_start']
        indexes = [
            models.Index(fields=['ip_address', 'endpoint', '-window_start']),
        ]
    
    def __str__(self):
        return f"{self.ip_address} - {self.endpoint} - {self.request_count}"
    
    @classmethod
    def check_rate_limit(cls, ip_address, endpoint, max_requests, window_seconds=60):
        """
        Check if IP has exceeded rate limit for endpoint.
        Returns (is_allowed, current_count, time_until_reset)
        """
        now = timezone.now()
        window_start = now - timedelta(seconds=window_seconds)
        
        # Clean up old trackers first
        cls.objects.filter(window_start__lt=window_start).delete()
        
        # Get or create tracker for current window
        # Handle race condition where duplicates may exist
        try:
            tracker, created = cls.objects.get_or_create(
                ip_address=ip_address,
                endpoint=endpoint,
                window_start__gte=window_start,
                defaults={'window_start': now}
            )
        except cls.MultipleObjectsReturned:
            # If duplicates exist, delete all but the first one
            trackers = cls.objects.filter(
                ip_address=ip_address,
                endpoint=endpoint,
                window_start__gte=window_start
            ).order_by('id')
            tracker = trackers.first()
            trackers.exclude(id=tracker.id).delete()
        
        if tracker.request_count >= max_requests:
            time_until_reset = (tracker.window_start + timedelta(seconds=window_seconds) - now).total_seconds()
            return False, tracker.request_count, time_until_reset
        
        # Increment counter
        tracker.request_count += 1
        tracker.save(update_fields=['request_count', 'last_request'])
        
        return True, tracker.request_count, 0
