from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.files.storage import default_storage
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
import os
import logging
from .models import (
    UserRank, UserForumStats, ForumCategory, Topic, Reply, ReplyLike, Notification
)
from .serializers import (
    UserRankSerializer, ForumCategoryListSerializer, ForumCategoryDetailSerializer,
    TopicListSerializer, TopicDetailSerializer, TopicCreateSerializer,
    ReplySerializer, ReplyCreateSerializer, NotificationSerializer, ForumUserSerializer
)
import re

User = get_user_model()
logger = logging.getLogger(__name__)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow read for everyone, write only for admins."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class UserRankViewSet(viewsets.ModelViewSet):
    """List all available ranks. Admins can create/edit/delete."""
    queryset = UserRank.objects.all().order_by('min_points')
    serializer_class = UserRankSerializer
    permission_classes = [IsAdminOrReadOnly]
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class ForumCategoryViewSet(viewsets.ModelViewSet):
    """Forum categories management."""
    queryset = ForumCategory.objects.filter(is_active=True).order_by('order')
    permission_classes = [IsAdminOrReadOnly]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ForumCategoryDetailSerializer
        return ForumCategoryListSerializer


class TopicViewSet(viewsets.ModelViewSet):
    """Forum topics/threads."""
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = Topic.objects.select_related('author', 'category')
        # Note: don't annotate reply_count as it conflicts with model property
        
        # Filter by category
        category_slug = self.request.query_params.get('category')
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        return queryset.order_by('-is_pinned', '-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TopicCreateSerializer
        if self.action in ['update', 'partial_update']:
            return TopicCreateSerializer
        if self.action == 'retrieve':
            return TopicDetailSerializer
        return TopicListSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        instance.views += 1
        instance.save(update_fields=['views'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        serializer.save()
    
    def update(self, request, *args, **kwargs):
        """Update a topic - only author or admin can edit."""
        topic = self.get_object()
        if topic.author != request.user and not request.user.is_staff:
            return Response({'error': 'You can only edit your own topics'}, status=403)
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a topic - only author or admin can delete."""
        topic = self.get_object()
        if topic.author != request.user and not request.user.is_staff:
            return Response({'error': 'You can only delete your own topics'}, status=403)
        
        # Update user stats
        try:
            stats = topic.author.forum_stats
            stats.total_topics = max(0, stats.total_topics - 1)
            stats.save()
        except UserForumStats.DoesNotExist:
            pass
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def pin(self, request, pk=None):
        """Pin/unpin a topic (admin only)."""
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        topic = self.get_object()
        topic.is_pinned = not topic.is_pinned
        topic.save()
        return Response({'is_pinned': topic.is_pinned})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def lock(self, request, pk=None):
        """Lock/unlock a topic (admin only)."""
        if not request.user.is_staff:
            return Response({'error': 'Admin only'}, status=403)
        topic = self.get_object()
        topic.is_locked = not topic.is_locked
        topic.save()
        return Response({'is_locked': topic.is_locked})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def solve(self, request, pk=None):
        """Mark topic as solved (author only)."""
        topic = self.get_object()
        if topic.author != request.user and not request.user.is_staff:
            return Response({'error': 'Only topic author can mark as solved'}, status=403)
        topic.is_solved = not topic.is_solved
        topic.save()
        return Response({'is_solved': topic.is_solved})


class ReplyViewSet(viewsets.ModelViewSet):
    """Replies to topics."""
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        topic_id = self.kwargs.get('topic_pk')
        if topic_id:
            return Reply.objects.filter(topic_id=topic_id).select_related('author', 'parent', 'parent__author')
        return Reply.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReplyCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ReplyCreateSerializer
        return ReplySerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        topic_id = self.kwargs.get('topic_pk')
        if topic_id:
            context['topic'] = get_object_or_404(Topic, pk=topic_id)
        return context
    
    def perform_create(self, serializer):
        """Save the reply and create notifications."""
        topic = get_object_or_404(Topic, pk=self.kwargs.get('topic_pk'))
        
        # Check if topic is locked
        if topic.is_locked:
            raise serializers.ValidationError({'error': 'This topic is locked'})
        
        # Save the reply
        reply = serializer.save()
        
        # Create notifications (wrapped in try-except to prevent reply creation from failing)
        try:
            content_type = ContentType.objects.get_for_model(Reply)
            
            # Detect @mentions in content
            mentions = re.findall(r'@(\w+)', reply.content)
            for mention in mentions:
                try:
                    mentioned_user = User.objects.get(nickname=mention)
                    # Don't notify yourself
                    if mentioned_user != self.request.user:
                        Notification.objects.create(
                            user=mentioned_user,
                            notifier=self.request.user,
                            notification_type='mention',
                            content_type=content_type,
                            object_id=reply.id,
                            message=f"@{self.request.user.nickname} mentioned you in {topic.title}"
                        )
                except User.DoesNotExist:
                    pass
            
            # Notify topic author if someone replied to their topic
            if reply.parent is None and topic.author != self.request.user:
                Notification.objects.create(
                    user=topic.author,
                    notifier=self.request.user,
                    notification_type='reply',
                    content_type=content_type,
                    object_id=reply.id,
                    message=f"{self.request.user.nickname} replied to your topic: {topic.title}"
                )
            
            # Notify parent reply author if someone replied to their reply
            if reply.parent and reply.parent.author != self.request.user:
                Notification.objects.create(
                    user=reply.parent.author,
                    notifier=self.request.user,
                    notification_type='reply',
                    content_type=content_type,
                    object_id=reply.id,
                    message=f"{self.request.user.nickname} replied to your comment in {topic.title}"
                )
        except Exception as e:
            # Log the error but don't fail the reply creation
            logger.error(f"Error creating notifications: {e}", exc_info=True)
            print(f"Error creating notifications: {e}")
    
    def update(self, request, *args, **kwargs):
        """Update a reply - only author or admin can edit."""
        reply = self.get_object()
        if reply.author != request.user and not request.user.is_staff:
            return Response({'error': 'You can only edit your own replies'}, status=403)
        
        # Mark as edited
        reply.is_edited = True
        reply.save(update_fields=['is_edited'])
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a reply - only author or admin can delete."""
        reply = self.get_object()
        if reply.author != request.user and not request.user.is_staff:
            return Response({'error': 'You can only delete your own replies'}, status=403)
        
        # Update user stats
        try:
            stats = reply.author.forum_stats
            stats.total_replies = max(0, stats.total_replies - 1)
            stats.save()
        except UserForumStats.DoesNotExist:
            pass
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, topic_pk=None, pk=None):
        """Like/unlike a reply."""
        reply = self.get_object()
        like, created = ReplyLike.objects.get_or_create(
            reply=reply,
            user=request.user
        )
        
        if not created:
            # Already liked, so unlike
            like.delete()
            reply.likes_count = max(0, reply.likes_count - 1)
            reply.save()
            
            # Update author stats
            if reply.author != request.user:
                try:
                    stats = reply.author.forum_stats
                    stats.total_likes_received = max(0, stats.total_likes_received - 1)
                    stats.save()
                except UserForumStats.DoesNotExist:
                    pass
            
            return Response({'liked': False, 'likes_count': reply.likes_count})
        
        # New like
        reply.likes_count += 1
        reply.save()
        
        # Update author stats
        if reply.author != request.user:
            stats, _ = UserForumStats.objects.get_or_create(user=reply.author)
            stats.total_likes_received += 1
            stats.save()
        
        return Response({'liked': True, 'likes_count': reply.likes_count})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_solution(self, request, topic_pk=None, pk=None):
        """Mark reply as solution (topic author only)."""
        reply = self.get_object()
        topic = reply.topic
        
        if topic.author != request.user and not request.user.is_staff:
            return Response({'error': 'Only topic author can mark solutions'}, status=403)
        
        # Unmark other solutions
        topic.replies.filter(is_solution=True).update(is_solution=False)
        
        reply.is_solution = True
        reply.save()
        
        topic.is_solved = True
        topic.save()
        
        return Response({'is_solution': True})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """User notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).select_related('notifier').order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read."""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'is_read': True})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read."""
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all marked as read'})


class ForumStatsViewSet(viewsets.ViewSet):
    """Forum statistics and leaderboard."""
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """Get top users by points."""
        limit = int(request.query_params.get('limit', 10))
        stats = UserForumStats.objects.select_related('user').order_by('-points')[:limit]
        
        result = []
        for stat in stats:
            rank = stat.get_rank()
            result.append({
                'user': ForumUserSerializer(stat.user, context={'request': request}).data,
                'points': stat.points,
                'rank': UserRankSerializer(rank).data if rank else None,
            })
        
        return Response(result)
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get forum overview stats."""
        return Response({
            'total_topics': Topic.objects.count(),
            'total_replies': Reply.objects.count(),
            'total_users': UserForumStats.objects.count(),
            'total_categories': ForumCategory.objects.filter(is_active=True).count(),
        })


