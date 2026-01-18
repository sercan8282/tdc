"""
Authentication views for registration, captcha, and MFA.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model

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
        'secret': user.mfa_secret,  # Allow manual entry
        'message': 'Scan this QR code with your authenticator app'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_verify(request):
    """Verify MFA code and enable MFA for the user."""
    user = request.user
    code = request.data.get('code')
    
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
        return Response({
            'message': 'MFA enabled successfully',
            'user': CustomUserSerializer(user).data
        })
    
    return Response(
        {'error': 'Invalid MFA code'},
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mfa_disable(request):
    """Disable MFA for the user (requires current MFA code)."""
    user = request.user
    code = request.data.get('code')
    
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
        return Response({
            'message': 'MFA disabled successfully',
            'user': CustomUserSerializer(user).data
        })
    
    return Response(
        {'error': 'Invalid MFA code'},
        status=status.HTTP_400_BAD_REQUEST
    )


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
