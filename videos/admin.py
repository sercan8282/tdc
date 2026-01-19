"""
Admin configuration for video platform.
Beautiful and functional admin interface.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import Video, VideoTag, VideoView, VideoReaction, VideoComment


@admin.register(VideoTag)
class VideoTagAdmin(admin.ModelAdmin):
    """Admin interface for video tags/hashtags."""
    list_display = ['colored_tag', 'description_short', 'video_count', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    list_editable = ['is_active']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['name']
    
    fieldsets = (
        ('Tag Information', {
            'fields': ('name', 'description', 'color')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def colored_tag(self, obj):
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; '
            'border-radius: 4px; font-weight: bold;">#{}</span>',
            obj.color, obj.name
        )
    colored_tag.short_description = 'Tag'
    colored_tag.admin_order_field = 'name'
    
    def description_short(self, obj):
        if obj.description:
            return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
        return '-'
    description_short.short_description = 'Description'
    
    def video_count(self, obj):
        return obj.videos.count()
    video_count.short_description = 'Videos'
    
    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            videos_count=Count('videos')
        )


class VideoCommentInline(admin.TabularInline):
    """Inline comments for video admin."""
    model = VideoComment
    extra = 0
    readonly_fields = ['user', 'content', 'created_at', 'is_active']
    can_delete = True
    show_change_link = True
    
    def has_add_permission(self, request, obj=None):
        return False


class VideoReactionInline(admin.TabularInline):
    """Inline reactions for video admin."""
    model = VideoReaction
    extra = 0
    readonly_fields = ['user', 'reaction_type', 'created_at']
    can_delete = True
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    """Admin interface for videos."""
    list_display = [
        'cover_preview', 'title', 'uploader', 'tag_list',
        'stats_display', 'is_active', 'is_featured', 'created_at'
    ]
    list_filter = ['is_active', 'is_featured', 'tags', 'created_at', 'uploader']
    search_fields = ['title', 'description', 'uploader__nickname', 'uploader__email']
    list_editable = ['is_active', 'is_featured']
    filter_horizontal = ['tags']
    readonly_fields = [
        'id', 'view_count', 'unique_view_count', 'like_count', 
        'dislike_count', 'comment_count', 'created_at', 'updated_at',
        'cover_preview_large', 'video_preview'
    ]
    date_hierarchy = 'created_at'
    inlines = [VideoCommentInline, VideoReactionInline]
    
    fieldsets = (
        ('Video Information', {
            'fields': ('title', 'description', 'video_file', 'video_preview', 'cover_image', 'cover_preview_large')
        }),
        ('Categorization', {
            'fields': ('tags',),
            'description': 'Select up to 50 tags for this video.'
        }),
        ('Owner', {
            'fields': ('uploader',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_featured')
        }),
        ('Statistics', {
            'fields': ('view_count', 'unique_view_count', 'like_count', 'dislike_count', 'comment_count'),
            'classes': ('collapse',)
        }),
        ('System Information', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def cover_preview(self, obj):
        if obj.cover_image:
            return format_html(
                '<img src="{}" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;" />',
                obj.cover_image.url
            )
        return '-'
    cover_preview.short_description = 'Cover'
    
    def cover_preview_large(self, obj):
        if obj.cover_image:
            return format_html(
                '<img src="{}" style="max-width: 300px; max-height: 200px; border-radius: 8px;" />',
                obj.cover_image.url
            )
        return '-'
    cover_preview_large.short_description = 'Cover Preview'
    
    def video_preview(self, obj):
        if obj.video_file:
            return format_html(
                '<video width="300" controls style="border-radius: 8px;">'
                '<source src="{}" type="video/mp4">'
                'Your browser does not support the video tag.'
                '</video>',
                obj.video_file.url
            )
        return '-'
    video_preview.short_description = 'Video Preview'
    
    def tag_list(self, obj):
        tags = obj.tags.all()[:5]
        if tags:
            tag_html = ' '.join([
                format_html(
                    '<span style="background-color: {}; color: white; padding: 2px 6px; '
                    'border-radius: 3px; font-size: 11px; margin-right: 3px;">#{}</span>',
                    tag.color, tag.name
                ) for tag in tags
            ])
            if obj.tags.count() > 5:
                tag_html += format_html(' <span style="color: #888;">+{} more</span>', obj.tags.count() - 5)
            return format_html(tag_html)
        return '-'
    tag_list.short_description = 'Tags'
    
    def stats_display(self, obj):
        return format_html(
            '<span title="Views">👁 {}</span> '
            '<span title="Likes">👍 {}</span> '
            '<span title="Dislikes">👎 {}</span> '
            '<span title="Comments">💬 {}</span>',
            obj.view_count, obj.like_count, obj.dislike_count, obj.comment_count
        )
    stats_display.short_description = 'Stats'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.uploader = request.user
        super().save_model(request, obj, form, change)
    
    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        # Validate max 50 tags
        if form.instance.tags.count() > 50:
            form.instance.tags.set(form.instance.tags.all()[:50])


@admin.register(VideoView)
class VideoViewAdmin(admin.ModelAdmin):
    """Admin interface for video views statistics."""
    list_display = ['video', 'user', 'ip_address', 'viewed_at']
    list_filter = ['viewed_at', 'video']
    search_fields = ['video__title', 'user__nickname', 'user__email', 'ip_address']
    readonly_fields = ['video', 'user', 'ip_address', 'viewed_at']
    date_hierarchy = 'viewed_at'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(VideoReaction)
class VideoReactionAdmin(admin.ModelAdmin):
    """Admin interface for video reactions."""
    list_display = ['video', 'user', 'reaction_badge', 'created_at']
    list_filter = ['reaction_type', 'created_at']
    search_fields = ['video__title', 'user__nickname', 'user__email']
    readonly_fields = ['video', 'user', 'reaction_type', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    def reaction_badge(self, obj):
        if obj.reaction_type == 'like':
            return format_html('<span style="color: green; font-size: 18px;">👍</span>')
        else:
            return format_html('<span style="color: red; font-size: 18px;">👎</span>')
    reaction_badge.short_description = 'Reaction'
    
    def has_add_permission(self, request):
        return False


@admin.register(VideoComment)
class VideoCommentAdmin(admin.ModelAdmin):
    """Admin interface for video comments with moderation."""
    list_display = ['content_short', 'video', 'user', 'is_active', 'has_parent', 'created_at']
    list_filter = ['is_active', 'created_at', 'video']
    search_fields = ['content', 'video__title', 'user__nickname', 'user__email']
    list_editable = ['is_active']
    readonly_fields = ['video', 'user', 'content', 'parent', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    
    actions = ['activate_comments', 'deactivate_comments']
    
    def content_short(self, obj):
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    content_short.short_description = 'Comment'
    
    def has_parent(self, obj):
        return '↳ Reply' if obj.parent else 'Comment'
    has_parent.short_description = 'Type'
    
    def has_add_permission(self, request):
        return False
    
    @admin.action(description='Activate selected comments')
    def activate_comments(self, request, queryset):
        queryset.update(is_active=True)
    
    @admin.action(description='Deactivate selected comments')
    def deactivate_comments(self, request, queryset):
        queryset.update(is_active=False)

