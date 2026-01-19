"""
Video models for Netflix-style video platform.
Includes security measures and statistics tracking.
"""
from django.db import models
from django.conf import settings
from django.core.validators import FileExtensionValidator, MaxLengthValidator
from django.core.exceptions import ValidationError
import os
import uuid


def video_upload_path(instance, filename):
    """Generate secure upload path for videos."""
    ext = filename.split('.')[-1].lower()
    new_filename = f"{uuid.uuid4()}.{ext}"
    return f"videos/files/{new_filename}"


def cover_upload_path(instance, filename):
    """Generate secure upload path for video covers."""
    ext = filename.split('.')[-1].lower()
    new_filename = f"{uuid.uuid4()}.{ext}"
    return f"videos/covers/{new_filename}"


def validate_video_file_size(value):
    """Validate video file size (max 500MB)."""
    max_size = 500 * 1024 * 1024  # 500MB
    if value.size > max_size:
        raise ValidationError(f'Video file too large. Maximum size is 500MB.')


def validate_cover_file_size(value):
    """Validate cover image file size (max 5MB)."""
    max_size = 5 * 1024 * 1024  # 5MB
    if value.size > max_size:
        raise ValidationError(f'Cover image too large. Maximum size is 5MB.')


class VideoTag(models.Model):
    """
    Hashtag model for video categorization.
    Tags are managed by admins and can be assigned to videos.
    """
    name = models.CharField(
        max_length=50,
        unique=True,
        help_text="Tag name without the # symbol"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of what this tag represents"
    )
    color = models.CharField(
        max_length=7,
        default="#3B82F6",
        help_text="Hex color code for the tag badge"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this tag is available for use"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "Video Tag"
        verbose_name_plural = "Video Tags"
    
    def __str__(self):
        return f"#{self.name}"
    
    def clean(self):
        # Remove # if present and convert to lowercase
        if self.name.startswith('#'):
            self.name = self.name[1:]
        self.name = self.name.lower().strip()
        
        # Validate tag name (alphanumeric and underscores only)
        if not self.name.replace('_', '').isalnum():
            raise ValidationError("Tag name can only contain letters, numbers, and underscores")


class TagProfile(models.Model):
    """
    Tag Profile - a collection of tags that can be applied to videos at once.
    Makes it easy to apply common tag combinations.
    """
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Profile name, e.g., 'Gaming Content', 'Nature Videos'"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of this tag profile"
    )
    tags = models.ManyToManyField(
        VideoTag,
        related_name='profiles',
        help_text="Tags included in this profile"
    )
    color = models.CharField(
        max_length=7,
        default="#8B5CF6",
        help_text="Hex color code for the profile badge"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this profile is available for use"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "Tag Profile"
        verbose_name_plural = "Tag Profiles"
    
    def __str__(self):
        return self.name
    
    @property
    def tag_count(self):
        return self.tags.count()
    
    @property
    def tag_names(self):
        return list(self.tags.values_list('name', flat=True))


class Video(models.Model):
    """
    Main video model with all metadata and relationships.
    Supports both uploaded files and embedded videos from YouTube, Twitch, Kick.
    """
    VIDEO_SOURCE_CHOICES = [
        ('upload', 'Uploaded File'),
        ('youtube', 'YouTube'),
        ('twitch', 'Twitch'),
        ('kick', 'Kick'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    title = models.CharField(
        max_length=200,
        validators=[MaxLengthValidator(200)]
    )
    description = models.TextField(
        blank=True,
        max_length=5000,
        validators=[MaxLengthValidator(5000)],
        help_text="Video description (max 5000 characters)"
    )
    video_file = models.FileField(
        upload_to=video_upload_path,
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['mp4', 'webm', 'mov', 'avi', 'mkv']),
            validate_video_file_size
        ],
        help_text="Supported formats: MP4, WebM, MOV, AVI, MKV. Max size: 500MB"
    )
    embed_url = models.URLField(
        blank=True,
        null=True,
        max_length=500,
        help_text="YouTube, Twitch, or Kick video URL"
    )
    video_source = models.CharField(
        max_length=20,
        choices=VIDEO_SOURCE_CHOICES,
        default='upload',
        help_text="Source of the video"
    )
    cover_image = models.ImageField(
        upload_to=cover_upload_path,
        blank=True,
        null=True,
        validators=[
            FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp']),
            validate_cover_file_size
        ],
        help_text="Cover image for the video. Supported formats: JPG, PNG, WebP. Max size: 5MB"
    )
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_videos'
    )
    tags = models.ManyToManyField(
        VideoTag,
        blank=True,
        related_name='videos',
        help_text="Maximum 50 tags per video"
    )
    
    # Statistics (cached for performance)
    view_count = models.PositiveIntegerField(default=0)
    unique_view_count = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)
    dislike_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this video is visible to users"
    )
    is_featured = models.BooleanField(
        default=False,
        help_text="Featured videos appear at the top"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Video"
        verbose_name_plural = "Videos"
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['is_active', '-created_at']),
            models.Index(fields=['is_featured', '-created_at']),
        ]
    
    def __str__(self):
        return self.title
    
    def clean(self):
        from django.core.exceptions import ValidationError
        # Require either video_file or embed_url
        if not self.video_file and not self.embed_url:
            raise ValidationError("Either a video file or embed URL is required.")
        if self.video_file and self.embed_url:
            raise ValidationError("Provide either a video file or embed URL, not both.")
        
        # Auto-detect video source from embed_url
        if self.embed_url:
            self.video_source = self.detect_video_source(self.embed_url)
            if self.video_source == 'upload':
                raise ValidationError("Invalid embed URL. Supported: YouTube, Twitch, Kick.")
    
    def save(self, *args, **kwargs):
        # Auto-detect video source if embed_url is set
        if self.embed_url and self.video_source == 'upload':
            self.video_source = self.detect_video_source(self.embed_url)
        elif self.video_file and not self.embed_url:
            self.video_source = 'upload'
        super().save(*args, **kwargs)
    
    @staticmethod
    def detect_video_source(url):
        """Detect the video source from URL."""
        import re
        if not url:
            return 'upload'
        
        url_lower = url.lower()
        if 'youtube.com' in url_lower or 'youtu.be' in url_lower:
            return 'youtube'
        elif 'twitch.tv' in url_lower:
            return 'twitch'
        elif 'kick.com' in url_lower:
            return 'kick'
        return 'upload'
    
    def get_embed_id(self):
        """Extract the video ID from the embed URL."""
        import re
        if not self.embed_url:
            return None
        
        url = self.embed_url
        
        if self.video_source == 'youtube':
            # Handle various YouTube URL formats
            patterns = [
                r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
                r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})',
            ]
            for pattern in patterns:
                match = re.search(pattern, url)
                if match:
                    return match.group(1)
        
        elif self.video_source == 'twitch':
            # Handle Twitch video and clip URLs
            # Videos: twitch.tv/videos/123456789
            # Clips: twitch.tv/channel/clip/ClipName or clips.twitch.tv/ClipName
            video_match = re.search(r'twitch\.tv/videos/(\d+)', url)
            if video_match:
                return ('video', video_match.group(1))
            
            clip_match = re.search(r'(?:clips\.twitch\.tv/|twitch\.tv/\w+/clip/)([a-zA-Z0-9_-]+)', url)
            if clip_match:
                return ('clip', clip_match.group(1))
            
            # Live channel: twitch.tv/channel_name
            channel_match = re.search(r'twitch\.tv/([a-zA-Z0-9_]+)(?:\?|$|/(?!videos|clip))', url)
            if channel_match:
                return ('channel', channel_match.group(1))
        
        elif self.video_source == 'kick':
            # Handle Kick video URLs
            # Format 1: kick.com/channel/videos/video-uuid (VOD recordings)
            # Format 2: kick.com/video/abc123
            # Format 3: kick.com/channel?video=abc123
            
            # VOD format: kick.com/channel/videos/uuid
            vod_match = re.search(r'kick\.com/[^/]+/videos/([a-zA-Z0-9_-]+)', url)
            if vod_match:
                return ('vod', vod_match.group(1))
            
            # Direct video format: kick.com/video/id
            video_match = re.search(r'kick\.com/video/([a-zA-Z0-9_-]+)', url)
            if video_match:
                return ('vod', video_match.group(1))
            
            # Query param format: kick.com/channel?video=id
            query_match = re.search(r'kick\.com/[^?]+\?video=([a-zA-Z0-9_-]+)', url)
            if query_match:
                return ('vod', query_match.group(1))
            
            # Live channel: kick.com/channel_name
            channel_match = re.search(r'kick\.com/([a-zA-Z0-9_]+)(?:\?|$|/(?!videos))', url)
            if channel_match:
                return ('channel', channel_match.group(1))
        
        return None
    
    def get_embed_html(self):
        """Get the HTML embed code for the video."""
        embed_id = self.get_embed_id()
        if not embed_id:
            return None
        
        if self.video_source == 'youtube':
            return f'https://www.youtube.com/embed/{embed_id}'
        
        elif self.video_source == 'twitch':
            if isinstance(embed_id, tuple):
                embed_type, embed_value = embed_id
                if embed_type == 'video':
                    return f'https://player.twitch.tv/?video={embed_value}&parent={{parent}}'
                elif embed_type == 'clip':
                    return f'https://clips.twitch.tv/embed?clip={embed_value}&parent={{parent}}'
                elif embed_type == 'channel':
                    return f'https://player.twitch.tv/?channel={embed_value}&parent={{parent}}'
        
        elif self.video_source == 'kick':
            if isinstance(embed_id, tuple):
                embed_type, embed_value = embed_id
                if embed_type == 'vod':
                    # VOD videos use video/ prefix
                    return f'https://player.kick.com/video/{embed_value}'
                elif embed_type == 'channel':
                    # Live channels
                    return f'https://player.kick.com/{embed_value}'
            # Fallback for old data
            return f'https://player.kick.com/video/{embed_id}'
        
        return None
    
    def delete(self, *args, **kwargs):
        # Delete associated files
        if self.video_file:
            if os.path.isfile(self.video_file.path):
                os.remove(self.video_file.path)
        if self.cover_image:
            if os.path.isfile(self.cover_image.path):
                os.remove(self.cover_image.path)
        super().delete(*args, **kwargs)
    
    def update_statistics(self):
        """Update cached statistics from related models."""
        self.view_count = self.views.count()
        self.unique_view_count = self.views.values('user', 'ip_address').distinct().count()
        self.like_count = self.reactions.filter(reaction_type='like').count()
        self.dislike_count = self.reactions.filter(reaction_type='dislike').count()
        self.comment_count = self.comments.filter(is_active=True).count()
        self.save(update_fields=['view_count', 'unique_view_count', 'like_count', 'dislike_count', 'comment_count'])


