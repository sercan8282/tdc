"""
Captcha service for generating math puzzle images.
"""
import random
import base64
import hashlib
import time
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont


class CaptchaService:
    """Generate math captcha puzzles as images."""
    
    # Simple secret for signing captcha tokens (in production use settings.SECRET_KEY)
    SECRET = "tdc-captcha-secret-key-2024"
    
    # Captcha expires after 5 minutes
    EXPIRY_SECONDS = 300
    
    def __init__(self):
        self.width = 200
        self.height = 80
    
    def _generate_math_problem(self) -> tuple[str, int]:
        """Generate a random math problem and its answer."""
        operators = ['+', '-', 'x']
        op = random.choice(operators)
        
        if op == '+':
            a = random.randint(1, 50)
            b = random.randint(1, 50)
            answer = a + b
            problem = f"{a} + {b} = ?"
        elif op == '-':
            a = random.randint(10, 50)
            b = random.randint(1, a)  # Ensure positive result
            answer = a - b
            problem = f"{a} - {b} = ?"
        else:  # multiplication
            a = random.randint(2, 12)
            b = random.randint(2, 12)
            answer = a * b
            problem = f"{a} x {b} = ?"
        
        return problem, answer
    
    def _add_noise(self, draw: ImageDraw.ImageDraw, width: int, height: int):
        """Add noise lines and dots to make OCR harder."""
        # Add random lines
        for _ in range(5):
            x1 = random.randint(0, width)
            y1 = random.randint(0, height)
            x2 = random.randint(0, width)
            y2 = random.randint(0, height)
            color = (
                random.randint(100, 180),
                random.randint(100, 180),
                random.randint(100, 180)
            )
            draw.line([(x1, y1), (x2, y2)], fill=color, width=1)
        
        # Add random dots
        for _ in range(100):
            x = random.randint(0, width)
            y = random.randint(0, height)
            color = (
                random.randint(100, 200),
                random.randint(100, 200),
                random.randint(100, 200)
            )
            draw.point((x, y), fill=color)
    
    def _create_token(self, answer: int) -> str:
        """Create a signed token containing the answer and expiry time."""
        expiry = int(time.time()) + self.EXPIRY_SECONDS
        data = f"{answer}:{expiry}"
        signature = hashlib.sha256(f"{data}:{self.SECRET}".encode()).hexdigest()[:16]
        token = base64.b64encode(f"{data}:{signature}".encode()).decode()
        return token
    
    def _verify_token(self, token: str, user_answer: int) -> tuple[bool, str]:
        """Verify the captcha token and user's answer."""
        try:
            decoded = base64.b64decode(token).decode()
            parts = decoded.split(':')
            if len(parts) != 3:
                return False, "Invalid captcha token"
            
            answer, expiry, signature = parts
            answer = int(answer)
            expiry = int(expiry)
            
            # Verify signature
            data = f"{answer}:{expiry}"
            expected_sig = hashlib.sha256(f"{data}:{self.SECRET}".encode()).hexdigest()[:16]
            if signature != expected_sig:
                return False, "Invalid captcha token"
            
            # Check expiry
            if time.time() > expiry:
                return False, "Captcha expired, please refresh"
            
            # Check answer
            if user_answer != answer:
                return False, "Incorrect answer"
            
            return True, "Success"
        except Exception:
            return False, "Invalid captcha token"
    
    def generate_captcha(self) -> dict:
        """Generate a captcha image and return it with a verification token."""
        problem, answer = self._generate_math_problem()
        
        # Create image with gradient background
        img = Image.new('RGB', (self.width, self.height))
        draw = ImageDraw.Draw(img)
        
        # Gradient background
        for y in range(self.height):
            r = 40 + int(y * 0.3)
            g = 50 + int(y * 0.2)
            b = 70 + int(y * 0.4)
            draw.line([(0, y), (self.width, y)], fill=(r, g, b))
        
        # Add noise
        self._add_noise(draw, self.width, self.height)
        
        # Draw the math problem
        # Use default font (PIL will use a basic font)
        try:
            font = ImageFont.truetype("arial.ttf", 32)
        except OSError:
            font = ImageFont.load_default()
        
        # Calculate text position (center)
        bbox = draw.textbbox((0, 0), problem, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (self.width - text_width) // 2
        y = (self.height - text_height) // 2
        
        # Draw text with slight shadow for depth
        draw.text((x + 2, y + 2), problem, font=font, fill=(30, 30, 50))
        draw.text((x, y), problem, font=font, fill=(255, 255, 255))
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Create verification token
        token = self._create_token(answer)
        
        return {
            'image': f"data:image/png;base64,{image_base64}",
            'token': token,
        }
    
    def verify_captcha(self, token: str, user_answer: int) -> tuple[bool, str]:
        """Verify a captcha answer."""
        return self._verify_token(token, user_answer)


# Singleton instance
captcha_service = CaptchaService()
