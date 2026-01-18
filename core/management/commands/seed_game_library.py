from django.core.management.base import BaseCommand
from core.models import Game, GameSettingDefinition
from django.utils.text import slugify


class Command(BaseCommand):
    help = 'Seeds the database with a library of 20 popular games and their graphics settings'

    def handle(self, *args, **options):
        games_data = self.get_games_library()
        
        for game_data in games_data:
            game_name = game_data['name']
            settings = game_data['settings']
            
            # Create or get game
            game, created = Game.objects.get_or_create(
                name=game_name,
                defaults={
                    'slug': slugify(game_name),
                    'description': game_data.get('description', f'Graphics settings for {game_name}'),
                    'is_active': True
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created game: {game_name}'))
            else:
                self.stdout.write(f'Game already exists: {game_name}')
            
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
            
            self.stdout.write(f'  Added {settings_created} new settings for {game_name}')
        
        self.stdout.write(self.style.SUCCESS(f'\nLibrary seeding complete! Total games: {Game.objects.count()}'))

    def get_games_library(self):
        """Returns a list of 20 popular games with their settings"""
        
        # Common display settings template
        common_display = [
            {'name': 'display_mode', 'display_name': 'Display Mode', 'category': 'display', 'field_type': 'select', 'options': 'Fullscreen,Windowed,Borderless', 'default_value': 'Fullscreen', 'order': 1},
            {'name': 'resolution', 'display_name': 'Resolution', 'category': 'display', 'field_type': 'select', 'options': '1920x1080,2560x1440,3840x2160,1280x720', 'default_value': '1920x1080', 'order': 2},
            {'name': 'refresh_rate', 'display_name': 'Refresh Rate', 'category': 'display', 'field_type': 'select', 'options': '60Hz,120Hz,144Hz,165Hz,240Hz', 'default_value': '60Hz', 'order': 3},
            {'name': 'vsync', 'display_name': 'V-Sync', 'category': 'display', 'field_type': 'toggle', 'default_value': 'Off', 'order': 4},
            {'name': 'aspect_ratio', 'display_name': 'Aspect Ratio', 'category': 'display', 'field_type': 'select', 'options': 'Auto,16:9,21:9,4:3', 'default_value': 'Auto', 'order': 5},
        ]
        
        # Common graphics quality settings
        common_graphics = [
            {'name': 'graphics_quality', 'display_name': 'Graphics Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra,Custom', 'default_value': 'High', 'order': 1},
            {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
            {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 3},
            {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,FXAA,TAA,SMAA,MSAA 2x,MSAA 4x', 'default_value': 'TAA', 'order': 4},
            {'name': 'anisotropic_filtering', 'display_name': 'Anisotropic Filtering', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,2x,4x,8x,16x', 'default_value': '16x', 'order': 5},
        ]
        
        return [
            # 1. EA Sports FC 25 (FIFA)
            {
                'name': 'EA Sports FC 25',
                'description': 'Football/Soccer simulation game by EA Sports',
                'settings': common_display + common_graphics + [
                    {'name': 'rendering_quality', 'display_name': 'Rendering Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 6},
                    {'name': 'strand_based_hair', 'display_name': 'Strand-Based Hair', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 7},
                    {'name': 'lighting_quality', 'display_name': 'Lighting Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 8},
                    {'name': 'crowd_quality', 'display_name': 'Crowd Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 9},
                    {'name': 'grass_quality', 'display_name': 'Grass Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 10},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 2},
                    {'name': 'frame_rate_limit', 'display_name': 'Frame Rate Limit', 'category': 'display', 'field_type': 'select', 'options': 'Off,30,60,120,144', 'default_value': 'Off', 'order': 6},
                ]
            },
            
            # 2. GTA 5 / GTA Online
            {
                'name': 'Grand Theft Auto V',
                'description': 'Open world action-adventure game by Rockstar Games',
                'settings': common_display + [
                    {'name': 'fxaa', 'display_name': 'FXAA', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'msaa', 'display_name': 'MSAA', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,2x,4x,8x', 'default_value': '2x', 'order': 2},
                    {'name': 'population_density', 'display_name': 'Population Density', 'category': 'graphics', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '75', 'order': 3},
                    {'name': 'population_variety', 'display_name': 'Population Variety', 'category': 'graphics', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '75', 'order': 4},
                    {'name': 'distance_scaling', 'display_name': 'Distance Scaling', 'category': 'graphics', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '50', 'order': 5},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Normal,High,Very High', 'default_value': 'Very High', 'order': 6},
                    {'name': 'shader_quality', 'display_name': 'Shader Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Normal,High,Very High', 'default_value': 'Very High', 'order': 7},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Normal,High,Very High,Ultra', 'default_value': 'Very High', 'order': 8},
                    {'name': 'reflection_quality', 'display_name': 'Reflection Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Normal,High,Very High,Ultra', 'default_value': 'Very High', 'order': 9},
                    {'name': 'reflection_msaa', 'display_name': 'Reflection MSAA', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,2x,4x,8x', 'default_value': '2x', 'order': 10},
                    {'name': 'water_quality', 'display_name': 'Water Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Normal,High,Very High', 'default_value': 'Very High', 'order': 11},
                    {'name': 'particles_quality', 'display_name': 'Particles Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Normal,High,Very High', 'default_value': 'Very High', 'order': 12},
                    {'name': 'grass_quality', 'display_name': 'Grass Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Normal,High,Very High,Ultra', 'default_value': 'Very High', 'order': 13},
                    {'name': 'soft_shadows', 'display_name': 'Soft Shadows', 'category': 'graphics', 'field_type': 'select', 'options': 'Softer,Soft,Sharp,AMD CHS', 'default_value': 'Soft', 'order': 14},
                    {'name': 'post_fx', 'display_name': 'Post FX', 'category': 'postprocess', 'field_type': 'select', 'options': 'Normal,High,Very High,Ultra', 'default_value': 'Very High', 'order': 1},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur Strength', 'category': 'postprocess', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '50', 'order': 2},
                    {'name': 'dof', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 3},
                    {'name': 'anisotropic_filtering', 'display_name': 'Anisotropic Filtering', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,2x,4x,8x,16x', 'default_value': '16x', 'order': 15},
                    {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Normal,High', 'default_value': 'High', 'order': 16},
                    {'name': 'tessellation', 'display_name': 'Tessellation', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Normal,High,Very High', 'default_value': 'Very High', 'order': 17},
                ]
            },
            
            # 3. Microsoft Flight Simulator
            {
                'name': 'Microsoft Flight Simulator',
                'description': 'Flight simulation game by Asobo Studio and Xbox Game Studios',
                'settings': common_display + [
                    {'name': 'global_rendering_quality', 'display_name': 'Global Rendering Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low-End,Medium,High-End,Ultra', 'default_value': 'High-End', 'order': 1},
                    {'name': 'render_scaling', 'display_name': 'Render Scaling', 'category': 'graphics', 'field_type': 'select', 'options': '50,60,70,80,90,100,110,120,130,150,200', 'default_value': '100', 'order': 2},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,DLAA,FXAA,TAA', 'default_value': 'TAA', 'order': 3},
                    {'name': 'terrain_lod', 'display_name': 'Terrain Level of Detail', 'category': 'graphics', 'field_type': 'slider', 'min_value': 10, 'max_value': 200, 'default_value': '100', 'order': 4},
                    {'name': 'terrain_vector_data', 'display_name': 'Terrain Vector Data', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 5},
                    {'name': 'buildings', 'display_name': 'Buildings', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 6},
                    {'name': 'trees', 'display_name': 'Trees', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 7},
                    {'name': 'grass_bushes', 'display_name': 'Grass and Bushes', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 8},
                    {'name': 'objects_lod', 'display_name': 'Objects Level of Detail', 'category': 'graphics', 'field_type': 'slider', 'min_value': 10, 'max_value': 200, 'default_value': '100', 'order': 9},
                    {'name': 'volumetric_clouds', 'display_name': 'Volumetric Clouds', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 10},
                    {'name': 'texture_resolution', 'display_name': 'Texture Resolution', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 11},
                    {'name': 'anisotropic_filtering', 'display_name': 'Anisotropic Filtering', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,2x,4x,8x,16x', 'default_value': '16x', 'order': 12},
                    {'name': 'texture_supersampling', 'display_name': 'Texture Supersampling', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,2x2,4x4,6x6,8x8', 'default_value': '4x4', 'order': 13},
                    {'name': 'texture_synthesis', 'display_name': 'Texture Synthesis', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 14},
                    {'name': 'water_waves', 'display_name': 'Water Waves', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 15},
                    {'name': 'shadow_maps', 'display_name': 'Shadow Maps', 'category': 'graphics', 'field_type': 'select', 'options': '768,1024,1536,2048', 'default_value': '1536', 'order': 16},
                    {'name': 'terrain_shadows', 'display_name': 'Terrain Shadows', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,128,256,512,1024,2048', 'default_value': '512', 'order': 17},
                    {'name': 'contact_shadows', 'display_name': 'Contact Shadows', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 18},
                    {'name': 'windshield_effects', 'display_name': 'Windshield Effects', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 19},
                    {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 20},
                    {'name': 'reflections', 'display_name': 'Reflections', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 21},
                    {'name': 'light_shafts', 'display_name': 'Light Shafts', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'bloom', 'display_name': 'Bloom', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 2},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 3},
                    {'name': 'lens_flare', 'display_name': 'Lens Flare', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 4},
                ]
            },
            
            # 4. Forza Horizon 5
            {
                'name': 'Forza Horizon 5',
                'description': 'Open world racing game by Playground Games',
                'settings': common_display + [
                    {'name': 'graphics_preset', 'display_name': 'Graphics Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Very Low,Low,Medium,High,Ultra,Extreme,Custom', 'default_value': 'High', 'order': 1},
                    {'name': 'anisotropic_filtering', 'display_name': 'Anisotropic Filtering', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra,Extreme', 'default_value': 'High', 'order': 3},
                    {'name': 'night_shadows', 'display_name': 'Night Shadows', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 4},
                    {'name': 'motion_blur_quality', 'display_name': 'Motion Blur Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Short,Medium,Long,Ultra Long', 'default_value': 'Medium', 'order': 5},
                    {'name': 'environment_texture_quality', 'display_name': 'Environment Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra,Extreme', 'default_value': 'High', 'order': 6},
                    {'name': 'environment_geometry_quality', 'display_name': 'Environment Geometry Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra,Extreme', 'default_value': 'High', 'order': 7},
                    {'name': 'ssao_quality', 'display_name': 'SSAO Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra,Extreme', 'default_value': 'High', 'order': 8},
                    {'name': 'reflection_quality', 'display_name': 'Reflection Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra,Extreme', 'default_value': 'High', 'order': 9},
                    {'name': 'world_car_lod', 'display_name': 'World Car Level of Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Very Low,Low,Medium,High,Ultra,Extreme', 'default_value': 'High', 'order': 10},
                    {'name': 'deformable_terrain', 'display_name': 'Deformable Terrain', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 11},
                    {'name': 'car_shader_quality', 'display_name': 'Car Shader Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 12},
                    {'name': 'msaa', 'display_name': 'MSAA', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,2x,4x,8x', 'default_value': '4x', 'order': 13},
                    {'name': 'fxaa', 'display_name': 'FXAA', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'Off', 'order': 14},
                    {'name': 'ray_tracing', 'display_name': 'Ray Tracing', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 1},
                    {'name': 'lens_effects', 'display_name': 'Lens Effects', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'shader_quality', 'display_name': 'Shader Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 15},
                ]
            },
            
            # 5. Fortnite
            {
                'name': 'Fortnite',
                'description': 'Battle royale game by Epic Games',
                'settings': common_display + [
                    {'name': 'quality_presets', 'display_name': 'Quality Presets', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Epic,Custom', 'default_value': 'High', 'order': 1},
                    {'name': '3d_resolution', 'display_name': '3D Resolution', 'category': 'graphics', 'field_type': 'slider', 'min_value': 25, 'max_value': 100, 'default_value': '100', 'order': 2},
                    {'name': 'view_distance', 'display_name': 'View Distance', 'category': 'graphics', 'field_type': 'select', 'options': 'Near,Medium,Far,Epic', 'default_value': 'Epic', 'order': 3},
                    {'name': 'shadows', 'display_name': 'Shadows', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Epic', 'default_value': 'High', 'order': 4},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Epic', 'default_value': 'High', 'order': 5},
                    {'name': 'textures', 'display_name': 'Textures', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Epic', 'default_value': 'High', 'order': 6},
                    {'name': 'effects', 'display_name': 'Effects', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Epic', 'default_value': 'High', 'order': 7},
                    {'name': 'post_processing', 'display_name': 'Post Processing', 'category': 'postprocess', 'field_type': 'select', 'options': 'Low,Medium,High,Epic', 'default_value': 'High', 'order': 1},
                    {'name': 'hardware_ray_tracing', 'display_name': 'Hardware Ray Tracing', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 1},
                    {'name': 'nvidia_reflex', 'display_name': 'NVIDIA Reflex Low Latency', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,On,On + Boost', 'default_value': 'On', 'order': 2},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 2},
                    {'name': 'show_fps', 'display_name': 'Show FPS', 'category': 'display', 'field_type': 'toggle', 'default_value': 'Off', 'order': 6},
                    {'name': 'rendering_mode', 'display_name': 'Rendering Mode', 'category': 'advanced', 'field_type': 'select', 'options': 'DirectX 11,DirectX 12,Performance Mode', 'default_value': 'DirectX 12', 'order': 3},
                ]
            },
            
            # 6. Apex Legends
            {
                'name': 'Apex Legends',
                'description': 'Battle royale hero shooter by Respawn Entertainment',
                'settings': common_display + [
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'None,TSAA', 'default_value': 'TSAA', 'order': 1},
                    {'name': 'texture_streaming_budget', 'display_name': 'Texture Streaming Budget', 'category': 'graphics', 'field_type': 'select', 'options': 'None,2GB VRAM,2-3GB VRAM,3GB VRAM,4GB VRAM,6GB VRAM,8GB VRAM', 'default_value': '4GB VRAM', 'order': 2},
                    {'name': 'texture_filtering', 'display_name': 'Texture Filtering', 'category': 'graphics', 'field_type': 'select', 'options': 'Bilinear,Trilinear,Anisotropic 2x,Anisotropic 4x,Anisotropic 8x,Anisotropic 16x', 'default_value': 'Anisotropic 16x', 'order': 3},
                    {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Disabled,Low,Medium,High', 'default_value': 'High', 'order': 4},
                    {'name': 'sun_shadow_coverage', 'display_name': 'Sun Shadow Coverage', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,High', 'default_value': 'High', 'order': 5},
                    {'name': 'sun_shadow_detail', 'display_name': 'Sun Shadow Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,High', 'default_value': 'High', 'order': 6},
                    {'name': 'spot_shadow_detail', 'display_name': 'Spot Shadow Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Disabled,Low,High,Very High', 'default_value': 'High', 'order': 7},
                    {'name': 'volumetric_lighting', 'display_name': 'Volumetric Lighting', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 8},
                    {'name': 'dynamic_spot_shadows', 'display_name': 'Dynamic Spot Shadows', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 9},
                    {'name': 'model_detail', 'display_name': 'Model Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 10},
                    {'name': 'effects_detail', 'display_name': 'Effects Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 11},
                    {'name': 'impact_marks', 'display_name': 'Impact Marks', 'category': 'graphics', 'field_type': 'select', 'options': 'Disabled,Low,High', 'default_value': 'High', 'order': 12},
                    {'name': 'ragdolls', 'display_name': 'Ragdolls', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 13},
                    {'name': 'nvidia_reflex', 'display_name': 'NVIDIA Reflex', 'category': 'advanced', 'field_type': 'select', 'options': 'Disabled,Enabled,Enabled + Boost', 'default_value': 'Enabled', 'order': 1},
                ]
            },
            
            # 7. Valorant
            {
                'name': 'Valorant',
                'description': 'Tactical shooter by Riot Games',
                'settings': common_display + [
                    {'name': 'multithreaded_rendering', 'display_name': 'Multithreaded Rendering', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'material_quality', 'display_name': 'Material Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 2},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 3},
                    {'name': 'detail_quality', 'display_name': 'Detail Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 4},
                    {'name': 'ui_quality', 'display_name': 'UI Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 5},
                    {'name': 'vignette', 'display_name': 'Vignette', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 1},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'None,MSAA 2x,MSAA 4x,FXAA', 'default_value': 'MSAA 4x', 'order': 6},
                    {'name': 'anisotropic_filtering', 'display_name': 'Anisotropic Filtering', 'category': 'graphics', 'field_type': 'select', 'options': '1x,2x,4x,8x,16x', 'default_value': '16x', 'order': 7},
                    {'name': 'improve_clarity', 'display_name': 'Improve Clarity', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 2},
                    {'name': 'bloom', 'display_name': 'Bloom', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 3},
                    {'name': 'distortion', 'display_name': 'Distortion', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 4},
                    {'name': 'cast_shadows', 'display_name': 'Cast Shadows', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 8},
                    {'name': 'nvidia_reflex', 'display_name': 'NVIDIA Reflex Low Latency', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,On,On + Boost', 'default_value': 'On + Boost', 'order': 1},
                ]
            },
            
            # 8. Counter-Strike 2 (CS2)
            {
                'name': 'Counter-Strike 2',
                'description': 'Tactical shooter by Valve',
                'settings': common_display + [
                    {'name': 'global_shadow_quality', 'display_name': 'Global Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Very Low,Low,Medium,High', 'default_value': 'High', 'order': 1},
                    {'name': 'model_detail', 'display_name': 'Model / Texture Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 2},
                    {'name': 'texture_filtering', 'display_name': 'Texture Filtering Mode', 'category': 'graphics', 'field_type': 'select', 'options': 'Bilinear,Trilinear,Anisotropic 2x,Anisotropic 4x,Anisotropic 8x,Anisotropic 16x', 'default_value': 'Anisotropic 8x', 'order': 3},
                    {'name': 'shader_detail', 'display_name': 'Shader Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 4},
                    {'name': 'particle_detail', 'display_name': 'Particle Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 5},
                    {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion', 'category': 'graphics', 'field_type': 'select', 'options': 'Disabled,Medium,High', 'default_value': 'High', 'order': 6},
                    {'name': 'high_dynamic_range', 'display_name': 'High Dynamic Range', 'category': 'graphics', 'field_type': 'select', 'options': 'Performance,Quality', 'default_value': 'Quality', 'order': 7},
                    {'name': 'fidelityfx_super_resolution', 'display_name': 'FidelityFX Super Resolution', 'category': 'advanced', 'field_type': 'select', 'options': 'Disabled,Ultra Quality,Quality,Balanced,Performance', 'default_value': 'Disabled', 'order': 1},
                    {'name': 'nvidia_reflex', 'display_name': 'NVIDIA Reflex Low Latency', 'category': 'advanced', 'field_type': 'select', 'options': 'Disabled,Enabled,Enabled + Boost', 'default_value': 'Enabled', 'order': 2},
                    {'name': 'multisampling_aa', 'display_name': 'Multisampling Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'None,CMAA2,2x MSAA,4x MSAA,8x MSAA', 'default_value': '4x MSAA', 'order': 8},
                ]
            },
            
            # 9. Cyberpunk 2077
            {
                'name': 'Cyberpunk 2077',
                'description': 'Open world action RPG by CD Projekt Red',
                'settings': common_display + [
                    {'name': 'quick_preset', 'display_name': 'Quick Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra,Ray Tracing: Low,Ray Tracing: Medium,Ray Tracing: Ultra,Ray Tracing: Overdrive', 'default_value': 'High', 'order': 1},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 2},
                    {'name': 'film_grain', 'display_name': 'Film Grain', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'chromatic_aberration', 'display_name': 'Chromatic Aberration', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 2},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 3},
                    {'name': 'lens_flare', 'display_name': 'Lens Flare', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 4},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'select', 'options': 'Off,Low,High', 'default_value': 'Low', 'order': 5},
                    {'name': 'contact_shadows', 'display_name': 'Contact Shadows', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 3},
                    {'name': 'improved_facial_lighting', 'display_name': 'Improved Facial Lighting Geometry', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 4},
                    {'name': 'anisotropy', 'display_name': 'Anisotropy', 'category': 'graphics', 'field_type': 'select', 'options': '1,4,8,16', 'default_value': '16', 'order': 5},
                    {'name': 'local_shadow_mesh_quality', 'display_name': 'Local Shadow Mesh Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 6},
                    {'name': 'local_shadow_quality', 'display_name': 'Local Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 7},
                    {'name': 'cascaded_shadows_range', 'display_name': 'Cascaded Shadows Range', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 8},
                    {'name': 'cascaded_shadows_resolution', 'display_name': 'Cascaded Shadows Resolution', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 9},
                    {'name': 'distant_shadows_resolution', 'display_name': 'Distant Shadows Resolution', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,High', 'default_value': 'High', 'order': 10},
                    {'name': 'volumetric_fog_resolution', 'display_name': 'Volumetric Fog Resolution', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 11},
                    {'name': 'volumetric_cloud_quality', 'display_name': 'Volumetric Cloud Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 12},
                    {'name': 'max_dynamic_decals', 'display_name': 'Max Dynamic Decals', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 13},
                    {'name': 'screen_space_reflections', 'display_name': 'Screen Space Reflections Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra,Psycho', 'default_value': 'High', 'order': 14},
                    {'name': 'subsurface_scattering', 'display_name': 'Subsurface Scattering Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 15},
                    {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High', 'default_value': 'High', 'order': 16},
                    {'name': 'color_precision', 'display_name': 'Color Precision', 'category': 'graphics', 'field_type': 'select', 'options': 'Medium,High', 'default_value': 'High', 'order': 17},
                    {'name': 'mirror_quality', 'display_name': 'Mirror Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High', 'default_value': 'High', 'order': 18},
                    {'name': 'lod', 'display_name': 'Level of Detail (LOD)', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 19},
                    {'name': 'crowd_density', 'display_name': 'Crowd Density', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 20},
                    {'name': 'ray_tracing', 'display_name': 'Ray Tracing', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 1},
                    {'name': 'ray_traced_reflections', 'display_name': 'Ray-Traced Reflections', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 2},
                    {'name': 'ray_traced_shadows', 'display_name': 'Ray-Traced Sun Shadows', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 3},
                    {'name': 'ray_traced_lighting', 'display_name': 'Ray-Traced Lighting', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Medium,Ultra', 'default_value': 'Off', 'order': 4},
                    {'name': 'dlss', 'display_name': 'DLSS', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Auto,DLAA,Quality,Balanced,Performance,Ultra Performance', 'default_value': 'Off', 'order': 5},
                    {'name': 'fsr', 'display_name': 'FidelityFX Super Resolution 2.1', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Quality,Balanced,Performance,Ultra Performance', 'default_value': 'Off', 'order': 6},
                ]
            },
            
            # 10. Red Dead Redemption 2
            {
                'name': 'Red Dead Redemption 2',
                'description': 'Open world western action-adventure by Rockstar Games',
                'settings': common_display + [
                    {'name': 'quality_preset', 'display_name': 'Quality Preset Level', 'category': 'graphics', 'field_type': 'select', 'options': 'Favor Performance,Balanced,Favor Quality', 'default_value': 'Balanced', 'order': 1},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
                    {'name': 'anisotropic_filtering', 'display_name': 'Anisotropic Filtering', 'category': 'graphics', 'field_type': 'select', 'options': '2x,4x,8x,16x', 'default_value': '16x', 'order': 3},
                    {'name': 'lighting_quality', 'display_name': 'Lighting Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 4},
                    {'name': 'global_illumination', 'display_name': 'Global Illumination Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 5},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 6},
                    {'name': 'far_shadows', 'display_name': 'Far Shadows', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 7},
                    {'name': 'screen_space_ao', 'display_name': 'Screen Space Ambient Occlusion', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 8},
                    {'name': 'reflection_quality', 'display_name': 'Reflection Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 9},
                    {'name': 'mirror_quality', 'display_name': 'Mirror Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 10},
                    {'name': 'water_quality', 'display_name': 'Water Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 11},
                    {'name': 'volumetrics_quality', 'display_name': 'Volumetrics Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 12},
                    {'name': 'particle_quality', 'display_name': 'Particle Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 13},
                    {'name': 'tessellation_quality', 'display_name': 'Tessellation Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 14},
                    {'name': 'taa', 'display_name': 'TAA', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Medium,High', 'default_value': 'High', 'order': 15},
                    {'name': 'fxaa', 'display_name': 'FXAA', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'Off', 'order': 16},
                    {'name': 'msaa', 'display_name': 'MSAA', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,2x,4x,8x', 'default_value': 'Off', 'order': 17},
                    {'name': 'grass_lod', 'display_name': 'Grass Level of Detail', 'category': 'graphics', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '75', 'order': 18},
                    {'name': 'tree_quality', 'display_name': 'Tree Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 19},
                    {'name': 'parallax_occlusion', 'display_name': 'Parallax Occlusion Mapping Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 20},
                    {'name': 'soft_shadows', 'display_name': 'Soft Shadows', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 21},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                ]
            },
            
            # 11. Elden Ring
            {
                'name': 'Elden Ring',
                'description': 'Action RPG by FromSoftware',
                'settings': common_display + [
                    {'name': 'quality_setting', 'display_name': 'Quality Setting', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 1},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 2},
                    {'name': 'antialiasing_quality', 'display_name': 'Antialiasing Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,High', 'default_value': 'High', 'order': 3},
                    {'name': 'ssao', 'display_name': 'SSAO', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High', 'default_value': 'High', 'order': 4},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'select', 'options': 'Off,Low,Medium,High', 'default_value': 'High', 'order': 1},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'select', 'options': 'Off,Low,Medium,High', 'default_value': 'Medium', 'order': 2},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 5},
                    {'name': 'lighting_quality', 'display_name': 'Lighting Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 6},
                    {'name': 'effects_quality', 'display_name': 'Effects Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 7},
                    {'name': 'volumetric_quality', 'display_name': 'Volumetric Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 8},
                    {'name': 'reflection_quality', 'display_name': 'Reflection Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 9},
                    {'name': 'water_surface_quality', 'display_name': 'Water Surface Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 10},
                    {'name': 'shader_quality', 'display_name': 'Shader Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 11},
                    {'name': 'global_illumination', 'display_name': 'Global Illumination Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 12},
                    {'name': 'grass_quality', 'display_name': 'Grass Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Maximum', 'default_value': 'High', 'order': 13},
                    {'name': 'ray_tracing', 'display_name': 'Ray Tracing Quality', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Low,Medium,High', 'default_value': 'Off', 'order': 1},
                ]
            },
            
            # 12. Hogwarts Legacy
            {
                'name': 'Hogwarts Legacy',
                'description': 'Action RPG set in the Harry Potter universe',
                'settings': common_display + [
                    {'name': 'graphics_preset', 'display_name': 'Global Quality Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 1},
                    {'name': 'effects_quality', 'display_name': 'Effects Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
                    {'name': 'material_quality', 'display_name': 'Material Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 3},
                    {'name': 'fog_quality', 'display_name': 'Fog Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 4},
                    {'name': 'sky_quality', 'display_name': 'Sky Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 5},
                    {'name': 'foliage_quality', 'display_name': 'Foliage Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 6},
                    {'name': 'post_process_quality', 'display_name': 'Post Process Quality', 'category': 'postprocess', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 1},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 7},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 8},
                    {'name': 'view_distance_quality', 'display_name': 'View Distance Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 9},
                    {'name': 'population_quality', 'display_name': 'Population Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 10},
                    {'name': 'ray_tracing_reflections', 'display_name': 'Ray Tracing Reflections', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'Off', 'order': 1},
                    {'name': 'ray_tracing_shadows', 'display_name': 'Ray Tracing Shadows', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 2},
                    {'name': 'ray_tracing_ao', 'display_name': 'Ray Tracing Ambient Occlusion', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 3},
                    {'name': 'nvidia_dlss', 'display_name': 'NVIDIA DLSS', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Quality,Balanced,Performance,Ultra Performance', 'default_value': 'Off', 'order': 4},
                    {'name': 'amd_fsr', 'display_name': 'AMD FidelityFX Super Resolution 2', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Quality,Balanced,Performance,Ultra Performance', 'default_value': 'Off', 'order': 5},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'slider', 'min_value': 0, 'max_value': 10, 'default_value': '5', 'order': 2},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 3},
                    {'name': 'chromatic_aberration', 'display_name': 'Chromatic Aberration', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 4},
                    {'name': 'film_grain', 'display_name': 'Film Grain', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 5},
                ]
            },
            
            # 13. Assassin's Creed Valhalla
            {
                'name': "Assassin's Creed Valhalla",
                'description': 'Open world action RPG by Ubisoft',
                'settings': common_display + [
                    {'name': 'graphics_quality', 'display_name': 'Graphics Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Very High,Ultra High', 'default_value': 'High', 'order': 1},
                    {'name': 'adaptive_quality', 'display_name': 'Adaptive Quality', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'Off', 'order': 2},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High', 'default_value': 'High', 'order': 3},
                    {'name': 'world_details', 'display_name': 'World Details', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Very High,Ultra High', 'default_value': 'High', 'order': 4},
                    {'name': 'clutter', 'display_name': 'Clutter', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Very High', 'default_value': 'High', 'order': 5},
                    {'name': 'shadows', 'display_name': 'Shadows', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Very High', 'default_value': 'High', 'order': 6},
                    {'name': 'environment_textures', 'display_name': 'Environment Textures', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 7},
                    {'name': 'character_textures', 'display_name': 'Character Textures', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 8},
                    {'name': 'volumetric_clouds', 'display_name': 'Volumetric Clouds', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Very High', 'default_value': 'High', 'order': 9},
                    {'name': 'water', 'display_name': 'Water', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Very High', 'default_value': 'High', 'order': 10},
                    {'name': 'screen_space_reflections', 'display_name': 'Screen Space Reflections', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,High', 'default_value': 'High', 'order': 11},
                    {'name': 'environment_occlusion', 'display_name': 'Environment Occlusion', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 12},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 2},
                    {'name': 'resolution_scale', 'display_name': 'Resolution Scale', 'category': 'graphics', 'field_type': 'slider', 'min_value': 50, 'max_value': 100, 'default_value': '100', 'order': 13},
                    {'name': 'resolution_modifier', 'display_name': 'Resolution Modifier', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,AMD FidelityFX CAS,Nearest,Bilinear', 'default_value': 'Off', 'order': 1},
                ]
            },
            
            # 14. F1 24
            {
                'name': 'F1 24',
                'description': 'Official Formula 1 racing game by EA Sports',
                'settings': common_display + [
                    {'name': 'graphics_quality', 'display_name': 'Graphics Quality Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Ultra Low,Low,Medium,High,Ultra High,Custom', 'default_value': 'High', 'order': 1},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,TAA Only,TAA + FXAA', 'default_value': 'TAA + FXAA', 'order': 2},
                    {'name': 'lighting_quality', 'display_name': 'Lighting Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 3},
                    {'name': 'shadows', 'display_name': 'Shadows', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 4},
                    {'name': 'post_process', 'display_name': 'Post Process', 'category': 'postprocess', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 1},
                    {'name': 'weather_effects', 'display_name': 'Weather Effects', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 5},
                    {'name': 'crowd', 'display_name': 'Crowd', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 6},
                    {'name': 'mirrors', 'display_name': 'Mirrors', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 7},
                    {'name': 'car_reflections', 'display_name': 'Car Reflections', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 8},
                    {'name': 'texture_streaming', 'display_name': 'Texture Streaming', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 9},
                    {'name': 'track_detail', 'display_name': 'Track Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 10},
                    {'name': 'vehicle_detail', 'display_name': 'Vehicle Detail', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 11},
                    {'name': 'ground_cover', 'display_name': 'Ground Cover', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 12},
                    {'name': 'skidmarks', 'display_name': 'Skidmarks', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,High,Enhanced', 'default_value': 'High', 'order': 13},
                    {'name': 'skidmarks_blending', 'display_name': 'Skidmarks Blending', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 14},
                    {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,On,HBAO+', 'default_value': 'HBAO+', 'order': 15},
                    {'name': 'screen_space_reflections', 'display_name': 'Screen Space Reflections', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra High', 'default_value': 'High', 'order': 16},
                    {'name': 'ray_tracing', 'display_name': 'Ray Tracing Quality', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Medium,High', 'default_value': 'Off', 'order': 1},
                    {'name': 'dlss', 'display_name': 'NVIDIA DLSS', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Quality,Balanced,Performance,Ultra Performance', 'default_value': 'Off', 'order': 2},
                    {'name': 'fsr', 'display_name': 'AMD FSR', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Ultra Quality,Quality,Balanced,Performance', 'default_value': 'Off', 'order': 3},
                ]
            },
            
            # 15. Need for Speed Unbound
            {
                'name': 'Need for Speed Unbound',
                'description': 'Street racing game by Criterion Games',
                'settings': common_display + [
                    {'name': 'graphics_preset', 'display_name': 'Graphics Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 1},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
                    {'name': 'texture_filtering', 'display_name': 'Texture Filtering', 'category': 'graphics', 'field_type': 'select', 'options': 'Bilinear,Trilinear,Anisotropic', 'default_value': 'Anisotropic', 'order': 3},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 4},
                    {'name': 'effects_quality', 'display_name': 'Effects Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 5},
                    {'name': 'post_process_quality', 'display_name': 'Post Process Quality', 'category': 'postprocess', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 1},
                    {'name': 'reflection_quality', 'display_name': 'Reflection Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 6},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,TAA Low,TAA High', 'default_value': 'TAA High', 'order': 7},
                    {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,SSAO,HBAO', 'default_value': 'HBAO', 'order': 8},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'select', 'options': 'Off,Low,Medium,High', 'default_value': 'Medium', 'order': 2},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 3},
                    {'name': 'lens_distortion', 'display_name': 'Lens Distortion', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 4},
                    {'name': 'ray_tracing', 'display_name': 'Ray Tracing', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 1},
                    {'name': 'ray_traced_reflections', 'display_name': 'Ray-Traced Reflections', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'Off', 'order': 2},
                    {'name': 'ray_traced_ao', 'display_name': 'Ray-Traced Ambient Occlusion', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 3},
                ]
            },
            
            # 16. The Witcher 3: Wild Hunt
            {
                'name': 'The Witcher 3: Wild Hunt',
                'description': 'Open world action RPG by CD Projekt Red',
                'settings': common_display + [
                    {'name': 'graphics_preset', 'display_name': 'Graphics Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra,Custom', 'default_value': 'High', 'order': 1},
                    {'name': 'nvidia_hairworks', 'display_name': 'NVIDIA HairWorks', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 1},
                    {'name': 'number_of_background_characters', 'display_name': 'Number of Background Characters', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 3},
                    {'name': 'terrain_quality', 'display_name': 'Terrain Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 4},
                    {'name': 'water_quality', 'display_name': 'Water Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 5},
                    {'name': 'grass_density', 'display_name': 'Grass Density', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 6},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 7},
                    {'name': 'foliage_visibility_range', 'display_name': 'Foliage Visibility Range', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 8},
                    {'name': 'detail_level', 'display_name': 'Detail Level', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 9},
                    {'name': 'hardware_cursor', 'display_name': 'Hardware Cursor', 'category': 'display', 'field_type': 'toggle', 'default_value': 'On', 'order': 6},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'bloom', 'display_name': 'Bloom', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 2},
                    {'name': 'sharpening', 'display_name': 'Sharpening', 'category': 'postprocess', 'field_type': 'select', 'options': 'Off,Low,High', 'default_value': 'High', 'order': 3},
                    {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion', 'category': 'postprocess', 'field_type': 'select', 'options': 'Off,SSAO,HBAO+', 'default_value': 'HBAO+', 'order': 4},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 5},
                    {'name': 'chromatic_aberration', 'display_name': 'Chromatic Aberration', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 6},
                    {'name': 'vignetting', 'display_name': 'Vignetting', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 7},
                    {'name': 'light_shafts', 'display_name': 'Light Shafts', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 8},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 9},
                    {'name': 'blur', 'display_name': 'Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 10},
                    {'name': 'ray_tracing', 'display_name': 'Ray Tracing', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 2},
                    {'name': 'ray_traced_global_illumination', 'display_name': 'Ray Traced Global Illumination', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 3},
                ]
            },
            
            # 17. Diablo IV
            {
                'name': 'Diablo IV',
                'description': 'Action RPG by Blizzard Entertainment',
                'settings': common_display + [
                    {'name': 'graphics_preset', 'display_name': 'Graphics Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra,Custom', 'default_value': 'High', 'order': 1},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
                    {'name': 'anisotropic_filtering', 'display_name': 'Anisotropic Filtering', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,4x,8x,16x', 'default_value': '16x', 'order': 3},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 4},
                    {'name': 'dynamic_shadows', 'display_name': 'Dynamic Shadows', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 5},
                    {'name': 'soft_shadows', 'display_name': 'Soft Shadows', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 6},
                    {'name': 'ssao', 'display_name': 'SSAO Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 7},
                    {'name': 'fog_quality', 'display_name': 'Fog Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 8},
                    {'name': 'clutter_quality', 'display_name': 'Clutter Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 9},
                    {'name': 'fur_quality', 'display_name': 'Fur Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Medium,High', 'default_value': 'High', 'order': 10},
                    {'name': 'water_simulation_quality', 'display_name': 'Water Simulation Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 11},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low FXAA,Medium FXAA,High FXAA,SMAA Low,SMAA Medium,SMAA High', 'default_value': 'SMAA High', 'order': 12},
                    {'name': 'geometric_complexity', 'display_name': 'Geometric Complexity', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 13},
                    {'name': 'screen_space_reflections', 'display_name': 'Screen Space Reflections', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Low,Medium,High,Ultra', 'default_value': 'High', 'order': 14},
                    {'name': 'distortion', 'display_name': 'Distortion', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'low_fx_quality', 'display_name': 'Low FX Quality', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'Off', 'order': 15},
                    {'name': 'nvidia_dlss', 'display_name': 'NVIDIA DLSS', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Quality,Balanced,Performance,Ultra Performance', 'default_value': 'Off', 'order': 1},
                    {'name': 'nvidia_reflex', 'display_name': 'NVIDIA Reflex Low Latency', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,On,On + Boost', 'default_value': 'On', 'order': 2},
                    {'name': 'amd_fsr', 'display_name': 'AMD FSR 2', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Quality,Balanced,Performance,Ultra Performance', 'default_value': 'Off', 'order': 3},
                ]
            },
            
            # 18. Starfield
            {
                'name': 'Starfield',
                'description': 'Space exploration RPG by Bethesda Game Studios',
                'settings': common_display + [
                    {'name': 'graphics_preset', 'display_name': 'Graphics Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra,Custom', 'default_value': 'High', 'order': 1},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
                    {'name': 'indirect_lighting', 'display_name': 'Indirect Lighting', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 3},
                    {'name': 'reflections', 'display_name': 'Reflections', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 4},
                    {'name': 'particle_quality', 'display_name': 'Particle Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 5},
                    {'name': 'volumetric_lighting', 'display_name': 'Volumetric Lighting', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 6},
                    {'name': 'crowd_density', 'display_name': 'Crowd Density', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 7},
                    {'name': 'motion_blur', 'display_name': 'Motion Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'gtao', 'display_name': 'GTAO Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 8},
                    {'name': 'grass_quality', 'display_name': 'Grass Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 9},
                    {'name': 'contact_shadows', 'display_name': 'Contact Shadows', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 10},
                    {'name': 'enable_vsync', 'display_name': 'VSync', 'category': 'display', 'field_type': 'toggle', 'default_value': 'On', 'order': 6},
                    {'name': 'upscaling', 'display_name': 'Upscaling', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,FSR2,DLSS,XeSS', 'default_value': 'Off', 'order': 1},
                    {'name': 'render_resolution_scale', 'display_name': 'Render Resolution Scale', 'category': 'graphics', 'field_type': 'slider', 'min_value': 50, 'max_value': 100, 'default_value': '75', 'order': 11},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 2},
                    {'name': 'film_grain_intensity', 'display_name': 'Film Grain Intensity', 'category': 'postprocess', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '0', 'order': 3},
                ]
            },
            
            # 19. Baldur's Gate 3
            {
                'name': "Baldur's Gate 3",
                'description': 'Turn-based RPG by Larian Studios',
                'settings': common_display + [
                    {'name': 'overall_preset', 'display_name': 'Overall Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra,Custom', 'default_value': 'High', 'order': 1},
                    {'name': 'model_quality', 'display_name': 'Model Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 2},
                    {'name': 'instance_distance', 'display_name': 'Instance Distance', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 3},
                    {'name': 'texture_quality', 'display_name': 'Texture Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 4},
                    {'name': 'texture_filtering', 'display_name': 'Texture Filtering', 'category': 'graphics', 'field_type': 'select', 'options': 'Trilinear,Anisotropic x2,Anisotropic x4,Anisotropic x8,Anisotropic x16', 'default_value': 'Anisotropic x16', 'order': 5},
                    {'name': 'shadow_quality', 'display_name': 'Shadow Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 6},
                    {'name': 'cloud_quality', 'display_name': 'Cloud Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High,Ultra', 'default_value': 'High', 'order': 7},
                    {'name': 'fog_quality', 'display_name': 'Fog Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 8},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,FXAA,SMAA,TAA', 'default_value': 'TAA', 'order': 9},
                    {'name': 'ambient_occlusion', 'display_name': 'Ambient Occlusion', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 10},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 1},
                    {'name': 'god_rays', 'display_name': 'God Rays', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 11},
                    {'name': 'bloom', 'display_name': 'Bloom', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'On', 'order': 2},
                    {'name': 'subsurface_scattering', 'display_name': 'Subsurface Scattering', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 12},
                    {'name': 'nvidia_dlss', 'display_name': 'NVIDIA DLSS', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,DLAA,Quality,Balanced,Performance,Ultra Performance', 'default_value': 'Off', 'order': 1},
                    {'name': 'amd_fsr', 'display_name': 'AMD FidelityFX Super Resolution 2.2', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,Quality,Balanced,Performance,Ultra Performance', 'default_value': 'Off', 'order': 2},
                    {'name': 'nvidia_reflex', 'display_name': 'NVIDIA Reflex Low Latency', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,On,On + Boost', 'default_value': 'On', 'order': 3},
                ]
            },
            
            # 20. Call of Duty: Warzone
            {
                'name': 'Call of Duty: Warzone',
                'description': 'Battle royale game by Infinity Ward and Raven Software',
                'settings': common_display + [
                    {'name': 'graphics_preset', 'display_name': 'Quality Preset', 'category': 'graphics', 'field_type': 'select', 'options': 'Basic,Normal,Balanced,Competitive,Ultra', 'default_value': 'Balanced', 'order': 1},
                    {'name': 'render_resolution', 'display_name': 'Render Resolution', 'category': 'display', 'field_type': 'slider', 'min_value': 50, 'max_value': 100, 'default_value': '100', 'order': 6},
                    {'name': 'upscaling', 'display_name': 'Upscaling/Sharpening', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,DLSS,FSR 1.0,Fidelity CAS,Image Sharpening', 'default_value': 'Off', 'order': 1},
                    {'name': 'vram_scale', 'display_name': 'VRAM Scale Target', 'category': 'graphics', 'field_type': 'slider', 'min_value': 50, 'max_value': 100, 'default_value': '90', 'order': 2},
                    {'name': 'variable_rate_shading', 'display_name': 'Variable Rate Shading', 'category': 'advanced', 'field_type': 'toggle', 'default_value': 'Off', 'order': 2},
                    {'name': 'texture_resolution', 'display_name': 'Texture Resolution', 'category': 'graphics', 'field_type': 'select', 'options': 'Very Low,Low,Normal,High', 'default_value': 'High', 'order': 3},
                    {'name': 'texture_filter', 'display_name': 'Texture Filter Anisotropic', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Normal,High', 'default_value': 'High', 'order': 4},
                    {'name': 'bullet_impacts', 'display_name': 'Bullet Impacts & Sprays', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 5},
                    {'name': 'tessellation', 'display_name': 'Tessellation', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Near,All', 'default_value': 'All', 'order': 6},
                    {'name': 'shadow_map_resolution', 'display_name': 'Shadow Map Resolution', 'category': 'graphics', 'field_type': 'select', 'options': 'Very Low,Low,Normal,High,Extra', 'default_value': 'High', 'order': 7},
                    {'name': 'cache_spot_shadows', 'display_name': 'Cache Spot Shadows', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 8},
                    {'name': 'cache_sun_shadows', 'display_name': 'Cache Sun Shadows', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 9},
                    {'name': 'particle_quality', 'display_name': 'Particle Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,High', 'default_value': 'High', 'order': 10},
                    {'name': 'particle_quality_level', 'display_name': 'Particle Quality Level', 'category': 'graphics', 'field_type': 'select', 'options': 'Very Low,Low,Normal,High', 'default_value': 'High', 'order': 11},
                    {'name': 'shader_quality', 'display_name': 'Shader Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 12},
                    {'name': 'on_demand_texture_streaming', 'display_name': 'On-Demand Texture Streaming', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 13},
                    {'name': 'streaming_quality', 'display_name': 'Streaming Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Normal,High,Ultra', 'default_value': 'High', 'order': 14},
                    {'name': 'volumetric_quality', 'display_name': 'Volumetric Quality', 'category': 'graphics', 'field_type': 'select', 'options': 'Low,Medium,High', 'default_value': 'High', 'order': 15},
                    {'name': 'deferred_physics_quality', 'display_name': 'Deferred Physics Quality', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 16},
                    {'name': 'water_caustics', 'display_name': 'Water Caustics', 'category': 'graphics', 'field_type': 'toggle', 'default_value': 'On', 'order': 17},
                    {'name': 'anti_aliasing', 'display_name': 'Anti-Aliasing', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,SMAA 1X,Filmic SMAA T2X', 'default_value': 'Filmic SMAA T2X', 'order': 18},
                    {'name': 'screen_space_reflection', 'display_name': 'Screen Space Reflection', 'category': 'graphics', 'field_type': 'select', 'options': 'Off,Normal,High', 'default_value': 'High', 'order': 19},
                    {'name': 'nvidia_reflex', 'display_name': 'NVIDIA Reflex Low Latency', 'category': 'advanced', 'field_type': 'select', 'options': 'Off,On,On + Boost', 'default_value': 'On + Boost', 'order': 3},
                    {'name': 'depth_of_field', 'display_name': 'Depth of Field', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 1},
                    {'name': 'world_motion_blur', 'display_name': 'World Motion Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 2},
                    {'name': 'weapon_motion_blur', 'display_name': 'Weapon Motion Blur', 'category': 'postprocess', 'field_type': 'toggle', 'default_value': 'Off', 'order': 3},
                    {'name': 'film_grain', 'display_name': 'Film Grain', 'category': 'postprocess', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '0', 'order': 4},
                    {'name': 'fov', 'display_name': 'Field of View', 'category': 'view', 'field_type': 'slider', 'min_value': 60, 'max_value': 120, 'default_value': '100', 'order': 1},
                    {'name': 'ads_fov', 'display_name': 'ADS Field of View', 'category': 'view', 'field_type': 'select', 'options': 'Affected,Independent', 'default_value': 'Affected', 'order': 2},
                    {'name': 'vehicle_fov', 'display_name': 'Vehicle Field of View', 'category': 'view', 'field_type': 'slider', 'min_value': 60, 'max_value': 120, 'default_value': '100', 'order': 3},
                    {'name': 'camera_movement', 'display_name': 'Camera Movement', 'category': 'view', 'field_type': 'slider', 'min_value': 0, 'max_value': 100, 'default_value': '50', 'order': 4},
                ]
            },
        ]
