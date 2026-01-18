from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from core.models import Game, Category, Weapon, Attachment, GameSettingDefinition, GameSettingProfile
from forum.models import Thread, Post, Notification
from .serializers import (
    UserDetailSerializer, UserListSerializer,
    GameSerializer, CategorySerializer, WeaponSerializer, AttachmentSerializer,
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

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserDetailSerializer
        return UserListSerializer

    @action(detail=True, methods=['post'])
    def verify_user(self, request, pk=None):
        user = self.get_object()
        user.is_verified = True
        user.save()
        return Response({'status': 'user verified'})

    @action(detail=True, methods=['post'])
    def block_user(self, request, pk=None):
        user = self.get_object()
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
        user.is_staff = True
        user.save()
        return Response({'status': 'user is now staff'})

    @action(detail=True, methods=['post'])
    def remove_staff(self, request, pk=None):
        user = self.get_object()
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


# Game ViewSet - Admin can edit, all can read
class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.filter(is_active=True)
    serializer_class = GameSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter]
    search_fields = ['name']


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
    queryset = Weapon.objects.all()
    serializer_class = WeaponSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['name']
    filterset_fields = ['category', 'category__game']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


# Attachment ViewSet
class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, DjangoFilterBackend, OrderingFilter]
    search_fields = ['name']
    filterset_fields = ['weapon', 'type']
    ordering_fields = ['name', 'type', 'created_at']
    ordering = ['type', 'name']


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
