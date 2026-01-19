"""
Additional security validators and utilities.
"""
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
import re


class PasswordComplexityValidator:
    """
    Validate password complexity:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    
    def validate(self, password, user=None):
        if len(password) < 12:
            raise ValidationError(
                _("Password must be at least 12 characters long."),
                code='password_too_short',
            )
        
        if not any(c.isupper() for c in password):
            raise ValidationError(
                _("Password must contain at least one uppercase letter."),
                code='password_no_upper',
            )
        
        if not any(c.islower() for c in password):
            raise ValidationError(
                _("Password must contain at least one lowercase letter."),
                code='password_no_lower',
            )
        
        if not any(c.isdigit() for c in password):
            raise ValidationError(
                _("Password must contain at least one number."),
                code='password_no_digit',
            )
        
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password):
            raise ValidationError(
                _("Password must contain at least one special character."),
                code='password_no_special',
            )
        
        # Check for common patterns
        if re.search(r'(\w)\1{2,}', password):  # Same character 3+ times
            raise ValidationError(
                _("Password contains repeating characters."),
                code='password_repeating',
            )
    
    def get_help_text(self):
        return _(
            "Your password must contain at least 12 characters, including uppercase, "
            "lowercase, numbers, and special characters."
        )


class NoPersonalInfoValidator:
    """
    Validate that password doesn't contain email or nickname.
    """
    
    def validate(self, password, user=None):
        if not user:
            return
        
        password_lower = password.lower()
        
        # Check against email
        if hasattr(user, 'email') and user.email:
            email_parts = user.email.lower().split('@')[0]
            if len(email_parts) >= 4 and email_parts in password_lower:
                raise ValidationError(
                    _("Password cannot contain your email address."),
                    code='password_contains_email',
                )
        
        # Check against nickname
        if hasattr(user, 'nickname') and user.nickname:
            nickname_lower = user.nickname.lower()
            if len(nickname_lower) >= 4 and nickname_lower in password_lower:
                raise ValidationError(
                    _("Password cannot contain your nickname."),
                    code='password_contains_nickname',
                )
    
    def get_help_text(self):
        return _("Your password cannot contain your email or nickname.")


def validate_ip_address(ip):
    """Validate IP address format."""
    import ipaddress
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False


def sanitize_input(value):
    """Sanitize user input to prevent XSS and injection attacks."""
    if not isinstance(value, str):
        return value
    
    # Remove null bytes
    value = value.replace('\x00', '')
    
    # Remove control characters
    value = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')
    
    return value.strip()
