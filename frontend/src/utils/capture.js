/**
 * Frame Capture Utility for Vintage Photo Booth
 * Captures 4:3 portrait frames from webcam video or fallback mock generator,
 * applying the selected retro film filter directly onto the Canvas.
 */

export const POSE_PROMPTS = [
  {
    step: 1,
    title: 'PHOTO 1 OF 4',
    prompt: 'Smile for the camera! 😊',
    tip: 'Look right into the lens'
  },
  {
    step: 2,
    title: 'PHOTO 2 OF 4',
    prompt: 'Strike a retro pose! ✨',
    tip: 'Give us some vintage charm'
  },
  {
    step: 3,
    title: 'PHOTO 3 OF 4',
    prompt: 'Make a silly face! 🤪',
    tip: 'Have fun with it!'
  },
  {
    step: 4,
    title: 'PHOTO 4 OF 4',
    prompt: 'One last dramatic look! 🎬',
    tip: 'Hold that glamour pose'
  }
];

// Reusable noise tile for analog film grain
let cachedNoiseTile = null;
function getNoiseTile() {
  if (cachedNoiseTile) return cachedNoiseTile;
  const tile = document.createElement('canvas');
  tile.width = 140;
  tile.height = 140;
  const tCtx = tile.getContext('2d');
  if (!tCtx) return null;
  const imgData = tCtx.createImageData(tile.width, tile.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const val = Math.floor(Math.random() * 256);
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 70; // Pronounced organic analog grain
  }
  tCtx.putImageData(imgData, 0, 0);
  cachedNoiseTile = tile;
  return tile;
}

/**
 * Capture a frame from video element or generate mock snapshot
 * @param {HTMLVideoElement|null} videoElement
 * @param {Object} filter
 * @param {boolean} isMock
 * @param {number} photoIndex (1 to 4)
 * @returns {Promise<{ id: number, dataUrl: string, filter: Object, timestamp: number }>}
 */
export async function capturePhotoSnapshot(videoElement, filter, isMock, photoIndex) {
  const canvas = document.createElement('canvas');
  // 4:3 high-resolution aspect ratio for crisp print & display
  canvas.width = 960;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  const hasLiveVideo =
    !isMock &&
    videoElement &&
    videoElement.readyState >= 2 &&
    videoElement.videoWidth > 0 &&
    videoElement.videoHeight > 0;

  if (hasLiveVideo) {
    // 1. Live Video Frame Capture
    ctx.save();

    // Mirror horizontally to match what user saw in the mirror
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // Apply the selected filter directly to the canvas rendering context
    if (filter && filter.cssFilter) {
      try {
        ctx.filter = filter.cssFilter;
      } catch (e) {
        console.warn('Canvas filter string unsupported, drawing standard frame:', e);
      }
    }

    // Calculate crop to maintain 4:3 aspect ratio without stretching
    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    const targetAspect = 4 / 3;
    const videoAspect = vw / vh;

    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoAspect > targetAspect) {
      sw = vh * targetAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetAspect;
      sy = (vh - sh) / 2;
    }

    ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    // 2. Synthetic Test Portrait Mode (Fallback)
    drawMockPortrait(ctx, canvas.width, canvas.height, filter, photoIndex);
  }

  // 3. Apply exact Snapchat lens optical effects (Analog Chromatin & Dania Natural Makeup)
  applyFilterEffectsToCanvas(ctx, canvas.width, canvas.height, filter);

  // Generate lightweight high-quality JPEG data URL (in-memory only)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

  return {
    id: photoIndex,
    dataUrl,
    filter,
    timestamp: Date.now()
  };
}

/**
 * Apply fine-tuned optical and tonal effects to match Snapchat lens references:
 * 1. Filter 2 (Dreamy Digicam) -> Analog Chromatin by Hitesh
 * 2. Filter 4 (Natural Glow) -> Natural Makeup by Dania
 */
