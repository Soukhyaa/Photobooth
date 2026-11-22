/**
 * Live Photo Recording Utility for Vintage Photo Booth
 * 
 * Captures Apple-inspired Live Photo clips:
 * - ~1.5s pre-shutter + ~1.2s post-shutter (total ~2.7s)
 * - Synchronized with the shutter moment
 * - In-memory Blob/Object-URL management (zero server uploads)
 * - Multi-codec detection (VP9/VP8/WebM/MP4) with graceful fallbacks
 * - Supports both Live Webcam and Synthetic Test Feed
 */

/**
 * Check if MediaRecorder is supported in current browser environment
 */
export function isMediaRecorderSupported() {
  return typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
}

/**
 * Get preferred browser-supported video MIME type
 */
export function getSupportedVideoMimeType() {
  if (!isMediaRecorderSupported()) return null;

  const candidateTypes = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  for (const type of candidateTypes) {
    try {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      // Continue checking next candidate
    }
  }

  return '';
}

/**
 * Get recommended file extension based on MIME type
 */
export function getVideoFileExtension(mimeType) {
  if (mimeType && mimeType.toLowerCase().includes('mp4')) {
    return 'mp4';
  }
  return 'webm';
}

/**
 * Trigger download of a video blob or object URL
 */
export function triggerVideoDownload(blobOrUrl, filename) {
  if (!blobOrUrl) {
    console.warn('triggerVideoDownload called with empty blob/url');
    return;
  }

  let objectUrl = null;
  let downloadUrl = '';

  if (typeof Blob !== 'undefined' && blobOrUrl instanceof Blob) {
    objectUrl = URL.createObjectURL(blobOrUrl);
    downloadUrl = objectUrl;
  } else if (typeof blobOrUrl === 'string') {
    downloadUrl = blobOrUrl;
  } else {
    console.warn('triggerVideoDownload: unsupported source type', blobOrUrl);
    return;
  }

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  link.style.position = 'fixed';
  link.style.left = '-9999px';
  link.style.top = '-9999px';
  link.style.opacity = '0';
  document.body.appendChild(link);

  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

  setTimeout(() => {
    if (link.parentNode) {
      document.body.removeChild(link);
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }, 4000);
}

/**
 * Clean up object URLs to free memory
 */
export function revokeLiveClipUrls(clips = []) {
  if (!Array.isArray(clips)) return;
  clips.forEach((clip) => {
    if (clip && clip.videoUrl && clip.videoUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(clip.videoUrl);
      } catch {
        // Ignore revocation errors
      }
    }
  });
}

/**
 * Helper to generate an animated mock stream for Test Mode
 */
let mockAnimCanvas = null;
let mockAnimStream = null;
let mockAnimFrameId = null;

function getMockAnimatedStream(filter, photoIndex) {
  if (!mockAnimCanvas) {
    mockAnimCanvas = document.createElement('canvas');
    mockAnimCanvas.width = 640;
    mockAnimCanvas.height = 480;
  }
  const ctx = mockAnimCanvas.getContext('2d');
  if (!ctx) return null;

  // Cancel prior loop if active
  if (mockAnimFrameId) {
    cancelAnimationFrame(mockAnimFrameId);
  }

  const startTime = Date.now();

  function renderMockFrame() {
    const elapsed = (Date.now() - startTime) / 1000;
    const w = mockAnimCanvas.width;
    const h = mockAnimCanvas.height;

    ctx.save();
    // Apply selected retro filter (Soft B&W or Golden Hour) directly to mock canvas
    if (filter && filter.cssFilter) {
      try {
        ctx.filter = filter.cssFilter;
      } catch {}
    } else {
      ctx.filter = 'none';
    }

    // Background gradient
    ctx.fillStyle = '#2b0c14';
    ctx.fillRect(0, 0, w, h);

    // Warm curtain backdrop
    ctx.fillStyle = '#4a1520';
    for (let x = 0; x < w; x += 40) {
      ctx.fillRect(x, 0, 20, h);
    }

    // Subtle breathing/bobbing motion
    const bob = Math.sin(elapsed * 4) * 6;

    // Portrait Silhouette (horizontally unflipped, natural orientation)
    ctx.save();
    ctx.translate(w / 2, h / 2 + bob);

    // Shoulders
    ctx.fillStyle = '#701426';
    ctx.beginPath();
    ctx.ellipse(0, 110, 120, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#f5d6ba';
    ctx.beginPath();
    ctx.ellipse(0, 0, 55, 68, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#3a1c14';
    ctx.beginPath();
    ctx.arc(0, -20, 62, Math.PI, Math.PI * 2);
    ctx.fill();

    // Sunglasses
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-38, -12, 32, 20);
    ctx.fillRect(6, -12, 32, 20);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(6, -2);
    ctx.stroke();

    // Smile
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 18, 20, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();

    // Watermark tag
    ctx.fillStyle = '#fab839';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`TEST FEED • LIVE POSE ${photoIndex}`, 20, 36);

    ctx.restore();

    mockAnimFrameId = requestAnimationFrame(renderMockFrame);
  }

  renderMockFrame();

  if (!mockAnimStream || (mockAnimStream.active === false)) {
    if (mockAnimCanvas.captureStream) {
      mockAnimStream = mockAnimCanvas.captureStream(30);
    }
  }

  return mockAnimStream;
}

/**
 * Controller class managing the lifecycle of Live Photo recording
 */
