import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'warzone_loadout.settings')
django.setup()

from users.models import CustomUser

# Disable MFA for admin
try:
    admin = CustomUser.objects.get(email='admin@example.com')
    admin.mfa_enabled = False
    admin.mfa_secret = ''
    admin.save()
    print(f"✓ MFA uitgeschakeld voor admin@example.com")
except CustomUser.DoesNotExist:
    print("✗ Admin account niet gevonden")

# Disable MFA for s.yazici
try:
    user = CustomUser.objects.get(email='s.yazici@yazici-mail.nl')
    user.mfa_enabled = False
    user.mfa_secret = ''
    user.save()
    print(f"✓ MFA uitgeschakeld voor s.yazici@yazici-mail.nl")
except CustomUser.DoesNotExist:
    print("✗ s.yazici account niet gevonden")

print("\n=== Je kunt nu inloggen zonder MFA code ===")
print("Email: admin@example.com")
print("Wachtwoord: admin123")
print("\nEmail: s.yazici@yazici-mail.nl")
print("Wachtwoord: admin123")
