from django.contrib import admin
from .models import Thread, Post, Like, Notification


@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'category', 'is_pinned', 'is_locked', 'created_at']
    list_filter = ['is_pinned', 'is_locked', 'category', 'created_at']
    search_fields = ['title', 'content', 'author__email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['thread', 'author', 'is_edited', 'created_at']
    list_filter = ['is_edited', 'created_at', 'thread__category']
    search_fields = ['content', 'author__email', 'thread__title']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'content_type', 'created_at']
    list_filter = ['content_type', 'created_at']
    search_fields = ['user__email']
    readonly_fields = ['created_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'notifier', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['user__email', 'notifier__email']
    readonly_fields = ['created_at']
