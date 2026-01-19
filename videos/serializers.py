"""
Serializers for video platform API.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Video, VideoTag, VideoView, VideoReaction, VideoComment, TagProfile

User = get_user_model()


class VideoTagSerializer(serializers.ModelSerializer):
    """Serializer for video tags."""
    video_count = serializers.SerializerMethodField()
    
    class Meta:
        model = VideoTag
        fields = ['id', 'name', 'description', 'color', 'is_active', 'video_count', 'created_at']
        read_only_fields = ['id', 'created_at', 'video_count']
    
    def get_video_count(self, obj):
        return obj.videos.filter(is_active=True).count()


class TagProfileSerializer(serializers.ModelSerializer):
    """Serializer for tag profiles."""
    tags = VideoTagSerializer(many=True, read_only=True)
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    tag_count = serializers.IntegerField(read_only=True)
    tag_names = serializers.ListField(read_only=True)
    
    class Meta:
        model = TagProfile
        fields = ['id', 'name', 'description', 'color', 'tags', 'tag_ids', 'tag_count', 'tag_names', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'tag_count', 'tag_names']
    
    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        profile = TagProfile.objects.create(**validated_data)
        if tag_ids:
            profile.tags.set(tag_ids)
        return profile
    
    def update(self, instance, validated_data):
        tag_ids = validated_data.pop('tag_ids', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tag_ids is not None:
            instance.tags.set(tag_ids)
        return instance


class VideoUploaderSerializer(serializers.ModelSerializer):
    """Minimal serializer for video uploader info."""
    class Meta:
        model = User
        fields = ['id', 'nickname', 'avatar']


class VideoCommentSerializer(serializers.ModelSerializer):
    """Serializer for video comments."""
    user = VideoUploaderSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    
    class Meta:
        model = VideoComment
        fields = [
            'id', 'user', 'content', 'parent', 'is_active',
            'replies', 'reply_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'is_active', 'created_at', 'updated_at']
    
    def get_replies(self, obj):
        # Only get top-level comments' replies (to avoid deep nesting)
        if obj.parent is None:
            replies = obj.replies.filter(is_active=True)[:5]
            return VideoCommentSerializer(replies, many=True).data
        return []
    
    def get_reply_count(self, obj):
        return obj.replies.filter(is_active=True).count()


class VideoListSerializer(serializers.ModelSerializer):
    """Serializer for video list (minimal data)."""
    uploader = VideoUploaderSerializer(read_only=True)
    tags = VideoTagSerializer(many=True, read_only=True)
    cover_url = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    embed_player_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Video
        fields = [
            'id', 'title', 'description', 'cover_url', 'uploader', 'tags',
            'view_count', 'unique_view_count', 'like_count', 'dislike_count',
            'comment_count', 'is_active', 'is_featured', 'user_reaction', 
            'video_source', 'embed_url', 'embed_player_url', 'created_at'
        ]
    
    def get_cover_url(self, obj):
        request = self.context.get('request')
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return None
    
    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            reaction = obj.reactions.filter(user=request.user).first()
            return reaction.reaction_type if reaction else None
        return None
    
    def get_embed_player_url(self, obj):
        """Get the embed player URL for external videos."""
        if obj.video_source != 'upload' and obj.embed_url:
            return obj.get_embed_html()
        return None


class VideoDetailSerializer(serializers.ModelSerializer):
    """Serializer for video detail (full data)."""
    uploader = VideoUploaderSerializer(read_only=True)
    tags = VideoTagSerializer(many=True, read_only=True)
    cover_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    embed_player_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Video
        fields = [
            'id', 'title', 'description', 'video_url', 'cover_url', 'uploader', 'tags',
            'view_count', 'unique_view_count', 'like_count', 'dislike_count',
            'comment_count', 'is_featured', 'user_reaction', 'comments',
            'video_source', 'embed_url', 'embed_player_url',
            'created_at', 'updated_at'
        ]
    
    def get_cover_url(self, obj):
        request = self.context.get('request')
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return None
    
    def get_video_url(self, obj):
        request = self.context.get('request')
        if obj.video_file and request:
            return request.build_absolute_uri(obj.video_file.url)
        return None
    
    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            reaction = obj.reactions.filter(user=request.user).first()
            return reaction.reaction_type if reaction else None
        return None
    
    def get_comments(self, obj):
        # Only top-level comments, paginated
        comments = obj.comments.filter(is_active=True, parent=None)[:20]
        return VideoCommentSerializer(comments, many=True).data
    
    def get_embed_player_url(self, obj):
        """Get the embed player URL for external videos."""
        if obj.video_source != 'upload' and obj.embed_url:
            return obj.get_embed_html()
        return None


class VideoUploadSerializer(serializers.ModelSerializer):
    """Serializer for video upload."""
    tag_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        max_length=50
    )
    video_file = serializers.FileField(required=False, allow_null=True)
    cover_image = serializers.ImageField(required=False, allow_null=True)
    embed_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    
    class Meta:
        model = Video
        fields = ['title', 'description', 'video_file', 'cover_image', 'embed_url', 'tag_ids']
    
    def validate_tag_ids(self, value):
        if len(value) > 50:
            raise serializers.ValidationError("Maximum 50 tags allowed per video.")
        # Verify all tags exist and are active
        tags = VideoTag.objects.filter(id__in=value, is_active=True)
        if len(tags) != len(value):
            raise serializers.ValidationError("One or more invalid or inactive tags.")
        return value
    
    def validate_embed_url(self, value):
        if value:
            # Validate that the URL is from a supported platform
            source = Video.detect_video_source(value)
            if source == 'upload':
                raise serializers.ValidationError(
                    "Invalid embed URL. Supported platforms: YouTube, Twitch, Kick."
                )
        return value
    
    def validate(self, data):
        video_file = data.get('video_file')
        embed_url = data.get('embed_url')
        
        # Require either video_file or embed_url
        if not video_file and not embed_url:
            raise serializers.ValidationError(
                "Either a video file or embed URL is required."
            )
        if video_file and embed_url:
            raise serializers.ValidationError(
                "Provide either a video file or embed URL, not both."
            )
        
        return data
    
    def create(self, validated_data):
        tag_ids = validated_data.pop('tag_ids', [])
        validated_data['uploader'] = self.context['request'].user
        
        # Auto-detect video source
        if validated_data.get('embed_url'):
            validated_data['video_source'] = Video.detect_video_source(validated_data['embed_url'])
        else:
            validated_data['video_source'] = 'upload'
        
        video = Video.objects.create(**validated_data)
        if tag_ids:
            video.tags.set(tag_ids)
        return video


class VideoReactionSerializer(serializers.ModelSerializer):
    """Serializer for video reactions."""
    class Meta:
        model = VideoReaction
        fields = ['id', 'reaction_type', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_reaction_type(self, value):
        if value not in ['like', 'dislike']:
            raise serializers.ValidationError("Reaction must be 'like' or 'dislike'")
        return value
