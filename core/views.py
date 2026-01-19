from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import SiteSettings
from .serializers import SiteSettingsSerializer


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
