"""
MFA (Multi-Factor Authentication) service using TOTP.
"""
import pyotp
import qrcode
import base64
from io import BytesIO


class MFAService:
    """Handle MFA setup and verification using TOTP."""
    
    ISSUER_NAME = "TDC"
    
    def generate_secret(self) -> str:
        """Generate a new TOTP secret."""
        return pyotp.random_base32()
    
    def get_totp_uri(self, secret: str, email: str) -> str:
        """Generate the TOTP URI for QR code."""
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=self.ISSUER_NAME)
    
    def generate_qr_code(self, secret: str, email: str) -> str:
        """Generate a QR code image as base64 for MFA setup."""
        uri = self.get_totp_uri(secret, email)
        
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(uri)
        qr.make(fit=True)
        
        # Create image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{image_base64}"
    
    def verify_code(self, secret: str, code: str) -> bool:
        """Verify a TOTP code."""
        if not secret or not code:
            return False
        
        totp = pyotp.TOTP(secret)
        # Allow 1 time step before/after for clock drift
        return totp.verify(code, valid_window=1)
    
    def get_current_code(self, secret: str) -> str:
        """Get the current TOTP code (for testing/debugging)."""
        totp = pyotp.TOTP(secret)
        return totp.now()


# Singleton instance
mfa_service = MFAService()
