"""
URL patterns for user authentication endpoints.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('captcha/', views.get_captcha, name='get_captcha'),
    path('register/', views.register, name='register'),
    path('login/', views.login_with_mfa, name='login'),
    
    # MFA
    path('mfa/setup/', views.mfa_setup, name='mfa_setup'),
    path('mfa/verify/', views.mfa_verify, name='mfa_verify'),
    path('mfa/disable/', views.mfa_disable, name='mfa_disable'),
    
    # Profile
    path('profile/', views.profile, name='profile'),
    path('profile/avatar/', views.upload_avatar, name='upload_avatar'),
    path('profile/avatar/delete/', views.delete_avatar, name='delete_avatar'),
    path('profile/password/', views.change_password, name='change_password'),
]
