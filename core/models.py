from django.db import models
from django.utils.text import slugify


class Game(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='games/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Category(models.Model):
    name = models.CharField(max_length=100)
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='categories')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['name']
        unique_together = ('name', 'game')

    def __str__(self):
        return f"{self.name} ({self.game.name})"


class Weapon(models.Model):
    SIZE_CHOICES = [
        ('small', 'Small'),
        ('medium', 'Medium'),
        ('large', 'Large'),
    ]

    name = models.CharField(max_length=150)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='weapons')
    image = models.ImageField(upload_to='weapons/', blank=True, null=True)
    text_color = models.CharField(
        max_length=7,
        default='#FFFFFF',
        help_text='Hex color code (e.g., #FFFFFF)'
    )
    image_size = models.CharField(
        max_length=10,
        choices=SIZE_CHOICES,
        default='medium'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ('name', 'category')

    def __str__(self):
        return self.name


class Attachment(models.Model):
    TYPE_CHOICES = [
        ('Muzzle', 'Muzzle'),
        ('Optic', 'Optic'),
        ('Stock', 'Stock'),
        ('Grip', 'Grip'),
        ('Magazine', 'Magazine'),
        ('Underbarrel', 'Underbarrel'),
        ('Ammunition', 'Ammunition'),
        ('Perk', 'Perk'),
    ]

    name = models.CharField(max_length=150)
    weapon = models.ForeignKey(Weapon, on_delete=models.CASCADE, related_name='attachments')
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    image = models.ImageField(upload_to='attachments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['type', 'name']
        unique_together = ('name', 'weapon')

    def __str__(self):
        return self.name


class GlobalSettings(models.Model):
    banner_text = models.TextField(blank=True, null=True)
    is_banner_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Global Settings'

    def __str__(self):
        return 'Global Settings'


class GameSettingDefinition(models.Model):
    """Defines which settings fields are available for each game"""
    FIELD_TYPE_CHOICES = [
        ('select', 'Dropdown Select'),
        ('number', 'Number'),
        ('toggle', 'On/Off Toggle'),
        ('text', 'Text Input'),
    ]
    
    CATEGORY_CHOICES = [
        ('display', 'Display'),
        ('graphics', 'Graphics Quality'),
        ('advanced', 'Advanced Graphics'),
        ('postprocess', 'Post Processing'),
        ('view', 'View Settings'),
        ('audio', 'Audio'),
        ('controls', 'Controls'),
    ]

    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='setting_definitions')
    name = models.CharField(max_length=100, help_text='Internal name (e.g., texture_quality)')
    display_name = models.CharField(max_length=100, help_text='Display name (e.g., Texture Quality)')
    field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES, default='select')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='graphics')
    options = models.JSONField(
        blank=True, 
        null=True, 
        help_text='For select fields: ["Low", "Medium", "High", "Ultra"]'
    )
    min_value = models.IntegerField(blank=True, null=True, help_text='For number fields')
    max_value = models.IntegerField(blank=True, null=True, help_text='For number fields')
    default_value = models.CharField(max_length=100, blank=True, null=True)
    order = models.IntegerField(default=0, help_text='Display order within category')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['game', 'category', 'order', 'display_name']
        unique_together = ('game', 'name')

    def __str__(self):
        return f"{self.game.name} - {self.display_name}"


class GameSettingProfile(models.Model):
    """A saved profile of game settings"""
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='setting_profiles')
    name = models.CharField(max_length=100, help_text='Profile name (e.g., "Competitive Settings")')
    description = models.TextField(blank=True, null=True)
    processor_type = models.CharField(max_length=150, blank=True, null=True, help_text='e.g., Intel Core i7-13700K')
    ram = models.CharField(max_length=100, blank=True, null=True, help_text='e.g., 32GB DDR5')
    graphic_card = models.CharField(max_length=150, blank=True, null=True, help_text='e.g., NVIDIA RTX 4080')
    values = models.JSONField(default=dict, help_text='Setting values as {setting_name: value}')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['game', 'name']

    def __str__(self):
        return f"{self.game.name} - {self.name}"
