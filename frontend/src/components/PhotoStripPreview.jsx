import React, { useState, useEffect } from 'react';
import {
  composeBasePhotoStrip,
  composeLivePhotoStripVideo,
  renderFinalPhotoStripCanvas,
  triggerBrowserDownload,
  getFormattedVintageDate,
  STRIP_DESIGNS,
  STRIP_WIDTH_PRESETS,
  SOLID_COLOR_PALETTE
} from '../utils/stripComposer';
import {
  triggerVideoDownload,
  getVideoFileExtension
} from '../utils/liveRecorder';
import { soundEngine } from '../utils/audio';

export default function PhotoStripPreview({
  capturedPhotos = [],
  liveClips = [],
  captureMode = 'still',
  selectedFilter = {},
  onRetake,
  baseStripUrl = null,
  isRecomposingStrip = false,
  selectedDesignId = 'classic_cream',
  selectedSolidColorId = 'black',
  selectedWidthId = 'wide',
  onDesignChange,
  onSolidColorChange,
  onWidthChange
}) {
  const [caption, setCaption] = useState('MEMORIES IN THE BOOTH');
  const [downloadNotice, setDownloadNotice] = useState('');
  const [activePlayingPhotoId, setActivePlayingPhotoId] = useState(null);
  const [isGeneratingVideoStrip, setIsGeneratingVideoStrip] = useState(false);
  const [videoProgressText, setVideoProgressText] = useState('');

  const isComposingBase = isRecomposingStrip || !baseStripUrl;

  // Fallback: If baseStripUrl was not yet created when entering preview, request composition from parent
  useEffect(() => {
    if (!baseStripUrl && capturedPhotos && capturedPhotos.length > 0) {
      if (onDesignChange) {
        onDesignChange(selectedDesignId);
      }
    }
  }, [baseStripUrl, capturedPhotos, selectedDesignId, onDesignChange]);

  // Switch Design Preset via single authoritative parent handler
  const handleDesignSwitch = (designId) => {
    soundEngine.playLeverClick?.();
    if (onDesignChange) {
      onDesignChange(designId);
    }
  };

  // Switch Solid Color Preset (in Solid Colours theme) via single authoritative parent handler
  const handleSolidColorSwitch = (colorId) => {
    soundEngine.playLeverClick?.();
    if (onSolidColorChange) {
      onSolidColorChange(colorId);
    }
  };

  // Switch Width Format (Classic Wide vs Slim Strip) via single authoritative parent handler
  const handleWidthSwitch = (widthId) => {
    soundEngine.playLeverClick?.();
    if (onWidthChange) {
      onWidthChange(widthId);
    }
  };

  // 2. Download Composed Photo Strip (Pure Still Photograph Print with Selected Design)
  const handleDownloadStrip = async () => {
    soundEngine.playTrayDrop();

    try {
      setDownloadNotice('Composing photo strip for download...');
      const canvas = await composeBasePhotoStrip(capturedPhotos, {
        designId: selectedDesignId,
        solidColorId: selectedSolidColorId,
        widthId: selectedWidthId,
        dateText: getFormattedVintageDate()
      });

      const finalCanvas = renderFinalPhotoStripCanvas(canvas, caption, {
        designId: selectedDesignId,
        solidColorId: selectedSolidColorId,
        widthId: selectedWidthId
      });

      if (!finalCanvas) {
        throw new Error('Failed to generate final photo strip canvas');
      }

      const designSlug = selectedDesignId === 'solid_colors' ? `solid-${selectedSolidColorId}` : selectedDesignId;
      const filename = `vintage-booth-strip-${designSlug}-${selectedWidthId}.png`;
      triggerBrowserDownload(finalCanvas, filename);

      const widthInfo = STRIP_WIDTH_PRESETS[selectedWidthId]?.sub || '600 × 1800 px';
      setDownloadNotice(`✓ Downloaded ${filename} (${widthInfo})!`);
      setTimeout(() => setDownloadNotice(''), 3500);
    } catch (err) {
      console.error('Error downloading photo strip:', err);
      setDownloadNotice('⚠️ Download error. Please try again.');
      setTimeout(() => setDownloadNotice(''), 3500);
    }
  };

  // 3. Download Single Individual Photo (1 to 4)
  const handleDownloadSinglePhoto = (photo, index) => {
    soundEngine.playTrayDrop();
    const filename = `vintage-booth-photo-${index + 1}.png`;
    triggerBrowserDownload(photo.dataUrl, filename);
    setDownloadNotice(`✓ Downloaded Photo ${index + 1} (${filename})!`);
    setTimeout(() => setDownloadNotice(''), 3000);
  };

  // 4. Download All 4 Individual Photos sequentially
  const handleDownloadAllIndividual = () => {
    soundEngine.playTrayDrop();
    setDownloadNotice('✓ Downloading all 4 individual photos...');
    capturedPhotos.forEach((photo, idx) => {
      setTimeout(() => {
        const filename = `vintage-booth-photo-${idx + 1}.png`;
        triggerBrowserDownload(photo.dataUrl, filename);
      }, idx * 250);
    });
    setTimeout(() => setDownloadNotice('✓ All 4 individual photos downloaded!'), 4 * 250 + 600);
  };

  // 5. Download Animated Live Photo Strip Video (Choice A)
  const handleDownloadLiveStrip = async () => {
    if (isGeneratingVideoStrip) return;
    soundEngine.playPrintingGear();
    setIsGeneratingVideoStrip(true);
    setVideoProgressText('Developing Live Photo Strip Video... (0%)');
    setDownloadNotice('🎞️ Developing Live Photo Strip Video (MP4/WebM)...');

    try {
      const result = await composeLivePhotoStripVideo(capturedPhotos, liveClips, {
        designId: selectedDesignId,
        solidColorId: selectedSolidColorId,
        widthId: selectedWidthId,
        caption,
        dateText: getFormattedVintageDate(),
        onProgress: (pct) => {
          setVideoProgressText(`Developing Video Strip... (${pct}%)`);
        }
      });

      triggerVideoDownload(result.blob, result.filename);
      soundEngine.playTrayDrop();
      setDownloadNotice(`✓ Downloaded Live Photo Strip (${result.filename})!`);
      setTimeout(() => setDownloadNotice(''), 4000);
    } catch (err) {
      console.error('Error generating Live Photo Strip video:', err);
      setDownloadNotice('⚠️ Video export error. Please try again.');
      setTimeout(() => setDownloadNotice(''), 4000);
    } finally {
      setIsGeneratingVideoStrip(false);
      setVideoProgressText('');
    }
  };

  // 6. Download Both Animated Video Strip and Static PNG Strip (Choice C)
  const handleDownloadBothStrips = async () => {
    if (isGeneratingVideoStrip) return;
    soundEngine.playPrintingGear();
    setIsGeneratingVideoStrip(true);
    setVideoProgressText('Developing Both Formats... (0%)');
    setDownloadNotice('✨ Developing Live Photo Strip Video & Composing Still PNG...');

    try {
      // Step 1: Generate & download Live Video Strip
      const result = await composeLivePhotoStripVideo(capturedPhotos, liveClips, {
        designId: selectedDesignId,
        solidColorId: selectedSolidColorId,
        widthId: selectedWidthId,
        caption,
        dateText: getFormattedVintageDate(),
        onProgress: (pct) => {
          setVideoProgressText(`Developing Video... (${pct}%)`);
        }
      });
      triggerVideoDownload(result.blob, result.filename);

      // Step 2: Generate & download Static PNG Strip after 500ms
      setTimeout(async () => {
        try {
          const canvas = await composeBasePhotoStrip(capturedPhotos, {
            designId: selectedDesignId,
            solidColorId: selectedSolidColorId,
            widthId: selectedWidthId,
            dateText: getFormattedVintageDate()
          });
          const finalCanvas = renderFinalPhotoStripCanvas(canvas, caption, {
            designId: selectedDesignId,
            solidColorId: selectedSolidColorId,
            widthId: selectedWidthId
          });
          const designSlug = selectedDesignId === 'solid_colors' ? `solid-${selectedSolidColorId}` : selectedDesignId;
          const pngFilename = `vintage-booth-strip-${designSlug}-${selectedWidthId}.png`;
          triggerBrowserDownload(finalCanvas, pngFilename);
          soundEngine.playTrayDrop();
          setDownloadNotice(`✓ Downloaded Both: ${result.filename} & ${pngFilename}!`);
          setTimeout(() => setDownloadNotice(''), 4500);
        } catch (pngErr) {
          console.error('Error in secondary PNG download for Get Both:', pngErr);
        }
      }, 500);
    } catch (err) {
      console.error('Error generating Get Both download:', err);
      setDownloadNotice('⚠️ Error exporting Live strip. Please try again.');
      setTimeout(() => setDownloadNotice(''), 4000);
    } finally {
      setIsGeneratingVideoStrip(false);
      setVideoProgressText('');
    }
  };

  // 7. Download Single Live Photo Clip (Playable Video)
  const handleDownloadLiveClip = (clip, index) => {
    soundEngine.playTrayDrop();
    const targetClip = clip || (liveClips || []).find((c) => c.id === index);
    if (!targetClip) {
      setDownloadNotice(`⚠️ Live Clip ${index} is not ready yet.`);
      setTimeout(() => setDownloadNotice(''), 3000);
      return;
    }
    const ext = targetClip.extension || getVideoFileExtension(targetClip.mimeType);
    const filename = targetClip.filename || `vintage-booth-live-${index}.${ext}`;
    const source = targetClip.blob || targetClip.videoUrl;
    triggerVideoDownload(source, filename);
    setDownloadNotice(`✓ Downloaded Live Video #${index} (${filename})!`);
    setTimeout(() => setDownloadNotice(''), 3000);
  };

  // 8. Download All Live Clips sequentially
  const handleDownloadAllLiveClips = () => {
    soundEngine.playTrayDrop();
    setDownloadNotice('✓ Downloading all 4 Live Photo video clips...');
    [1, 2, 3, 4].forEach((num, idx) => {
      const clip = (liveClips || []).find((c) => c.id === num);
      if (clip) {
        setTimeout(() => {
          const ext = clip.extension || getVideoFileExtension(clip.mimeType);
          const filename = clip.filename || `vintage-booth-live-${num}.${ext}`;
          const source = clip.blob || clip.videoUrl;
          triggerVideoDownload(source, filename);
        }, idx * 350);
      }
    });
    setTimeout(() => setDownloadNotice('✓ All 4 Live Photo video clips downloaded!'), 4 * 350 + 600);
  };

  // 7. Interactive Click-to-Play Live Photo directly inside the strip photo frame
  const handleToggleLiveFrame = (photoId) => {
    soundEngine.playBeep(false);
    setActivePlayingPhotoId((prev) => (prev === photoId ? null : photoId));
  };

  const activeWidthPreset = STRIP_WIDTH_PRESETS[selectedWidthId] || STRIP_WIDTH_PRESETS.wide;
  const activeDesignPreset = STRIP_DESIGNS.find((d) => d.id === selectedDesignId) || STRIP_DESIGNS[0];

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
              className={`physical-strip-card ${selectedWidthId === 'slim' ? 'card-slim' : 'card-wide'}`}
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
                    color: selectedDesignId === 'solid_colors'
                      ? (SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId)?.captionColor || '#ffffff')
                      : activeDesignPreset.captionColor
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
                className={`preview-width-btn ${selectedWidthId === 'wide' ? 'active' : ''}`}
                onClick={() => handleWidthSwitch('wide')}
                title="Classic 2 × 6″ wide photo strip format"
              >
                🖼️ Classic Wide (2 × 6″)
              </button>
              <button
                type="button"
                className={`preview-width-btn ${selectedWidthId === 'slim' ? 'active' : ''}`}
                onClick={() => handleWidthSwitch('slim')}
                title="Narrow 1.6 × 6″ ribbon strip format"
              >
                🎞️ Slim Strip (1.6 × 6″)
              </button>
            </div>

            {/* 5 Preset Design Badges */}
            <div className="preview-designs-picker">
              {STRIP_DESIGNS.map((d) => {
                const isSelected = selectedDesignId === d.id;
                const solidObj = SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId);
                const swatchBg = d.id === 'solid_colors' ? solidObj?.hex : d.swatchBg;
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
                      style={{
                        background: swatchBg,
                        borderColor: isSelected ? 'var(--color-mustard-bright)' : (d.swatchBorder || 'rgba(255,255,255,0.4)')
                      }}
                    />
                    <span>{d.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Solid Colours Palette inside Preview (revealed if Solid Colours selected) */}
            {selectedDesignId === 'solid_colors' && (
              <div className="preview-solid-palette">
                <span className="preview-solid-title">Select Solid Background:</span>
                <div className="preview-solid-swatches">
                  {SOLID_COLOR_PALETTE.map((color) => {
                    const isColorSelected = selectedSolidColorId === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        className={`preview-color-btn ${isColorSelected ? 'active' : ''}`}
                        onClick={() => handleSolidColorSwitch(color.id)}
                        title={`${color.name} background`}
                      >
                        <span
                          className="preview-color-circle"
                          style={{
                            backgroundColor: color.hex,
                            border: color.id === 'white' ? '1.5px solid #d4d4d8' : '1.5px solid rgba(0, 0, 0, 0.25)'
                          }}
                        >
                          {isColorSelected && (
                            <span
                              className="preview-color-check"
                              style={{ color: color.isDark ? '#ffffff' : '#141414' }}
                            >
                              ✓
                            </span>
                          )}
                        </span>
                        <span className="preview-color-label">{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
                <span className="spec-value">
                  {selectedDesignId === 'solid_colors'
                    ? `Solid ${SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId)?.name}`
                    : activeDesignPreset.name}
                </span>
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
            {/* Primary Download Bay: 3 Choices for Live Photos mode, Single PNG for Still mode */}
            {captureMode === 'live' ? (
              <div className="live-strip-download-group">
                <div className="live-strip-download-header">
                  <span className="live-badge-glow">✦ LIVE PHOTOS MODE ✦</span>
                  <h3 className="live-download-heading">CHOOSE STRIP DOWNLOAD FORMAT:</h3>
                </div>

                <div className="live-strip-options-grid">
                  {/* Choice A: Get Live Photo Strip (Video) */}
                  <button
                    type="button"
                    className="strip-btn live-format-btn live-video-btn"
                    onClick={handleDownloadLiveStrip}
                    disabled={isComposingBase || isGeneratingVideoStrip}
                    aria-label="Download animated Live Photo Strip video"
                  >
                    <span className="btn-icon">🎞️</span>
                    <div className="btn-labels">
                      <span className="main-text">GET LIVE PHOTO STRIP</span>
                      <span className="sub-text">
                        {isGeneratingVideoStrip
                          ? videoProgressText || 'DEVELOPING VIDEO STRIP...'
                          : `ANIMATED VIDEO (${activeWidthPreset.sub.toUpperCase()})`}
                      </span>
                    </div>
                  </button>

                  {/* Choice B: Get Still Photo Strip (PNG) */}
                  <button
                    type="button"
                    className="strip-btn live-format-btn still-png-btn"
                    onClick={handleDownloadStrip}
                    disabled={isComposingBase || isGeneratingVideoStrip}
                    aria-label="Download classic static photo strip PNG"
                  >
                    <span className="btn-icon">🖼️</span>
                    <div className="btn-labels">
                      <span className="main-text">GET STILL PHOTO STRIP</span>
                      <span className="sub-text">STATIC HIGH-RES PRINT (PNG)</span>
                    </div>
                  </button>

                  {/* Choice C: Get Both (Video + PNG) */}
                  <button
                    type="button"
                    className="strip-btn live-format-btn get-both-btn"
                    onClick={handleDownloadBothStrips}
                    disabled={isComposingBase || isGeneratingVideoStrip}
                    aria-label="Download both animated video strip and static PNG"
                  >
                    <span className="btn-icon">✨</span>
                    <div className="btn-labels">
                      <span className="main-text">GET BOTH (VIDEO + STILL)</span>
                      <span className="sub-text">ANIMATED STRIP + HIGH-RES PNG</span>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* Still Photos Mode: Standard Single High-Res PNG Button */
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
            )}

            {/* Individual Live Photo Video Downloads (Only in Live Photos Mode) */}
            {captureMode === 'live' && (
              <div className="live-downloads-card">
                <div className="live-downloads-header">
                  <div className="live-header-tag">
                    <span className="live-pulse-dot"></span>
                    <span className="live-header-title">LIVE PHOTO CLIPS (4 VIDEOS)</span>
                  </div>
                  <button
                    type="button"
                    className="save-all-link-btn"
                    onClick={handleDownloadAllLiveClips}
                    title="Download all 4 Live video clips"
                  >
                    Save All 4 Videos
                  </button>
                </div>
                <p className="live-downloads-hint">
                  Download each pose as a playable video file preserving pre- & post-shutter motion:
                </p>

                <div className="live-buttons-grid">
                  {[1, 2, 3, 4].map((photoNum) => {
                    const clip = (liveClips || []).find((c) => c.id === photoNum);
                    const ext = (clip?.extension || 'mp4').toUpperCase();
                    return (
                      <button
                        key={`live-clip-btn-${photoNum}`}
                        type="button"
                        className="single-live-dl-btn"
                        onClick={() => handleDownloadLiveClip(clip, photoNum)}
                        title={`Download Live Video #${photoNum} (${ext})`}
                      >
                        <span className="dl-icon">📹</span>
                        <span>Live Video #{photoNum} ({ext})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual Still Photos Download */}
            <div className="individual-downloads-card">
              <div className="individual-header">
                <span className="individual-title">
                  {captureMode === 'live' ? 'STILL PHOTOGRAPHS (4 POSES):' : 'SAVE INDIVIDUAL POSES:'}
                </span>
                <button
                  type="button"
                  className="save-all-link-btn"
                  onClick={handleDownloadAllIndividual}
                  title="Download all 4 individual still photos"
                >
                  Save All 4 Stills
                </button>
              </div>

              <div className="individual-buttons-grid">
                {[1, 2, 3, 4].map((photoNum, idx) => {
                  const photo = capturedPhotos[idx];
                  return (
                    <button
                      key={photo?.id || `still-photo-btn-${photoNum}`}
                      type="button"
                      className="single-photo-dl-btn"
                      onClick={() => photo && handleDownloadSinglePhoto(photo, idx)}
                      disabled={!photo}
                      title={`Download Still Photo ${photoNum} (PNG)`}
                    >
                      <span className="dl-icon">📷</span>
                      <span>Still Photo #{photoNum} (PNG)</span>
                    </button>
                  );
                })}
              </div>
            </div>

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
