from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import Game, Category, Weapon, Attachment, GameSettingDefinition, GameSettingProfile
from forum.models import Thread, Post, Notification, Like

User = get_user_model()


# User Serializers
class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'nickname', 'avatar', 'is_blocked', 'is_verified', 'is_staff', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'nickname', 'is_blocked', 'is_verified', 'is_staff']


# Core Serializers
class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'name', 'weapon', 'type', 'image', 'created_at']
        read_only_fields = ['created_at']


class WeaponSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)
    game_slug = serializers.CharField(source='category.game.slug', read_only=True)
    category_slug = serializers.SlugField(source='category.name', read_only=True)

    class Meta:
        model = Weapon
        fields = ['id', 'name', 'category', 'image', 'text_color', 'image_size', 'attachments', 'game_slug', 'category_slug', 'created_at']
        read_only_fields = ['created_at']


class CategorySerializer(serializers.ModelSerializer):
    weapons = WeaponSerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'game', 'weapons', 'created_at']
        read_only_fields = ['created_at']


class GameSerializer(serializers.ModelSerializer):
    categories = CategorySerializer(many=True, read_only=True)

    class Meta:
        model = Game
        fields = ['id', 'name', 'slug', 'description', 'image', 'is_active', 'categories']


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
