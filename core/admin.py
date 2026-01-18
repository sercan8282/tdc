from django.contrib import admin
from django.db.models import Count
from .models import Game, Category, Weapon, Attachment, GlobalSettings, SiteSettings


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
