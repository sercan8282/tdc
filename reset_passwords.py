import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warzone_loadout.settings')
django.setup()

from users.models import CustomUser

# Reset admin account
try:
    admin = CustomUser.objects.get(email='admin@example.com')
    admin.set_password('admin123')
    admin.save()
    print(f"✓ Admin account password reset to 'admin123'")
    print(f"  Email: {admin.email}")
    print(f"  Nickname: {admin.nickname}")
except CustomUser.DoesNotExist:
    print("✗ Admin account not found")

# Reset s.yazici account
try:
    user = CustomUser.objects.get(email='s.yazici@yazici-mail.nl')
    user.set_password('admin123')
    user.save()
    print(f"\n✓ s.yazici account password reset to 'admin123'")
    print(f"  Email: {user.email}")
    print(f"  Nickname: {user.nickname}")
except CustomUser.DoesNotExist:
    print("\n✗ s.yazici@yazici-mail.nl account not found")

print("\n=== All accounts can now login with password 'admin123' ===")
