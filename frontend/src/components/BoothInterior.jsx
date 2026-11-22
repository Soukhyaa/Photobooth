import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { RETRO_FILTERS, DEFAULT_FILTER } from '../utils/filters';
import MockCameraFeed from './MockCameraFeed';
import FilterOverlay from './FilterOverlay';
import CaptureOverlay from './CaptureOverlay';
import ReviewSet from './ReviewSet';
import PhotoStripPreview from './PhotoStripPreview';
import { capturePhotoSnapshot } from '../utils/capture';
import { soundEngine } from '../utils/audio';
import {
  livePhotoManager,
  revokeLiveClipUrls
} from '../utils/liveRecorder';
import {
  composeBasePhotoStrip,
  getFormattedVintageDate,
  STRIP_DESIGNS,
  STRIP_WIDTH_PRESETS,
  SOLID_COLOR_PALETTE,
  clearComposedStripCache
} from '../utils/stripComposer';

export default function BoothInterior({
  onStepOutside,
  selectedFilter,
  onSelectFilter
}) {
  const {
    videoRef,
    streamRef,
    cameraStatus,
    errorMessage,
    hasMultipleCameras,
    startCamera,
    flipCamera,
    enableMockMode
  } = useCamera();

  const [activeFilter, setActiveFilter] = useState(selectedFilter || DEFAULT_FILTER);
  const [captureMode, setCaptureMode] = useState('still'); // 'still' | 'live'
  const [liveClips, setLiveClips] = useState([]);

  // Capture sequence state:
  // 'idle' | 'selecting_mode' | 'countdown' | 'flash' | 'pause' | 'ready_to_dispense' | 'dispensing' | 'dispensed' | 'collected'
  const [captureState, setCaptureState] = useState('idle');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(1);
  const [countdownValue, setCountdownValue] = useState(3);
  const [isFlashing, setIsFlashing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [baseStripUrl, setBaseStripUrl] = useState(null);
  const [selectedDesignId, setSelectedDesignId] = useState('classic_cream');
  const [selectedSolidColorId, setSelectedSolidColorId] = useState('black');
  const [selectedWidthId, setSelectedWidthId] = useState('wide');
  const [isRecomposingStrip, setIsRecomposingStrip] = useState(false);

  // Request versioning ref to discard stale async composition results during rapid switches
  const compositionVersionRef = useRef(0);

  // Timer refs to prevent memory leaks / clean cancel
  const countdownTimerRef = useRef(null);
  const sequenceTimerRef = useRef(null);
  const livePreRecordTimerRef = useRef(null);
  const runCountdownRef = useRef(null);
  const takeSinglePhotoRef = useRef(null);

  // Mutable refs to keep countdown and capture callbacks immune to stale closures & re-render cancels
  const activeModeRef = useRef('still');
  const activeFilterRef = useRef(activeFilter);
  const cameraStatusRef = useRef(cameraStatus);
  const liveClipsRef = useRef(liveClips);
  const capturedPhotosRef = useRef(capturedPhotos);

  useEffect(() => {
    capturedPhotosRef.current = capturedPhotos;
  }, [capturedPhotos]);

  useEffect(() => {
    activeFilterRef.current = activeFilter;
  }, [activeFilter]);

  useEffect(() => {
    cameraStatusRef.current = cameraStatus;
  }, [cameraStatus]);

  useEffect(() => {
    liveClipsRef.current = liveClips;
  }, [liveClips]);

  useEffect(() => {
    activeModeRef.current = captureMode;
  }, [captureMode]);

  // Single authoritative source of truth composition pipeline with request versioning
  const recompileBaseStrip = useCallback((designId, solidColorId, widthId, overridePhotos) => {
    const photos = (overridePhotos && overridePhotos.length > 0)
      ? overridePhotos
      : ((capturedPhotos && capturedPhotos.length > 0) ? capturedPhotos : capturedPhotosRef.current);
    if (!photos || photos.length === 0) return;

    const requestVersion = ++compositionVersionRef.current;
    setIsRecomposingStrip(true);

    composeBasePhotoStrip(photos, {
      designId,
      solidColorId,
      widthId,
      dateText: getFormattedVintageDate()
    })
      .then((canvas) => {
        if (compositionVersionRef.current === requestVersion) {
          setBaseStripUrl(canvas.toDataURL('image/png'));
          setIsRecomposingStrip(false);
        }
      })
      .catch((err) => {
        if (compositionVersionRef.current === requestVersion) {
          console.error('Strip composition error:', err);
          setIsRecomposingStrip(false);
        }
      });
  }, [capturedPhotos]);

  // Automatically start camera when entering the interior
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Clean timers ONLY on unmount (strictly empty dependency array to avoid killing timers during capture)
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
      if (livePreRecordTimerRef.current) clearTimeout(livePreRecordTimerRef.current);
      livePhotoManager.cancel();
      revokeLiveClipUrls(liveClipsRef.current);
    };
  }, []);

  const handleFilterClick = (filter) => {
    if (captureState !== 'idle') return; // Locked during capture or mode selection
    soundEngine.playBeep(false);
    setActiveFilter(filter);
    if (onSelectFilter) {
      onSelectFilter(filter);
    }
  };

  // Cancel ongoing capture sequence immediately
  const handleCancelCapture = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
    if (livePreRecordTimerRef.current) {
      clearTimeout(livePreRecordTimerRef.current);
      livePreRecordTimerRef.current = null;
    }
    livePhotoManager.cancel();
    compositionVersionRef.current += 1;
    setIsRecomposingStrip(false);
    setCaptureState('idle');
    setCurrentPhotoIndex(1);
    setCountdownValue(3);
    setIsFlashing(false);
    setCapturedPhotos([]);
    revokeLiveClipUrls(liveClipsRef.current);
    clearComposedStripCache();
    setLiveClips([]);
    setBaseStripUrl(null);
    setSelectedDesignId('classic_cream');
    setSelectedSolidColorId('black');
    setSelectedWidthId('wide');
  }, []);

  // Retake entire set from review screen
  const handleRetakeSet = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
    if (livePreRecordTimerRef.current) {
      clearTimeout(livePreRecordTimerRef.current);
      livePreRecordTimerRef.current = null;
    }
    livePhotoManager.cancel();
    compositionVersionRef.current += 1;
    setIsRecomposingStrip(false);
    setCaptureState('idle');
    setCurrentPhotoIndex(1);
    setCountdownValue(3);
    setIsFlashing(false);
    setCapturedPhotos([]);
    revokeLiveClipUrls(liveClipsRef.current);
    clearComposedStripCache();
    setLiveClips([]);
    setBaseStripUrl(null);
    setSelectedDesignId('classic_cream');
    setSelectedSolidColorId('black');
    setSelectedWidthId('wide');
  }, []);

  // Capture single photo and handle sequence progression
  const takeSinglePhoto = useCallback(
    async (photoIndex, existingPhotos) => {
      // 1. Flash effect + shutter sound
      setIsFlashing(true);
      soundEngine.playShutter();

      try {
        const snapshot = await capturePhotoSnapshot(
          videoRef.current,
          activeFilterRef.current,
          cameraStatusRef.current === 'mock',
          photoIndex
        );

        const updatedPhotos = [...existingPhotos, snapshot];
        setCapturedPhotos(updatedPhotos);

        // In Live Photos mode: record 1.2s post-shutter reaction, then package clip
        if (activeModeRef.current === 'live') {
          setTimeout(async () => {
            try {
              const clip = await livePhotoManager.stopRecording();
              if (clip) {
                setLiveClips((prev) => {
                  const filtered = prev.filter((c) => c.id !== clip.id);
                  const updated = [...filtered, clip];
                  liveClipsRef.current = updated;
                  return updated;
                });
              }
            } catch (clipErr) {
              console.warn('Live clip packaging warning (non-fatal):', clipErr);
            }
          }, 1200);
        }

        // Flash lasts 280ms
        sequenceTimerRef.current = setTimeout(() => {
          setIsFlashing(false);

          if (photoIndex < 4) {
            // Pause approximately 3 seconds between consecutive shots
            // Gives user plenty of time to reset expression or pose comfortably
            setCaptureState('pause');
            const nextIndex = photoIndex + 1;
            setCurrentPhotoIndex(nextIndex);
            setCountdownValue(3);

            sequenceTimerRef.current = setTimeout(() => {
              if (runCountdownRef.current) {
                runCountdownRef.current(nextIndex, updatedPhotos);
              }
            }, 3000);
          } else {
            // All 4 photos captured!
            // In live mode, allow 1500ms so clip 4 finishes stopping (at 1200ms) and packages
            const completionDelay = activeModeRef.current === 'live' ? 1500 : 500;
            sequenceTimerRef.current = setTimeout(() => {
              // Pre-compose the base strip canvas in background using unified versioned pipeline
              recompileBaseStrip(selectedDesignId, selectedSolidColorId, selectedWidthId, updatedPhotos);

              // Transition to physical dispensing station (Stage 5 UX)
              setCaptureState('ready_to_dispense');
            }, completionDelay);
          }
        }, 280);
      } catch (err) {
        console.error('Error capturing snapshot:', err);
        setIsFlashing(false);
        handleCancelCapture();
      }
    },
    [handleCancelCapture, recompileBaseStrip, selectedDesignId, selectedSolidColorId, selectedWidthId, videoRef]
  );

  takeSinglePhotoRef.current = takeSinglePhoto;

  // Run 3-2-1 countdown for a given photo index
  const runCountdownForPhoto = useCallback(
    (photoIndex, existingPhotos) => {
      setCaptureState('countdown');
      let count = 3;
      setCountdownValue(3);
      soundEngine.playBeep(false);

      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      if (livePreRecordTimerRef.current) {
        clearTimeout(livePreRecordTimerRef.current);
        livePreRecordTimerRef.current = null;
      }

      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdownValue(count);
          soundEngine.playBeep(false);

          // If Live Photos mode is active:
          // When count reaches 2, schedule pre-shutter recording to start 500ms later
          // (which is exactly 1.5s before the shutter fires at count 0).
          if (activeModeRef.current === 'live' && count === 2) {
            livePreRecordTimerRef.current = setTimeout(() => {
              livePhotoManager.startRecording({
                stream: streamRef.current,
                videoElement: videoRef.current,
                isMock: cameraStatusRef.current === 'mock',
                photoIndex,
                activeFilter: activeFilterRef.current
              });
            }, 500);
          }
        } else {
          // Reached 0: flash and capture!
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          if (takeSinglePhotoRef.current) {
            takeSinglePhotoRef.current(photoIndex, existingPhotos);
          }
        }
      }, 1000);
    },
    [streamRef]
  );

  runCountdownRef.current = runCountdownForPhoto;

  // Step 2 in sequence: user clicks "READY: START 4-SHOT STRIP" on console
  // Opens the mode selection dialog
  const handleReadyClick = () => {
    if (captureState !== 'idle') return;
    soundEngine.playBeep(false);
    setCaptureState('selecting_mode');
  };

  // Step 3 in sequence: user selects mode ("Still Photos" or "Live Photos")
  // Begins the 4-shot capture sequence immediately
  const handleSelectModeAndStart = (mode) => {
    soundEngine.playBeep(false);
    activeModeRef.current = mode;
    setCaptureMode(mode);
    setCapturedPhotos([]);
    revokeLiveClipUrls(liveClipsRef.current);
    setLiveClips([]);
    setCurrentPhotoIndex(1);
    runCountdownForPhoto(1, []);
  };

  // Customization Step: Switch strip design preset
  const handleSelectDesign = useCallback(
    (designId) => {
      soundEngine.playLeverClick?.();
      setSelectedDesignId(designId);
      recompileBaseStrip(designId, selectedSolidColorId, selectedWidthId);
    },
    [recompileBaseStrip, selectedSolidColorId, selectedWidthId]
  );

  // Customization Step: Switch solid color in Solid Colours theme
  const handleSelectSolidColor = useCallback(
    (colorId) => {
      soundEngine.playLeverClick?.();
      setSelectedSolidColorId(colorId);
      setSelectedDesignId('solid_colors');
      recompileBaseStrip('solid_colors', colorId, selectedWidthId);
    },
    [recompileBaseStrip, selectedWidthId]
  );

  // Customization Step: Switch strip width format (Classic Wide vs Slim Strip)
  const handleSelectWidth = useCallback(
    (widthId) => {
      soundEngine.playLeverClick?.();
      setSelectedWidthId(widthId);
      recompileBaseStrip(selectedDesignId, selectedSolidColorId, widthId);
    },
    [recompileBaseStrip, selectedDesignId, selectedSolidColorId]
  );

  // Step 4 in sequence: user clicks "GET MY STRIP"
  // Starts mechanical printing & dispensing animation with authentic sounds
  const handleGetMyStrip = () => {
    if (captureState !== 'ready_to_dispense') return;
    soundEngine.playPrintingGear();
    setCaptureState('dispensing');

    // Strip emerges over ~2.6 seconds, then paper drop sound fires as it reaches the tray
    setTimeout(() => {
      soundEngine.playTrayDrop();
    }, 2600);

    // Completely settled in collection tray at 3.0 seconds
    setTimeout(() => {
      setCaptureState('dispensed');
    }, 3000);
  };

  // Step 5 in sequence: user clicks/pulls the strip from collection window
  // Opens the full preview and download workspace
  const handleCollectStrip = () => {
    soundEngine.playCurtain();
    setCaptureState('collected');
  };

  const isSequenceActive =
    captureState === 'countdown' ||
    captureState === 'flash' ||
    captureState === 'pause';

  return (
    <div className="booth-interior-stage">
      {/* 1. Interior Top Navigation & Status */}
      <div className="interior-top-bar">
        <button
          type="button"
          onClick={onStepOutside}
          className="exit-booth-btn"
          disabled={isSequenceActive || captureState === 'selecting_mode' || captureState === 'dispensing'}
          aria-label="Exit booth to exterior parlor"
        >
          <span className="btn-arrow">◀</span>
          <span>EXIT BOOTH</span>
        </button>

        <div className="interior-status-badge">
          <span
            className={`status-lamp ${isSequenceActive
              ? 'lamp-mock'
              : captureState === 'dispensing'
                ? 'lamp-active'
                : cameraStatus === 'active'
                  ? 'lamp-active'
                  : cameraStatus === 'mock'
                    ? 'lamp-mock'
                    : 'lamp-warning'
              }`}
          ></span>
          <span className="status-label">
            {isSequenceActive && `CAPTURING POSE ${currentPhotoIndex} OF 4${captureMode === 'live' ? ' • LIVE MOMENT' : ''}`}
            {captureState === 'selecting_mode' && 'CHOOSE CAPTURE MODE'}
            {captureState === 'ready_to_dispense' && 'MEMORIES READY • CLICK GET MY STRIP'}
            {captureState === 'dispensing' && 'PRINTING PHYSICAL PHOTO STRIP...'}
            {captureState === 'dispensed' && 'STRIP READY IN TRAY • CLICK TO COLLECT'}
            {captureState === 'collected' && 'PHOTO STRIP COLLECTED'}
            {captureState === 'idle' && cameraStatus === 'active' && 'LIVE CAMERA MIRROR'}
            {captureState === 'idle' && cameraStatus === 'requesting' && 'STARTING CAMERA...'}
            {captureState === 'idle' && cameraStatus === 'mock' && 'TEST PORTRAIT MODE'}
            {captureState === 'idle' && (cameraStatus === 'denied' || cameraStatus === 'error') && 'CAMERA OFFLINE'}
          </span>
        </div>

        <div className="interior-top-actions">
          {!isSequenceActive && captureState !== 'selecting_mode' && captureState === 'idle' && hasMultipleCameras && (
            <button
              type="button"
              className="booth-icon-btn"
              onClick={flipCamera}
              title="Flip camera front/back"
            >
              🔄 Flip
            </button>
          )}

          {!isSequenceActive && captureState !== 'selecting_mode' && captureState === 'idle' && cameraStatus !== 'mock' && (
            <button
              type="button"
              className="test-mode-toggle-btn"
              onClick={enableMockMode}
              title="Switch to Test Portrait Feed"
            >
              🎭 Test Feed
            </button>
          )}
          {!isSequenceActive && captureState !== 'selecting_mode' && captureState === 'idle' && cameraStatus === 'mock' && (
            <button
              type="button"
              className="test-mode-toggle-btn"
              onClick={() => startCamera()}
              title="Connect Webcam"
            >
              📷 Live Camera
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Centerpiece: Live Mirror, Physical Dispenser, or Review Gallery */}
      <main className="interior-main-chamber">
        {captureState === 'collected' ? (
          /* Step 5: Collected Strip Workspace (Large preview, live playback, downloads) */
          <PhotoStripPreview
            capturedPhotos={capturedPhotos && capturedPhotos.length > 0 ? capturedPhotos : capturedPhotosRef.current}
            liveClips={liveClips && liveClips.length > 0 ? liveClips : liveClipsRef.current}
            captureMode={captureMode}
            selectedFilter={activeFilter}
            onRetake={handleRetakeSet}
            baseStripUrl={baseStripUrl}
            isRecomposingStrip={isRecomposingStrip}
            selectedDesignId={selectedDesignId}
            selectedSolidColorId={selectedSolidColorId}
            selectedWidthId={selectedWidthId}
            onDesignChange={handleSelectDesign}
            onSolidColorChange={handleSelectSolidColor}
            onWidthChange={handleSelectWidth}
          />
        ) : (captureState === 'ready_to_dispense' || captureState === 'dispensing' || captureState === 'dispensed') ? (
          /* Steps 1, 2, 3: Physical Dispensing Machine Station */
          <div className="physical-dispenser-station">
            {/* Top Vanity Bulbs */}
            <div className="vanity-bulb-strip strip-top">
              {[...Array(7)].map((_, i) => (
                <div key={`dt-${i}`} className="vanity-socket">
                  <span className={`vanity-lamp ${captureState === 'dispensing' ? 'bright' : ''}`}></span>
                </div>
              ))}
            </div>

            <div className="dispenser-cabinet-chassis">
              {/* Cabinet Header */}
              <div className="dispenser-marquee-header">
                <span className="marquee-star">✦</span>
                <h2 className="dispenser-marquee-title">PHOTO STRIP DISPENSER</h2>
                <span className="marquee-star">✦</span>
              </div>

              {/* Upper Action Bay */}
              <div className="dispenser-action-bay">
                <div className="dispenser-status-badge">
                  <span className="ready-bulb"></span>
                  <span>4 POSES PROCESSED</span>
                  <span className="ready-bulb"></span>
                </div>

                <h3 className="dispenser-headline">Your memories are ready!</h3>
                <p className="dispenser-subtext">
                  {captureMode === 'live'
                    ? '4 still photographs & 4 live clips developed. Ready to print.'
                    : 'Chemical developer cycle complete. Ready for physical delivery.'}
                </p>

                {captureState === 'ready_to_dispense' && (
                  <div className="dispenser-customizer-console">
                    {/* Header */}
                    <div className="customizer-headline-box">
                      <span className="customizer-sparkle">✦</span>
                      <h4 className="customizer-title">CUSTOMIZE YOUR STRIP</h4>
                      <span className="customizer-sparkle">✦</span>
                    </div>

                    {/* Step 1: Strip Width Options */}
                    <div className="customizer-step-group">
                      <div className="customizer-step-header">
                        <span className="step-num-pill">1</span>
                        <span className="step-label">STRIP WIDTH FORMAT:</span>
                      </div>
                      <div className="width-options-grid" role="radiogroup" aria-label="Strip Width Options">
                        <button
                          type="button"
                          className={`width-option-card ${selectedWidthId === 'wide' ? 'active' : ''}`}
                          onClick={() => handleSelectWidth('wide')}
                          role="radio"
                          aria-checked={selectedWidthId === 'wide'}
                          title="Classic Wide: 2 × 6″ format with generous borders"
                        >
                          <span className="width-icon">🖼️</span>
                          <div className="width-text-block">
                            <span className="width-title">Classic Wide Strip</span>
                            <span className="width-spec">2 × 6″ (Generous borders)</span>
                            {selectedWidthId === 'wide' && <span className="width-check-pill">✓ SELECTED</span>}
                          </div>
                        </button>

                        <button
                          type="button"
                          className={`width-option-card ${selectedWidthId === 'slim' ? 'active' : ''}`}
                          onClick={() => handleSelectWidth('slim')}
                          role="radio"
                          aria-checked={selectedWidthId === 'slim'}
                          title="Slim Strip: 1.6 × 6″ narrow ribbon format with compact borders"
                        >
                          <span className="width-icon">🎞️</span>
                          <div className="width-text-block">
                            <span className="width-title">Slim Strip</span>
                            <span className="width-spec">1.6 × 6″ (Compact borders)</span>
                            {selectedWidthId === 'slim' && <span className="width-check-pill">✓ SELECTED</span>}
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Step 2: 5 Preset Designs */}
                    <div className="customizer-step-group">
                      <div className="customizer-step-header">
                        <span className="step-num-pill">2</span>
                        <span className="step-label">CHOOSE PRESET DESIGN:</span>
                      </div>
                      <div className="design-options-grid" role="radiogroup" aria-label="Strip Preset Designs">
                        {STRIP_DESIGNS.map((design) => {
                          const isSelected = selectedDesignId === design.id;
                          const solidObj = SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId);
                          const swatchBg = design.id === 'solid_colors' ? solidObj?.hex : design.swatchBg;
                          return (
                            <button
                              key={design.id}
                              type="button"
                              className={`design-option-card ${isSelected ? 'active' : ''}`}
                              onClick={() => handleSelectDesign(design.id)}
                              role="radio"
                              aria-checked={isSelected}
                              title={`${design.name}: ${design.description}`}
                            >
                              {isSelected && <span className="design-selected-pill">✓</span>}
                              <div
                                className="design-swatch-thumb"
                                style={{
                                  background: swatchBg,
                                  borderColor: isSelected ? 'var(--color-mustard-bright)' : design.swatchBorder
                                }}
                              >
                                <div
                                  className="swatch-mat-box"
                                  style={{
                                    borderColor: design.id === 'solid_colors' ? (solidObj?.photoBorder || 'rgba(255,255,255,0.9)') : design.photoBorder,
                                    backgroundColor: design.id === 'solid_colors' ? 'rgba(255, 255, 255, 0.12)' : '#e6dccb'
                                  }}
                                />
                                {design.patternType === 'polka_dots' && (
                                  <span className="swatch-badge">• •</span>
                                )}
                                {design.patternType === 'little_hearts' && (
                                  <span className="swatch-badge">♥ ♥</span>
                                )}
                                {design.patternType === 'starry' && (
                                  <span className="swatch-badge">✦ ✦</span>
                                )}
                                {design.patternType === 'solid_colors' && (
                                  <span className="swatch-badge">🎨</span>
                                )}
                              </div>
                              <span className="design-card-name">{design.name}</span>
                              <span className="design-card-tag">{design.tagline}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Solid Colours Palette (Revealed when Solid Colours is selected) */}
                      {selectedDesignId === 'solid_colors' && (
                        <div className="solid-palette-section" role="region" aria-label="Solid Colour Palette">
                          <div className="solid-palette-header">
                            <span className="palette-star">✦</span>
                            <span className="palette-title">SELECT SOLID BACKGROUND COLOUR:</span>
                          </div>
                          <div className="solid-palette-swatches" role="radiogroup" aria-label="Solid Colours">
                            {SOLID_COLOR_PALETTE.map((color) => {
                              const isColorActive = selectedSolidColorId === color.id;
                              return (
                                <button
                                  key={color.id}
                                  type="button"
                                  className={`solid-color-btn ${isColorActive ? 'active' : ''}`}
                                  onClick={() => handleSelectSolidColor(color.id)}
                                  role="radio"
                                  aria-checked={isColorActive}
                                  title={`${color.name} background`}
                                >
                                  <span
                                    className="solid-color-circle"
                                    style={{
                                      backgroundColor: color.hex,
                                      border: color.id === 'white' ? '1.5px solid #d4d4d8' : '1.5px solid rgba(0, 0, 0, 0.25)'
                                    }}
                                  >
                                    {isColorActive && (
                                      <span
                                        className="solid-check-mark"
                                        style={{ color: color.isDark ? '#ffffff' : '#141414' }}
                                      >
                                        ✓
                                      </span>
                                    )}
                                  </span>
                                  <span className="solid-color-name">{color.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Live Customization Preview */}
                    <div className="customizer-live-preview-row">
                      <div className="mini-strip-preview-box">
                        {isRecomposingStrip ? (
                          <div className="mini-preview-spinner">
                            <span className="spin-cog">⚙️</span>
                            <span>Updating...</span>
                          </div>
                        ) : baseStripUrl ? (
                          <img
                            src={baseStripUrl}
                            alt="Live customized strip preview"
                            className={`mini-strip-img ${selectedWidthId === 'slim' ? 'is-slim' : 'is-wide'}`}
                          />
                        ) : null}
                      </div>

                      {/* Pattern Detail Zoom Box for subtle textures */}
                      <div className="preview-pattern-detail-box">
                        <div
                          className="pattern-detail-swatch"
                          style={{
                            backgroundColor: selectedDesignId === 'solid_colors'
                              ? (SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId)?.hex || '#1c1917')
                              : (STRIP_DESIGNS.find((d) => d.id === selectedDesignId)?.backgroundColor || '#f6f1e7'),
                            borderColor: selectedDesignId === 'solid_colors'
                              ? (SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId)?.photoBorder || '#ffffff')
                              : (STRIP_DESIGNS.find((d) => d.id === selectedDesignId)?.photoBorder || '#3a1219')
                          }}
                        >
                          {selectedDesignId === 'polka_dots' && (
                            <div className="pattern-detail-sample dots-sample" title="Polka Dot Pattern">
                              <span>•</span><span>•</span><span>•</span>
                              <span>•</span><span>•</span><span>•</span>
                            </div>
                          )}
                          {selectedDesignId === 'little_hearts' && (
                            <div className="pattern-detail-sample hearts-sample" title="Little Hearts Pattern">
                              <span>♥</span><span>♥</span><span>♥</span>
                              <span>♥</span><span>♥</span><span>♥</span>
                            </div>
                          )}
                          {selectedDesignId === 'starry' && (
                            <div className="pattern-detail-sample stars-sample" title="Starry Night Pattern">
                              <span>✦</span><span>★</span><span>✦</span>
                              <span>★</span><span>✦</span><span>★</span>
                            </div>
                          )}
                          {selectedDesignId === 'classic_cream' && (
                            <div className="pattern-detail-sample cream-sample" title="Classic Cream Warm Grain">
                              <span className="sample-grain-label">WARM CREAM</span>
                            </div>
                          )}
                          {selectedDesignId === 'solid_colors' && (
                            <div className="pattern-detail-sample solid-sample" title="Solid Color Emulsion">
                              <span
                                className="sample-solid-label"
                                style={{
                                  color: SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId)?.isDark ? '#ffffff' : '#141414'
                                }}
                              >
                                {SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId)?.name.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="pattern-detail-caption">PATTERN DETAIL</span>
                      </div>

                      <div className="mini-preview-info">
                        <div className="preview-info-badge">
                          <span className="info-dot"></span>
                          <span>LIVE PREVIEW</span>
                        </div>
                        <h5 className="preview-design-name">
                          {selectedDesignId === 'solid_colors'
                            ? `Solid: ${SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId)?.name}`
                            : STRIP_DESIGNS.find((d) => d.id === selectedDesignId)?.name}
                        </h5>
                        <p className="preview-design-desc">
                          {selectedDesignId === 'solid_colors'
                            ? `Solid ${SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId)?.name} paper with matched contrast frame & text.`
                            : STRIP_DESIGNS.find((d) => d.id === selectedDesignId)?.description}
                        </p>
                        <span className="preview-format-spec">
                          Format: <strong>{STRIP_WIDTH_PRESETS[selectedWidthId]?.name}</strong> ({STRIP_WIDTH_PRESETS[selectedWidthId]?.sub})
                        </span>
                      </div>
                    </div>

                    {/* Prominent GET MY STRIP Button */}
                    <button
                      type="button"
                      className="get-my-strip-btn"
                      onClick={handleGetMyStrip}
                      aria-label="Get my physical photo strip"
                    >
                      <div className="btn-bulb-ring"></div>
                      <div className="get-strip-inner">
                        <span className="get-strip-icon">🎟️</span>
                        <div className="get-strip-labels">
                          <span className="get-strip-main">GET MY STRIP</span>
                          <span className="get-strip-sub">
                            PRINT & DISPENSE ({selectedDesignId === 'solid_colors'
                              ? `SOLID ${SOLID_COLOR_PALETTE.find((c) => c.id === selectedSolidColorId)?.name.toUpperCase()}`
                              : STRIP_DESIGNS.find((d) => d.id === selectedDesignId)?.name.toUpperCase()})
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {captureState === 'dispensing' && (
                  <div className="dispenser-motor-status">
                    <div className="motor-cog-spin">⚙️</div>
                    <span className="motor-status-label">PRINTING & DRYING EMULSION...</span>
                  </div>
                )}

                {captureState === 'dispensed' && (
                  <div className="dispenser-collect-prompt">
                    <div className="collect-prompt-pill">
                      <span className="collect-sparkle">✦</span>
                      <span>YOUR STRIP IS READY – COLLECT IT</span>
                      <span className="collect-sparkle">✦</span>
                    </div>
                    <p className="collect-sub-hint">Click or pull the strip from the collection tray below</p>
                  </div>
                )}
              </div>

              {/* Physical Dispensing Slot Mechanism */}
              <div className="dispenser-physical-chute">
                {/* Heavy Chrome Faceplate */}
                <div className="dispenser-slot-faceplate">
                  <div className="chrome-slot-bezel">
                    <span className="slot-bezel-title">PHOTOS</span>
                    {/* Mechanical Slit Opening */}
                    <div className="slot-mechanical-slit">
                      <div className="slot-slit-shadow"></div>
                    </div>
                  </div>
                </div>

                {/* Collection Window / Delivery Bay */}
                <div className="dispenser-collection-window">
                  {/* Emerging / Dropped Strip Container */}
                  {(captureState === 'dispensing' || captureState === 'dispensed') && (
                    <div
                      className={`dispensing-strip-carrier ${captureState === 'dispensing' ? 'is-emerging' : 'is-dropped'} ${selectedWidthId === 'slim' ? 'is-slim' : 'is-wide'}`}
                      onClick={captureState === 'dispensed' ? handleCollectStrip : undefined}
                      role={captureState === 'dispensed' ? 'button' : undefined}
                      tabIndex={captureState === 'dispensed' ? 0 : undefined}
                      title={captureState === 'dispensed' ? 'Click to collect your strip!' : 'Dispensing...'}
                    >
                      {baseStripUrl ? (
                        <img
                          src={baseStripUrl}
                          alt="Physical Composed Photo Strip"
                          className="dispensing-strip-image"
                        />
                      ) : (
                        <div className="dispensing-strip-fallback">
                          <div className="fallback-strip-paper">
                            <span>PRINTING...</span>
                          </div>
                        </div>
                      )}

                      {captureState === 'dispensed' && (
                        <div className="strip-grab-tag">
                          <span>CLICK TO COLLECT ⬆</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Physical Chrome Collection Tray */}
                  <div className="dispenser-collection-tray">
                    <div className="collection-tray-rim">
                      <span className="tray-emboss-text">COLLECTION TRAY</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Vanity Bulbs */}
            <div className="vanity-bulb-strip strip-bottom">
              {[...Array(7)].map((_, i) => (
                <div key={`db-${i}`} className="vanity-socket">
                  <span className={`vanity-lamp ${captureState === 'dispensing' ? 'bright' : ''}`}></span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Live Camera Viewport + Middle Ready Button + Bottom Filters */
          <div className="interior-booth-view">
            {/* 1. TOP: Live Mirror Vanity Chamber */}
            <div className="vanity-mirror-unit">
              {/* Top Vanity Bulbs */}
              <div className="vanity-bulb-strip strip-top">
                {[...Array(7)].map((_, i) => (
                  <div key={`vt-${i}`} className="vanity-socket">
                    <span className={`vanity-lamp ${isSequenceActive ? 'bright' : ''}`}></span>
                  </div>
                ))}
              </div>

              {/* Mirror Glass Housing */}
              <div className="mirror-glass-frame">
                <div className="mirror-glass-pane">
                  {/* Diagonal Mirror Glare Highlight */}
                  <div className="mirror-glare-effect"></div>

                  {/* Live Mirrored Video Feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`live-mirror-video ${cameraStatus === 'active' ? 'visible' : 'hidden'}`}
                    style={{ filter: activeFilter.cssFilter }}
                  />

                  {/* Mock Feed if in Test Mode */}
                  {cameraStatus === 'mock' && (
                    <MockCameraFeed activeFilter={activeFilter} />
                  )}

                  {/* Loading State */}
                  {cameraStatus === 'requesting' && (
                    <div className="mirror-fallback-card">
                      <div className="retro-loader-spinner"></div>
                      <h3 className="fallback-heading">Adjusting Lens...</h3>
                      <p className="fallback-text">Connecting to your webcam</p>
                    </div>
                  )}

                  {/* Camera Denied / Error State */}
                  {(cameraStatus === 'denied' || cameraStatus === 'error') && (
                    <div className="mirror-fallback-card">
                      <span className="fallback-icon">📷</span>
                      <h3 className="fallback-heading">Camera Access Needed</h3>
                      <p className="fallback-text">
                        {errorMessage || 'Please allow camera access in your browser to see your live reflection.'}
                      </p>
                      <div className="fallback-actions">
                        <button
                          type="button"
                          className="fallback-btn primary"
                          onClick={() => startCamera()}
                        >
                          Try Again
                        </button>
                        <button
                          type="button"
                          className="fallback-btn secondary"
                          onClick={enableMockMode}
                        >
                          Use Test Mode
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Filter Badge */}
                  {captureState === 'idle' && (
                    <div className="mirror-filter-watermark">
                      <span className="watermark-era">{activeFilter.era}</span>
                      <span className="watermark-name">{activeFilter.name}</span>
                    </div>
                  )}

                  {/* Mode Selection Modal: Appears only AFTER clicking Ready */}
                  {captureState === 'selecting_mode' && (
                    <div className="mode-selection-modal-backdrop">
                      <div className="mode-selection-modal-card">
                        <div className="mode-modal-header">
                          <span className="mode-modal-step-tag">STEP 2 OF 2</span>
                          <h3 className="mode-modal-title">CHOOSE CAPTURE MODE</h3>
                          <p className="mode-modal-sub">
                            Selected Filter: <strong>{activeFilter.name}</strong> • Choose how your 4 poses are captured
                          </p>
                        </div>

                        <div className="mode-options-grid">
                          {/* Option 1: Still Photos */}
                          <button
                            type="button"
                            className="mode-choice-card"
                            onClick={() => handleSelectModeAndStart('still')}
                            autoFocus
                          >
                            <div className="mode-choice-icon-bubble">
                              <span className="mode-choice-icon">📷</span>
                            </div>
                            <div className="mode-choice-info">
                              <div className="mode-choice-heading-row">
                                <span className="mode-choice-title">STILL PHOTOS</span>
                                <span className="mode-choice-badge classic">RETRO PRINT</span>
                              </div>
                              <p className="mode-choice-desc">
                                Classic four-photo vintage strip. Crisp high-resolution photographs ready for instant printing and downloads.
                              </p>
                              <span className="mode-choice-action">START STILL STRIP ▶</span>
                            </div>
                          </button>

                          {/* Option 2: Live Photos */}
                          <button
                            type="button"
                            className="mode-choice-card featured"
                            onClick={() => handleSelectModeAndStart('live')}
                          >
                            <div className="mode-choice-icon-bubble live">
                              <span className="mode-choice-icon">✦ 📹</span>
                            </div>
                            <div className="mode-choice-info">
                              <div className="mode-choice-heading-row">
                                <span className="mode-choice-title">LIVE PHOTOS</span>
                                <span className="mode-choice-badge live">APPLE STYLE</span>
                              </div>
                              <p className="mode-choice-desc">
                                Captures 4 still photos PLUS 4 short moving moments (~2.7s around each shutter). Preserves smiles and motion!
                              </p>
                              <span className="mode-choice-action live">START LIVE STRIP ▶</span>
                            </div>
                          </button>
                        </div>

                        <button
                          type="button"
                          className="mode-modal-cancel-btn"
                          onClick={() => setCaptureState('idle')}
                        >
                          <span>✕ BACK TO FILTERS</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Interactive Sequential Capture Overlay (Top-Right Countdown, Flash) */}
                  {isSequenceActive && (
                    <CaptureOverlay
                      currentPhotoIndex={currentPhotoIndex}
                      countdownValue={countdownValue}
                      isFlashing={isFlashing}
                      capturedPhotos={capturedPhotos}
                      onCancel={handleCancelCapture}
                    />
                  )}
                </div>
              </div>

              {/* Bottom Vanity Bulbs */}
              <div className="vanity-bulb-strip strip-bottom">
                {[...Array(7)].map((_, i) => (
                  <div key={`vb-${i}`} className="vanity-socket">
                    <span className={`vanity-lamp ${isSequenceActive ? 'bright' : ''}`}></span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. MIDDLE (Directly between camera & filters): Separate, Prominent READY Button */}
            {captureState === 'idle' && (
              <div className="interior-ready-section">
                <button
                  type="button"
                  disabled={cameraStatus !== 'active' && cameraStatus !== 'mock'}
                  className="interior-ready-btn"
                  onClick={handleReadyClick}
                  aria-label="Ready: start 4-shot photo sequence"
                >
                  <div className="ready-btn-glow-ring" aria-hidden="true"></div>
                  <div className="ready-btn-casing">
                    <div className="ready-btn-inner">
                      <span className="ready-camera-icon">📸</span>
                      <div className="ready-btn-labels">
                        <span className="ready-main-label">READY: START 4-SHOT STRIP</span>
                        <span className="ready-sub-label">PRESS TO BEGIN FOUR AUTOMATED POSES</span>
                      </div>
                      <span className="ready-btn-arrow">▶</span>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* 3. BOTTOM: Film Filter Selection Card (Containing only Soft B&W and Golden Hour) */}
            {captureState === 'idle' && (
              <div className="interior-filter-section">
                <div className="filter-card-header">
                  <span className="filter-step-tag">STEP 1</span>
                  <h3 className="filter-card-title">CHOOSE FILM STYLE</h3>
                </div>

                <div className="filter-cards-row" role="radiogroup" aria-label="Film Filters">
                  {RETRO_FILTERS.map((filter) => {
                    const isSelected = activeFilter.id === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        className={`filter-selector-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleFilterClick(filter)}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${filter.name} filter`}
                      >
                        <div className="filter-card-led" aria-hidden="true"></div>
                        <div className="filter-card-body">
                          <div className="filter-card-badge-row">
                            <span className="filter-era-badge">{filter.era}</span>
                            {isSelected && <span className="filter-active-pill">ACTIVE</span>}
                          </div>
                          <span className="filter-card-name">{filter.name}</span>
                          <span className="filter-card-desc">{filter.subtitle}</span>
                        </div>
                        {isSelected && <span className="filter-card-checkmark" aria-hidden="true">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
