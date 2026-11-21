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
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1',
    'video/mp4'
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
  if (mimeType && mimeType.includes('mp4')) {
    return 'mp4';
  }
  return 'webm';
}

/**
 * Trigger download of a video blob or object URL
 */
export function triggerVideoDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
  }, 200);
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

    // Portrait Silhouette
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

    mockAnimFrameId = requestAnimationFrame(renderMockFrame);
  }

  renderMockFrame();

  if (!mockAnimStream && mockAnimCanvas.captureStream) {
    mockAnimStream = mockAnimCanvas.captureStream(30);
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
  }

  /**
   * Start recording pre-shutter footage (~1.5s before shutter)
   */
  startRecording({ stream, isMock, photoIndex, activeFilter }) {
    if (!isMediaRecorderSupported()) {
      console.warn('MediaRecorder unsupported in this browser; Live Photo skipped.');
      return false;
    }

    // Cancel any stale recorder
    this.cancel();

    let targetStream = stream;
    if (isMock || !targetStream) {
      targetStream = getMockAnimatedStream(activeFilter, photoIndex);
    }

    if (!targetStream) {
      console.warn('No media stream available for Live Photo recording.');
      return false;
    }

    const mimeType = getSupportedVideoMimeType();
    const options = mimeType ? { mimeType } : undefined;

    try {
      this.currentRecorder = new MediaRecorder(targetStream, options);
    } catch (err) {
      console.warn('Failed to initialize MediaRecorder:', err);
      try {
        // Fallback without options
        this.currentRecorder = new MediaRecorder(targetStream);
      } catch (fallbackErr) {
        console.error('MediaRecorder completely unavailable:', fallbackErr);
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
      this.isRecording = false;
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
          const blob = new Blob(this.recordedChunks, { type: mimeType });
          const videoUrl = URL.createObjectURL(blob);
          const duration = (Date.now() - (this.recordingStartTime || Date.now())) / 1000;

          if (mockAnimFrameId) {
            cancelAnimationFrame(mockAnimFrameId);
            mockAnimFrameId = null;
          }

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
