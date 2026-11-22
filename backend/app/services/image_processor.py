import io
from typing import Tuple
from PIL import Image, ImageOps

# Cap decompressed pixels to mitigate decompression bombs (25 megapixels)
Image.MAX_IMAGE_PIXELS = 25_000_000

MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_DIMENSION = 5000  # 5000 px max width or height
ALLOWED_FORMATS = {"PNG", "JPEG"}


def validate_image(data: bytes, max_size_bytes: int = MAX_IMAGE_SIZE_BYTES) -> Tuple[str, Tuple[int, int]]:
    """
    Validate that bytes represent a valid, uncorrupted PNG or JPEG image
    within allowable dimension and file-size constraints.
    Returns (format_name, (width, height)).
    Raises ValueError on invalid input.
    """
    if not data or len(data) == 0:
        raise ValueError("Image data is empty.")

    if len(data) > max_size_bytes:
        raise ValueError(f"Image exceeds maximum allowable file size ({max_size_bytes // (1024 * 1024)} MB).")

    try:
        # First pass: Pillow verify() checks structural integrity
        bio = io.BytesIO(data)
        with Image.open(bio) as img:
            img.verify()
            format_name = img.format

        if not format_name or format_name.upper() not in ALLOWED_FORMATS:
            raise ValueError(f"Unsupported image format: '{format_name}'. Only PNG and JPEG are allowed.")

        # Second pass: re-open to inspect dimensions safely (verify() exhausts the image buffer)
        bio.seek(0)
        with Image.open(bio) as img:
            w, h = img.size
            if w <= 0 or h <= 0:
                raise ValueError("Invalid image dimensions (zero or negative).")
            if w > MAX_DIMENSION or h > MAX_DIMENSION:
                raise ValueError(
                    f"Image dimensions ({w}×{h}) exceed maximum allowable size ({MAX_DIMENSION}×{MAX_DIMENSION} px)."
                )
            return format_name.upper(), (w, h)

    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"Corrupted or invalid image data: {str(exc)}") from exc


def generate_thumbnail(image_bytes: bytes, target_width: int = 240) -> bytes:
    """
    Generate an optimized WebP thumbnail approximately target_width px wide,
    preserving exact aspect ratio and applying EXIF orientation transpose if present.
    Returns the WebP binary data.
    """
    try:
        bio = io.BytesIO(image_bytes)
        with Image.open(bio) as img:
            # Correct orientation from EXIF if applicable
            img = ImageOps.exif_transpose(img)

            orig_w, orig_h = img.size
            if orig_w > target_width:
                scale = target_width / orig_w
                target_height = max(1, int(orig_h * scale))
                img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)

            # WebP supports RGBA (transparent strips) and RGB
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA" if "A" in img.mode or img.mode == "P" else "RGB")

            out_buf = io.BytesIO()
            img.save(out_buf, format="WEBP", quality=85, method=6)
            return out_buf.getvalue()
    except Exception as exc:
        raise ValueError(f"Failed to generate thumbnail: {str(exc)}") from exc


def get_image_extension(format_name: str) -> str:
    """Return standard lowercase extension for supported formats."""
    fmt = format_name.upper()
    if fmt == "PNG":
        return "png"
    if fmt in ("JPEG", "JPG"):
        return "jpg"
    return "png"
