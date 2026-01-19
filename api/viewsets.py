from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.db import models
from core.models import Game, Category, Weapon, Attachment, AttachmentType, GameSettingDefinition, GameSettingProfile
from forum.models import Thread, Post, Notification
from .serializers import (
    UserDetailSerializer, UserListSerializer,
    GameSerializer, CategorySerializer, WeaponSerializer, AttachmentSerializer,
    AttachmentTypeSerializer,
    GameSettingDefinitionSerializer, GameSettingProfileSerializer,
    ThreadSerializer, ThreadListSerializer,
    PostSerializer, NotificationSerializer
)

User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_staff


# User ViewSet - Admin only
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAdminUser]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['email', 'nickname']
    ordering_fields = ['created_at', 'email']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter for pending (unverified) users only
        pending = self.request.query_params.get('pending')
        if pending and pending.lower() == 'true':
            queryset = queryset.filter(is_verified=False)
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserDetailSerializer
        return UserListSerializer

    @action(detail=True, methods=['post'])
    def verify_user(self, request, pk=None):
        user = self.get_object()
        # Only superusers can verify other superusers
        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can verify superuser accounts'},
                status=status.HTTP_403_FORBIDDEN
            )
        user.is_verified = True
        user.save()
        return Response({'status': 'user verified'})

    @action(detail=True, methods=['post'])
    def reject_user(self, request, pk=None):
        """Reject a pending user registration - deletes the user"""
        user = self.get_object()
        if user.is_verified:
            return Response(
                {'error': 'Cannot reject an already verified user'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.delete()
        return Response({'status': 'user registration rejected'})

    @action(detail=True, methods=['post'])
    def block_user(self, request, pk=None):
        user = self.get_object()
        # Staff cannot block superusers
        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can block other superusers'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Cannot block yourself
        if user == request.user:
            return Response(
                {'error': 'You cannot block yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_blocked = True
        user.save()
        return Response({'status': 'user blocked'})

    @action(detail=True, methods=['post'])
    def unblock_user(self, request, pk=None):
        user = self.get_object()
        user.is_blocked = False
        user.save()
        return Response({'status': 'user unblocked'})

    @action(detail=True, methods=['post'])
    def make_staff(self, request, pk=None):
        user = self.get_object()
        # Cannot modify superusers
        if user.is_superuser:
            return Response(
                {'error': 'Cannot modify superuser status'},
                status=status.HTTP_403_FORBIDDEN
            )
        user.is_staff = True
        user.save()
        return Response({'status': 'user is now staff'})

    @action(detail=True, methods=['post'])
    def remove_staff(self, request, pk=None):
        user = self.get_object()
        # Cannot modify superusers
        if user.is_superuser:
            return Response(
                {'error': 'Cannot modify superuser status'},
                status=status.HTTP_403_FORBIDDEN
            )
        user.is_staff = False
        user.save()
        return Response({'status': 'staff removed'})

    @action(detail=True, methods=['post'])
    def deactivate_user(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'status': 'user deactivated'})

    @action(detail=True, methods=['post'])
    def activate_user(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({'status': 'user activated'})

    @action(detail=True, methods=['post'])
    def promote_to_superuser(self, request, pk=None):
        """Only superusers can promote other users to superuser"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can promote users to superuser'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        if user.is_superuser:
            return Response(
                {'error': 'User is already a superuser'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_superuser = True
        user.is_staff = True  # Superusers are also staff
        user.save()
        return Response({'status': 'user promoted to superuser'})

    @action(detail=True, methods=['post'])
    def demote_from_superuser(self, request, pk=None):
        """Only superusers can demote other superusers"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can demote superusers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        if not user.is_superuser:
            return Response(
                {'error': 'User is not a superuser'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent demoting yourself
        if user == request.user:
            return Response(
                {'error': 'You cannot demote yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_superuser = False
        user.save()
        return Response({'status': 'user demoted from superuser'})

    @action(detail=True, methods=['post'])
    def ban_user(self, request, pk=None):
        """Staff can ban users (but not superusers). Requires 'days' parameter."""
        user = self.get_object()
        
        # Only staff can ban
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff can ban users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Cannot ban superusers (unless you are also a superuser)
        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {'error': 'Staff cannot ban superusers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Cannot ban yourself
        if user == request.user:
            return Response(
                {'error': 'You cannot ban yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get days from request
        days = request.data.get('days')
        if not days:
            return Response(
                {'error': 'Number of days is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            days = int(days)
            if days <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {'error': 'Days must be a positive integer'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.ban(days)
        return Response({
            'status': 'user banned',
            'banned_until': user.banned_until
        })

    @action(detail=True, methods=['post'])
    def unban_user(self, request, pk=None):
        """Staff can unban users"""
        if not request.user.is_staff:
            return Response(
                {'error': 'Only staff can unban users'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user = self.get_object()
        user.unban()
        return Response({'status': 'user unbanned'})


# Game ViewSet - Admin can edit, all can read
class GameViewSet(viewsets.ModelViewSet):
    serializer_class = GameSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, DjangoFilterBackend]
    search_fields = ['name']
    filterset_fields = ['is_active', 'game_type']

    def get_queryset(self):
        """
        Return all games for admin users, only active games for regular users.
        Supports filtering by has_image parameter.
        Authenticated users can use ?all=true to see all games (for favorites).
        """
        queryset = Game.objects.all()
        
        # Check if user is authenticated
        is_authenticated = self.request.user and self.request.user.is_authenticated
        is_admin = is_authenticated and self.request.user.is_staff
        
        # If 'all' parameter is passed and user is authenticated, show all games
        show_all = self.request.query_params.get('all', 'false').lower() == 'true'
        
        # Filter by has_image
        has_image = self.request.query_params.get('has_image', None)
        if has_image is not None:
            if has_image.lower() == 'true':
                queryset = queryset.exclude(image__isnull=True).exclude(image='')
            elif has_image.lower() == 'false':
                queryset = queryset.filter(models.Q(image__isnull=True) | models.Q(image=''))
        
        # Authenticated users (including admins) can see all games with ?all=true
        if is_authenticated and show_all:
            return queryset
        
        # Default behavior: only show active games
        # Admin needs to explicitly pass ?all=true to see inactive games
        queryset = queryset.filter(is_active=True)
        
        return queryset

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def activate(self, request, pk=None):
        """Activate a game"""
        game = self.get_object()
        game.is_active = True
        game.save()
        return Response({'status': 'game activated', 'is_active': True})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def deactivate(self, request, pk=None):
        """Deactivate a game"""
        game = self.get_object()
        game.is_active = False
        game.save()
        return Response({'status': 'game deactivated', 'is_active': False})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_activate(self, request):
        """Activate multiple games by IDs"""
        game_ids = request.data.get('ids', [])
        if not game_ids:
            return Response({'error': 'No game IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        updated = Game.objects.filter(id__in=game_ids).update(is_active=True)
        return Response({'status': f'{updated} games activated'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_deactivate(self, request):
        """Deactivate multiple games by IDs"""
        game_ids = request.data.get('ids', [])
        if not game_ids:
            return Response({'error': 'No game IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        updated = Game.objects.filter(id__in=game_ids).update(is_active=False)
        return Response({'status': f'{updated} games deactivated'})

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def search_images(self, request):
        """Search for game images from various sources"""
        from core.services.image_search import image_search_service
        
        game_name = request.query_params.get('name', '')
        if not game_name:
            return Response({'error': 'Game name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        results = image_search_service.search_game_images(game_name)
        return Response({'results': results})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def set_image_from_url(self, request, pk=None):
        """Download and set game image from URL"""
        from core.services.image_search import image_search_service
        from django.core.files.base import ContentFile
        
        game = self.get_object()
        image_url = request.data.get('url', '')
        
        if not image_url:
            return Response({'error': 'Image URL is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            image_bytes = image_search_service.download_and_process_image(image_url)
            if image_bytes:
                filename = f"{game.slug}.jpg"
                game.image.save(filename, ContentFile(image_bytes), save=True)
                return Response({
                    'status': 'Image saved',
                    'image_url': game.image.url if game.image else None
                })
            return Response({'error': 'Failed to download image'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def fetch_weapons(self, request, pk=None):
        """Fetch weapons for a shooter game from external sources"""
        from core.services.weapon_fetch import weapon_fetch_service
        
        game = self.get_object()
        download_images = request.data.get('download_images', True)
        
        if not game.is_shooter:
            return Response({'error': 'Game is not a shooter'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not weapon_fetch_service.can_fetch_weapons(game.slug):
            return Response({
                'error': f'Automatic weapon fetching not available for {game.name}',
                'supported_games': weapon_fetch_service.get_supported_games()
            }, status=status.HTTP_400_BAD_REQUEST)
        
        result = weapon_fetch_service.fetch_weapons_for_game(game, download_images)
        return Response(result)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def fetch_settings(self, request, pk=None):
        """Fetch and create game settings definitions"""
        from core.services.game_settings_fetch import game_settings_fetch_service
        
        game = self.get_object()
        result = game_settings_fetch_service.fetch_settings_for_game(game)
        return Response(result)

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def supported_weapon_sources(self, request):
        """Get list of games that support automatic weapon fetching"""
        from core.services.weapon_fetch import weapon_fetch_service
        return Response({'supported_games': weapon_fetch_service.get_supported_games()})

    @action(detail=False, methods=['get'])
    def shooter_games(self, request):
        """Get only shooter games (for weapon management)"""
        queryset = Game.objects.filter(game_type='shooter')
        
        # Check if user is admin
        is_admin = request.user and request.user.is_staff
        show_all = request.query_params.get('all', 'false').lower() == 'true'
        
        if not (is_admin and show_all):
            queryset = queryset.filter(is_active=True)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# Category ViewSet
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, DjangoFilterBackend]
    search_fields = ['name']
    filterset_fields = ['game']


# Weapon ViewSet
class WeaponViewSet(viewsets.ModelViewSet):
    serializer_class = WeaponSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['name']
    filterset_fields = ['category', 'category__game', 'is_active']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        """
        Return all weapons for admin users, only active weapons for regular users.
        Admin can also filter by is_active parameter and has_image.
        Only returns weapons from shooter games.
        """
        # Only get weapons from shooter games
        queryset = Weapon.objects.filter(category__game__game_type='shooter')
        
        # Check if user is admin
        is_admin = self.request.user and self.request.user.is_staff
        
        # If 'all' parameter is passed and user is admin, show all weapons
        show_all = self.request.query_params.get('all', 'false').lower() == 'true'
        
        # Filter by has_image
        has_image = self.request.query_params.get('has_image', None)
        if has_image is not None:
            if has_image.lower() == 'true':
                queryset = queryset.exclude(image__isnull=True).exclude(image='')
            elif has_image.lower() == 'false':
                queryset = queryset.filter(models.Q(image__isnull=True) | models.Q(image=''))
        
        if is_admin and show_all:
            return queryset
        
        # For non-admin or when not requesting all, only show active weapons
        # Unless there's an explicit is_active filter
        is_active_filter = self.request.query_params.get('is_active', None)
        if is_active_filter is None and not is_admin:
            queryset = queryset.filter(is_active=True)
        
        return queryset

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def activate(self, request, pk=None):
        """Activate a weapon"""
        weapon = self.get_object()
        weapon.is_active = True
        weapon.save()
        return Response({'status': 'weapon activated', 'is_active': True})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def deactivate(self, request, pk=None):
        """Deactivate a weapon"""
        weapon = self.get_object()
        weapon.is_active = False
        weapon.save()
        return Response({'status': 'weapon deactivated', 'is_active': False})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_activate(self, request):
        """Activate multiple weapons by IDs"""
        weapon_ids = request.data.get('ids', [])
        if not weapon_ids:
            return Response({'error': 'No weapon IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        updated = Weapon.objects.filter(id__in=weapon_ids).update(is_active=True)
        return Response({'status': f'{updated} weapons activated'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdminUser])
    def bulk_deactivate(self, request):
        """Deactivate multiple weapons by IDs"""
        weapon_ids = request.data.get('ids', [])
        if not weapon_ids:
            return Response({'error': 'No weapon IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        updated = Weapon.objects.filter(id__in=weapon_ids).update(is_active=False)
        return Response({'status': f'{updated} weapons deactivated'})

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def search_images(self, request):
        """Search for weapon images"""
        from core.services.image_search import image_search_service
        
        weapon_name = request.query_params.get('name', '')
        game_name = request.query_params.get('game', '')
        
        if not weapon_name:
            return Response({'error': 'Weapon name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        search_query = f"{weapon_name} {game_name} weapon" if game_name else f"{weapon_name} weapon"
        results = image_search_service.search_game_images(search_query)
        return Response({'results': results})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def set_image_from_url(self, request, pk=None):
        """Download and set weapon image from URL"""
        from core.services.image_search import image_search_service
        from django.core.files.base import ContentFile
        from django.utils.text import slugify
        
        weapon = self.get_object()
        image_url = request.data.get('url', '')
        
        if not image_url:
            return Response({'error': 'Image URL is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            image_bytes = image_search_service.download_and_process_image(image_url, max_width=400, max_height=300)
            if image_bytes:
                filename = f"{slugify(weapon.name)}.jpg"
                weapon.image.save(filename, ContentFile(image_bytes), save=True)
                return Response({
                    'status': 'Image saved',
                    'image_url': weapon.image.url if weapon.image else None
                })
            return Response({'error': 'Failed to download image'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# Attachment Type ViewSet
class AttachmentTypeViewSet(viewsets.ModelViewSet):
    queryset = AttachmentType.objects.all()
    serializer_class = AttachmentTypeSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'display_name']
    ordering_fields = ['order', 'name', 'created_at']
    ordering = ['order', 'name']


# Attachment ViewSet
class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['name']
    filterset_fields = ['weapon', 'attachment_type', 'type']
    ordering_fields = ['name', 'attachment_type__order', 'created_at']
    ordering = ['attachment_type__order', 'name']


# Thread ViewSet
class ThreadViewSet(viewsets.ModelViewSet):
    queryset = Thread.objects.all()
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['title', 'content']
    filterset_fields = ['category', 'author', 'is_pinned', 'is_locked']
    ordering_fields = ['created_at', 'is_pinned']
    ordering = ['-is_pinned', '-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ThreadListSerializer
        return ThreadSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.AllowAny]
        return [permission() for permission in permission_classes]


# Post ViewSet
class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['thread', 'author']
    ordering_fields = ['created_at']
    ordering = ['created_at']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.AllowAny]
        return [permission() for permission in permission_classes]


# Notification ViewSet
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    filter_backends = [OrderingFilter]
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})


# Game Setting Definition ViewSet
class GameSettingDefinitionViewSet(viewsets.ModelViewSet):
    queryset = GameSettingDefinition.objects.all()
    serializer_class = GameSettingDefinitionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['name', 'display_name']
    filterset_fields = ['game', 'category', 'field_type']
    ordering_fields = ['game', 'category', 'order', 'display_name']
    ordering = ['game', 'category', 'order']
    pagination_class = None  # Disable pagination for settings definitions


# Game Setting Profile ViewSet
class GameSettingProfileViewSet(viewsets.ModelViewSet):
    queryset = GameSettingProfile.objects.all()
    serializer_class = GameSettingProfileSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['name', 'description']
    filterset_fields = ['game', 'is_active']
    ordering_fields = ['game', 'name', 'created_at']
    ordering = ['game', 'name']
