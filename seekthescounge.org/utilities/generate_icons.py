import os
from PIL import Image

def generate_icons():
    source_path = "assets/heads/rovert-head.png"
    icon_192_path = "assets/icons/icon-192.png"
    icon_512_path = "assets/icons/icon-512.png"

    if not os.path.exists(source_path):
        print(f"Error: {source_path} not found.")
        return

    # Open source image
    img = Image.open(source_path).convert("RGBA")
    w, h = img.size
    print(f"Original size: {w}x{h}")

    # Create a square canvas based on the largest dimension
    # Add a bit of padding if desired, but for pixel art, let's keep it tight or use specific ratio
    # Let's make it square 48x48 (since height is 48)
    size = max(w, h)
    
    # Create background (black to match game theme, or transparent?)
    # PWA icons usually look best with a background color if they are maskable
    # Manifest says background_color is #000000, so let's use black background for the icon
    # to avoid transparency issues on some Android launchers
    base = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    
    # Center the image
    x = (size - w) // 2
    y = (size - h) // 2
    base.paste(img, (x, y), img)

    # Resize to 192x192
    icon_192 = base.resize((192, 192), resample=Image.NEAREST)
    icon_192.save(icon_192_path)
    print(f"Saved {icon_192_path}")

    # Resize to 512x512
    icon_512 = base.resize((512, 512), resample=Image.NEAREST)
    icon_512.save(icon_512_path)
    print(f"Saved {icon_512_path}")

if __name__ == "__main__":
    generate_icons()