function applyFilterEffectsToCanvas(ctx, width, height, filter) {
  if (!filter) return;

  // 1. Analog Chromatin by Hitesh (Dreamy Digicam)
  if (filter.id === 'dreamy-digicam') {
    ctx.save();

    // A. Cool bluish & lavender-tinted analog tone
    ctx.globalCompositeOperation = 'soft-light';
    const coolWash = ctx.createLinearGradient(0, 0, width, height);
    coolWash.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    coolWash.addColorStop(0.5, 'rgba(129, 140, 248, 0.25)');
    coolWash.addColorStop(1, 'rgba(167, 139, 250, 0.32)');
    ctx.fillStyle = coolWash;
    ctx.fillRect(0, 0, width, height);

    // B. Distinctive Red-Blue Chromatic Color Shifts (RGB Fringe Aberration)
    ctx.globalCompositeOperation = 'screen';
    // Red fringe gradient on left edges
    const redFringe = ctx.createLinearGradient(0, 0, width * 0.15, 0);
    redFringe.addColorStop(0, 'rgba(255, 30, 70, 0.28)');
    redFringe.addColorStop(1, 'rgba(255, 30, 70, 0)');
    ctx.fillStyle = redFringe;
    ctx.fillRect(0, 0, width * 0.15, height);

    // Cyan/Blue fringe gradient on right edges
    const cyanFringe = ctx.createLinearGradient(width * 0.85, 0, width, 0);
    cyanFringe.addColorStop(0, 'rgba(0, 210, 255, 0)');
    cyanFringe.addColorStop(1, 'rgba(0, 210, 255, 0.30)');
    ctx.fillStyle = cyanFringe;
    ctx.fillRect(width * 0.85, 0, width * 0.15, height);

    // Lateral chromatic fringing across center
    const centerChromatic = ctx.createLinearGradient(0, 0, width, 0);
    centerChromatic.addColorStop(0, 'rgba(255, 20, 60, 0.08)');
    centerChromatic.addColorStop(0.5, 'transparent');
    centerChromatic.addColorStop(1, 'rgba(0, 200, 255, 0.10)');
    ctx.fillStyle = centerChromatic;
    ctx.fillRect(0, 0, width, height);

    // C. Retro Lo-Fi & VHS Interlace Texture (Horizontal scanlines)
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1.5);
    }

    // D. Pronounced Analog Film Grain
    const noiseTile = getNoiseTile();
    if (noiseTile) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = ctx.createPattern(noiseTile, 'repeat');
      ctx.fillRect(0, 0, width, height);
    }

    // E. Lifted Lo-Fi Blacks / Faded Shadows
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.10)';
    ctx.fillRect(0, 0, width, height);

    // F. Dreamy Analog Vignette
    ctx.globalCompositeOperation = 'multiply';
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.35,
      width / 2, height / 2, width * 0.72
    );
    vignette.addColorStop(0, 'rgba(255, 255, 255, 1)');
    vignette.addColorStop(0.8, 'rgba(240, 245, 255, 0.95)');
    vignette.addColorStop(1, 'rgba(15, 23, 42, 0.65)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  // 2. Natural Makeup by Dania (Natural Glow)
  if (filter.id === 'natural-glow') {
    ctx.save();

    // A. Fresh, Brighter Complexion Diffusion
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(255, 244, 235, 0.22)';
    ctx.fillRect(0, 0, width, height);

    // B. Gentle Sun-Kissed Golden-Honey Warmth
    const sunWarmth = ctx.createLinearGradient(0, 0, 0, height);
    sunWarmth.addColorStop(0, 'rgba(251, 191, 36, 0.10)');
    sunWarmth.addColorStop(0.5, 'rgba(251, 146, 60, 0.08)');
    sunWarmth.addColorStop(1, 'rgba(244, 114, 182, 0.06)');
    ctx.fillStyle = sunWarmth;
    ctx.fillRect(0, 0, width, height);

    // C. Naturally Blended Rosy Blush: Cheeks & Nose Bridge (Dania signature "W" flush)
    const blushRadius = width * 0.16;
    const cheekY = height * 0.51;
    const leftCheekX = width * 0.37;
    const rightCheekX = width * 0.63;

    // Left Apple
    const leftBlush = ctx.createRadialGradient(leftCheekX, cheekY, 4, leftCheekX, cheekY, blushRadius);
    leftBlush.addColorStop(0, 'rgba(251, 113, 133, 0.32)');
    leftBlush.addColorStop(0.45, 'rgba(251, 146, 60, 0.16)');
    leftBlush.addColorStop(1, 'rgba(251, 113, 133, 0)');
    ctx.fillStyle = leftBlush;
    ctx.fillRect(leftCheekX - blushRadius, cheekY - blushRadius, blushRadius * 2, blushRadius * 2);

    // Right Apple
    const rightBlush = ctx.createRadialGradient(rightCheekX, cheekY, 4, rightCheekX, cheekY, blushRadius);
    rightBlush.addColorStop(0, 'rgba(251, 113, 133, 0.32)');
    rightBlush.addColorStop(0.45, 'rgba(251, 146, 60, 0.16)');
    rightBlush.addColorStop(1, 'rgba(251, 113, 133, 0)');
    ctx.fillStyle = rightBlush;
    ctx.fillRect(rightCheekX - blushRadius, cheekY - blushRadius, blushRadius * 2, blushRadius * 2);

    // Nose Bridge Sun-Kissed Flush
    const bridgeX = width * 0.5;
    const bridgeY = height * 0.50;
    const bridgeRadiusX = width * 0.14;
    const bridgeRadiusY = height * 0.06;
    const noseBridge = ctx.createRadialGradient(bridgeX, bridgeY, 2, bridgeX, bridgeY, bridgeRadiusX);
    noseBridge.addColorStop(0, 'rgba(251, 113, 133, 0.22)');
    noseBridge.addColorStop(0.6, 'rgba(251, 146, 60, 0.10)');
    noseBridge.addColorStop(1, 'rgba(251, 113, 133, 0)');
    ctx.fillStyle = noseBridge;
    ctx.fillRect(bridgeX - bridgeRadiusX, bridgeY - bridgeRadiusY, bridgeRadiusX * 2, bridgeRadiusY * 2);

    // D. Subtle Pink Glossy Lips + Specular Shine
    const lipX = width * 0.5;
    const lipY = height * 0.64;
    const lipRadiusX = width * 0.10;
    const lipRadiusY = height * 0.06;

    // Natural Rosy-Pink Base Tint
    const lipTint = ctx.createRadialGradient(lipX, lipY, 2, lipX, lipY, lipRadiusX);
    lipTint.addColorStop(0, 'rgba(225, 29, 72, 0.28)');
    lipTint.addColorStop(0.65, 'rgba(244, 63, 94, 0.16)');
    lipTint.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = lipTint;
    ctx.fillRect(lipX - lipRadiusX, lipY - lipRadiusY, lipRadiusX * 2, lipRadiusY * 2);

    // Lip Gloss Specular Highlight (Center of lower lip & cupid's bow)
    ctx.globalCompositeOperation = 'screen';
    const glossHighlight = ctx.createRadialGradient(lipX, lipY + 4, 1, lipX, lipY + 4, lipRadiusX * 0.45);
    glossHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.38)');
    glossHighlight.addColorStop(0.7, 'rgba(255, 230, 240, 0.12)');
    glossHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = glossHighlight;
    ctx.fillRect(lipX - lipRadiusX * 0.5, lipY - lipRadiusY * 0.5, lipRadiusX, lipRadiusY);

    // E. Dewy Glass-Skin Radiance on High Points
    const dewyGlow = ctx.createRadialGradient(width * 0.5, height * 0.40, 2, width * 0.5, height * 0.40, width * 0.20);
    dewyGlow.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
    dewyGlow.addColorStop(0.7, 'rgba(255, 245, 235, 0.06)');
    dewyGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = dewyGlow;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }
}

