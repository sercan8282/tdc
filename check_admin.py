import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warzone_loadout.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

admin = User.objects.filter(email='admin@example.com').first()

if admin:
    print(f"Admin account found:")
    print(f"  Email: {admin.email}")
    print(f"  Nickname: {admin.nickname}")
    print(f"  Is verified: {admin.is_verified}")
    print(f"  Is blocked: {admin.is_blocked}")
    print(f"  Is staff: {admin.is_staff}")
    print(f"  Is superuser: {admin.is_superuser}")
    
    # Reset password to 'admin123'
    admin.set_password('admin123')
    admin.is_verified = True
    admin.is_blocked = False
    admin.save()
    print("\n✅ Password reset to 'admin123'")
    print("✅ Account verified and unblocked")
else:
    print("❌ Admin account not found!")
    print("\nCreating admin account...")
    admin = User.objects.create_superuser(
        email='admin@example.com',
        nickname='Admin',
        password='admin123'
    )
    admin.is_verified = True
    admin.save()
    print("✅ Admin account created with password 'admin123'")
