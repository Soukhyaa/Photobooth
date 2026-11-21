import React, { useState, useEffect, useRef } from 'react';
import {
  composeBasePhotoStrip,
  renderFinalPhotoStrip,
  triggerBrowserDownload,
  getFormattedVintageDate
} from '../utils/stripComposer';
import { triggerVideoDownload } from '../utils/liveRecorder';
import { soundEngine } from '../utils/audio';

export default function PhotoStripPreview({
  capturedPhotos,
  liveClips = [],
  captureMode = 'still',
  selectedFilter,
  onRetake,
  onStripComposed
}) {
  const [baseStripUrl, setBaseStripUrl] = useState(null);
  const [isComposingBase, setIsComposingBase] = useState(true);
  const [caption, setCaption] = useState('MEMORIES IN THE BOOTH');
  const [downloadNotice, setDownloadNotice] = useState('');
  const [activePlayingPhotoId, setActivePlayingPhotoId] = useState(null);

  const baseCanvasRef = useRef(null);

  // 1. Compose the 4-photo base strip ONCE.
  // The 4 photographs remain completely stable while the user edits the caption.
  useEffect(() => {
    let isMounted = true;
    setIsComposingBase(true);

    composeBasePhotoStrip(capturedPhotos, {
      dateText: getFormattedVintageDate()
    })
      .then((canvas) => {
        if (!isMounted) return;
        baseCanvasRef.current = canvas;
        const initialBaseUrl = canvas.toDataURL('image/png');
        setBaseStripUrl(initialBaseUrl);
        setIsComposingBase(false);

        // Notify parent with initial complete strip
        const finalUrl = renderFinalPhotoStrip(canvas, caption);
        if (onStripComposed) {
          onStripComposed(finalUrl);
        }
      })
      .catch((err) => {
        console.error('Error composing base photo strip:', err);
        if (isMounted) setIsComposingBase(false);
      });

    return () => {
      isMounted = false;
    };
  }, [capturedPhotos, onStripComposed]);

  // Keep parent's composed strip in sync when caption changes (without re-rendering base canvas)
  useEffect(() => {
    if (baseCanvasRef.current && onStripComposed) {
      const finalUrl = renderFinalPhotoStrip(baseCanvasRef.current, caption);
      onStripComposed(finalUrl);
    }
  }, [caption, onStripComposed]);

  // 2. Download Composed 600 × 1800 px Photo Strip
  const handleDownloadStrip = () => {
    if (!baseCanvasRef.current) return;
    soundEngine.playTrayDrop();

    // Render final strip synchronously with latest caption in ~2ms
    const finalStripUrl = renderFinalPhotoStrip(baseCanvasRef.current, caption);
    triggerBrowserDownload(finalStripUrl, 'vintage-booth-strip.png');

    setDownloadNotice('✓ Photo strip downloaded (600 × 1800 px)!');
    setTimeout(() => setDownloadNotice(''), 3500);
  };

  // 3. Download Single Individual Photo (1 to 4)
  const handleDownloadSinglePhoto = (photo, index) => {
    soundEngine.playTrayDrop();
    triggerBrowserDownload(photo.dataUrl, `vintage-booth-photo-${index + 1}.png`);
    setDownloadNotice(`✓ Downloaded Photo ${index + 1}!`);
    setTimeout(() => setDownloadNotice(''), 3000);
  };

  // 4. Download All 4 Individual Photos sequentially
  const handleDownloadAllIndividual = () => {
    soundEngine.playTrayDrop();
    capturedPhotos.forEach((photo, idx) => {
      setTimeout(() => {
        triggerBrowserDownload(photo.dataUrl, `vintage-booth-photo-${idx + 1}.png`);
      }, idx * 250);
    });
    setDownloadNotice('✓ Downloading all 4 individual photos...');
    setTimeout(() => setDownloadNotice(''), 3500);
  };

  // 5. Download Single Live Photo Clip
  const handleDownloadLiveClip = (clip) => {
    soundEngine.playTrayDrop();
    triggerVideoDownload(clip.videoUrl, clip.filename);
    setDownloadNotice(`✓ Downloaded Live Clip ${clip.id} (${clip.filename})!`);
    setTimeout(() => setDownloadNotice(''), 3000);
  };

  // 6. Download All Live Clips sequentially
  const handleDownloadAllLiveClips = () => {
    soundEngine.playTrayDrop();
    liveClips.forEach((clip, idx) => {
      setTimeout(() => {
        triggerVideoDownload(clip.videoUrl, clip.filename);
      }, idx * 300);
    });
    setDownloadNotice('✓ Downloading all 4 Live Photo clips...');
    setTimeout(() => setDownloadNotice(''), 3500);
  };

  // 7. Interactive Click-to-Play Live Photo directly on the digital strip
  const handleToggleLiveFrame = (photoId) => {
    soundEngine.playBeep(false);
    setActivePlayingPhotoId((prev) => (prev === photoId ? null : photoId));
  };

  return (
    <div className="strip-preview-stage">
      {/* Header */}
      <div className="strip-preview-header">
        <div className="strip-badge">
          <span className="badge-star">✦</span>
          <span>PHOTO STRIP COMPLETE</span>
          <span className="badge-star">✦</span>
        </div>
        <h2 className="strip-preview-title">Your 4-Pose Photo Strip</h2>
        <p className="strip-preview-sub">
          Filter: <strong>{selectedFilter.name}</strong> • Standard 2 × 6″ (600 × 1800 px @ 300 DPI)
          {captureMode === 'live' && (
            <span className="live-sub-tag"> • <strong>✦ Live Photos: Click photos on strip to play!</strong></span>
          )}
        </p>
      </div>

      <div className="strip-preview-workspace">
        {/* Left / Center: The Assembled Vertical Strip Preview */}
        <div className="physical-strip-wrapper">
          {isComposingBase ? (
            <div className="strip-composer-loading">
              <div className="retro-loader-spinner"></div>
              <span>Composing photo strip frames...</span>
            </div>
          ) : (
            <div className="physical-strip-card" title="Composed 600 × 1800 px Photo Strip">
              <img
                src={baseStripUrl}
                alt="Composed Vintage 4-Pose Photo Strip"
                className="composed-strip-image"
              />

              {/* Dynamic Live Typewriter Caption Overlay */}
              {/* Overlays caption in real-time with zero image reload or flicker */}
              <div className="strip-live-caption-slot" aria-hidden="true">
                <span className="strip-live-caption-text">
                  {caption.trim() || <span className="caption-empty-dot">• • •</span>}
                </span>
              </div>

              {/* In Live Photos mode: 4 Clickable Photo Zones directly on the strip */}
              {captureMode === 'live' && liveClips.length > 0 && (
                <div className="strip-interactive-frames-overlay">
                  {[
                    { id: 1, top: '1.94%' },
                    { id: 2, top: '24.94%' },
                    { id: 3, top: '47.94%' },
                    { id: 4, top: '70.94%' }
                  ].map(({ id, top }) => {
                    const clip = liveClips.find((c) => c.id === id);
                    const isPlaying = activePlayingPhotoId === id;
                    return (
                      <div
                        key={`frame-slot-${id}`}
                        className={`strip-photo-interactive-slot ${isPlaying ? 'playing' : ''}`}
                        style={{
                          top,
                          left: '6.67%',
                          width: '86.67%',
                          height: '21.67%'
                        }}
                        onClick={() => handleToggleLiveFrame(id)}
                        role="button"
                        tabIndex={0}
                        title={`Pose #${id}: Click to ${isPlaying ? 'pause' : 'play'} Live Photo clip`}
                      >
                        {isPlaying && clip ? (
                          <video
                            src={clip.videoUrl}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="strip-slot-video"
                            style={{ filter: selectedFilter.cssFilter }}
                          />
                        ) : null}

                        <div className="strip-slot-live-badge">
                          <span className={`live-tab-dot ${isPlaying ? 'active' : ''}`} />
                          <span>{isPlaying ? 'PAUSE LIVE' : '▶ LIVE'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="strip-gloss-sheen" />
            </div>
          )}
        </div>

        {/* Right Panel: Caption Customization & Download Options */}
        <aside className="strip-actions-panel">
          {/* Caption Editor Box */}
          <div className="strip-options-card">
            <h3 className="options-heading">KEEPSAKE CAPTION</h3>

            <div className="caption-input-group">
              <label htmlFor="caption-input" className="caption-label">
                Custom Footer Caption:
              </label>
              <input
                id="caption-input"
                type="text"
                maxLength={32}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="caption-text-input"
                placeholder="e.g. SUMMER MEMORIES '26"
              />
              <span className="caption-char-count">{caption.length}/32 chars</span>
            </div>

            <div className="strip-specs-info">
              <div className="spec-item">
                <span className="spec-label">DIMENSIONS:</span>
                <span className="spec-value">600 × 1800 px (300 DPI)</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">PAPER TONE:</span>
                <span className="spec-value">Warm Ivory / Vanilla Cream</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">FILTER EMULSION:</span>
                <span className="spec-value">{selectedFilter.name}</span>
              </div>
            </div>
          </div>

          {/* Download Notification Banner */}
          {downloadNotice && (
            <div className="download-notice-banner" role="status">
              <span>{downloadNotice}</span>
            </div>
          )}

          {/* Download & Save Controls */}
          <div className="strip-action-buttons">
            {/* Primary: Download Complete Strip */}
            <button
              type="button"
              className="strip-btn download-strip-btn"
              onClick={handleDownloadStrip}
              disabled={isComposingBase}
              aria-label="Download complete 600x1800 photo strip PNG"
            >
              <span className="btn-icon">📥</span>
              <div className="btn-labels">
                <span className="main-text">DOWNLOAD PHOTO STRIP</span>
                <span className="sub-text">FULL HIGH-RES PNG (600 × 1800 PX)</span>
              </div>
            </button>

            {/* Secondary: Individual Photo Downloads */}
            <div className="individual-downloads-card">
              <div className="individual-header">
                <span className="individual-title">SAVE INDIVIDUAL POSES:</span>
                <button
                  type="button"
                  className="save-all-link-btn"
                  onClick={handleDownloadAllIndividual}
                  title="Download all 4 individual photos"
                >
                  Save All 4
                </button>
              </div>

              <div className="individual-buttons-grid">
                {capturedPhotos.map((photo, idx) => (
                  <button
                    key={photo.id || idx}
                    type="button"
                    className="single-photo-dl-btn"
                    onClick={() => handleDownloadSinglePhoto(photo, idx)}
                    title={`Download Photo ${idx + 1} (PNG)`}
                  >
                    <span className="dl-icon">📷</span>
                    <span>Pose #{idx + 1}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tertiary: Live Photo Moments Preview & Download (Only if Live Photos Mode) */}
            {liveClips && liveClips.length > 0 && (
              <div className="live-moments-card">
                <div className="live-moments-header">
                  <div className="live-header-tag">
                    <span className="live-pulse-dot"></span>
                    <span className="live-header-title">LIVE PHOTO MOMENTS ({liveClips.length})</span>
                  </div>
                  <button
                    type="button"
                    className="save-all-link-btn"
                    onClick={handleDownloadAllLiveClips}
                    title="Download all 4 Live video clips"
                  >
                    Save All Live
                  </button>
                </div>
                <p className="live-moments-hint">
                  ~2.7s moving moment around each shutter click (1.5s before + 1.2s after).
                </p>

                <div className="live-clips-grid">
                  {liveClips.map((clip) => (
                    <div key={clip.id} className="live-clip-tile">
                      <div className="live-video-box">
                        <video
                          src={clip.videoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="live-preview-video"
                          style={{ filter: selectedFilter.cssFilter }}
                          onMouseEnter={(e) => {
                            e.target.currentTime = 0;
                            e.target.play().catch(() => {});
                          }}
                        />
                        <div className="live-pill-badge">
                          <span className="live-badge-dot"></span>
                          <span>LIVE #{clip.id}</span>
                        </div>
                        <span className="live-duration-tag">{clip.duration}s</span>
                      </div>

                      <button
                        type="button"
                        className="single-live-dl-btn"
                        onClick={() => handleDownloadLiveClip(clip)}
                        title={`Download Live Clip ${clip.id} (${clip.filename})`}
                      >
                        <span className="dl-icon">📹</span>
                        <span>Clip #{clip.id} ({clip.extension.toUpperCase()})</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Retake Control */}
            <button
              type="button"
              className="strip-btn retake-ghost-btn"
              onClick={onRetake}
              aria-label="Retake all four photos"
            >
              <span className="btn-icon">🔄</span>
              <span>TAKE ANOTHER SET</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
