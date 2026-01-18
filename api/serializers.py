from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import Game, Category, Weapon, Attachment, AttachmentType, GameSettingDefinition, GameSettingProfile
from forum.models import Thread, Post, Notification, Like

User = get_user_model()


# User Serializers
class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'nickname', 'avatar', 'is_blocked', 'is_verified', 'is_staff', 'is_superuser', 'is_active', 'banned_until', 'mfa_enabled', 'created_at']
        read_only_fields = ['created_at']


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'nickname', 'is_blocked', 'is_verified', 'is_staff', 'is_superuser', 'is_active', 'banned_until', 'created_at']


# Attachment Type Serializer
class AttachmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttachmentType
        fields = ['id', 'name', 'display_name', 'order', 'created_at']
        read_only_fields = ['created_at']


# Core Serializers
class AttachmentSerializer(serializers.ModelSerializer):
    type_name = serializers.CharField(read_only=True)
    attachment_type_name = serializers.CharField(source='attachment_type.display_name', read_only=True)
    weapon_name = serializers.CharField(source='weapon.name', read_only=True)

    class Meta:
        model = Attachment
        fields = ['id', 'name', 'weapon', 'weapon_name', 'attachment_type', 'type', 'type_name', 'attachment_type_name', 'image', 'created_at']
        read_only_fields = ['created_at', 'type_name', 'attachment_type_name', 'weapon_name']


class WeaponSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    game_slug = serializers.CharField(source='category.game.slug', read_only=True)
    category_slug = serializers.SlugField(source='category.name', read_only=True)

    class Meta:
        model = Weapon
        fields = ['id', 'name', 'category', 'image', 'text_color', 'image_size', 'is_active', 'attachments', 'game_slug', 'category_slug', 'created_at']
        read_only_fields = ['created_at']


class CategorySerializer(serializers.ModelSerializer):
    weapons = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'game', 'weapons', 'created_at']
        read_only_fields = ['created_at']

    def get_weapons(self, obj):
        """Only return active weapons for public API"""
        request = self.context.get('request')
        is_admin = request and request.user and request.user.is_staff
        show_all = request and request.query_params.get('all', 'false').lower() == 'true'
        
        if is_admin and show_all:
            weapons = obj.weapons.all()
        else:
            weapons = obj.weapons.filter(is_active=True)
        
        return WeaponSerializer(weapons, many=True, context=self.context).data


class GameSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)
    is_shooter = serializers.BooleanField(read_only=True)
    can_fetch_weapons = serializers.SerializerMethodField()

    class Meta:
        model = Game
        fields = ['id', 'name', 'slug', 'description', 'image', 'is_active', 'game_type', 'is_shooter', 'can_fetch_weapons', 'categories']

    def get_can_fetch_weapons(self, obj):
        """Check if this game supports automatic weapon fetching"""
        try:
            from core.services.weapon_fetch import weapon_fetch_service
            return weapon_fetch_service.can_fetch_weapons(obj)
        except:
            return False


# Game Settings Serializers
class GameSettingDefinitionSerializer(serializers.ModelSerializer):
    game_name = serializers.CharField(source='game.name', read_only=True)

    class Meta:
        model = GameSettingDefinition
        fields = ['id', 'game', 'game_name', 'name', 'display_name', 'field_type', 'category', 
                  'options', 'min_value', 'max_value', 'default_value', 'order', 'created_at']
        read_only_fields = ['created_at']


class GameSettingProfileSerializer(serializers.ModelSerializer):
    game_name = serializers.CharField(source='game.name', read_only=True)

    class Meta:
        model = GameSettingProfile
        fields = ['id', 'game', 'game_name', 'name', 'description', 'processor_type', 'ram', 'graphic_card', 'values', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


# Forum Serializers
class PostSerializer(serializers.ModelSerializer):
    author_nickname = serializers.CharField(source='author.nickname', read_only=True)
    author_avatar = serializers.CharField(source='author.avatar', read_only=True)

    class Meta:
        model = Post
        fields = ['id', 'content', 'author', 'author_nickname', 'author_avatar', 'thread', 'parent_post', 'is_edited', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ThreadSerializer(serializers.ModelSerializer):
    posts = PostSerializer(many=True, read_only=True)
    author_nickname = serializers.CharField(source='author.nickname', read_only=True)
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = ['id', 'title', 'content', 'category', 'author', 'author_nickname', 'is_pinned', 'is_locked', 'posts', 'post_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_post_count(self, obj):
        return obj.posts.count()


class ThreadListSerializer(serializers.ModelSerializer):
    author_nickname = serializers.CharField(source='author.nickname', read_only=True)
    post_count = serializers.SerializerMethodField()

    class Meta:
        model = Thread
        fields = ['id', 'title', 'category', 'author_nickname', 'is_pinned', 'is_locked', 'post_count', 'created_at']

    def get_post_count(self, obj):
        return obj.posts.count()


class NotificationSerializer(serializers.ModelSerializer):
    notifier_nickname = serializers.CharField(source='notifier.nickname', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'notifier', 'notifier_nickname', 'is_read', 'created_at']
        read_only_fields = ['created_at']