class VideoView(models.Model):
    """
    Track video views for statistics.
    Records both unique views (per user/IP) and total play count.
    """
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='views'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='video_views'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="For anonymous view tracking"
    )
    viewed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-viewed_at']
        verbose_name = "Video View"
        verbose_name_plural = "Video Views"
        indexes = [
            models.Index(fields=['video', '-viewed_at']),
            models.Index(fields=['user', 'video']),
        ]
    
    def __str__(self):
        return f"{self.video.title} - View at {self.viewed_at}"


class VideoReaction(models.Model):
    """
    Like/Dislike reactions on videos.
    One reaction per user per video.
    """
    REACTION_CHOICES = [
        ('like', 'Like'),
        ('dislike', 'Dislike'),
    ]
    
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='reactions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='video_reactions'
    )
    reaction_type = models.CharField(
        max_length=10,
        choices=REACTION_CHOICES
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['video', 'user']
        ordering = ['-created_at']
        verbose_name = "Video Reaction"
        verbose_name_plural = "Video Reactions"
    
    def __str__(self):
        return f"{self.user.nickname} {self.reaction_type}d {self.video.title}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update video statistics
        self.video.update_statistics()
    
    def delete(self, *args, **kwargs):
        video = self.video
        super().delete(*args, **kwargs)
        # Update video statistics
        video.update_statistics()


class VideoComment(models.Model):
    """
    Comments on videos with moderation support.
    """
    video = models.ForeignKey(
        Video,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='video_comments'
    )
    content = models.TextField(
        max_length=2000,
        validators=[MaxLengthValidator(2000)],
        help_text="Comment text (max 2000 characters)"
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies',
        help_text="Parent comment for replies"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this comment is visible"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Video Comment"
        verbose_name_plural = "Video Comments"
        indexes = [
            models.Index(fields=['video', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.nickname}: {self.content[:50]}..."
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update video statistics
        self.video.update_statistics()
    
    def delete(self, *args, **kwargs):
        video = self.video
        super().delete(*args, **kwargs)
        # Update video statistics
        video.update_statistics()

