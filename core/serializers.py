from rest_framework import serializers
from .models import SiteSettings
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile


class SiteSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    favicon_url = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = ['id', 'site_name', 'logo', 'logo_url', 'favicon', 'favicon_url', 'updated_at']
        extra_kwargs = {
            'logo': {'write_only': True, 'required': False},
            'favicon': {'write_only': True, 'required': False},
        }

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None

    def get_favicon_url(self, obj):
        if obj.favicon:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.favicon.url)
            return obj.favicon.url
        return None

    def update(self, instance, validated_data):
        # Handle logo resize
        if 'logo' in validated_data:
            logo = validated_data['logo']
            if logo:
                img = Image.open(logo)
                
                # Convert RGBA to RGB if needed
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                
                # Resize logo to max 200x60px maintaining aspect ratio
                img.thumbnail((200, 60), Image.Resampling.LANCZOS)
                
                # Save resized image
                output = BytesIO()
                img.save(output, format='JPEG', quality=95)
                output.seek(0)
                
                # Create new file
                instance.logo.save(
                    f'logo.jpg',
                    ContentFile(output.read()),
                    save=False
                )

        # Handle favicon resize
        if 'favicon' in validated_data:
            favicon = validated_data['favicon']
            if favicon:
                img = Image.open(favicon)
                
                # Convert to RGBA for favicon
                if img.mode != 'RGBA':
                    img = img.convert('RGBA')
                
                # Resize to 32x32
                img = img.resize((32, 32), Image.Resampling.LANCZOS)
                
                # Save as PNG
                output = BytesIO()
                img.save(output, format='PNG')
                output.seek(0)
                
                # Create new file
                instance.favicon.save(
                    f'favicon.png',
                    ContentFile(output.read()),
                    save=False
                )

        # Update other fields
        instance.site_name = validated_data.get('site_name', instance.site_name)
        instance.save()
        
        return instance
