from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import (
    UserViewSet, GameViewSet, CategoryViewSet, WeaponViewSet, AttachmentViewSet,
    AttachmentTypeViewSet,
    GameSettingDefinitionViewSet, GameSettingProfileViewSet,
    ThreadViewSet, PostViewSet, NotificationViewSet
)
from core.views import SiteSettingsViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'games', GameViewSet, basename='game')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'weapons', WeaponViewSet, basename='weapon')
router.register(r'attachments', AttachmentViewSet, basename='attachment')
router.register(r'attachment-types', AttachmentTypeViewSet, basename='attachment-type')
router.register(r'game-setting-definitions', GameSettingDefinitionViewSet, basename='game-setting-definition')
router.register(r'game-setting-profiles', GameSettingProfileViewSet, basename='game-setting-profile')
router.register(r'threads', ThreadViewSet, basename='thread')
router.register(r'posts', PostViewSet, basename='post')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'site-settings', SiteSettingsViewSet, basename='site-settings')

urlpatterns = [
    path('', include(router.urls)),
]
