"""
Security middleware for rate limiting and IP blocking.
"""
from django.http import JsonResponse
from django.utils import timezone
from django.conf import settings
from core.security_models import SecurityEvent, IPBlock, RateLimitTracker
import re


def get_client_ip(request):
    """Get the client's IP address from the request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class SecurityMiddleware:
    """
    Middleware for comprehensive security monitoring and protection.
    - Blocks banned IPs
    - Rate limiting
    - Automatic IP blocking on suspicious activity
    - Security event logging
    """
    
    # Endpoints that require strict rate limiting
    SENSITIVE_ENDPOINTS = {
        '/api/auth/users/': {
            'max_requests': settings.MAX_REGISTER_ATTEMPTS,
            'window': settings.RATE_LIMIT_WINDOW,
            'name': 'register'
        },
        '/api/auth/token/login/': {
            'max_requests': settings.MAX_LOGIN_ATTEMPTS,
            'window': settings.RATE_LIMIT_WINDOW,
            'name': 'login'
        },
        '/api/auth/token/logout/': {
            'max_requests': 10,
            'window': 60,
            'name': 'logout'
        },
    }
    
    # Patterns for API endpoints (general rate limiting)
    API_PATTERN = re.compile(r'^/api/')
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        ip_address = get_client_ip(request)
        
        # 1. Check if IP is blocked
        if IPBlock.is_ip_blocked(ip_address):
            SecurityEvent.objects.create(
                event_type='ip_blocked',
                severity='high',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                endpoint=request.path,
                method=request.method,
                details={'message': 'Attempted access from blocked IP'}
            )
            return JsonResponse({
                'error': 'Access denied',
                'message': 'Your IP address has been blocked due to suspicious activity. Please contact support.'
            }, status=403)
        
        # 2. Check rate limiting for sensitive endpoints
        for endpoint, limits in self.SENSITIVE_ENDPOINTS.items():
            if request.path.startswith(endpoint):
                is_allowed, count, time_until_reset = RateLimitTracker.check_rate_limit(
                    ip_address=ip_address,
                    endpoint=endpoint,
                    max_requests=limits['max_requests'],
                    window_seconds=limits['window']
                )
                
                if not is_allowed:
                    # Log rate limit exceeded
                    SecurityEvent.objects.create(
                        event_type='rate_limit',
                        severity='medium',
                        ip_address=ip_address,
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        endpoint=endpoint,
                        method=request.method,
                        details={
                            'endpoint_name': limits['name'],
                            'attempt_count': count,
                            'time_until_reset': time_until_reset
                        }
                    )
                    
                    # Check if should auto-block (exceeded threshold significantly)
                    if count > limits['max_requests'] + 5:
                        self._auto_block_ip(ip_address, f"Excessive {limits['name']} attempts", count)
                    
                    return JsonResponse({
                        'error': 'Rate limit exceeded',
                        'message': f'Too many {limits["name"]} attempts. Please try again in {int(time_until_reset)} seconds.',
                        'retry_after': int(time_until_reset)
                    }, status=429)
        
        # 3. General API rate limiting
        if self.API_PATTERN.match(request.path):
            is_allowed, count, time_until_reset = RateLimitTracker.check_rate_limit(
                ip_address=ip_address,
                endpoint='api_general',
                max_requests=settings.MAX_API_CALLS_PER_MINUTE,
                window_seconds=60
            )
            
            if not is_allowed:
                SecurityEvent.objects.create(
                    event_type='rate_limit',
                    severity='low',
                    ip_address=ip_address,
                    endpoint=request.path,
                    method=request.method,
                    details={'message': 'General API rate limit exceeded'}
                )
                
                # Check for potential DDoS
                if count > settings.MAX_API_CALLS_PER_MINUTE * 3:
                    self._auto_block_ip(ip_address, "Potential DDoS attack", count)
                    SecurityEvent.objects.create(
                        event_type='ddos',
                        severity='critical',
                        ip_address=ip_address,
                        endpoint=request.path,
                        details={'request_count': count}
                    )
                
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                    'message': 'Too many API requests. Please slow down.',
                    'retry_after': int(time_until_reset)
                }, status=429)
        
        # Process the request
        response = self.get_response(request)
        
        # 4. Monitor failed authentication attempts
        if request.path.startswith('/api/auth/token/login/') and response.status_code == 401:
            self._handle_failed_login(request, ip_address)
        
        # 5. Monitor successful registrations
        if request.path.startswith('/api/auth/users/') and request.method == 'POST' and response.status_code == 201:
            SecurityEvent.objects.create(
                event_type='register_success',
                severity='low',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                endpoint=request.path,
                method=request.method
            )
        
        return response
    
    def _handle_failed_login(self, request, ip_address):
        """Handle failed login attempts."""
        # Log the failed attempt
        SecurityEvent.objects.create(
            event_type='login_fail',
            severity='medium',
            ip_address=ip_address,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            endpoint=request.path,
            method=request.method,
            details={'email': request.data.get('email', 'unknown') if hasattr(request, 'data') else 'unknown'}
        )
        
        # Check recent failed attempts from this IP
        recent_fails = SecurityEvent.objects.filter(
            event_type='login_fail',
            ip_address=ip_address,
            timestamp__gte=timezone.now() - timezone.timedelta(minutes=15)
        ).count()
        
        # Auto-block if threshold exceeded
        if recent_fails >= settings.AUTO_BLOCK_THRESHOLD:
            self._auto_block_ip(ip_address, "Brute force login attempts", recent_fails)
            SecurityEvent.objects.create(
                event_type='brute_force',
                severity='critical',
                ip_address=ip_address,
                details={'failed_attempts': recent_fails}
            )
    
    def _auto_block_ip(self, ip_address, reason, attempt_count):
        """Automatically block an IP address."""
        IPBlock.block_ip(
            ip_address=ip_address,
            reason='auto',
            details=f"{reason} ({attempt_count} attempts)",
            duration_hours=settings.BLOCK_DURATION_HOURS
        )
