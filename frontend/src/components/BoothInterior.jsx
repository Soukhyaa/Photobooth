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
  getFormattedVintageDate
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
  const [composedStrip, setComposedStrip] = useState(null);
  const [baseStripUrl, setBaseStripUrl] = useState(null);

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
    setCaptureState('idle');
    setCurrentPhotoIndex(1);
    setCountdownValue(3);
    setIsFlashing(false);
    setCapturedPhotos([]);
    revokeLiveClipUrls(liveClipsRef.current);
    setLiveClips([]);
    setComposedStrip(null);
    setBaseStripUrl(null);
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
    setCaptureState('idle');
    setCurrentPhotoIndex(1);
    setCountdownValue(3);
    setIsFlashing(false);
    setCapturedPhotos([]);
    revokeLiveClipUrls(liveClipsRef.current);
    setLiveClips([]);
    setComposedStrip(null);
    setBaseStripUrl(null);
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
                  return [...filtered, clip];
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
              // Pre-compose the base strip canvas in background so the physical paper strip is ready to emerge
              composeBasePhotoStrip(updatedPhotos, { dateText: getFormattedVintageDate() })
                .then((canvas) => {
                  setBaseStripUrl(canvas.toDataURL('image/png'));
                })
                .catch((err) => console.warn('Background strip composition error:', err));

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
    [handleCancelCapture, videoRef]
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
            capturedPhotos={capturedPhotos}
            liveClips={liveClips}
            captureMode={captureMode}
            selectedFilter={activeFilter}
            onRetake={handleRetakeSet}
            onStripComposed={(url) => setComposedStrip(url)}
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
                        <span className="get-strip-sub">PRINT & DISPENSE</span>
                      </div>
                    </div>
                  </button>
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
                      className={`dispensing-strip-carrier ${captureState === 'dispensing' ? 'is-emerging' : 'is-dropped'}`}
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
          /* Live Mirror Vanity Chamber */
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
        )}
      </main>

      {/* 3. Retro Console / Control Panel (Only shown before capture is initiated) */}
      {captureState === 'idle' && (
        <footer className="booth-control-console">
          <div className="console-panel-rim">
            {/* Filter Bar */}
            <div className="filter-selection-section">
              <div className="console-section-header">
                <span className="console-label-tag">STEP 1</span>
                <h2 className="console-heading">CHOOSE FILM STYLE</h2>
              </div>

              <div className="filter-buttons-scroll">
                {RETRO_FILTERS.map((filter) => {
                  const isSelected = activeFilter.id === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      className={`filter-selector-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleFilterClick(filter)}
                      aria-pressed={isSelected}
                    >
                      <div className="filter-btn-led"></div>
                      <div className="filter-btn-content">
                        <span className="filter-era-badge">{filter.era}</span>
                        <span className="filter-name">{filter.name}</span>
                        <span className="filter-sub">{filter.subtitle}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Capture Trigger Area */}
            <div className="console-capture-section">
              <button
                type="button"
                disabled={cameraStatus !== 'active' && cameraStatus !== 'mock'}
                className="shutter-trigger-btn"
                onClick={handleReadyClick}
                aria-label="Ready: start 4-shot photo sequence"
              >
                <div className="shutter-btn-casing">
                  <div className="shutter-btn-inner">
                    <span className="shutter-camera-icon">📸</span>
                    <div className="shutter-btn-labels">
                      <span className="shutter-main-label">READY</span>
                      <span className="shutter-sub-label">START 4-SHOT STRIP</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
