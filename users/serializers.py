from django.contrib.auth import get_user_model
from djoser.serializers import UserCreateSerializer
from rest_framework import serializers

User = get_user_model()


class CustomUserCreateSerializer(UserCreateSerializer):
    class Meta(UserCreateSerializer.Meta):
        fields = ('id', 'email', 'nickname', 'password')
        model = User


class CustomUserSerializer(serializers.ModelSerializer):
    """Custom serializer that explicitly includes is_staff"""
    class Meta:
        model = User
        fields = ('id', 'email', 'nickname', 'avatar', 'is_verified', 'is_blocked', 'is_staff', 'is_superuser', 'created_at')
        read_only_fields = ('id', 'is_verified', 'is_blocked', 'is_staff', 'is_superuser', 'created_at')


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'nickname', 'password']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already exists')
        return value

    def validate_nickname(self, value):
        if User.objects.filter(nickname=value).exists():
            raise serializers.ValidationError('Nickname already exists')
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            nickname=validated_data['nickname'],
            password=validated_data['password']
        )
        return user
