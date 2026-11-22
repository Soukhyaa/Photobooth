/**
 * Stage 4 & Feature: High-Resolution Photo Strip Composition Engine
 * 
 * Supports:
 * - 6 Preset Designs: Classic Cream, Clean Minimal, Cherry Pop, Butter Yellow, Polka Party, Stars & Hearts
 * - 2 Width Formats: Classic Wide (2 × 6″ @ 300 DPI, 600 × 1800 px) & Slim Strip (1.6 × 6″ @ 300 DPI, 480 × 1800 px)
 * - In-memory image & canvas caching for instant (<5ms) design switching without reloading
 * - Dynamic caption rendering without full-strip recomposition
 * - Exact 4:3 photo aspect ratio preservation across all designs
 */

export function getFormattedVintageDate() {
  const now = new Date();
  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * 2 Strip Width Presets
 */
export const STRIP_WIDTH_PRESETS = {
  wide: {
    id: 'wide',
    name: 'Classic Wide',
    sub: '2 × 6″ (600 × 1800 px)',
    tag: 'Generous Borders',
    width: 600,
    height: 1800,
    sideMargin: 40,
    photoWidth: 520,
    photoHeight: 390, // Exact 4:3 (520 / 390 = 1.333333)
    photoGap: 24,
    topMargin: 35,
    footerStartY: 1685,
    dateY: 1747,
    arcadeY: 1771,
    captionY: 1718,
    captionBottomCss: '3.3%',
    cardWidthCss: '240px',
    aspectRatioCss: '1 / 3',
    interactiveSlots: [
      { id: 1, top: '1.94%', left: '6.67%', width: '86.67%', height: '21.67%' },
      { id: 2, top: '24.94%', left: '6.67%', width: '86.67%', height: '21.67%' },
      { id: 3, top: '47.94%', left: '6.67%', width: '86.67%', height: '21.67%' },
      { id: 4, top: '70.94%', left: '6.67%', width: '86.67%', height: '21.67%' }
    ]
  },
  slim: {
    id: 'slim',
    name: 'Slim Strip',
    sub: '1.6 × 6″ (480 × 1800 px)',
    tag: 'Compact Borders',
    width: 480,
    height: 1800,
    sideMargin: 20,
    photoWidth: 440,
    photoHeight: 330, // Exact 4:3 (440 / 330 = 1.333333)
    photoGap: 20,
    topMargin: 60,
    footerStartY: 1460,
    dateY: 1590,
    arcadeY: 1625,
    captionY: 1530,
    captionBottomCss: '13.5%',
    cardWidthCss: '192px',
    aspectRatioCss: '4 / 15',
    interactiveSlots: [
      { id: 1, top: '3.33%', left: '4.17%', width: '91.67%', height: '18.33%' },
      { id: 2, top: '22.78%', left: '4.17%', width: '91.67%', height: '18.33%' },
      { id: 3, top: '42.22%', left: '4.17%', width: '91.67%', height: '18.33%' },
      { id: 4, top: '61.67%', left: '4.17%', width: '91.67%', height: '18.33%' }
    ]
  }
};

/**
 * 6 Preset Designs
 */
export const STRIP_DESIGNS = [
  {
    id: 'classic_cream',
    name: 'Classic Cream',
    tagline: 'Warm Ivory Vintage',
    description: 'Existing warm ivory vintage design with delicate analog grain and classic typography.',
    paperColor: '#faf6ec',
    outerBorder: 'rgba(180, 160, 130, 0.28)',
    photoBorder: 'rgba(56, 8, 17, 0.16)',
    photoMatColor: null,
    photoMatPadding: 0,
    dividerColor: 'rgba(180, 160, 130, 0.35)',
    textColor: '#6b1426',
    arcadeColor: '#b8770d',
    captionColor: '#420814',
    hasPaperGrain: true,
    patternType: 'none',
    swatchBg: '#faf6ec',
    swatchBorder: '#b8770d',
    swatchText: '#420814'
  },
  {
    id: 'clean_minimal',
    name: 'Clean Minimal',
    tagline: 'Plain White Studio',
    description: 'Plain white background with crisp edges and no decorative patterns.',
    paperColor: '#ffffff',
    outerBorder: 'rgba(0, 0, 0, 0.08)',
    photoBorder: 'rgba(0, 0, 0, 0.14)',
    photoMatColor: null,
    photoMatPadding: 0,
    dividerColor: 'rgba(0, 0, 0, 0.15)',
    textColor: '#374151',
    arcadeColor: '#4b5563',
    captionColor: '#111827',
    hasPaperGrain: false,
    patternType: 'none',
    swatchBg: '#ffffff',
    swatchBorder: '#9ca3af',
    swatchText: '#111827'
  },
  {
    id: 'cherry_pop',
    name: 'Cherry Pop',
    tagline: 'Deep Cherry & Cream',
    description: 'Deep cherry-red background with cream photo matting borders.',
    paperColor: '#4a0e1b',
    outerBorder: 'rgba(250, 184, 57, 0.45)',
    photoBorder: '#fff5e6',
    photoMatColor: '#fff8f0', // Crisp cream matting frame around photos
    photoMatPadding: 6,
    dividerColor: 'rgba(250, 184, 57, 0.45)',
    textColor: '#fab839',
    arcadeColor: '#fab839',
    captionColor: '#ffffff',
    hasPaperGrain: true,
    patternType: 'none',
    swatchBg: '#4a0e1b',
    swatchBorder: '#fab839',
    swatchText: '#ffffff'
  },
  {
    id: 'butter_yellow',
    name: 'Butter Yellow',
    tagline: 'Soft Butter Yellow',
    description: 'Soft butter-yellow background with warm roasted sepia accents.',
    paperColor: '#fbf0c2',
    outerBorder: 'rgba(180, 130, 20, 0.3)',
    photoBorder: 'rgba(110, 60, 10, 0.22)',
    photoMatColor: null,
    photoMatPadding: 0,
    dividerColor: 'rgba(180, 130, 20, 0.35)',
    textColor: '#703808',
    arcadeColor: '#8a4b0d',
    captionColor: '#522806',
    hasPaperGrain: true,
    patternType: 'none',
    swatchBg: '#fbf0c2',
    swatchBorder: '#df981c',
    swatchText: '#522806'
  },
  {
    id: 'polka_party',
    name: 'Polka Party',
    tagline: 'Retro Polka Dots',
    description: 'Small, tasteful polka-dot pattern on warm porcelain cream.',
    paperColor: '#fdf9f2',
    outerBorder: 'rgba(180, 50, 75, 0.25)',
    photoBorder: 'rgba(70, 15, 25, 0.2)',
    photoMatColor: '#ffffff',
    photoMatPadding: 4,
    dividerColor: 'rgba(180, 50, 75, 0.3)',
    textColor: '#701426',
    arcadeColor: '#b8770d',
    captionColor: '#4a0b18',
    hasPaperGrain: true,
    patternType: 'polka_dots',
    swatchBg: '#fdf9f2',
    swatchBorder: '#c43d56',
    swatchText: '#701426'
  },
  {
    id: 'stars_hearts',
    name: 'Stars & Hearts',
    tagline: 'Decorative Stars & Hearts',
    description: 'Small decorative stars and hearts along the margins.',
    paperColor: '#fef7f9',
    outerBorder: 'rgba(215, 75, 105, 0.25)',
    photoBorder: 'rgba(100, 20, 35, 0.18)',
    photoMatColor: '#ffffff',
    photoMatPadding: 4,
    dividerColor: 'rgba(215, 75, 105, 0.3)',
    textColor: '#80182e',
    arcadeColor: '#df981c',
    captionColor: '#500e1c',
    hasPaperGrain: true,
    patternType: 'stars_hearts',
    swatchBg: '#fef7f9',
    swatchBorder: '#e11d48',
    swatchText: '#80182e'
  }
];

// In-memory cache of loaded image elements across design switches
let loadedImageElementsCache = [];
let loadedPhotosCacheKey = '';

// In-memory cache of composed base canvases keyed by `${designId}_${widthId}`
const composedBaseCanvasCache = new Map();

/**
 * Reset all in-memory strip composer caches (call when retaking photos)
 */
export function clearComposedStripCache() {
  loadedImageElementsCache = [];
  loadedPhotosCacheKey = '';
  composedBaseCanvasCache.clear();
}

/**
 * Loads an image element from a data URL safely
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load snapshot for strip: ' + err));
    img.src = src;
  });
}

/**
 * Draws soft organic paper grain onto the canvas
 */
function drawPaperGrain(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
  for (let i = 0; i < 3500; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.restore();
}

/**
 * Draws tasteful retro polka dots across the strip paper background
 */
function drawPolkaDots(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = 'rgba(180, 50, 75, 0.12)';
  const dotRadius = 3;
  const spacing = 30;
  for (let y = 15; y < height; y += spacing) {
    const offsetX = (Math.floor(y / spacing) % 2) * (spacing / 2);
    for (let x = 15; x < width; x += spacing) {
      ctx.beginPath();
      ctx.arc(x + offsetX, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Draws a 4-point decorative star
 */
function drawDecorativeStar(ctx, cx, cy, outerRadius, innerRadius, color) {
  ctx.save();
  ctx.fillStyle = color;
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / 4;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < 4; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a small decorative heart
 */
function drawDecorativeHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.translate(x, y);
  ctx.beginPath();
  const topCurveHeight = size * 0.3;
  ctx.moveTo(0, topCurveHeight);
  ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
  ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, (size + topCurveHeight) / 1.4, 0, size);
  ctx.bezierCurveTo(0, (size + topCurveHeight) / 1.4, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
  ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draws tasteful decorative stars and hearts along the margins
 */
function drawStarsAndHeartsPattern(ctx, width, height) {
  ctx.save();
  const starColor = 'rgba(215, 145, 30, 0.32)'; // Warm vintage gold
  const heartColor = 'rgba(205, 55, 85, 0.28)'; // Soft vintage rose

  // Scatter along the side borders
  for (let y = 35; y < height - 60; y += 52) {
    const isEven = (Math.floor(y / 52) % 2 === 0);
    // Left margin
    if (isEven) {
      drawDecorativeStar(ctx, 10, y, 6, 2.2, starColor);
    } else {
      drawDecorativeHeart(ctx, 10, y - 4, 7, heartColor);
    }
    // Right margin
    if (isEven) {
      drawDecorativeHeart(ctx, width - 10, y - 4, 7, heartColor);
    } else {
      drawDecorativeStar(ctx, width - 10, y, 6, 2.2, starColor);
    }
  }

  // Header & Footer decorative accents
  drawDecorativeStar(ctx, width / 2 - 70, 20, 5, 2, starColor);
  drawDecorativeStar(ctx, width / 2 + 70, 20, 5, 2, starColor);
  drawDecorativeHeart(ctx, width / 2 - 80, height - 25, 7, heartColor);
  drawDecorativeHeart(ctx, width / 2 + 80, height - 25, 7, heartColor);

  ctx.restore();
}

/**
 * Composes the base photo strip with the selected design preset and width format.
 * Caches loaded images and rendered canvases for instantaneous (<5ms) design switching.
 *
 * @param {Array<{ dataUrl: string, id: number }>} photos
 * @param {Object} options
 * @param {string} options.designId - One of the 6 STRIP_DESIGNS ids
 * @param {string} options.widthId - 'wide' or 'slim'
 * @param {string} options.dateText - Vintage date string
 * @returns {Promise<HTMLCanvasElement>} Cached offscreen canvas containing the base strip
 */
export async function composeBasePhotoStrip(photos, options = {}) {
  if (!photos || photos.length === 0) {
    throw new Error('No photographs provided for strip composition');
  }

  const {
    designId = 'classic_cream',
    widthId = 'wide',
    dateText = getFormattedVintageDate()
  } = options;

  const widthPreset = STRIP_WIDTH_PRESETS[widthId] || STRIP_WIDTH_PRESETS.wide;
  const designPreset = STRIP_DESIGNS.find((d) => d.id === designId) || STRIP_DESIGNS[0];

  // Check composed canvas cache
  const cacheKey = `${designPreset.id}_${widthPreset.id}`;
  if (composedBaseCanvasCache.has(cacheKey)) {
    return composedBaseCanvasCache.get(cacheKey);
  }

  const stripWidth = widthPreset.width;
  const stripHeight = widthPreset.height;
  const sideMargin = widthPreset.sideMargin;
  const photoWidth = widthPreset.photoWidth;
  const photoHeight = widthPreset.photoHeight;
  const photoGap = widthPreset.photoGap;
  const topMargin = widthPreset.topMargin;

  const canvas = document.createElement('canvas');
  canvas.width = stripWidth;
  canvas.height = stripHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // 1. Draw Paper Background Base
  ctx.fillStyle = designPreset.paperColor;
  ctx.fillRect(0, 0, stripWidth, stripHeight);

  // 2. Draw Decorative Patterns (if selected)
  if (designPreset.patternType === 'polka_dots') {
    drawPolkaDots(ctx, stripWidth, stripHeight);
  } else if (designPreset.patternType === 'stars_hearts') {
    drawStarsAndHeartsPattern(ctx, stripWidth, stripHeight);
  }

  // 3. Draw Organic Paper Grain / Emulsion Texture (if enabled)
  if (designPreset.hasPaperGrain) {
    drawPaperGrain(ctx, stripWidth, stripHeight);
  }

  // 4. Subtle Inset Border on Paper Edges
  if (designPreset.outerBorder) {
    ctx.strokeStyle = designPreset.outerBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, stripWidth - 20, stripHeight - 20);
  }

  // 5. Load & Cache Images for this 4-photo set
  const currentKey = photos.map((p) => p.dataUrl.slice(-30)).join('|');
  if (loadedPhotosCacheKey !== currentKey || loadedImageElementsCache.length === 0) {
    loadedImageElementsCache = await Promise.all(
      photos.slice(0, 4).map((p) => loadImage(p.dataUrl))
    );
    loadedPhotosCacheKey = currentKey;
  }
  const loadedImages = loadedImageElementsCache;

  // 6. Draw 4 Captured Photographs at exact 4:3 Aspect Ratio
  let currentY = topMargin;

  for (let i = 0; i < loadedImages.length; i++) {
    const img = loadedImages[i];

    // Optional Photo Matting Frame (e.g. Cherry Pop / Polka Party)
    if (designPreset.photoMatColor && designPreset.photoMatPadding > 0) {
      const pad = designPreset.photoMatPadding;
      ctx.save();
      ctx.fillStyle = designPreset.photoMatColor;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      ctx.fillRect(sideMargin - pad, currentY - pad, photoWidth + pad * 2, photoHeight + pad * 2);
      ctx.restore();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sideMargin - pad, currentY - pad, photoWidth + pad * 2, photoHeight + pad * 2);
    }

    ctx.save();
    // Soft physical drop shadow for photo depth
    ctx.shadowColor = 'rgba(40, 6, 12, 0.14)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Draw photo snapshot at exact 4:3 ratio without stretching
    ctx.drawImage(img, sideMargin, currentY, photoWidth, photoHeight);
    ctx.restore();

    // Emulsion photo border
    if (designPreset.photoBorder) {
      ctx.strokeStyle = designPreset.photoBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(sideMargin, currentY, photoWidth, photoHeight);
    }

    currentY += photoHeight + photoGap;
  }

  // 7. Static Elements in Footer (Divider rule, Date Stamp, Arcade Mark)
  const footerStartY = widthPreset.footerStartY;

  ctx.save();
  ctx.textAlign = 'center';

  // Delicate divider rule above footer
  if (designPreset.dividerColor) {
    ctx.strokeStyle = designPreset.dividerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sideMargin + 15, footerStartY);
    ctx.lineTo(stripWidth - (sideMargin + 15), footerStartY);
    ctx.stroke();
  }

  // Date Stamp in Special Elite font
  ctx.fillStyle = designPreset.textColor;
  ctx.font = '13px "Special Elite", "Courier New", monospace';
  ctx.letterSpacing = '1.5px';
  ctx.fillText(`• ${dateText.toUpperCase()} •`, stripWidth / 2, widthPreset.dateY);

  // Vintage Arcade Mark in Bebas Neue font
  ctx.fillStyle = designPreset.arcadeColor;
  ctx.font = 'bold 11px "Bebas Neue", sans-serif';
  ctx.letterSpacing = '2.5px';
  ctx.fillText('THE VINTAGE BOOTH • NO. 44', stripWidth / 2, widthPreset.arcadeY);

  ctx.restore();

  // Cache the composed base canvas
  composedBaseCanvasCache.set(cacheKey, canvas);

  return canvas;
}

/**
 * Instantly renders the final photo strip with the latest caption text.
 * Runs in ~2ms without reloading any images or flickering.
 *
 * @param {HTMLCanvasElement} baseCanvas - Cached canvas from composeBasePhotoStrip
 * @param {string} caption - Current user-entered caption
 * @param {Object} options - { designId, widthId }
 * @returns {string} dataUrl of final PNG
 */
export function renderFinalPhotoStrip(baseCanvas, caption = '', options = {}) {
  if (!baseCanvas) return '';

  const {
    designId = 'classic_cream',
    widthId = 'wide'
  } = options;

  const widthPreset = STRIP_WIDTH_PRESETS[widthId] || STRIP_WIDTH_PRESETS.wide;
  const designPreset = STRIP_DESIGNS.find((d) => d.id === designId) || STRIP_DESIGNS[0];

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = baseCanvas.width;
  finalCanvas.height = baseCanvas.height;
  const ctx = finalCanvas.getContext('2d');

  if (!ctx) return '';

  // 1. Draw cached base strip (paper, pattern, 4 photos, static footer)
  ctx.drawImage(baseCanvas, 0, 0);

  // 2. Draw live caption in Special Elite font with design's caption color
  const trimmed = (caption || '').trim();
  if (trimmed.length > 0) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = designPreset.captionColor;
    ctx.font = '15px "Special Elite", "Courier New", monospace';
    ctx.letterSpacing = '1px';
    ctx.fillText(trimmed, finalCanvas.width / 2, widthPreset.captionY);
    ctx.restore();
  }

  return finalCanvas.toDataURL('image/png');
}

/**
 * Triggers a browser download directly without a backend
 * @param {string} dataUrl
 * @param {string} filename
 */
export function triggerBrowserDownload(dataUrl, filename) {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
