from django.db import models
from django.core.cache import cache


class ThemeSettings(models.Model):
    """Store customizable theme/CSS settings."""
    
    # Meta
    name = models.CharField(max_length=100, unique=True, default='default')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Colors - Primary
    primary_color = models.CharField(max_length=7, default='#3B82F6', help_text='Main brand color (hex)')
    primary_hover = models.CharField(max_length=7, default='#2563EB', help_text='Primary hover state (hex)')
    primary_text = models.CharField(max_length=7, default='#FFFFFF', help_text='Text on primary background (hex)')
    
    # Colors - Secondary
    secondary_color = models.CharField(max_length=7, default='#8B5CF6', help_text='Secondary accent color (hex)')
    secondary_hover = models.CharField(max_length=7, default='#7C3AED')
    secondary_text = models.CharField(max_length=7, default='#FFFFFF')
    
    # Colors - Background
    bg_primary = models.CharField(max_length=7, default='#0F172A', help_text='Main background')
    bg_secondary = models.CharField(max_length=7, default='#1E293B', help_text='Card/panel background')
    bg_tertiary = models.CharField(max_length=7, default='#334155', help_text='Hover/elevated background')
    
    # Colors - Text
    text_primary = models.CharField(max_length=7, default='#F1F5F9', help_text='Main text color')
    text_secondary = models.CharField(max_length=7, default='#94A3B8', help_text='Muted text')
    text_tertiary = models.CharField(max_length=7, default='#64748B', help_text='Very muted text')
    
    # Colors - Border
    border_color = models.CharField(max_length=7, default='#334155')
    border_hover = models.CharField(max_length=7, default='#475569')
    
    # Colors - Status
    success_color = models.CharField(max_length=7, default='#10B981')
    warning_color = models.CharField(max_length=7, default='#F59E0B')
    error_color = models.CharField(max_length=7, default='#EF4444')
    info_color = models.CharField(max_length=7, default='#3B82F6')
    
    # Typography
    font_family_base = models.CharField(max_length=200, default='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
    font_family_heading = models.CharField(max_length=200, default='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
    font_family_mono = models.CharField(max_length=200, default='ui-monospace, Menlo, Monaco, "Cascadia Mono", "Courier New", monospace')
    
    font_size_base = models.CharField(max_length=10, default='16px')
    font_size_sm = models.CharField(max_length=10, default='14px')
    font_size_lg = models.CharField(max_length=10, default='18px')
    font_size_xl = models.CharField(max_length=10, default='20px')
    
    # Spacing
    spacing_unit = models.CharField(max_length=10, default='4px', help_text='Base spacing unit')
    border_radius_sm = models.CharField(max_length=10, default='4px')
    border_radius_md = models.CharField(max_length=10, default='8px')
    border_radius_lg = models.CharField(max_length=10, default='12px')
    border_radius_xl = models.CharField(max_length=10, default='16px')
    
    # Components
    navbar_bg = models.CharField(max_length=7, default='#1E293B')
    navbar_text = models.CharField(max_length=7, default='#F1F5F9')
    sidebar_bg = models.CharField(max_length=7, default='#1E293B')
    sidebar_text = models.CharField(max_length=7, default='#F1F5F9')
    
    button_radius = models.CharField(max_length=10, default='8px')
    input_radius = models.CharField(max_length=10, default='6px')
    card_radius = models.CharField(max_length=10, default='12px')
    
    # Shadows
    shadow_sm = models.CharField(max_length=100, default='0 1px 2px 0 rgb(0 0 0 / 0.05)')
    shadow_md = models.CharField(max_length=100, default='0 4px 6px -1px rgb(0 0 0 / 0.1)')
    shadow_lg = models.CharField(max_length=100, default='0 10px 15px -3px rgb(0 0 0 / 0.1)')
    
    # Custom CSS
    custom_css = models.TextField(blank=True, help_text='Additional custom CSS')
    
    class Meta:
        verbose_name = 'Theme Settings'
        verbose_name_plural = 'Theme Settings'
    
    def __str__(self):
        return f"{self.name} {'(Active)' if self.is_active else ''}"
    
    def save(self, *args, **kwargs):
        # If this is being set as active, deactivate all others
        if self.is_active:
            ThemeSettings.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
        # Clear cache when theme is updated
        cache.delete('active_theme_css')
        cache.delete('active_theme_settings')
    
    @classmethod
    def get_active_theme(cls):
        """Get the currently active theme."""
        cached = cache.get('active_theme_settings')
        if cached:
            return cached
        
        theme = cls.objects.filter(is_active=True).first()
        if not theme:
            # Create default theme if none exists
            theme = cls.objects.create(name='default', is_active=True)
        
        cache.set('active_theme_settings', theme, 60 * 60)  # Cache for 1 hour
        return theme
    
    def generate_css(self):
        """Generate CSS from theme settings."""
        css = f"""
/* Auto-generated theme CSS */
:root {{
    /* Colors - Primary */
    --color-primary: {self.primary_color};
    --color-primary-hover: {self.primary_hover};
    --color-primary-text: {self.primary_text};
    
    /* Colors - Secondary */
    --color-secondary: {self.secondary_color};
    --color-secondary-hover: {self.secondary_hover};
    --color-secondary-text: {self.secondary_text};
    
    /* Colors - Background */
    --bg-primary: {self.bg_primary};
    --bg-secondary: {self.bg_secondary};
    --bg-tertiary: {self.bg_tertiary};
    
    /* Colors - Text */
    --text-primary: {self.text_primary};
    --text-secondary: {self.text_secondary};
    --text-tertiary: {self.text_tertiary};
    
    /* Colors - Border */
    --border-color: {self.border_color};
    --border-hover: {self.border_hover};
    
    /* Colors - Status */
    --color-success: {self.success_color};
    --color-warning: {self.warning_color};
    --color-error: {self.error_color};
    --color-info: {self.info_color};
    
    /* Typography */
    --font-base: {self.font_family_base};
    --font-heading: {self.font_family_heading};
    --font-mono: {self.font_family_mono};
    
    --font-size-base: {self.font_size_base};
    --font-size-sm: {self.font_size_sm};
    --font-size-lg: {self.font_size_lg};
    --font-size-xl: {self.font_size_xl};
    
    /* Spacing */
    --spacing-unit: {self.spacing_unit};
    --radius-sm: {self.border_radius_sm};
    --radius-md: {self.border_radius_md};
    --radius-lg: {self.border_radius_lg};
    --radius-xl: {self.border_radius_xl};
    
    /* Components */
    --navbar-bg: {self.navbar_bg};
    --navbar-text: {self.navbar_text};
    --sidebar-bg: {self.sidebar_bg};
    --sidebar-text: {self.sidebar_text};
    
    --button-radius: {self.button_radius};
    --input-radius: {self.input_radius};
    --card-radius: {self.card_radius};
    
    /* Shadows */
    --shadow-sm: {self.shadow_sm};
    --shadow-md: {self.shadow_md};
    --shadow-lg: {self.shadow_lg};
}}

/* Apply theme to body */
body {{
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-base);
    font-size: var(--font-size-base);
}}

/* Custom CSS */
{self.custom_css}
"""
        return css