class ForumImageUploadView(viewsets.ViewSet):
    """Handle image uploads for forum posts."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Upload and resize an image for forum posts."""
        if 'image' not in request.FILES:
            return Response({'error': 'No image provided'}, status=400)
        
        image_file = request.FILES['image']
        
        # Validate file size (max 10MB)
        if image_file.size > 10 * 1024 * 1024:
            return Response({'error': 'Image too large (max 10MB)'}, status=400)
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if image_file.content_type not in allowed_types:
            return Response({'error': 'Invalid image type'}, status=400)
        
        try:
            # Open image
            img = Image.open(image_file)
            
            # Convert RGBA to RGB if needed (for JPEG)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Keep original for PNG/GIF
                if image_file.content_type in ['image/png', 'image/gif']:
                    img = img.convert('RGBA')
                    format_to_save = 'PNG'
                    ext = 'png'
                else:
                    # Convert to RGB for JPEG
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'RGBA' or img.mode == 'LA':
                        background.paste(img, mask=img.split()[-1])
                    else:
                        background.paste(img)
                    img = background
                    format_to_save = 'JPEG'
                    ext = 'jpg'
            else:
                img = img.convert('RGB')
                format_to_save = 'JPEG'
                ext = 'jpg'
            
            # Save original (max 1920px width)
            max_width = 1920
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            # Save original
            original_buffer = BytesIO()
            img.save(original_buffer, format=format_to_save, quality=90)
            original_buffer.seek(0)
            
            # Generate filename
            import uuid
            filename = f"forum/{uuid.uuid4()}.{ext}"
            
            # Save original
            original_path = default_storage.save(filename, ContentFile(original_buffer.read()))
            original_url = request.build_absolute_uri(default_storage.url(original_path))
            
            # Create thumbnail (max 800px width)
            img_thumb = img.copy()
            thumb_max_width = 800
            if img_thumb.width > thumb_max_width:
                ratio = thumb_max_width / img_thumb.width
                new_height = int(img_thumb.height * ratio)
                img_thumb = img_thumb.resize((thumb_max_width, new_height), Image.Resampling.LANCZOS)
            
            # Save thumbnail
            thumb_buffer = BytesIO()
            img_thumb.save(thumb_buffer, format=format_to_save, quality=85)
            thumb_buffer.seek(0)
            
            thumb_filename = f"forum/thumb_{uuid.uuid4()}.{ext}"
            thumb_path = default_storage.save(thumb_filename, ContentFile(thumb_buffer.read()))
            thumb_url = request.build_absolute_uri(default_storage.url(thumb_path))
            
            return Response({
                'url': original_url,
                'thumbnail': thumb_url,
                'width': img.width,
                'height': img.height,
            })
            
        except Exception as e:
            return Response({'error': f'Failed to process image: {str(e)}'}, status=500)
