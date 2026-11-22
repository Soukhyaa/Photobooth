import React, { useState, useEffect, useRef } from 'react';
import {
  composeBasePhotoStrip,
  renderFinalPhotoStrip,
  triggerBrowserDownload,
  getFormattedVintageDate,
  STRIP_DESIGNS,
  STRIP_WIDTH_PRESETS
} from '../utils/stripComposer';
import { triggerVideoDownload } from '../utils/liveRecorder';
import { soundEngine } from '../utils/audio';

export default function PhotoStripPreview({
  capturedPhotos = [],
  liveClips = [],
  captureMode = 'still',
  selectedFilter = {},
  onRetake,
  initialBaseStripUrl = null,
  selectedDesignId = 'classic_cream',
  selectedWidthId = 'wide',
  onDesignChange,
  onWidthChange
}) {
  const [currentDesignId, setCurrentDesignId] = useState(selectedDesignId);
  const [currentWidthId, setCurrentWidthId] = useState(selectedWidthId);
  const [baseStripUrl, setBaseStripUrl] = useState(initialBaseStripUrl || null);
  const [isComposingBase, setIsComposingBase] = useState(!initialBaseStripUrl);
  const [caption, setCaption] = useState('MEMORIES IN THE BOOTH');
  const [downloadNotice, setDownloadNotice] = useState('');
  const [activePlayingPhotoId, setActivePlayingPhotoId] = useState(null);

  const baseCanvasRef = useRef(null);
  const hasComposedRef = useRef(false);

  // Sync with parent props if changed externally
  useEffect(() => {
    if (selectedDesignId && selectedDesignId !== currentDesignId) {
      setCurrentDesignId(selectedDesignId);
    }
  }, [selectedDesignId, currentDesignId]);

  useEffect(() => {
    if (selectedWidthId && selectedWidthId !== currentWidthId) {
      setCurrentWidthId(selectedWidthId);
    }
  }, [selectedWidthId, currentWidthId]);

  // 1. Compose the 4-photo base strip once on mount if not already present
  // The 4 photographs, borders, and grain remain completely stationary
  // while the user edits or deletes caption text in real time.
  useEffect(() => {
    if (hasComposedRef.current) return;
    hasComposedRef.current = true;

    let isMounted = true;
    if (!baseStripUrl) {
      setIsComposingBase(true);
    }

    composeBasePhotoStrip(capturedPhotos, {
      designId: currentDesignId,
      widthId: currentWidthId,
      dateText: getFormattedVintageDate()
    })
      .then((canvas) => {
        if (!isMounted) return;
        baseCanvasRef.current = canvas;
        if (!baseStripUrl) {
          setBaseStripUrl(canvas.toDataURL('image/png'));
        }
        setIsComposingBase(false);
      })
      .catch((err) => {
        console.error('Error composing base photo strip:', err);
        if (isMounted) setIsComposingBase(false);
      });

    return () => {
      isMounted = false;
    };
  }, [capturedPhotos, baseStripUrl, currentDesignId, currentWidthId]);

  // Switch Design Preset
  const handleDesignSwitch = (designId) => {
    if (designId === currentDesignId || capturedPhotos.length === 0) return;
    soundEngine.playLeverClick();
    setCurrentDesignId(designId);
    if (onDesignChange) onDesignChange(designId);

    composeBasePhotoStrip(capturedPhotos, {
      designId,
      widthId: currentWidthId,
      dateText: getFormattedVintageDate()
    })
      .then((canvas) => {
        baseCanvasRef.current = canvas;
        setBaseStripUrl(canvas.toDataURL('image/png'));
      })
      .catch((err) => console.error('Error switching design:', err));
  };

  // Switch Width Format (Classic Wide vs Slim Strip)
  const handleWidthSwitch = (widthId) => {
    if (widthId === currentWidthId || capturedPhotos.length === 0) return;
    soundEngine.playLeverClick();
    setCurrentWidthId(widthId);
    if (onWidthChange) onWidthChange(widthId);

    composeBasePhotoStrip(capturedPhotos, {
      designId: currentDesignId,
      widthId,
      dateText: getFormattedVintageDate()
    })
      .then((canvas) => {
        baseCanvasRef.current = canvas;
        setBaseStripUrl(canvas.toDataURL('image/png'));
      })
      .catch((err) => console.error('Error switching width:', err));
  };

  // 2. Download Composed Photo Strip (Pure Still Photograph Print with Selected Design)
  const handleDownloadStrip = () => {
    if (!baseCanvasRef.current) return;
    soundEngine.playTrayDrop();

    // Render final strip synchronously with latest caption and selected design in ~2ms
    const finalStripUrl = renderFinalPhotoStrip(baseCanvasRef.current, caption, {
      designId: currentDesignId,
      widthId: currentWidthId
    });
    triggerBrowserDownload(finalStripUrl, `vintage-booth-strip-${currentDesignId}-${currentWidthId}.png`);

    const widthInfo = STRIP_WIDTH_PRESETS[currentWidthId]?.sub || '600 × 1800 px';
    setDownloadNotice(`✓ Photo strip downloaded (${widthInfo})!`);
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

  // 7. Interactive Click-to-Play Live Photo directly inside the strip photo frame
  const handleToggleLiveFrame = (photoId) => {
    soundEngine.playBeep(false);
    setActivePlayingPhotoId((prev) => (prev === photoId ? null : photoId));
  };

  const activeWidthPreset = STRIP_WIDTH_PRESETS[currentWidthId] || STRIP_WIDTH_PRESETS.wide;
  const activeDesignPreset = STRIP_DESIGNS.find((d) => d.id === currentDesignId) || STRIP_DESIGNS[0];

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
          Filter: <strong>{selectedFilter?.name || 'Selected Filter'}</strong> • Design: <strong>{activeDesignPreset.name}</strong> • Format: <strong>{activeWidthPreset.name}</strong> ({activeWidthPreset.sub})
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
            <div
              className={`physical-strip-card ${currentWidthId === 'slim' ? 'card-slim' : 'card-wide'}`}
              style={{
                width: activeWidthPreset.cardWidthCss,
                aspectRatio: activeWidthPreset.aspectRatioCss
              }}
              title={`Composed ${activeWidthPreset.name} Photo Strip (${activeDesignPreset.name})`}
            >
              <img
                src={baseStripUrl}
                alt="Composed Vintage 4-Pose Photo Strip"
                className="composed-strip-image"
              />

              {/* Dynamic Live Typewriter Caption Overlay */}
              {/* Overlays caption in real-time with zero image reload or flicker */}
              <div
                className="strip-live-caption-slot"
                style={{
                  bottom: activeWidthPreset.captionBottomCss
                }}
                aria-hidden="true"
              >
                <span
                  className="strip-live-caption-text"
                  style={{
                    color: activeDesignPreset.captionColor
                  }}
                >
                  {caption.trim() || <span className="caption-empty-dot">• • •</span>}
                </span>
              </div>

              {/* In Live Photos mode: 4 Clickable Photo Zones directly on the strip */}
              {captureMode === 'live' && liveClips.length > 0 && (
                <div className="strip-interactive-frames-overlay">
                  {activeWidthPreset.interactiveSlots.map(({ id, top, left, width, height }) => {
                    const clip = liveClips.find((c) => c.id === id);
                    const isPlaying = activePlayingPhotoId === id;
                    return (
                      <div
                        key={`frame-slot-${id}`}
                        className={`strip-photo-interactive-slot ${isPlaying ? 'playing' : ''}`}
                        style={{
                          top,
                          left,
                          width,
                          height
                        }}
                        onClick={() => handleToggleLiveFrame(id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggleLiveFrame(id);
                          }
                        }}
                        aria-label={`Photo ${id}: ${isPlaying ? 'Stop motion' : 'Play Live Photo motion clip'}`}
                        title={`Pose #${id}: Click to ${isPlaying ? 'pause' : 'play'} Live Photo clip`}
                      >
                        {/* Live video playback embedded inside the exact photo frame */}
                        {isPlaying && clip ? (
                          <video
                            src={clip.videoUrl}
                            autoPlay
                            muted
                            playsInline
                            className="strip-slot-video"
                            style={{ filter: selectedFilter?.cssFilter || 'none' }}
                            onEnded={() => setActivePlayingPhotoId(null)}
                          />
                        ) : null}

                        {/* Subtle Live Badge Indicator */}
                        <div className={`strip-slot-live-badge ${isPlaying ? 'active' : ''}`}>
                          <span className={`live-tab-dot ${isPlaying ? 'active' : ''}`} />
                          <span>{isPlaying ? '▶ PLAYING' : '✦ LIVE'}</span>
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

        {/* Right Panel: Customization, Caption & Download Options */}
        <aside className="strip-actions-panel">
          {/* Format & Design Options */}
          <div className="strip-options-card">
            <h3 className="options-heading">PRINT FORMAT & DESIGN</h3>

            {/* Width Format Switcher */}
            <div className="preview-width-toggle-group">
              <button
                type="button"
                className={`preview-width-btn ${currentWidthId === 'wide' ? 'active' : ''}`}
                onClick={() => handleWidthSwitch('wide')}
                title="Classic 2 × 6″ wide photo strip format"
              >
                🖼️ Classic Wide (2 × 6″)
              </button>
              <button
                type="button"
                className={`preview-width-btn ${currentWidthId === 'slim' ? 'active' : ''}`}
                onClick={() => handleWidthSwitch('slim')}
                title="Narrow 1.6 × 6″ ribbon strip format"
              >
                🎞️ Slim Strip (1.6 × 6″)
              </button>
            </div>

            {/* 6 Preset Design Badges */}
            <div className="preview-designs-picker">
              {STRIP_DESIGNS.map((d) => {
                const isSelected = currentDesignId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`preview-design-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => handleDesignSwitch(d.id)}
                    title={d.description}
                  >
                    <span
                      className="design-pill-swatch"
                      style={{ backgroundColor: d.swatchBg, borderColor: d.swatchBorder }}
                    />
                    <span>{d.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

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
                <span className="spec-value">{activeWidthPreset.sub}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">DESIGN PRESET:</span>
                <span className="spec-value">{activeDesignPreset.name}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">FILTER EMULSION:</span>
                <span className="spec-value">{selectedFilter?.name || 'Retro Film'}</span>
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
              aria-label="Download complete photo strip PNG"
            >
              <span className="btn-icon">📥</span>
              <div className="btn-labels">
                <span className="main-text">DOWNLOAD PHOTO STRIP</span>
                <span className="sub-text">HIGH-RES PNG ({activeWidthPreset.sub.toUpperCase()})</span>
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

            {/* Tertiary: Live Photo Downloads (Only in Live Photos Mode) */}
            {captureMode === 'live' && liveClips && liveClips.length > 0 && (
              <div className="live-downloads-card">
                <div className="live-downloads-header">
                  <div className="live-header-tag">
                    <span className="live-pulse-dot"></span>
                    <span className="live-header-title">LIVE PHOTO CLIPS ({liveClips.length})</span>
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
                <p className="live-downloads-hint">
                  Click any photo frame on the strip to play its motion clip!
                </p>

                <div className="live-buttons-grid">
                  {liveClips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      className="single-live-dl-btn"
                      onClick={() => handleDownloadLiveClip(clip)}
                      title={`Download Live Clip ${clip.id} (${clip.filename})`}
                    >
                      <span className="dl-icon">📹</span>
                      <span>Clip #{clip.id} ({clip.extension.toUpperCase()})</span>
                    </button>
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
