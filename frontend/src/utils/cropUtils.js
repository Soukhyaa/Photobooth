/**
 * Utility functions for 4:3 photo cropping, zoom, pan, and canvas export.
 * Target aspect ratio: 4:3 (matches Vintage Booth camera snapshots).
 */

export const TARGET_ASPECT_RATIO = 4 / 3; // 1.333333
export const DEFAULT_EXPORT_WIDTH = 960;
export const DEFAULT_EXPORT_HEIGHT = 720;

/**
 * Calculates the crop source bounding box within the original image.
 *
 * @param {number} imgWidth - Original image width
 * @param {number} imgHeight - Original image height
 * @param {number} zoom - Zoom factor between 1.0 and 3.0
 * @param {number} panX - Normalized horizontal pan between -1.0 (left) and 1.0 (right)
 * @param {number} panY - Normalized vertical pan between -1.0 (top) and 1.0 (bottom)
 * @returns {{ srcX: number, srcY: number, cropW: number, cropH: number }}
 */
export function getCropSourceCoordinates(imgWidth, imgHeight, zoom = 1, panX = 0, panY = 0) {
  const w = Math.max(1, imgWidth);
  const h = Math.max(1, imgHeight);
  const imgRatio = w / h;

  let baseCropW;
  let baseCropH;

  if (imgRatio >= TARGET_ASPECT_RATIO) {
    // Image is wider than 4:3 (e.g. 16:9, panoramic)
    baseCropH = h;
    baseCropW = h * TARGET_ASPECT_RATIO;
  } else {
    // Image is taller than 4:3 (e.g. 9:16 portrait, 1:1 square)
    baseCropW = w;
    baseCropH = w / TARGET_ASPECT_RATIO;
  }

  const clampedZoom = Math.max(1, Math.min(3, Number(zoom) || 1));
  const cropW = Math.min(w, baseCropW / clampedZoom);
  const cropH = Math.min(h, baseCropH / clampedZoom);

  // Maximum pan range from center
  const maxPanRangeX = (w - cropW) / 2;
  const maxPanRangeY = (h - cropH) / 2;

  const clampedPanX = Math.max(-1, Math.min(1, Number(panX) || 0));
  const clampedPanY = Math.max(-1, Math.min(1, Number(panY) || 0));

  const centerX = (w / 2) + (clampedPanX * maxPanRangeX);
  const centerY = (h / 2) + (clampedPanY * maxPanRangeY);

  const srcX = Math.max(0, Math.min(w - cropW, centerX - (cropW / 2)));
  const srcY = Math.max(0, Math.min(h - cropH, centerY - (cropH / 2)));

  return {
    srcX,
    srcY,
    cropW,
    cropH
  };
}

/**
 * Loads an image from a Data URL or Object URL into an HTMLImageElement.
 *
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to load image: ${err?.message || 'Unknown error'}`));
    img.src = src;
  });
}

/**
 * Renders a cropped 4:3 image to a data URL at high resolution.
 *
 * @param {HTMLImageElement} img
 * @param {Object} cropSettings - { zoom, panX, panY }
 * @param {number} targetWidth - Default 960
 * @param {number} targetHeight - Default 720
 * @returns {string} High-res JPEG data URL (0.95 quality)
 */
export function renderCroppedDataUrl(
  img,
  cropSettings = {},
  targetWidth = DEFAULT_EXPORT_WIDTH,
  targetHeight = DEFAULT_EXPORT_HEIGHT
) {
  const { zoom = 1, panX = 0, panY = 0 } = cropSettings;
  const { srcX, srcY, cropW, cropH } = getCropSourceCoordinates(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    zoom,
    panX,
    panY
  );

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable for image crop');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Reads a File, loads it as an image, and automatically generates a center 4:3 crop.
 *
 * @param {File} file
 * @returns {Promise<{ originalDataUrl: string, croppedDataUrl: string, cropSettings: Object, filename: string }>}
 */
export async function autoCropImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = async () => {
      try {
        const originalDataUrl = reader.result;
        const img = await loadImageElement(originalDataUrl);
        const cropSettings = { zoom: 1, panX: 0, panY: 0 };
        const croppedDataUrl = renderCroppedDataUrl(img, cropSettings);
        resolve({
          originalDataUrl,
          croppedDataUrl,
          cropSettings,
          filename: file.name
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsDataURL(file);
  });
}
