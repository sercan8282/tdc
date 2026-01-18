import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warzone_loadout.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()
if not User.objects.filter(email='admin@example.com').exists():
    user = User.objects.create_superuser(email='admin@example.com', password='admin123', nickname='admin')
    user.is_verified = True
    user.save()
    print('✓ Superuser created: admin@example.com / admin123')
else:
    print('✗ User already exists')
