from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    UserRank, UserForumStats, ForumCategory, Topic, Reply, ReplyLike, Notification
)
import re

User = get_user_model()


class UserRankSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UserRank
        fields = ['id', 'name', 'slug', 'min_points', 'chevrons', 'icon', 'image', 'image_url', 'color']
        extra_kwargs = {
            'image': {'write_only': True, 'required': False},
        }
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class ForumUserSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for forum display."""
    rank = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'nickname', 'avatar_url', 'rank', 'stats', 'is_streamer', 'stream_url', 'created_at']
    
    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
    
    def get_rank(self, obj):
        try:
            stats = obj.forum_stats
            rank = stats.get_rank()
            if rank:
                return UserRankSerializer(rank, context=self.context).data
        except UserForumStats.DoesNotExist:
            pass
        # Return default recruit rank
        rank = UserRank.objects.filter(min_points=0).first()
        if rank:
            return UserRankSerializer(rank, context=self.context).data
        return None
    
    def get_stats(self, obj):
        try:
            stats = obj.forum_stats
            return {
                'total_topics': stats.total_topics,
                'total_replies': stats.total_replies,
                'points': stats.points,
            }
        except UserForumStats.DoesNotExist:
            return {
                'total_topics': 0,
                'total_replies': 0,
                'points': 0,
            }


class ForumCategoryListSerializer(serializers.ModelSerializer):
    """Category list with counts."""
    topics_count = serializers.SerializerMethodField()
    replies_count = serializers.SerializerMethodField()
    latest_topic = serializers.SerializerMethodField()
    
    class Meta:
        model = ForumCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon', 'color', 
            'topics_count', 'replies_count', 'latest_topic'
        ]
    
    def get_topics_count(self, obj):
        return obj.topics.count()
    
    def get_replies_count(self, obj):
        return Reply.objects.filter(topic__category=obj).count()
    
    def get_latest_topic(self, obj):
        topic = obj.topics.order_by('-created_at').first()
        if topic:
            return {
                'id': topic.id,
                'title': topic.title,
                'slug': topic.slug,
                'author': topic.author.nickname,
                'created_at': topic.created_at,
            }
        return None


class ForumCategoryDetailSerializer(serializers.ModelSerializer):
    """Full category details for admin."""
    class Meta:
        model = ForumCategory
        fields = '__all__'


class ReplySerializer(serializers.ModelSerializer):
    """Reply serializer with author info."""
    author = ForumUserSerializer(read_only=True)
    is_liked = serializers.SerializerMethodField()
    mentioned_users = serializers.SerializerMethodField()
    quoted_reply = serializers.SerializerMethodField()
    is_own = serializers.SerializerMethodField()
    
    class Meta:
        model = Reply
        fields = [
            'id', 'content', 'author', 'parent', 'quoted_reply',
            'mentioned_users', 'is_edited', 'is_solution', 
            'likes_count', 'is_liked', 'is_own',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['author', 'is_edited', 'likes_count', 'created_at', 'updated_at']
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
    
    def get_mentioned_users(self, obj):
        return list(obj.mentioned_users.values_list('nickname', flat=True))
    
    def get_quoted_reply(self, obj):
        """Get the quoted/parent reply info for display."""
        if obj.parent:
            return {
                'id': obj.parent.id,
                'author': obj.parent.author.nickname,
                'content': obj.parent.content[:200] + ('...' if len(obj.parent.content) > 200 else ''),
                'created_at': obj.parent.created_at,
            }
        return None
    
    def get_is_own(self, obj):
        """Check if the current user is the author."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.author == request.user
        return False


class ReplyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating replies."""
    class Meta:
        model = Reply
        fields = ['content', 'parent']
    
    def validate_content(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError('Reply must be at least 3 characters.')
        return value
    
    def create(self, validated_data):
        request = self.context.get('request')
        topic = self.context.get('topic')
        
        reply = Reply.objects.create(
            topic=topic,
            author=request.user,
            **validated_data
        )
        
        # Parse @mentions and add to mentioned_users
        mentions = re.findall(r'@(\w+)', validated_data.get('content', ''))
        if mentions:
            mentioned = User.objects.filter(nickname__in=mentions)
            reply.mentioned_users.set(mentioned)
        
        # Update user stats
        stats, _ = UserForumStats.objects.get_or_create(user=request.user)
        stats.total_replies += 1
        stats.save()
        
        return reply


class TopicListSerializer(serializers.ModelSerializer):
    """Topic list serializer."""
    author = ForumUserSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    reply_count = serializers.SerializerMethodField()
    last_reply = serializers.SerializerMethodField()
    
    class Meta:
        model = Topic
        fields = [
            'id', 'title', 'slug', 'category', 'category_name', 'category_slug',
            'author', 'is_pinned', 'is_locked', 'is_solved',
            'views', 'reply_count', 'last_reply', 'created_at'
        ]
    
    def get_reply_count(self, obj):
        return obj.replies.count()
    
    def get_last_reply(self, obj):
        reply = obj.replies.order_by('-created_at').first()
        if reply:
            return {
                'author': reply.author.nickname,
                'created_at': reply.created_at,
            }
        return None


class TopicDetailSerializer(serializers.ModelSerializer):
    """Full topic detail with replies."""
    author = ForumUserSerializer(read_only=True)
    category = ForumCategoryListSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Topic
        fields = [
            'id', 'title', 'slug', 'content', 'category', 'author',
            'is_pinned', 'is_locked', 'is_solved', 'views',
            'reply_count', 'replies', 'created_at', 'updated_at'
        ]
    
    def get_reply_count(self, obj):
        return obj.replies.count()
    
    def get_replies(self, obj):
        # Get all replies in chronological order (flat list for quote-style display)
        replies = obj.replies.all().order_by('created_at')
        return ReplySerializer(replies, many=True, context=self.context).data


class TopicCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating topics."""
    class Meta:
        model = Topic
        fields = ['id', 'title', 'content', 'category']
        read_only_fields = ['id']
    
    def validate_title(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError('Title must be at least 5 characters.')
        return value
    
    def validate_content(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError('Content must be at least 10 characters.')
        return value
    
    def create(self, validated_data):
        request = self.context.get('request')
        topic = Topic.objects.create(
            author=request.user,
            **validated_data
        )
        
        # Update user stats
        stats, _ = UserForumStats.objects.get_or_create(user=request.user)
        stats.total_topics += 1
        stats.save()
        
        return topic


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer."""
    notifier = ForumUserSerializer(read_only=True)
    topic_id = serializers.SerializerMethodField()
    topic_title = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'notifier', 'message',
            'is_read', 'created_at', 'topic_id', 'topic_title'
        ]
    
    def get_topic_id(self, obj):
        """Get the topic ID from the related reply or topic."""
        if obj.content_type.model == 'reply':
            try:
                reply = Reply.objects.get(pk=obj.object_id)
                return reply.topic.id
            except Reply.DoesNotExist:
                pass
        elif obj.content_type.model == 'topic':
            return obj.object_id
        return None
    
    def get_topic_title(self, obj):
        """Get the topic title from the related reply or topic."""
        if obj.content_type.model == 'reply':
            try:
                reply = Reply.objects.get(pk=obj.object_id)
                return reply.topic.title
            except Reply.DoesNotExist:
                pass
        elif obj.content_type.model == 'topic':
            try:
                topic = Topic.objects.get(pk=obj.object_id)
                return topic.title
            except Topic.DoesNotExist:
                pass
        return None
