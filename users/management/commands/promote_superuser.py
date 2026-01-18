from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Promote admin user to superuser'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email of the admin user to promote')

    def handle(self, *args, **options):
        email = options.get('email')
        
        if email:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User with email {email} not found'))
                return
        else:
            # Find first staff user
            user = User.objects.filter(is_staff=True).first()
            if not user:
                self.stdout.write(self.style.ERROR('No staff users found'))
                return
        
        if user.is_superuser:
            self.stdout.write(self.style.WARNING(f'{user.email} is already a superuser'))
        else:
            user.is_superuser = True
            user.is_staff = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Successfully promoted {user.email} to superuser'))
