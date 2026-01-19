from django.utils import timezone
from django.http import JsonResponse


class BanCheckMiddleware:
    """Check if user is banned before processing request"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if user is authenticated and banned
        if hasattr(request, 'user') and request.user.is_authenticated:
            if request.user.banned_until:
                # Check if ban has expired
                if timezone.now() < request.user.banned_until:
                    # User is still banned
                    return JsonResponse({
                        'error': 'You are banned until ' + request.user.banned_until.strftime('%Y-%m-%d %H:%M:%S'),
                        'banned_until': request.user.banned_until.isoformat()
                    }, status=403)
                else:
                    # Ban has expired, automatically unban
                    request.user.unban()
        
        response = self.get_response(request)
        return response