class LivePhotoManager {
  constructor() {
    this.currentRecorder = null;
    this.recordedChunks = [];
    this.activePhotoIndex = null;
    this.recordingStartTime = null;
    this.isRecording = false;
    this.recordCanvas = null;
    this.animFrameId = null;
    this.activeStream = null;
  }

  /**
   * Start recording pre-shutter footage (~1.5s before shutter) with the selected filter
   * applied and in natural, horizontally unflipped orientation.
   */
  startRecording({ stream, videoElement, isMock, photoIndex, activeFilter }) {
    if (!isMediaRecorderSupported()) {
      console.warn('MediaRecorder unsupported in this browser; Live Photo skipped.');
      return false;
    }

    // Cancel any ongoing recording
    this.cancel();

    let targetStream = null;

    if (isMock || !videoElement || videoElement.readyState < 2) {
      targetStream = getMockAnimatedStream(activeFilter, photoIndex);
    } else {
      // Process live camera frames through Canvas with the selected filter
      if (!this.recordCanvas) {
        this.recordCanvas = document.createElement('canvas');
        this.recordCanvas.width = 640;
        this.recordCanvas.height = 480;
      }
      const canvas = this.recordCanvas;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const filterStr = activeFilter?.cssFilter || 'none';
      const targetAspect = 4 / 3;

      this.isRecording = true;

      const renderLiveFrame = () => {
        if (!this.isRecording) return;

        ctx.save();
        // 1. Consistently apply selected filter throughout pre- and post-shutter
        try {
          ctx.filter = filterStr;
        } catch {
          ctx.filter = 'none';
        }

        // 2. Horizontally UNFLIPPED (natural camera orientation, no scale(-1, 1))
        const vw = videoElement.videoWidth || 640;
        const vh = videoElement.videoHeight || 480;
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

        this.animFrameId = requestAnimationFrame(renderLiveFrame);
      };

      // Start the frame loop
      renderLiveFrame();

      if (canvas.captureStream) {
        targetStream = canvas.captureStream(30);
      } else {
        targetStream = stream;
      }
    }

    if (!targetStream) {
      console.warn('No media stream available for Live Photo recording.');
      this.cancel();
      return false;
    }

    this.activeStream = targetStream;
    const mimeType = getSupportedVideoMimeType();
    const options = mimeType ? { mimeType, videoBitsPerSecond: 3500000 } : undefined;

    try {
      this.currentRecorder = new MediaRecorder(targetStream, options);
    } catch (err) {
      console.warn('Failed to initialize MediaRecorder with options:', err);
      try {
        // Fallback without options
        this.currentRecorder = new MediaRecorder(targetStream);
      } catch (fallbackErr) {
        console.error('MediaRecorder completely unavailable:', fallbackErr);
        this.cancel();
        return false;
      }
    }

    this.recordedChunks = [];
    this.activePhotoIndex = photoIndex;
    this.recordingStartTime = Date.now();
    this.isRecording = true;

    this.currentRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    try {
      // Collect data every 100ms
      this.currentRecorder.start(100);
      return true;
    } catch (startErr) {
      console.warn('Error starting MediaRecorder:', startErr);
      this.cancel();
      return false;
    }
  }

  /**
   * Stop recording post-shutter (~1.2s after shutter) and produce Live Clip object
   */
  stopRecording() {
    return new Promise((resolve) => {
      if (!this.currentRecorder || !this.isRecording || this.currentRecorder.state === 'inactive') {
        this.cancel();
        resolve(null);
        return;
      }

      const photoId = this.activePhotoIndex;
      const recorder = this.currentRecorder;
      const mimeType = recorder.mimeType || getSupportedVideoMimeType() || 'video/webm';
      const extension = getVideoFileExtension(mimeType);

      // Safety timeout in case browser never fires onstop
      const safetyTimer = setTimeout(() => {
        console.warn('MediaRecorder stop timed out after 2.5s; resolving null.');
        this.cancel();
        resolve(null);
      }, 2500);

      recorder.onerror = (err) => {
        console.warn('MediaRecorder runtime error:', err);
        clearTimeout(safetyTimer);
        this.cancel();
        resolve(null);
      };

      recorder.onstop = () => {
        clearTimeout(safetyTimer);
        try {
          if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
          }
          if (mockAnimFrameId) {
            cancelAnimationFrame(mockAnimFrameId);
            mockAnimFrameId = null;
          }

          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const videoUrl = URL.createObjectURL(blob);
          const duration = (Date.now() - (this.recordingStartTime || Date.now())) / 1000;

          this.currentRecorder = null;
          this.recordedChunks = [];
          this.isRecording = false;

          resolve({
            id: photoId,
            blob,
            videoUrl,
            mimeType,
            extension,
            filename: `vintage-booth-live-${photoId}.${extension}`,
            duration: Number(duration.toFixed(1))
          });
        } catch (err) {
          console.error('Error packaging Live Photo blob:', err);
          this.cancel();
          resolve(null);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
        clearTimeout(safetyTimer);
        this.cancel();
        resolve(null);
      }
    });
  }

  /**
   * Immediately abort ongoing recording without saving
   */
  cancel() {
    if (this.currentRecorder && this.currentRecorder.state !== 'inactive') {
      try {
        this.currentRecorder.stop();
      } catch {
        // Ignore
      }
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (mockAnimFrameId) {
      cancelAnimationFrame(mockAnimFrameId);
      mockAnimFrameId = null;
    }
    this.currentRecorder = null;
    this.recordedChunks = [];
    this.activePhotoIndex = null;
    this.isRecording = false;
  }
}

export const livePhotoManager = new LivePhotoManager();
