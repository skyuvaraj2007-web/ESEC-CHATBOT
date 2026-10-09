import math
import os
from PIL import Image, ImageDraw, ImageFilter

RES_DIR = r"D:\ESEC\frontend\android\app\src\main\res"

def create_logo_image(size, is_adaptive=False, is_round=False):
    """
    Creates high quality VISIONAI brand emblem.
    If is_adaptive=True, background is transparent and logo is centered within 66% safe zone.
    If is_round=True, clips to circle.
    """
    # Create 4x supersampled image for ultra crisp antialiasing
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center = canvas_size / 2
    
    if not is_adaptive:
        # Background squircle or circle
        margin = canvas_size * 0.04
        if is_round:
            draw.ellipse([margin, margin, canvas_size - margin, canvas_size - margin], fill=(8, 11, 20, 255))
        else:
            # Rounded squircle
            radius = canvas_size * 0.22
            draw.rounded_rectangle([margin, margin, canvas_size - margin, canvas_size - margin], radius=radius, fill=(8, 11, 20, 255))
        
        # Subtle ambient radial glow behind the eye
        glow_radius = canvas_size * 0.38
        glow_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow_img)
        glow_draw.ellipse([center - glow_radius, center - glow_radius, center + glow_radius, center + glow_radius], fill=(139, 92, 246, 70))
        glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=canvas_size * 0.08))
        img.paste(glow_img, (0, 0), glow_img)
        draw = ImageDraw.Draw(img)

    # Safe zone for icon
    if is_adaptive:
        # Safe center 66% zone
        radius_x = canvas_size * 0.28
        radius_y = canvas_size * 0.18
    else:
        radius_x = canvas_size * 0.36
        radius_y = canvas_size * 0.23

    # 1. Outer Eye Contour with Gradient Simulation
    # Eye shape: two intersecting arcs / bezier-like points
    steps = 180
    outer_pts_top = []
    outer_pts_bot = []
    
    for i in range(steps + 1):
        t = i / steps
        # x from -radius_x to +radius_x
        x = -radius_x + 2 * radius_x * t
        # curvature
        norm_x = x / radius_x
        if abs(norm_x) <= 1.0:
            y = radius_y * (1.0 - norm_x**2)
            outer_pts_top.append((center + x, center - y))
            outer_pts_bot.append((center + x, center + y))
            
    eye_contour = outer_pts_top + list(reversed(outer_pts_bot))
    
    # Outer glow ring
    stroke_w = int(canvas_size * 0.035)
    for i in range(len(eye_contour) - 1):
        pt1 = eye_contour[i]
        pt2 = eye_contour[i + 1]
        t = i / len(eye_contour)
        # Interpolate color from Violet (#8B5CF6) to Cyan (#22D3EE)
        r = int(139 * (1 - t) + 34 * t)
        g = int(92 * (1 - t) + 211 * t)
        b = int(246 * (1 - t) + 238 * t)
        draw.line([pt1, pt2], fill=(r, g, b, 255), width=stroke_w)
    # close loop
    draw.line([eye_contour[-1], eye_contour[0]], fill=(139, 92, 246, 255), width=stroke_w)

    # 2. Outer Iris Ring (Cyan / White)
    iris_radius = radius_y * 0.95
    iris_stroke = int(canvas_size * 0.028)
    draw.ellipse(
        [center - iris_radius, center - iris_radius, center + iris_radius, center + iris_radius],
        outline=(34, 211, 238, 255),
        width=iris_stroke
    )

    # 3. Inner Glowing Pupil (Cyan to White)
    pupil_radius = iris_radius * 0.48
    draw.ellipse(
        [center - pupil_radius, center - pupil_radius, center + pupil_radius, center + pupil_radius],
        fill=(34, 211, 238, 255)
    )
    
    # Pupil center glint / core
    core_radius = pupil_radius * 0.45
    draw.ellipse(
        [center - core_radius - pupil_radius*0.15, center - core_radius - pupil_radius*0.15,
         center + core_radius - pupil_radius*0.15, center + core_radius - pupil_radius*0.15],
        fill=(255, 255, 255, 240)
    )

    # 4. Telemetry Corner Brackets / Vision AI Reticle
    bracket_len = radius_x * 0.28
    bracket_stroke = int(canvas_size * 0.02)
    bracket_color = (208, 188, 255, 220)
    bx_offset = radius_x * 1.05
    by_offset = radius_y * 1.25

    # Top-left bracket
    draw.line([(center - bx_offset, center - by_offset + bracket_len), (center - bx_offset, center - by_offset)], fill=bracket_color, width=bracket_stroke)
    draw.line([(center - bx_offset, center - by_offset), (center - bx_offset + bracket_len, center - by_offset)], fill=bracket_color, width=bracket_stroke)

    # Top-right bracket
    draw.line([(center + bx_offset, center - by_offset + bracket_len), (center + bx_offset, center - by_offset)], fill=bracket_color, width=bracket_stroke)
    draw.line([(center + bx_offset, center - by_offset), (center + bx_offset - bracket_len, center - by_offset)], fill=bracket_color, width=bracket_stroke)

    # Bottom-left bracket
    draw.line([(center - bx_offset, center + by_offset - bracket_len), (center - bx_offset, center + by_offset)], fill=bracket_color, width=bracket_stroke)
    draw.line([(center - bx_offset, center + by_offset), (center - bx_offset + bracket_len, center + by_offset)], fill=bracket_color, width=bracket_stroke)

    # Bottom-right bracket
    draw.line([(center + bx_offset, center + by_offset - bracket_len), (center + bx_offset, center + by_offset)], fill=bracket_color, width=bracket_stroke)
    draw.line([(center + bx_offset, center + by_offset), (center + bx_offset - bracket_len, center + by_offset)], fill=bracket_color, width=bracket_stroke)

    # Downsample to target size with highest quality LANCZOS filter
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def create_splash_image(width, height):
    """
    Creates premium VISIONAI Splash Screen on deep #080B14 canvas.
    """
    scale = 2
    w = width * scale
    h = height * scale
    img = Image.new("RGBA", (w, h), (8, 11, 20, 255))
    
    # Ambient radial glow behind emblem
    center_x = w // 2
    center_y = int(h * 0.46)
    
    glow_radius = min(w, h) * 0.35
    glow_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_draw.ellipse(
        [center_x - glow_radius, center_y - glow_radius, center_x + glow_radius, center_y + glow_radius],
        fill=(139, 92, 246, 55)
    )
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=min(w, h) * 0.1))
    img.paste(glow_img, (0, 0), glow_img)
    
    # Paste high-res logo emblem
    logo_size = int(min(w, h) * 0.38)
    logo_img = create_logo_image(logo_size // scale, is_adaptive=False)
    logo_img_scaled = logo_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    img.paste(logo_img_scaled, (center_x - logo_size // 2, center_y - logo_size // 2), logo_img_scaled)
    
    return img.resize((width, height), Image.Resampling.LANCZOS)

def generate_all_assets():
    # 1. Launcher Mipmaps (Standard, Round, Adaptive Foreground)
    densities = {
        "mipmap-mdpi": (48, 108),
        "mipmap-hdpi": (72, 162),
        "mipmap-xhdpi": (96, 216),
        "mipmap-xxhdpi": (144, 324),
        "mipmap-xxxhdpi": (192, 432),
    }

    for folder, (std_size, fore_size) in densities.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Standard icon
        std_img = create_logo_image(std_size, is_adaptive=False, is_round=False)
        std_img.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        
        # Round icon
        round_img = create_logo_image(std_size, is_adaptive=False, is_round=True)
        round_img.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
        
        # Foreground adaptive icon
        fore_img = create_logo_image(fore_size, is_adaptive=True)
        fore_img.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
        print(f"Generated {folder}: ic_launcher ({std_size}x{std_size}), round, foreground ({fore_size}x{fore_size})")

    # 2. Splash Screens
    splash_configs = {
        "drawable": (1080, 1920),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
    }

    for folder, (w, h) in splash_configs.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        splash_img = create_splash_image(w, h)
        splash_img.save(os.path.join(folder_path, "splash.png"), "PNG")
        print(f"Generated {folder}/splash.png ({w}x{h})")

if __name__ == "__main__":
    generate_all_assets()
    print("All VISIONAI Android icon and splash assets successfully generated!")
