from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    nickname = models.CharField(max_length=100, unique=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_blocked = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    mfa_secret = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        help_text='TOTP secret for MFA'
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nickname']

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.email

    def block(self):
        self.is_blocked = True
        self.save()

    def unblock(self):
        self.is_blocked = False
        self.save()
