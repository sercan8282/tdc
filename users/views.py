"""
Authentication views for registration, captcha, and MFA.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.db import models

from .serializers import RegistrationSerializer, CustomUserSerializer
from .services.captcha import captcha_service
from .services.mfa import mfa_service

User = get_user_model()


@api_view(['GET'])
@permission_classes([AllowAny])
def get_captcha(request):
    """Generate a new captcha image and token."""
    captcha_data = captcha_service.generate_captcha()
    return Response(captcha_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user with captcha verification."""
    serializer = RegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'message': 'Registration successful! Please wait for admin approval.',
            'user': {
                'id': user.id,
                'email': user.email,
                'nickname': user.nickname,
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_with_mfa(request):
    """Login endpoint that handles MFA verification."""
    email = request.data.get('email')
    password = request.data.get('password')
    mfa_code = request.data.get('mfa_code')
    
    if not email or not password:
        return Response(
            {'error': 'Email and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.check_password(password):
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if user.is_blocked:
        return Response(
            {'error': 'Your account has been blocked'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if not user.is_verified:
        return Response(
            {'error': 'Your account is pending approval. Please wait for admin verification.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Check MFA
    if user.mfa_enabled:
        if not mfa_code:
            return Response({
                'mfa_required': True,
                'message': 'MFA code required'
            }, status=status.HTTP_200_OK)
        
        if not mfa_service.verify_code(user.mfa_secret, mfa_code):
            return Response(
                {'error': 'Invalid MFA code'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    # Create or get token
    token, _ = Token.objects.get_or_create(user=user)
    
    return Response({
        'token': token.key,
        'user': CustomUserSerializer(user).data,
        'mfa_setup_required': not user.mfa_enabled,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mfa_setup(request):
    """Initialize MFA setup - generate secret and QR code."""
    user = request.user
    
    if user.mfa_enabled:
        return Response(
            {'error': 'MFA is already enabled'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate new secret if not exists
    if not user.mfa_secret:
        user.mfa_secret = mfa_service.generate_secret()
        user.save()
    
    qr_code = mfa_service.generate_qr_code(user.mfa_secret, user.email)
    
    return Response({
        'qr_code': qr_code,
        'secret': user.mfa_secret,
        'message': 'Scan this QR code with your authenticator app. If you need manual entry, use the secret code provided.'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_verify(request):
    """Verify MFA code and enable MFA for the user."""
    from core.security_models import SecurityEvent, RateLimitTracker
    from core.middleware import get_client_ip
    
    user = request.user
    code = request.data.get('code')
    ip_address = get_client_ip(request)
    
    # Rate limiting: Max 5 MFA verification attempts per minute
    is_allowed, count, time_until_reset = RateLimitTracker.check_rate_limit(
        ip_address=ip_address,
        endpoint='mfa_verify',
        max_requests=5,
        window_seconds=60
    )
    
    if not is_allowed:
        SecurityEvent.objects.create(
            event_type='rate_limit',
            severity='high',
            ip_address=ip_address,
            user=user,
            endpoint='/api/auth/mfa/verify/',
            method='POST',
            details={'message': 'MFA verification rate limit exceeded', 'attempts': count}
        )
        return Response(
            {'error': f'Too many attempts. Please try again in {int(time_until_reset)} seconds.'},
            status=429
        )
    
    if not code:
        return Response(
            {'error': 'MFA code is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.mfa_secret:
        return Response(
            {'error': 'MFA setup not initialized'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if mfa_service.verify_code(user.mfa_secret, code):
        user.mfa_enabled = True
        user.save()
        
        SecurityEvent.objects.create(
            event_type='login_success',
            severity='low',
            ip_address=ip_address,
            user=user,
            details={'action': 'mfa_enabled'}
        )
        
        return Response({
            'message': 'MFA enabled successfully',
            'user': CustomUserSerializer(user).data
        })
    
    # Log failed MFA attempt
    SecurityEvent.objects.create(
        event_type='login_fail',
        severity='medium',
        ip_address=ip_address,
        user=user,
        endpoint='/api/auth/mfa/verify/',
        details={'action': 'mfa_verification_failed'}
    )
    
    return Response(
        {'error': 'Invalid MFA code'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_disable(request):
    """Disable MFA for the user (requires current MFA code)."""
    from core.security_models import SecurityEvent
    from core.middleware import get_client_ip
    
    user = request.user
    code = request.data.get('code')
    ip_address = get_client_ip(request)
    
    if not user.mfa_enabled:
        return Response(
            {'error': 'MFA is not enabled'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not code:
        return Response(
            {'error': 'Current MFA code is required to disable MFA'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if mfa_service.verify_code(user.mfa_secret, code):
        user.mfa_enabled = False
        user.mfa_secret = None
        user.save()
        
        # Log MFA disabled
        SecurityEvent.objects.create(
            event_type='suspicious',
            severity='medium',
            ip_address=ip_address,
            user=user,
            details={'action': 'mfa_disabled'}
        )
        
        return Response({
            'message': 'MFA disabled successfully',
            'user': CustomUserSerializer(user).data
        })
    
    # Log failed attempt
    SecurityEvent.objects.create(
        event_type='login_fail',
        severity='medium',
        ip_address=ip_address,
        user=user,
        details={'action': 'mfa_disable_failed'}
    )
    
    return Response(
        {'error': 'Invalid MFA code'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_reset(request):
    """Reset MFA for the user (requires password verification)."""
    user = request.user
    password = request.data.get('password')
    
    if not password:
        return Response(
            {'error': 'Password is required to reset MFA'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.check_password(password):
        return Response(
            {'error': 'Invalid password'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Reset MFA
    user.mfa_enabled = False
    user.mfa_secret = None
    user.save()
    
    return Response({
        'message': 'MFA has been reset successfully. You can set it up again from your profile.',
        'user': CustomUserSerializer(user).data
    })


# ============== Profile Views ==============

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Get or update user profile."""
    user = request.user
    
    if request.method == 'GET':
        from .serializers import ProfileSerializer
        serializer = ProfileSerializer(user)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        from .serializers import ProfileUpdateSerializer
        serializer = ProfileUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            from .serializers import ProfileSerializer
            return Response(ProfileSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """Upload user avatar."""
    user = request.user
    
    if 'avatar' not in request.FILES:
        return Response(
            {'error': 'No avatar file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    avatar = request.FILES['avatar']
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if avatar.content_type not in allowed_types:
        return Response(
            {'error': 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate file size (max 2MB)
    if avatar.size > 2 * 1024 * 1024:
        return Response(
            {'error': 'File too large. Maximum size is 2MB'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Delete old avatar if exists
    if user.avatar:
        user.avatar.delete(save=False)
    
    user.avatar = avatar
    user.save()
    
    from .serializers import ProfileSerializer
    return Response({
        'message': 'Avatar uploaded successfully',
        'user': ProfileSerializer(user).data
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_avatar(request):
    """Delete user avatar."""
    user = request.user
    
    if user.avatar:
        user.avatar.delete(save=True)
        return Response({'message': 'Avatar deleted successfully'})
    
    return Response(
        {'error': 'No avatar to delete'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password."""
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    confirm_password = request.data.get('confirm_password')
    
    if not current_password or not new_password or not confirm_password:
        return Response(
            {'error': 'Current password, new password, and confirmation are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.check_password(current_password):
        return Response(
            {'error': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if new_password != confirm_password:
        return Response(
            {'error': 'New passwords do not match'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(new_password) < 8:
        return Response(
            {'error': 'Password must be at least 8 characters long'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user.set_password(new_password)
    user.save()
    
    # Update token
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)
    
    return Response({
        'message': 'Password changed successfully',
        'token': token.key  # Return new token since old one is invalidated
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_replies(request):
    """Get user's recent forum replies with pagination."""
    from forum.models import Reply
    from forum.serializers import ReplySerializer
    from django.core.paginator import Paginator
    
    user = request.user
    page_number = request.query_params.get('page', 1)
    page_size = 20
    
    # Get all replies by user, ordered by most recent
    replies = Reply.objects.filter(author=user).select_related(
        'topic', 'topic__category', 'author', 'author__forum_stats'
    ).order_by('-created_at')
    
    # Paginate
    paginator = Paginator(replies, page_size)
    page_obj = paginator.get_page(page_number)
    
    # Serialize with topic info
    replies_data = []
    for reply in page_obj:
        reply_data = ReplySerializer(reply, context={'request': request}).data
        reply_data['topic'] = {
            'id': reply.topic.id,
            'title': reply.topic.title,
            'slug': reply.topic.slug,
            'category': {
                'name': reply.topic.category.name,
                'slug': reply.topic.category.slug,
            }
        }
        replies_data.append(reply_data)
    
    return Response({
        'count': paginator.count,
        'total_pages': paginator.num_pages,
        'current_page': page_obj.number,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
        'results': replies_data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """
    Search for users to send messages to.
    Query param: q (search query)
    """
    query = request.query_params.get('q', '').strip()
    
    if not query or len(query) < 2:
        return Response([])
    
    # Search by nickname or email, exclude current user
    users = User.objects.filter(
        models.Q(nickname__icontains=query) | models.Q(email__icontains=query)
    ).exclude(
        id=request.user.id
    ).filter(
        is_verified=True,
        is_blocked=False
    )[:10]  # Limit to 10 results
    
    results = [{
        'id': user.id,
        'nickname': user.nickname,
        'email': user.email,
        'avatar': request.build_absolute_uri(user.avatar.url) if user.avatar else None,
    } for user in users]
    
    return Response(results)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_user_profile(request, user_id):
    """
    Get public profile information for a user.
    Returns safe, public information only.
    """
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Only show verified, non-blocked users
    if not user.is_verified or user.is_blocked:
        return Response(
            {'error': 'User profile not available'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from django.db.models import Q
    
    # Get favorite games if they exist
    favorite_games_data = []
    if user.favorite_games:
        from core.models import Game
        # Assuming favorite_games contains game IDs or names
        try:
            # If it's a list of game IDs
            if user.favorite_games and isinstance(user.favorite_games, list):
                games = Game.objects.filter(name__in=user.favorite_games, is_active=True)
                favorite_games_data = [{
                    'id': game.id,
                    'name': game.name,
                    'image': request.build_absolute_uri(game.image.url) if game.image else None,
                } for game in games]
        except:
            pass
    
    profile_data = {
        'id': user.id,
        'nickname': user.nickname,
        'name': f"{user.first_name} {user.last_name}".strip() or user.nickname,
        'avatar': request.build_absolute_uri(user.avatar.url) if user.avatar else None,
        'favorite_games': favorite_games_data,
        'is_streamer': user.is_streamer,
        'stream_url': user.stream_url if user.is_streamer else '',
        'youtube_url': user.youtube_url or '',
        'kick_url': user.kick_url or '',
        'discord_url': user.discord_url or '',
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'created_at': user.created_at.isoformat() if user.created_at else None,
    }
    
    # Add forum statistics if forum app exists
    try:
        from forum.models import Post
        
        # Count total posts
        post_count = Post.objects.filter(author=user).count()
        
        # Get recent posts
        recent_posts = Post.objects.filter(author=user).order_by('-created_at')[:5]
        
        profile_data['forum_stats'] = {
            'post_count': post_count,
            'recent_posts': [{
                'id': post.id,
                'topic_id': post.topic.id,
                'topic_title': post.topic.title,
                'title': post.topic.title,
                'content': post.content[:200] if len(post.content) > 200 else post.content,
                'created_at': post.created_at.isoformat(),
            } for post in recent_posts]
        }
    except:
        profile_data['forum_stats'] = None
    
    return Response(profile_data)
