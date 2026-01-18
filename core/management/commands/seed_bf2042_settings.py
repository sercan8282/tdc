from django.core.management.base import BaseCommand
from core.models import Game, GameSettingDefinition
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Seeds the database with Battlefield 2042 graphics settings'

    def handle(self, *args, **options):
        game_name = 'Battlefield 2042'
        
        # Create or get Battlefield 2042 game
        game, created = Game.objects.get_or_create(
            name=game_name,
            defaults={
                'slug': slugify(game_name),
                'description': 'Battlefield 2042 (Battlefield 6) - Large-scale warfare FPS by DICE/EA',
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created game: {game_name}'))
        else:
            self.stdout.write(f'Game already exists: {game_name}')

        # Battlefield 2042 specific settings
        settings = [
            # Display Settings
            {'name': 'fullscreen_mode', 'display_name': 'Fullscreen Mode', 'category': 'display', 'field_type': 'select', 'options': 'Fullscreen,Borderless,Windowed', 'default_value': 'Fullscreen', 'order': 1},
            {'name': 'fullscreen_resolution', 'display_name': 'Fullscreen Resolution', 'category': 'display', 'field_type': 'select', 'options': '1920x1080,2560x1440,3840x2160,1280x720,1600x900', 'default_value': '1920x1080', 'order': 2},
            {'name': 'refresh_rate', 'display_name': 'Refresh Rate', 'category': 'display', 'field_type': 'select', 'options': '60Hz,120Hz,144Hz,165Hz,240Hz,360Hz', 'default_value': '60Hz', 'order': 3},
            {'name': 'field_of_view', 'display_name': 'Field of View', 'category': 'display', 'field_type': 'slider', 'min_value': 55, 'max_value': 105, 'default_value': '74', 'order': 4},
            {'name': 'ads_field_of_view', 'display_name': 'ADS Field of View', 'category': 'display', 'field_type': 'toggle', 'default_value': 'Off', 'order': 5},
            {'name': 'vehicle_field_of_view', 'display_name': 'Vehicle 3rd Person FOV', 'category': 'display', 'field_type': 'slider', 'min_value': 55, 'max_value': 95, 'default_value': '74', 'order': 6},
            {'name': 'brightness', 'display_name': 'Brightness', 'category': 'display', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '50', 'order': 7},
            {'name': 'hdr_enabled', 'display_name': 'HDR', 'category': 'display', 'field_type': 'toggle', 'default_value': 'Off', 'order': 8},
            {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'display', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '50', 'order': 9},
            {'name': 'weapon_motion_blur', 'display_name': 'Weapon Motion Blur', 'category': 'display', 'field_type': 'toggle', 'default_value': 'On', 'order': 10},
            {'name': 'chromatic_aberration', 'display_name': 'Chromatic Aberration', 'category': 'display', 'field_type': 'toggle', 'default_value': 'On', 'order': 11},
            {'name': 'film_grain', 'display_name': 'Film Grain', 'category': 'display', 'field_type': 'toggle', 'default_value': 'On', 'order': 12},
            {'name': 'vignette', 'display_name': 'Vignette', 'category': 'display', 'field_type': 'toggle', 'default_value': 'On', 'order': 13},
            {'name': 'lens_distortion', 'display_name': 'Lens Distortion', 'category': 'display', 'field_type': 'toggle', 'default_value': 'On', 'order': 14},

            # Graphics Quality Settings
            {'name': 'graphics_quality', 'display_name': 'Graphics Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra,Custom', 'default_value': 'High', 'order': 1},
            {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
            {'name': 'texture_filtering', 'display_name': 'Texture Filtering', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'Ultra', 'order': 3},
            {'name': 'lighting_quality', 'display_name': 'Lighting Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 4},
            {'name': 'effects_quality', 'display_name': 'Effects Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 5},
            {'name': 'post_process_quality', 'display_name': 'Post Process Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 6},
            {'name': 'mesh_quality', 'display_name': 'Mesh Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 7},
            {'name': 'undergrowth_quality', 'display_name': 'Undergrowth Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'Medium', 'order': 8},
            {'name': 'terrain_quality', 'display_name': 'Terrain Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 9},
            {'name': 'terrain_decoration_quality', 'display_name': 'Terrain Decoration Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'Medium', 'order': 10},
            {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing Post', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,TAA Low,TAA High', 'default_value': 'TAA High', 'order': 11},
            {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,HBAO,SSAO', 'default_value': 'HBAO', 'order': 12},

            # Advanced Graphics Settings
            {'name': 'gpu_memory_restriction', 'display_name': 'GPU Memory Restriction', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 1},
            {'name': 'dynamic_resolution_scale', 'display_name': 'Dynamic Resolution Scale', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 2},
            {'name': 'dynamic_resolution_min', 'display_name': 'Dynamic Resolution Minimum', 'category': 'advanced', 'field_type': 'slider', 'min_value': 50, 'max_value': 100, 'default_value': '75', 'order': 3},
            {'name': 'dlss', 'display_name': 'DLSS (NVIDIA)', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Performance,Balanced,Quality,Ultra Quality', 'default_value': 'Off', 'order': 4},
            {'name': 'dlss_sharpness', 'display_name': 'DLSS Sharpness', 'category': 'advanced', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '50', 'order': 5},
            {'name': 'dlss_frame_generation', 'display_name': 'DLSS Frame Generation', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 6},
            {'name': 'nvidia_reflex', 'display_name': 'NVIDIA Reflex Low Latency', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,On,On + Boost', 'default_value': 'On', 'order': 7},
            {'name': 'fsr', 'display_name': 'AMD FSR (FidelityFX)', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Performance,Balanced,Quality,Ultra Quality', 'default_value': 'Off', 'order': 8},
            {'name': 'fsr_sharpness', 'display_name': 'FSR Sharpness', 'category': 'advanced', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '50', 'order': 9},
            {'name': 'future_frame_rendering', 'display_name': 'Future Frame Rendering', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'On', 'order': 10},
            {'name': 'vertical_sync', 'display_name': 'Vertical Sync', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 11},
            {'name': 'framerate_limiter', 'display_name': 'Framerate Limiter', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,30,60,90,120,144,165,200,240', 'default_value': 'Off', 'order': 12},
            {'name': 'render_scale', 'display_name': 'Render Scale', 'category': 'advanced', 'field_type': 'slider', 'min_value': 25, 'max_value': 200, 'default_value': '100', 'order': 13},
            {'name': 'ray_traced_ambient_occlusion', 'display_name': 'Ray Traced Ambient Occlusion', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 14},

            # Audio Settings
            {'name': 'master_volume', 'display_name': 'Master Volume', 'category': 'audio', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '100', 'order': 1},
            {'name': 'music_volume', 'display_name': 'Music Volume', 'category': 'audio', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '50', 'order': 2},
            {'name': 'effects_volume', 'display_name': 'Effects Volume', 'category': 'audio', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '100', 'order': 3},
            {'name': 'dialogue_volume', 'display_name': 'Dialogue Volume', 'category': 'audio', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '100', 'order': 4},
            {'name': 'voice_chat_volume', 'display_name': 'Voice Chat Volume', 'category': 'audio', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '100', 'order': 5},
            {'name': 'voice_chat_output', 'display_name': 'Voice Chat Output', 'category': 'audio', 'field_type': 'select', 'options': 'Headphones,Speakers,Both', 'default_value': 'Headphones', 'order': 6},
            {'name': 'speaker_configuration', 'display_name': 'Speaker Configuration', 'category': 'audio', 'field_type': 'select', 'options': 'Headphones,Stereo,Home Cinema,TV Speakers,War Tapes', 'default_value': 'Headphones', 'order': 7},
            {'name': 'audio_language', 'display_name': 'Audio Language', 'category': 'audio', 'field_type': 'select', 'options': 'English,German,French,Spanish,Italian,Dutch,Portuguese,Polish,Russian,Japanese,Korean,Chinese', 'default_value': 'English', 'order': 8},
            {'name': 'subtitles', 'display_name': 'Subtitles', 'category': 'audio', 'field_type': 'toggle', 'default_value': 'On', 'order': 9},
            {'name': '3d_headphones', 'display_name': '3D Headphones', 'category': 'audio', 'field_type': 'toggle', 'default_value': 'Off', 'order': 10},

            # Gameplay Settings
            {'name': 'minimap_size', 'display_name': 'Minimap Size', 'category': 'gameplay', 'field_type': 'slider', 'min_value': 75, 'max_value': 150, 'default_value': '100', 'order': 1},
            {'name': 'minimap_zoom', 'display_name': 'Minimap Zoom', 'category': 'gameplay', 'field_type': 'slider', 'min_value': 100, 'max_value': 200, 'default_value': '120', 'order': 2},
            {'name': 'hud_scale', 'display_name': 'HUD Scale', 'category': 'gameplay', 'field_type': 'slider', 'min_value': 50, 'max_value': 150, 'default_value': '100', 'order': 3},
            {'name': 'hud_opacity', 'display_name': 'HUD Opacity', 'category': 'gameplay', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '100', 'order': 4},
            {'name': 'crosshair_color', 'display_name': 'Crosshair Color', 'category': 'gameplay', 'field_type': 'select', 'options': 'White,Red,Green,Blue,Yellow,Cyan,Magenta', 'default_value': 'White', 'order': 5},
            {'name': 'hit_indicator', 'display_name': 'Hit Indicator', 'category': 'gameplay', 'field_type': 'toggle', 'default_value': 'On', 'order': 6},
            {'name': 'kill_log', 'display_name': 'Kill Log', 'category': 'gameplay', 'field_type': 'toggle', 'default_value': 'On', 'order': 7},
            {'name': 'vehicle_third_person_camera', 'display_name': 'Vehicle 3rd Person Camera', 'category': 'gameplay', 'field_type': 'toggle', 'default_value': 'On', 'order': 8},
            {'name': 'auto_lean', 'display_name': 'Auto Lean', 'category': 'gameplay', 'field_type': 'toggle', 'default_value': 'On', 'order': 9},
            {'name': 'soldier_sprint', 'display_name': 'Soldier Sprint', 'category': 'gameplay', 'field_type': 'select', 'options': 'Hold,Toggle', 'default_value': 'Hold', 'order': 10},
            {'name': 'soldier_crouch', 'display_name': 'Soldier Crouch', 'category': 'gameplay', 'field_type': 'select', 'options': 'Hold,Toggle', 'default_value': 'Toggle', 'order': 11},
            {'name': 'soldier_aim', 'display_name': 'Soldier Aim', 'category': 'gameplay', 'field_type': 'select', 'options': 'Hold,Toggle', 'default_value': 'Hold', 'order': 12},

            # Mouse & Keyboard Settings
            {'name': 'mouse_sensitivity', 'display_name': 'Mouse Sensitivity', 'category': 'controls', 'field_type': 'slider', 'min_value': 1, 'max_value': 100, 'default_value': '15', 'order': 1},
            {'name': 'mouse_vertical_ratio', 'display_name': 'Mouse Vertical Ratio', 'category': 'controls', 'field_type': 'slider', 'min_value': 50, 'max_value': 200, 'default_value': '100', 'order': 2},
            {'name': 'soldier_zoom_sensitivity', 'display_name': 'Soldier Zoom Sensitivity', 'category': 'controls', 'field_type': 'slider', 'min_value': 1, 'max_value': 100, 'default_value': '100', 'order': 3},
            {'name': 'vehicle_mouse_sensitivity', 'display_name': 'Vehicle Mouse Sensitivity', 'category': 'controls', 'field_type': 'slider', 'min_value': 1, 'max_value': 100, 'default_value': '50', 'order': 4},
            {'name': 'uniform_soldier_aiming', 'display_name': 'Uniform Soldier Aiming', 'category': 'controls', 'field_type': 'toggle', 'default_value': 'Off', 'order': 5},
            {'name': 'raw_mouse_input', 'display_name': 'Raw Mouse Input', 'category': 'controls', 'field_type': 'toggle', 'default_value': 'On', 'order': 6},
            {'name': 'invert_vertical_look', 'display_name': 'Invert Vertical Look', 'category': 'controls', 'field_type': 'toggle', 'default_value': 'Off', 'order': 7},
        ]

        # Add settings
        settings_created = 0
        for setting in settings:
            # Convert options from comma-separated string to list for JSONField
            options_value = None
            if setting.get('options'):
                options_value = [opt.strip() for opt in setting['options'].split(',')]
            
            _, was_created = GameSettingDefinition.objects.get_or_create(
                game=game,
                name=setting['name'],
                defaults={
                    'display_name': setting['display_name'],
                    'category': setting['category'],
                    'field_type': setting['field_type'],
                    'options': options_value,
                    'min_value': setting.get('min_value'),
                    'max_value': setting.get('max_value'),
                    'default_value': setting.get('default_value', ''),
                    'order': setting.get('order', 0)
                }
            )
            if was_created:
                settings_created += 1

        self.stdout.write(self.style.SUCCESS(f'Added {settings_created} new settings for {game_name}'))
        self.stdout.write(self.style.SUCCESS(f'Battlefield 2042 seeding complete!'))
