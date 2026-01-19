from django.contrib.auth import get_user_model
from djoser.serializers import UserCreateSerializer
from rest_framework import serializers

User = get_user_model()


class CustomUserCreateSerializer(UserCreateSerializer):
    class Meta(UserCreateSerializer.Meta):
        fields = ('id', 'email', 'nickname', 'password')
        model = User


class CustomUserSerializer(serializers.ModelSerializer):
    """Custom serializer that explicitly includes is_staff but NEVER exposes mfa_secret"""
    class Meta:
        model = User
        fields = ('id', 'email', 'nickname', 'avatar', 'is_verified', 'is_blocked', 'is_staff', 'is_superuser', 'mfa_enabled', 'created_at')
        read_only_fields = ('id', 'email', 'is_verified', 'is_blocked', 'is_staff', 'is_superuser', 'mfa_enabled', 'created_at')
        # CRITICAL: mfa_secret is NOT in fields - never expose this!


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=12)
    password_confirm = serializers.CharField(write_only=True)
    captcha_token = serializers.CharField(write_only=True)
    captcha_answer = serializers.IntegerField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'nickname', 'password', 'password_confirm', 'captcha_token', 'captcha_answer']

    def validate_email(self, value):
        # Don't reveal if email exists (prevent user enumeration)
        # Instead, silently handle in create()
        if not value or '@' not in value:
            raise serializers.ValidationError('Invalid email address')
        return value.lower()

    def validate_nickname(self, value):
        if len(value) < 3:
            raise serializers.ValidationError('Nickname must be at least 3 characters')
        if User.objects.filter(nickname=value).exists():
            raise serializers.ValidationError('Nickname already exists')
        return value

    def validate(self, data):
        # Check passwords match
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        
        # Password complexity check
        password = data['password']
        if not any(c.isupper() for c in password):
            raise serializers.ValidationError({'password': 'Password must contain at least one uppercase letter'})
        if not any(c.islower() for c in password):
            raise serializers.ValidationError({'password': 'Password must contain at least one lowercase letter'})
        if not any(c.isdigit() for c in password):
            raise serializers.ValidationError({'password': 'Password must contain at least one number'})
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password):
            raise serializers.ValidationError({'password': 'Password must contain at least one special character'})
        
        # Verify captcha
        from users.services.captcha import captcha_service
        is_valid, message = captcha_service.verify_captcha(
            data['captcha_token'], 
            data['captcha_answer']
        )
        if not is_valid:
            raise serializers.ValidationError({'captcha_answer': message})
        
        return data

    def create(self, validated_data):
        # Remove extra fields
        validated_data.pop('password_confirm', None)
        validated_data.pop('captcha_token', None)
        validated_data.pop('captcha_answer', None)
        
        # Check if email already exists (prevent enumeration by not revealing)
        email = validated_data['email'].lower()
        if User.objects.filter(email=email).exists():
            # Return existing user but don't reveal it exists
            return User.objects.get(email=email)
        
        user = User.objects.create_user(
            email=email,
            nickname=validated_data['nickname'],
            password=validated_data['password'],
            is_verified=False  # Requires admin approval
        )
        return user


class MFASetupSerializer(serializers.Serializer):
    """Serializer for MFA setup response."""
    qr_code = serializers.CharField()
    secret = serializers.CharField()


class MFAVerifySerializer(serializers.Serializer):
    """Serializer for MFA code verification."""
    code = serializers.CharField(max_length=6, min_length=6)


class GameSimpleSerializer(serializers.Serializer):
    """Simple game serializer for profile."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    slug = serializers.CharField()
    image = serializers.ImageField()


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile with all details."""
    favorite_games = serializers.ListField(
        child=serializers.CharField(),
        read_only=True
    )
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'nickname', 'first_name', 'last_name', 'full_name',
            'avatar', 'favorite_games', 'is_streamer', 'stream_url', 'youtube_url', 'kick_url', 'discord_url',
            'is_staff', 'is_superuser', 'mfa_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'email', 'is_staff', 'is_superuser', 'mfa_enabled', 'created_at', 'updated_at']


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    favorite_games = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = User
        fields = ['nickname', 'first_name', 'last_name', 'favorite_games', 'is_streamer', 'stream_url', 'youtube_url', 'kick_url', 'discord_url']
    
    def validate_nickname(self, value):
        user = self.instance
        if User.objects.filter(nickname=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError('Nickname already exists')
        if len(value) < 3:
            raise serializers.ValidationError('Nickname must be at least 3 characters')
        return value
    
    def validate_favorite_games(self, value):
        if len(value) > 10:
            raise serializers.ValidationError('Maximum 10 favorite games allowed')
        # Clean up: strip whitespace and remove duplicates while preserving order
        seen = set()
        cleaned = []
        for game in value:
            game = game.strip()
            if game and game.lower() not in seen:
                seen.add(game.lower())
                cleaned.append(game)
        return cleaned
    
    def validate(self, data):
        # If is_streamer is True, stream_url is required
        if data.get('is_streamer') and not data.get('stream_url'):
            raise serializers.ValidationError({'stream_url': 'Stream URL is required for streamers'})
        # If is_streamer is False, clear stream_url
        if not data.get('is_streamer', self.instance.is_streamer):
            data['stream_url'] = None
        return data
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
