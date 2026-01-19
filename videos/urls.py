"""
URL patterns for video platform API.
"""
from django.urls import path
from . import views

app_name = 'videos'

urlpatterns = [
    # Video list and search
    path('', views.VideoListView.as_view(), name='video_list'),
    
    # Admin video list (20 per page, includes inactive)
    path('admin/', views.AdminVideoListView.as_view(), name='admin_video_list'),
    
    # Video upload (staff only)
    path('upload/', views.upload_video, name='upload_video'),
    
    # Video detail and operations
    path('<uuid:id>/', views.VideoDetailView.as_view(), name='video_detail'),
    path('<uuid:video_id>/update/', views.update_video, name='update_video'),
    path('<uuid:video_id>/delete/', views.delete_video, name='delete_video'),
    
    # Admin video detail (includes inactive)
    path('admin/<uuid:id>/', views.AdminVideoDetailView.as_view(), name='admin_video_detail'),
    
    # Video interactions
    path('<uuid:video_id>/view/', views.record_view, name='record_view'),
    path('<uuid:video_id>/react/', views.react_to_video, name='react_to_video'),
    path('<uuid:video_id>/comments/', views.video_comments, name='video_comments'),
    path('<uuid:video_id>/stats/', views.video_stats, name='video_stats'),
    
    # Apply tag profile to video
    path('<uuid:video_id>/apply-profile/<int:profile_id>/', views.apply_profile_to_video, name='apply_profile_to_video'),
    
    # Comments
    path('comments/<int:comment_id>/', views.delete_comment, name='delete_comment'),
    
    # Tags management
    path('tags/', views.manage_tags, name='manage_tags'),
    path('tags/<int:tag_id>/', views.manage_tag, name='manage_tag'),
    path('tags/popular/', views.popular_tags, name='popular_tags'),
    
    # Tag Profiles management
    path('profiles/', views.manage_tag_profiles, name='manage_tag_profiles'),
    path('profiles/<int:profile_id>/', views.manage_tag_profile, name='manage_tag_profile'),
]
