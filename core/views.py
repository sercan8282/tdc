from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from .models import SiteSettings, EventBanner
from .theme_models import ThemeSettings
from .serializers import SiteSettingsSerializer, EventBannerSerializer, ThemeSettingsSerializer


class SiteSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing site settings.
    Only superusers can update settings.
    Anyone can read settings.
    """
    queryset = SiteSettings.objects.all()
    serializer_class = SiteSettingsSerializer

    def get_permissions(self):
        """Only superusers can modify settings, anyone can read"""
        if self.action in ['update', 'partial_update', 'destroy', 'create']:
            # Use custom permission to check superuser
            from rest_framework.permissions import BasePermission
            
            class IsSuperUser(BasePermission):
                def has_permission(self, request, view):
                    return request.user and request.user.is_authenticated and request.user.is_superuser
            
            return [IsSuperUser()]
        return [AllowAny()]

    def get_queryset(self):
        # Always return or create the singleton instance
        SiteSettings.get_settings()
        return SiteSettings.objects.all()

    def list(self, request):
        """Return the singleton settings instance as a list"""
        settings = SiteSettings.get_settings()
        serializer = self.get_serializer(settings)
        # Return as a list with single item for consistency with DRF router
        return Response([serializer.data])

    def update(self, request, *args, **kwargs):
        """Only superusers can update settings"""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Only superusers can update site settings'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        settings = SiteSettings.get_settings()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def create(self, request):
        """Prevent creating multiple instances"""
        return Response(
            {'error': 'Site settings already exist. Use update instead.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    def destroy(self, request, *args, **kwargs):
        """Prevent deletion"""
        return Response(
            {'error': 'Site settings cannot be deleted'},
            status=status.HTTP_400_BAD_REQUEST
        )


class EventBannerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing event banners.
    Staff can create/update/delete banners.
    Anyone can view active banners.
    """
    queryset = EventBanner.objects.all()
    serializer_class = EventBannerSerializer

    def get_permissions(self):
        """Staff can manage banners, anyone can read"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [AllowAny()]

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active banner (if any)"""
        banner = EventBanner.get_active_banner()
        if banner:
            serializer = self.get_serializer(banner)
            return Response(serializer.data)
        return Response(None)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def toggle_active(self, request, pk=None):
        """Toggle banner active status"""
        banner = self.get_object()
        banner.is_active = not banner.is_active
        banner.save()
        serializer = self.get_serializer(banner)
        return Response(serializer.data)


class ThemeSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for theme customization.
    Admin can customize, anyone can view active theme.
    """
    from .serializers import ThemeSettingsSerializer
    from .models import ThemeSettings
    
    queryset = ThemeSettings.objects.all()
    serializer_class = ThemeSettingsSerializer

    def get_permissions(self):
        """Admin can manage theme, anyone can read active theme"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'set_active']:
            return [IsAdminUser()]
        return [AllowAny()]

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active theme"""
        theme = ThemeSettings.get_active_theme()
        serializer = self.get_serializer(theme)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def css(self, request):
        """Get the CSS for the active theme"""
        from django.http import HttpResponse
        theme = ThemeSettings.get_active_theme()
        css = theme.generate_css()
        return HttpResponse(css, content_type='text/css')

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def set_active(self, request, pk=None):
        """Set this theme as active"""
        theme = self.get_object()
        theme.is_active = True
        theme.save()
        serializer = self.get_serializer(theme)
        return Response(serializer.data)
