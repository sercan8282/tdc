"""
Video platform API views.
Secure endpoints with authentication and rate limiting.
"""
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.throttling import UserRateThrottle
from django.db.models import Q
from django.db import transaction
from django.utils.html import escape
import bleach

from .models import Video, VideoTag, VideoView, VideoReaction, VideoComment
from .serializers import (
    VideoListSerializer, VideoDetailSerializer, VideoUploadSerializer,
    VideoTagSerializer, VideoCommentSerializer, VideoReactionSerializer
)


# Rate limiting classes
class CommentRateThrottle(UserRateThrottle):
    """Limit comment posting to 10 per minute."""
    rate = '10/minute'


class UploadRateThrottle(UserRateThrottle):
    """Limit video uploads for staff members."""
    rate = '30/hour'  # Staff can upload 30 videos per hour
    scope = 'video_upload'


class ReactionRateThrottle(UserRateThrottle):
    """Limit reactions to 30 per minute."""
    rate = '30/minute'


def sanitize_text(text):
    """Sanitize text input to prevent XSS attacks."""
    if not text:
        return text
    # Allow only safe HTML tags, strip all others
    allowed_tags = []
    allowed_attrs = {}
    return bleach.clean(text, tags=allowed_tags, attributes=allowed_attrs, strip=True)


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class VideoPagination(PageNumberPagination):
    """Custom pagination for videos - default 40 per page."""
    page_size = 40
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminVideoPagination(PageNumberPagination):
    """Custom pagination for admin video list - 20 per page."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


class VideoListView(generics.ListAPIView):
    """
    List all active videos with pagination.
    Supports search, tag filtering, and sorting.
    """
    serializer_class = VideoListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = VideoPagination
    
    def get_queryset(self):
        queryset = Video.objects.filter(is_active=True).select_related('uploader').prefetch_related('tags')
        
        # Search query
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(tags__name__icontains=search.replace('#', '')) |
                Q(uploader__nickname__icontains=search)
            ).distinct()
        
        # Filter by tag
        tag = self.request.query_params.get('tag', '').strip()
        if tag:
            # Remove # if present
            tag = tag.replace('#', '')
            queryset = queryset.filter(tags__name__iexact=tag)
        
        # Filter by multiple tags
        tags = self.request.query_params.get('tags', '').strip()
        if tags:
            tag_list = [t.replace('#', '').strip() for t in tags.split(',')]
            queryset = queryset.filter(tags__name__in=tag_list).distinct()
        
        # Sort options
        sort = self.request.query_params.get('sort', '-created_at')
        valid_sorts = ['created_at', '-created_at', 'view_count', '-view_count', 
                       'like_count', '-like_count', 'title', '-title']
        if sort in valid_sorts:
            queryset = queryset.order_by(sort)
        
        # Featured first option
        if self.request.query_params.get('featured_first', '').lower() == 'true':
            queryset = queryset.order_by('-is_featured', sort)
        
        return queryset


class AdminVideoListView(generics.ListAPIView):
    """
    Admin video list with pagination (20 per page).
    Shows all videos including inactive ones.
    """
    serializer_class = VideoListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = AdminVideoPagination
    
    def get_queryset(self):
        if not self.request.user.is_staff:
            return Video.objects.none()
        
        queryset = Video.objects.all().select_related('uploader').prefetch_related('tags')
        
        # Search query
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(uploader__nickname__icontains=search)
            ).distinct()
        
        # Filter by active status
        active = self.request.query_params.get('active', '').strip().lower()
        if active == 'true':
            queryset = queryset.filter(is_active=True)
        elif active == 'false':
            queryset = queryset.filter(is_active=False)
        
        return queryset.order_by('-created_at')


class VideoDetailView(generics.RetrieveAPIView):
    """Get video details by ID."""
    serializer_class = VideoDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        return Video.objects.filter(is_active=True).select_related('uploader').prefetch_related('tags', 'comments')


class AdminVideoDetailView(generics.RetrieveAPIView):
    """Get video details by ID (admin - includes inactive)."""
    serializer_class = VideoDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        if not self.request.user.is_staff:
            return Video.objects.none()
        return Video.objects.all().select_related('uploader').prefetch_related('tags', 'comments')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([UploadRateThrottle])
def upload_video(request):
    """Upload a new video."""
    # Check if user is staff (only staff can upload)
    if not request.user.is_staff:
        return Response(
            {'error': 'Only staff members can upload videos'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    serializer = VideoUploadSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        video = serializer.save()
        return Response(
            VideoDetailSerializer(video, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_video(request, video_id):
    """Update an existing video (staff only)."""
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Update fields
    if 'title' in request.data:
        video.title = request.data['title']
    if 'description' in request.data:
        video.description = request.data['description']
    if 'is_active' in request.data:
        video.is_active = request.data['is_active']
    if 'is_featured' in request.data:
        video.is_featured = request.data['is_featured']
    
    video.save()
    
    # Update tags if provided
    if 'tag_ids' in request.data:
        tag_ids = request.data['tag_ids']
        if len(tag_ids) <= 50:
            video.tags.set(tag_ids)
    
    return Response(VideoDetailSerializer(video, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_view(request, video_id):
    """Record a video view for statistics."""
    try:
        video = Video.objects.get(id=video_id, is_active=True)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Create view record
    VideoView.objects.create(
        video=video,
        user=request.user,
        ip_address=get_client_ip(request)
    )
    
    # Update statistics
    video.update_statistics()
    
    return Response({
        'message': 'View recorded',
        'view_count': video.view_count,
        'unique_view_count': video.unique_view_count
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([ReactionRateThrottle])
def react_to_video(request, video_id):
    """Like or dislike a video."""
    try:
        video = Video.objects.get(id=video_id, is_active=True)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    
    reaction_type = request.data.get('reaction_type')
    if reaction_type not in ['like', 'dislike']:
        return Response(
            {'error': 'Invalid reaction type. Must be "like" or "dislike"'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    with transaction.atomic():
        # Check for existing reaction
        existing = VideoReaction.objects.filter(video=video, user=request.user).first()
        
        if existing:
            if existing.reaction_type == reaction_type:
                # Same reaction - remove it (toggle off)
                existing.delete()
                video.update_statistics()
                return Response({
                    'message': 'Reaction removed',
                    'user_reaction': None,
                    'like_count': video.like_count,
                    'dislike_count': video.dislike_count
                })
            else:
                # Different reaction - update it
                existing.reaction_type = reaction_type
                existing.save()
        else:
            # New reaction
            VideoReaction.objects.create(
                video=video,
                user=request.user,
                reaction_type=reaction_type
            )
        
        video.refresh_from_db()
        return Response({
            'message': f'Video {reaction_type}d',
            'user_reaction': reaction_type,
            'like_count': video.like_count,
            'dislike_count': video.dislike_count
        })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([CommentRateThrottle])
def video_comments(request, video_id):
    """Get or post comments on a video."""
    try:
        video = Video.objects.get(id=video_id, is_active=True)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        # Get comments with pagination
        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            page = 1
        per_page = 20
        offset = (page - 1) * per_page
        
        comments = video.comments.filter(is_active=True, parent=None).select_related('user')[offset:offset+per_page]
        total = video.comments.filter(is_active=True, parent=None).count()
        
        return Response({
            'comments': VideoCommentSerializer(comments, many=True).data,
            'total': total,
            'page': page,
            'total_pages': (total + per_page - 1) // per_page
        })
    
    elif request.method == 'POST':
        content = request.data.get('content', '').strip()
        parent_id = request.data.get('parent_id')
        
        if not content:
            return Response({'error': 'Comment content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(content) > 2000:
            return Response({'error': 'Comment too long (max 2000 characters)'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitize content to prevent XSS
        content = sanitize_text(content)
        
        parent = None
        if parent_id:
            try:
                parent_id = int(parent_id)
                parent = VideoComment.objects.get(id=parent_id, video=video, is_active=True)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid parent_id'}, status=status.HTTP_400_BAD_REQUEST)
            except VideoComment.DoesNotExist:
                return Response({'error': 'Parent comment not found'}, status=status.HTTP_404_NOT_FOUND)
        
        comment = VideoComment.objects.create(
            video=video,
            user=request.user,
            content=content,
            parent=parent
        )
        
        return Response(
            VideoCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment(request, comment_id):
    """Delete own comment or any comment if staff."""
    try:
        comment = VideoComment.objects.get(id=comment_id)
    except VideoComment.DoesNotExist:
        return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Only owner or staff can delete
    if comment.user != request.user and not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    video = comment.video
    comment.delete()
    
    return Response({'message': 'Comment deleted', 'comment_count': video.comment_count})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_tags(request):
    """List all active video tags."""
    search = request.query_params.get('search', '').strip().replace('#', '')
    
    tags = VideoTag.objects.filter(is_active=True)
    if search:
        tags = tags.filter(Q(name__icontains=search) | Q(description__icontains=search))
    
    return Response(VideoTagSerializer(tags, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def popular_tags(request):
    """Get most popular tags by video count."""
    from django.db.models import Count
    
    limit = int(request.query_params.get('limit', 20))
    tags = VideoTag.objects.filter(is_active=True).annotate(
        video_count=Count('videos', filter=Q(videos__is_active=True))
    ).order_by('-video_count')[:limit]
    
    return Response(VideoTagSerializer(tags, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def video_stats(request, video_id):
    """Get detailed statistics for a video (staff only)."""
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get view stats
    from django.db.models.functions import TruncDate
    from django.db.models import Count
    
    views_by_date = video.views.annotate(
        date=TruncDate('viewed_at')
    ).values('date').annotate(count=Count('id')).order_by('-date')[:30]
    
    return Response({
        'video_id': str(video.id),
        'title': video.title,
        'total_views': video.view_count,
        'unique_views': video.unique_view_count,
        'likes': video.like_count,
        'dislikes': video.dislike_count,
        'comments': video.comment_count,
        'views_by_date': list(views_by_date),
        'created_at': video.created_at.isoformat(),
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_video(request, video_id):
    """Delete a video (staff only)."""
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    
    video.delete()
    return Response({'message': 'Video deleted successfully'}, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_tags(request):
    """List all tags or create a new tag (staff only for creation)."""
    if request.method == 'GET':
        search = request.query_params.get('search', '').strip().replace('#', '')
        tags = VideoTag.objects.all()
        if search:
            tags = tags.filter(Q(name__icontains=search) | Q(description__icontains=search))
        return Response(VideoTagSerializer(tags, many=True).data)
    
    elif request.method == 'POST':
        if not request.user.is_staff:
            return Response({'error': 'Only staff can create tags'}, status=status.HTTP_403_FORBIDDEN)
        
        name = request.data.get('name', '').strip().lower()
        description = request.data.get('description', '').strip()
        color = request.data.get('color', '#3B82F6')
        is_active = request.data.get('is_active', True)
        
        if not name:
            return Response({'error': 'Tag name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if VideoTag.objects.filter(name=name).exists():
            return Response({'error': 'Tag with this name already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        tag = VideoTag.objects.create(
            name=name,
            description=description,
            color=color,
            is_active=is_active
        )
        return Response(VideoTagSerializer(tag).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_tag(request, tag_id):
    """Get, update, or delete a specific tag (staff only for update/delete)."""
    try:
        tag = VideoTag.objects.get(id=tag_id)
    except VideoTag.DoesNotExist:
        return Response({'error': 'Tag not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        return Response(VideoTagSerializer(tag).data)
    
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'PUT':
        name = request.data.get('name', tag.name).strip().lower()
        
        # Check if name changed and already exists
        if name != tag.name and VideoTag.objects.filter(name=name).exists():
            return Response({'error': 'Tag with this name already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        tag.name = name
        tag.description = request.data.get('description', tag.description)
        tag.color = request.data.get('color', tag.color)
        tag.is_active = request.data.get('is_active', tag.is_active)
        tag.save()
        return Response(VideoTagSerializer(tag).data)
    
    elif request.method == 'DELETE':
        tag.delete()
        return Response({'message': 'Tag deleted'}, status=status.HTTP_200_OK)


# ==================== TAG PROFILES ====================

from .models import TagProfile
from .serializers import TagProfileSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def manage_tag_profiles(request):
    """List all tag profiles or create a new one (staff only for creation)."""
    if request.method == 'GET':
        profiles = TagProfile.objects.all().prefetch_related('tags')
        return Response(TagProfileSerializer(profiles, many=True).data)
    
    elif request.method == 'POST':
        if not request.user.is_staff:
            return Response({'error': 'Only staff can create tag profiles'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = TagProfileSerializer(data=request.data)
        if serializer.is_valid():
            profile = serializer.save()
            return Response(TagProfileSerializer(profile).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def manage_tag_profile(request, profile_id):
    """Get, update, or delete a specific tag profile (staff only for update/delete)."""
    try:
        profile = TagProfile.objects.prefetch_related('tags').get(id=profile_id)
    except TagProfile.DoesNotExist:
        return Response({'error': 'Tag profile not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        return Response(TagProfileSerializer(profile).data)
    
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    if request.method == 'PUT':
        serializer = TagProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            profile = serializer.save()
            return Response(TagProfileSerializer(profile).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        profile.delete()
        return Response({'message': 'Tag profile deleted'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_profile_to_video(request, video_id, profile_id):
    """Apply a tag profile's tags to a video (staff only)."""
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        video = Video.objects.get(id=video_id)
    except Video.DoesNotExist:
        return Response({'error': 'Video not found'}, status=status.HTTP_404_NOT_FOUND)
    
    try:
        profile = TagProfile.objects.prefetch_related('tags').get(id=profile_id, is_active=True)
    except TagProfile.DoesNotExist:
        return Response({'error': 'Tag profile not found or inactive'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get mode: 'replace' replaces all tags, 'add' adds to existing tags
    mode = request.data.get('mode', 'add')
    
    if mode == 'replace':
        video.tags.set(profile.tags.all())
    else:
        # Add profile tags to existing tags (up to 50 total)
        current_tags = set(video.tags.values_list('id', flat=True))
        profile_tags = set(profile.tags.values_list('id', flat=True))
        combined = current_tags | profile_tags
        
        if len(combined) > 50:
            return Response(
                {'error': f'Cannot add tags: would exceed maximum of 50 tags (current: {len(current_tags)}, profile: {len(profile_tags)})'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        video.tags.add(*profile.tags.all())
    
    video.refresh_from_db()
    
    return Response({
        'message': f'Tag profile "{profile.name}" applied to video',
        'video_id': str(video.id),
        'tag_count': video.tags.count(),
        'tags': list(video.tags.values_list('name', flat=True))
    })
