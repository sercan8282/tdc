from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from . import views

# Main router
router = DefaultRouter()
router.register(r'categories', views.ForumCategoryViewSet, basename='forum-category')
router.register(r'topics', views.TopicViewSet, basename='forum-topic')
router.register(r'ranks', views.UserRankViewSet, basename='forum-rank')
router.register(r'notifications', views.NotificationViewSet, basename='forum-notification')
router.register(r'stats', views.ForumStatsViewSet, basename='forum-stats')
router.register(r'images', views.ForumImageUploadView, basename='forum-images')

# Nested router for replies under topics
topics_router = routers.NestedDefaultRouter(router, r'topics', lookup='topic')
topics_router.register(r'replies', views.ReplyViewSet, basename='topic-replies')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(topics_router.urls)),
]
