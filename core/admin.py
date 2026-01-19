from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html
from .models import Game, Category, Weapon, Attachment, GlobalSettings, SiteSettings, EventBanner


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 1


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'game', 'created_at']
    list_filter = ['game', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Weapon)
class WeaponAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'get_thumbnail', 'text_color', 'image_size']
    list_filter = ['category', 'category__game', 'image_size', 'created_at']
    search_fields = ['name', 'category__name']
    readonly_fields = ['created_at', 'updated_at', 'get_thumbnail']
    inlines = [AttachmentInline]

    def get_thumbnail(self, obj):
        if obj.image:
            return f'<img src="{obj.image.url}" width="50" height="50" />'
        return 'No image'
    get_thumbnail.allow_tags = True
    get_thumbnail.short_description = 'Thumbnail'


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'weapon', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['name', 'weapon__name']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(GlobalSettings)
class GlobalSettingsAdmin(admin.ModelAdmin):
    list_display = ['banner_text', 'is_banner_active']
    readonly_fields = ['created_at', 'updated_at']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ['site_name', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('General', {
            'fields': ('site_name',)
        }),
        ('Branding', {
            'fields': ('logo', 'favicon')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def has_add_permission(self, request):
        # Only allow one instance
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EventBanner)
class EventBannerAdmin(admin.ModelAdmin):
    list_display = ['title', 'banner_type', 'color_scheme', 'is_active', 'show_countdown', 'event_date', 'priority', 'get_status']
    list_filter = ['is_active', 'banner_type', 'color_scheme', 'show_countdown']
    search_fields = ['title', 'subtitle']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['is_active', 'priority']
    ordering = ['-priority', '-created_at']
    
    fieldsets = (
        ('Content', {
            'fields': ('title', 'subtitle', 'image')
        }),
        ('Appearance', {
            'fields': ('banner_type', 'color_scheme')
        }),
        ('Countdown', {
            'fields': ('event_date', 'show_countdown')
        }),
        ('Link', {
            'fields': ('link_url', 'link_text'),
            'classes': ('collapse',)
        }),
        ('Display Settings', {
            'fields': ('is_active', 'is_dismissible', 'priority')
        }),
        ('Scheduling', {
            'fields': ('start_date', 'end_date'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_status(self, obj):
        from django.utils import timezone
        now = timezone.now()
        
        if not obj.is_active:
            return format_html('<span style="color: gray;">● Inactive</span>')
        
        # Check schedule
        if obj.start_date and obj.start_date > now:
            return format_html('<span style="color: orange;">● Scheduled</span>')
        if obj.end_date and obj.end_date < now:
            return format_html('<span style="color: red;">● Expired</span>')
        
        return format_html('<span style="color: green;">● Live</span>')
    
    get_status.short_description = 'Status'