/**
 * Draw a charming vintage booth portrait with pose variations for mock/fallback mode
 */
function drawMockPortrait(ctx, width, height, filter, photoIndex) {
  ctx.save();

  // Apply chosen filter
  if (filter && filter.cssFilter) {
    try {
      ctx.filter = filter.cssFilter;
    } catch { }
  }

  // Vintage studio backdrop
  const bgGradient = ctx.createRadialGradient(
    width / 2, height / 2 - 50, 40,
    width / 2, height / 2, width * 0.7
  );
  bgGradient.addColorStop(0, '#5a1322');
  bgGradient.addColorStop(0.7, '#24060c');
  bgGradient.addColorStop(1, '#110205');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle curtain drapes at the sides
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, 100, height);
  ctx.fillRect(width - 100, 0, 100, height);

  // Head and Hair
  ctx.fillStyle = '#2c140e';
  ctx.beginPath();
  ctx.arc(width / 2, height / 2 - 40, 110, 0, Math.PI * 2);
  ctx.fill();

  // Face
  ctx.fillStyle = '#f5d6ba';
  ctx.beginPath();
  ctx.ellipse(width / 2, height / 2 - 20, 80, 95, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sunglasses / Glasses
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(width / 2 - 65, height / 2 - 55, 50, 32, 10);
    ctx.roundRect(width / 2 + 15, height / 2 - 55, 50, 32, 10);
  } else {
    ctx.rect(width / 2 - 65, height / 2 - 55, 50, 32);
    ctx.rect(width / 2 + 15, height / 2 - 55, 50, 32);
  }
  ctx.fill();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 15, height / 2 - 40);
  ctx.lineTo(width / 2 + 15, height / 2 - 40);
  ctx.stroke();

  // Pose variation smiles & expressions
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (photoIndex === 1) {
    // Big warm smile
    ctx.arc(width / 2, height / 2 + 10, 35, 0.15 * Math.PI, 0.85 * Math.PI);
  } else if (photoIndex === 2) {
    // Winking / tilted smile
    ctx.arc(width / 2 + 5, height / 2 + 12, 32, 0.1 * Math.PI, 0.9 * Math.PI);
  } else if (photoIndex === 3) {
    // Silly face (open mouth)
    ctx.ellipse(width / 2, height / 2 + 30, 24, 18, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#b91c1c';
    ctx.fill();
  } else {
    // Dramatic pose / subtle curve
    ctx.moveTo(width / 2 - 25, height / 2 + 25);
    ctx.lineTo(width / 2 + 25, height / 2 + 25);
  }
  ctx.stroke();

  // Retro Jacket / Shoulders
  ctx.fillStyle = '#701426';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 240, height);
  ctx.quadraticCurveTo(width / 2 - 180, height / 2 + 100, width / 2 - 60, height / 2 + 90);
  ctx.lineTo(width / 2 + 60, height / 2 + 90);
  ctx.quadraticCurveTo(width / 2 + 180, height / 2 + 100, width / 2 + 240, height);
  ctx.closePath();
  ctx.fill();

  // Mustard collar
  ctx.fillStyle = '#fab839';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 35, height / 2 + 90);
  ctx.lineTo(width / 2, height / 2 + 140);
  ctx.lineTo(width / 2 + 35, height / 2 + 90);
  ctx.closePath();
  ctx.fill();

  // Vintage Watermark stamp on snapshot
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.font = 'bold 22px "Bebas Neue", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`POSE #${photoIndex} • VINTAGE BOOTH`, width - 30, height - 25);

  ctx.restore();
}
