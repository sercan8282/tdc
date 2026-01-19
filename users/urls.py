"""
URL patterns for user authentication endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .messaging_views import PrivateMessageViewSet

# Router for messaging
router = DefaultRouter()
router.register(r'messages', PrivateMessageViewSet, basename='messages')

urlpatterns = [
    # Auth
    path('captcha/', views.get_captcha, name='get_captcha'),
    path('register/', views.register, name='register'),
    path('login/', views.login_with_mfa, name='login'),
    
    # MFA
    path('mfa/setup/', views.mfa_setup, name='mfa_setup'),
    path('mfa/verify/', views.mfa_verify, name='mfa_verify'),
    path('mfa/disable/', views.mfa_disable, name='mfa_disable'),
    path('mfa/reset/', views.mfa_reset, name='mfa_reset'),
    
    # Profile
    path('profile/', views.profile, name='profile'),
    path('profile/avatar/', views.upload_avatar, name='upload_avatar'),
    path('profile/avatar/delete/', views.delete_avatar, name='delete_avatar'),
    path('profile/password/', views.change_password, name='change_password'),
    path('profile/recent-replies/', views.recent_replies, name='recent_replies'),
    
    # User search and public profiles
    path('search/', views.search_users, name='search_users'),
    path('<int:user_id>/profile/', views.public_user_profile, name='public_user_profile'),
    
    # Private Messaging
    path('', include(router.urls)),
]
