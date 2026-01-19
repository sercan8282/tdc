from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.conf import settings
from django.utils.text import slugify
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
import os


def rank_image_path(instance, filename):
    """Generate upload path for rank images."""
    ext = filename.split('.')[-1]
    return f'ranks/{instance.slug}.{ext}'


class UserRank(models.Model):
    """Military-style ranks based on user activity."""
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    min_points = models.IntegerField(default=0)
    chevrons = models.IntegerField(default=0, help_text='Number of chevrons (1-5)')
    icon = models.CharField(max_length=50, blank=True, help_text='Icon class or emoji')
    image = models.ImageField(upload_to=rank_image_path, blank=True, null=True, help_text='Custom rank image (will be resized to 64x64)')
    color = models.CharField(max_length=20, default='gray', help_text='Tailwind color name')
    order = models.IntegerField(default=0)
    
    RANK_IMAGE_SIZE = (64, 64)  # Size for rank icons
    
    class Meta:
        ordering = ['order', 'min_points']
    
    def __str__(self):
        return f"{self.name} ({self.min_points}+ pts)"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        
        # Resize image if uploaded
        if self.image:
            self._resize_image()
        
        super().save(*args, **kwargs)
    
    def _resize_image(self):
        """Resize the uploaded image to RANK_IMAGE_SIZE."""
        try:
            img = Image.open(self.image)
            
            # Convert to RGB if necessary (for PNG with transparency, use RGBA)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Keep transparency for PNG
                img = img.convert('RGBA')
                format_to_save = 'PNG'
                ext = 'png'
            else:
                img = img.convert('RGB')
                format_to_save = 'JPEG'
                ext = 'jpg'
            
            # Resize with high quality
            img.thumbnail(self.RANK_IMAGE_SIZE, Image.Resampling.LANCZOS)
            
            # Create a new image with exact size (centered)
            new_img = Image.new(img.mode, self.RANK_IMAGE_SIZE, (0, 0, 0, 0) if img.mode == 'RGBA' else (255, 255, 255))
            
            # Calculate position to center
            x = (self.RANK_IMAGE_SIZE[0] - img.width) // 2
            y = (self.RANK_IMAGE_SIZE[1] - img.height) // 2
            new_img.paste(img, (x, y))
            
            # Save to BytesIO
            buffer = BytesIO()
            new_img.save(buffer, format=format_to_save, quality=95)
            buffer.seek(0)
            
            # Generate new filename
            filename = f"{self.slug}.{ext}"
            
            # Replace the image file
            self.image.save(filename, ContentFile(buffer.read()), save=False)
            
        except Exception as e:
            print(f"Error resizing rank image: {e}")
    
    @classmethod
    def get_rank_for_points(cls, points):
        """Get the appropriate rank for a given point total."""
        return cls.objects.filter(min_points__lte=points).order_by('-min_points').first()


class UserForumStats(models.Model):
    """Track user activity and points for ranking."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='forum_stats'
    )
    total_topics = models.IntegerField(default=0)
    total_replies = models.IntegerField(default=0)
    total_likes_received = models.IntegerField(default=0)
    total_likes_given = models.IntegerField(default=0)
    points = models.IntegerField(default=0)
    
    class Meta:
        verbose_name_plural = 'User forum stats'
    
    def __str__(self):
        return f"Stats for {self.user.nickname}"
    
    def calculate_points(self):
        """Calculate total points: topics=10, replies=5, likes_received=2"""
        self.points = (
            self.total_topics * 10 +
            self.total_replies * 5 +
            self.total_likes_received * 2
        )
        return self.points
    
    def get_rank(self):
        """Get current rank based on points."""
        return UserRank.get_rank_for_points(self.points)
    
    def save(self, *args, **kwargs):
        self.calculate_points()
        super().save(*args, **kwargs)


class ForumCategory(models.Model):
    """Forum categories like Games, Hardware, etc."""
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text='Lucide icon name')
    color = models.CharField(max_length=20, default='blue', help_text='Tailwind color')
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = 'Forum categories'
        ordering = ['order', 'name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    @property
    def topic_count(self):
        return self.topics.count()
    
    @property
    def reply_count(self):
        return Reply.objects.filter(topic__category=self).count()
    
    @property
    def latest_activity(self):
        """Get the latest reply or topic in this category."""
        latest_reply = Reply.objects.filter(topic__category=self).order_by('-created_at').first()
        latest_topic = self.topics.order_by('-created_at').first()
        
        if latest_reply and latest_topic:
            return latest_reply if latest_reply.created_at > latest_topic.created_at else latest_topic
        return latest_reply or latest_topic


class Topic(models.Model):
    """Forum topics/threads within a category."""
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=320, blank=True)
    content = models.TextField()
    category = models.ForeignKey(ForumCategory, on_delete=models.CASCADE, related_name='topics')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='forum_topics'
    )
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    is_solved = models.BooleanField(default=False)
    views = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)[:300]
            self.slug = base_slug
            # Ensure unique slug
            counter = 1
            while Topic.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
                self.slug = f"{base_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)
    
    @property
    def reply_count(self):
        return self.replies.count()
    
    @property
    def last_reply(self):
        return self.replies.order_by('-created_at').first()


class Reply(models.Model):
    """Replies to topics with nested reply support."""
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='replies')
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='forum_replies'
    )
    content = models.TextField()
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        related_name='children', 
        blank=True, 
        null=True,
        help_text='Parent reply for nested threading'
    )
    mentioned_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='forum_mentions',
        help_text='Users mentioned with @username'
    )
    is_edited = models.BooleanField(default=False)
    is_solution = models.BooleanField(default=False, help_text='Marked as solution by topic author')
    likes_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name_plural = 'Replies'
    
    def __str__(self):
        return f"Reply by {self.author.nickname} in {self.topic.title}"
    
    @property
    def is_nested(self):
        return self.parent is not None
    
    @property
    def depth(self):
        """Calculate nesting depth (max 3 levels)."""
        depth = 0
        parent = self.parent
        while parent and depth < 3:
            depth += 1
            parent = parent.parent
        return depth


class ReplyLike(models.Model):
    """Likes on replies."""
    reply = models.ForeignKey(Reply, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='reply_likes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('reply', 'user')
    
    def __str__(self):
        return f"{self.user.nickname} likes reply #{self.reply.id}"


# Keep old models for backwards compatibility, but mark as deprecated
class Thread(models.Model):
    """DEPRECATED: Use Topic instead."""
    title = models.CharField(max_length=300)
    content = models.TextField()
    category = models.ForeignKey('core.Category', on_delete=models.CASCADE, related_name='forum_threads')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='forum_threads')
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title


class Post(models.Model):
    """DEPRECATED: Use Reply instead."""
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='posts')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='forum_posts')
    content = models.TextField()
    parent_post = models.ForeignKey('self', on_delete=models.CASCADE, related_name='replies', blank=True, null=True)
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Post by {self.author.email} in {self.thread.title}"


class Like(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='likes')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('user', 'content_type', 'object_id')

    def __str__(self):
        return f"{self.user.email} likes {self.content_type}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('mention', 'Mention'),
        ('reply', 'Reply'),
        ('like', 'Like'),
        ('solution', 'Solution'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notifier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications_sent')
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    message = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} for {self.user.email}"
