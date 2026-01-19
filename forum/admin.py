from django.contrib import admin
from .models import (
    UserRank, UserForumStats, ForumCategory, Topic, Reply, ReplyLike,
    Thread, Post, Like, Notification
)


@admin.register(UserRank)
class UserRankAdmin(admin.ModelAdmin):
    list_display = ['name', 'min_points', 'chevrons', 'color', 'order']
    list_editable = ['min_points', 'chevrons', 'order']
    ordering = ['order']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(UserForumStats)
class UserForumStatsAdmin(admin.ModelAdmin):
    list_display = ['user', 'total_topics', 'total_replies', 'total_likes_received', 'points']
    search_fields = ['user__nickname', 'user__email']
    readonly_fields = ['points']


@admin.register(ForumCategory)
class ForumCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon', 'color', 'order', 'is_active', 'topic_count']
    list_editable = ['order', 'is_active']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['order']
    
    def topic_count(self, obj):
        return obj.topics.count()
    topic_count.short_description = 'Topics'


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'author', 'is_pinned', 'is_locked', 'is_solved', 'views', 'reply_count', 'created_at']
    list_filter = ['category', 'is_pinned', 'is_locked', 'is_solved', 'created_at']
    search_fields = ['title', 'content', 'author__nickname']
    list_editable = ['is_pinned', 'is_locked', 'is_solved']
    prepopulated_fields = {'slug': ('title',)}
    raw_id_fields = ['author']
    date_hierarchy = 'created_at'
    
    def reply_count(self, obj):
        return obj.replies.count()
    reply_count.short_description = 'Replies'


@admin.register(Reply)
class ReplyAdmin(admin.ModelAdmin):
    list_display = ['id', 'topic', 'author', 'parent', 'is_solution', 'likes_count', 'created_at']
    list_filter = ['is_solution', 'is_edited', 'created_at']
    search_fields = ['content', 'author__nickname', 'topic__title']
    raw_id_fields = ['author', 'topic', 'parent']
    filter_horizontal = ['mentioned_users']


@admin.register(ReplyLike)
class ReplyLikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'reply', 'created_at']
    raw_id_fields = ['user', 'reply']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notifier', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']
    search_fields = ['user__nickname', 'notifier__nickname']


# Keep old admins for backwards compatibility
@admin.register(Thread)
class ThreadAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'author', 'is_pinned', 'created_at']
    list_filter = ['is_pinned', 'is_locked']


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['id', 'thread', 'author', 'created_at']


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ['user', 'content_type', 'object_id', 'created_at']
