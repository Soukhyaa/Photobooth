import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  composeCustomPhotoStrip,
  renderFinalPhotoStripCanvas,
  getCustomStripDimensions,
  getFormattedVintageDate,
  triggerBrowserDownload,
  STRIP_DESIGNS,
  STRIP_WIDTH_PRESETS,
  SOLID_COLOR_PALETTE
} from '../utils/stripComposer';
import { autoCropImageFile } from '../utils/cropUtils';
import { soundEngine } from '../utils/audio';
import PhotoCropModal from './PhotoCropModal';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function CreateStripStudio({
  onReturnToBooth,
  onStepInside
}) {
  // Photo count configuration: 2, 3, or 4 photos
  const [photoCount, setPhotoCount] = useState(4);

  // Slots array: length matches photoCount, each item is null or a photo object
  const [slots, setSlots] = useState([null, null, null, null]);

  // Strip Customization Options
  const [selectedDesignId, setSelectedDesignId] = useState('classic_cream');
  const [selectedSolidColorId, setSelectedSolidColorId] = useState('black');
  const [selectedWidthId, setSelectedWidthId] = useState('wide');
  const [caption, setCaption] = useState('MEMORIES IN THE BOOTH');

  // Strip Composition & Preview State
  const [composedStripUrl, setComposedStripUrl] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const [compositionError, setCompositionError] = useState(null);
  const [downloadNotice, setDownloadNotice] = useState('');

  // Crop Modal State: slot index (0..photoCount-1) or null
  const [cropModalSlotIndex, setCropModalSlotIndex] = useState(null);

  // Drag and drop state
  const [isDragOverZone, setIsDragOverZone] = useState(false);

  // Ref to store composed canvas for download
  const composedCanvasRef = useRef(null);

  // Hidden file inputs
  const bulkFileInputRef = useRef(null);
  const slotFileInputRef = useRef(null);
  const targetReplaceIndexRef = useRef(null);

  // Synchronize slots array length when photoCount changes
  const handlePhotoCountChange = (newCount) => {
    soundEngine.playLeverClick?.();
    const count = Math.min(4, Math.max(2, newCount));
    setPhotoCount(count);
    setSlots((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        // Expand slots with nulls
        const expanded = [...prev];
        while (expanded.length < count) {
          expanded.push(null);
        }
        return expanded;
      }
      // Shrink slots, keeping first `count` items
      return prev.slice(0, count);
    });
  };

  // Process imported image files
  const processFiles = useCallback(async (files, targetSlotIndex = null) => {
    const validFiles = Array.from(files).filter((file) =>
      ALLOWED_MIME_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)
    );

    if (validFiles.length === 0) {
      alert('Please select valid JPG, PNG, or WebP images.');
      return;
    }

    soundEngine.playLeverClick?.();

    try {
      if (targetSlotIndex !== null) {
        // Replace single specific slot
        const file = validFiles[0];
        const cropped = await autoCropImageFile(file);
        setSlots((prev) => {
          const next = [...prev];
          next[targetSlotIndex] = {
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            ...cropped
          };
          return next;
        });
        soundEngine.playShutter?.();
      } else {
        // Fill next available empty slots or replace from the beginning
        setSlots((prev) => {
          const next = [...prev];
          let fileIdx = 0;

          // First pass: fill null slots
          for (let i = 0; i < next.length && fileIdx < validFiles.length; i++) {
            if (next[i] === null) {
              const file = validFiles[fileIdx++];
              // Placeholder while cropping
              next[i] = {
                id: `pending-${fileIdx}`,
                filename: file.name,
                isPending: true,
                file
              };
            }
          }

          // Second pass: if still more files, replace from top
          for (let i = 0; i < next.length && fileIdx < validFiles.length; i++) {
            const file = validFiles[fileIdx++];
            next[i] = {
              id: `pending-${fileIdx}`,
              filename: file.name,
              isPending: true,
              file
            };
          }

          return next;
        });

        // Now perform async auto-crop on the pending items
        for (let i = 0; i < validFiles.length && i < photoCount; i++) {
          const file = validFiles[i];
          const cropped = await autoCropImageFile(file);
          setSlots((prev) => {
            const next = [...prev];
            // Find slot with matching pending file or first pending
            const slotIdx = next.findIndex((s) => s?.file === file || s?.isPending);
            if (slotIdx !== -1) {
              next[slotIdx] = {
                id: `photo-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 6)}`,
                ...cropped
              };
            }
            return next;
          });
        }
        soundEngine.playShutter?.();
      }
    } catch (err) {
      console.error('Failed to process image file:', err);
      alert('Could not process the selected image. Please try another file.');
    }
  }, [photoCount]);

  // Bulk File Input Handler
  const handleBulkFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Single Slot Replace Handler
  const handleSlotFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const targetIndex = targetReplaceIndexRef.current;
      if (targetIndex !== null && targetIndex >= 0) {
        processFiles(e.target.files, targetIndex);
      }
      e.target.value = '';
      targetReplaceIndexRef.current = null;
    }
  };

  const triggerSlotReplace = (index) => {
    targetReplaceIndexRef.current = index;
    slotFileInputRef.current?.click();
  };

  // Reorder: Move Slot Up
  const handleMoveUp = (index) => {
    if (index <= 0) return;
    soundEngine.playLeverClick?.();
    setSlots((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  // Reorder: Move Slot Down
  const handleMoveDown = (index) => {
    if (index >= photoCount - 1) return;
    soundEngine.playLeverClick?.();
    setSlots((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  // Remove Slot Photo
  const handleRemoveSlot = (index) => {
    soundEngine.playLeverClick?.();
    setSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  // Apply Crop Modal result
  const handleApplyCrop = useCallback((croppedDataUrl, cropSettings) => {
    if (cropModalSlotIndex === null) return;
    setSlots((prev) => {
      const next = [...prev];
      if (next[cropModalSlotIndex]) {
        next[cropModalSlotIndex] = {
          ...next[cropModalSlotIndex],
          croppedDataUrl,
          cropSettings
        };
      }
      return next;
    });
    setCropModalSlotIndex(null);
  }, [cropModalSlotIndex]);

  const handleCloseCropModal = useCallback(() => {
    setCropModalSlotIndex(null);
  }, []);

  // Drag and Drop Zone Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOverZone(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOverZone(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOverZone(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Slot Drag & Drop onto specific slot
  const handleSlotDrop = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files, index);
    }
  };

  // Slot calculations
  const activeSlots = useMemo(() => slots.slice(0, photoCount), [slots, photoCount]);
  const filledSlots = useMemo(
    () => activeSlots.filter((s) => s && s.croppedDataUrl && !s.isPending),
    [activeSlots]
  );
  const filledCount = filledSlots.length;
  const isAllFilled = filledCount === photoCount;

  // Stable fingerprint of slot photos to prevent infinite composition render loops
  const slotPhotosFingerprint = useMemo(() => {
    return activeSlots
      .map((s, idx) =>
        s && s.croppedDataUrl
          ? `${s.id || idx}:${s.croppedDataUrl.length}:${s.cropSettings?.zoom || 1}:${s.cropSettings?.panX || 0}:${s.cropSettings?.panY || 0}`
          : 'empty'
      )
      .join('|');
  }, [activeSlots]);

  // Custom Strip Dimensions for CSS preview aspect ratio
  const stripDims = getCustomStripDimensions(photoCount, selectedWidthId);

  // Compose the Photo Strip when all slots are filled or when customization changes
  useEffect(() => {
    if (!isAllFilled) {
      composedCanvasRef.current = null;
      setComposedStripUrl((prev) => (prev !== null ? null : prev));
      setIsComposing((prev) => (prev ? false : prev));
      return;
    }

    let isCurrent = true;
    setIsComposing(true);
    setCompositionError(null);

    const photosForComposition = activeSlots.map((slot, idx) => ({
      id: slot.id || idx + 1,
      dataUrl: slot.croppedDataUrl
    }));

    composeCustomPhotoStrip(photosForComposition, {
      designId: selectedDesignId,
      solidColorId: selectedSolidColorId,
      widthId: selectedWidthId,
      dateText: getFormattedVintageDate()
    })
      .then((baseCanvas) => {
        if (!isCurrent) return;

        const finalCanvas = renderFinalPhotoStripCanvas(baseCanvas, caption, {
          designId: selectedDesignId,
          solidColorId: selectedSolidColorId,
          widthId: selectedWidthId
        });

        if (isCurrent && finalCanvas) {
          composedCanvasRef.current = finalCanvas;
          setComposedStripUrl(finalCanvas.toDataURL('image/png'));
          setIsComposing(false);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          console.error('Custom strip composition failed:', err);
          setCompositionError(err.message || 'Composition error');
          setIsComposing(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    isAllFilled,
    photoCount,
    slotPhotosFingerprint,
    selectedDesignId,
    selectedSolidColorId,
    selectedWidthId,
    caption
  ]);

  // Download Composed Photo Strip PNG
  const handleDownloadStrip = () => {
    if (!isAllFilled || !composedCanvasRef.current) return;

    soundEngine.playTrayDrop?.();
    setDownloadNotice('Downloading your custom photo strip...');

    try {
      const filename = `vintage-booth-custom-strip-${photoCount}photos-${Date.now()}.png`;
      triggerBrowserDownload(composedCanvasRef.current, filename);
      setTimeout(() => setDownloadNotice(''), 3000);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadNotice('Download failed. Please try again.');
      setTimeout(() => setDownloadNotice(''), 3000);
    }
  };

  const selectedDesign = STRIP_DESIGNS.find((d) => d.id === selectedDesignId) || STRIP_DESIGNS[0];
  const isSolidTheme = selectedDesign.id === 'solid_colors';

  return (
    <main className="create-strip-studio-stage">
      {/* Hidden file inputs */}
      <input
        ref={bulkFileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleBulkFileChange}
      />
      <input
        ref={slotFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleSlotFileChange}
      />

      <div className="studio-container">
        {/* Studio Marquee Header */}
        <header className="studio-marquee">
          <div className="studio-marquee-top">
            <button
              type="button"
              className="studio-back-btn"
              onClick={onReturnToBooth}
              title="Return to Photo Booth"
            >
              ◀ RETURN TO BOOTH
            </button>
            <div className="studio-brand-center">
              <span className="marquee-star">✦</span>
              <h1 className="studio-title">CREATE A STRIP</h1>
              <span className="marquee-star">✦</span>
            </div>
            {onStepInside && (
              <button
                type="button"
                className="studio-step-inside-link"
                onClick={onStepInside}
                title="Step inside the vintage camera booth"
              >
                ENTER BOOTH ▶
              </button>
            )}
          </div>
          <p className="studio-subtitle">
            Import photographs from your device • Frame & customize your vintage strip
          </p>
        </header>

        {/* Main Two-Column Layout */}
        <div className="studio-grid-layout">
          {/* LEFT COLUMN: Photo Importer, Count Selector, & Slots Manager */}
          <section className="studio-left-column" aria-label="Photo management panel">
            {/* Step 1: Photo Count Configuration */}
            <div className="studio-card count-selector-card">
              <div className="card-header-badge">
                <span className="badge-step">STEP 1</span>
                <span className="badge-title">CHOOSE STRIP LENGTH</span>
              </div>
              <div className="count-button-group">
                {[2, 3, 4].map((count) => (
                  <button
                    key={`count-${count}`}
                    type="button"
                    className={`count-select-btn ${photoCount === count ? 'active' : ''}`}
                    onClick={() => handlePhotoCountChange(count)}
                  >
                    <span className="count-num">{count}</span>
                    <span className="count-label">PHOTOS</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Import & Slot Management */}
            <div className="studio-card slots-manager-card">
              <div className="card-header-badge">
                <span className="badge-step">STEP 2</span>
                <span className="badge-title">IMPORT & ARRANGE PHOTOS</span>
              </div>

              {/* Status Pill: How many slots filled */}
              <div className={`slots-status-pill ${isAllFilled ? 'status-complete' : 'status-pending'}`}>
                {isAllFilled ? (
                  <span>★ ALL {photoCount} PHOTOS LOADED • READY TO PRINT</span>
                ) : (
                  <span>
                    ★ {filledCount} OF {photoCount} PHOTOS LOADED • {photoCount - filledCount} NEEDED
                  </span>
                )}
              </div>

              {/* Bulk Drop & Upload Zone */}
              <div
                className={`studio-drop-zone ${isDragOverZone ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => bulkFileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    bulkFileInputRef.current?.click();
                  }
                }}
              >
                <div className="drop-zone-content">
                  <span className="drop-icon">📁</span>
                  <div className="drop-text-group">
                    <span className="drop-main-text">CLICK OR DROP PHOTOS HERE</span>
                    <span className="drop-sub-text">
                      JPG, PNG, or WebP • Select up to {photoCount} images
                    </span>
                  </div>
                </div>
              </div>

              {/* Photo Slots List */}
              <div className="photo-slots-list" role="list">
                {activeSlots.map((slot, index) => (
                  <div
                    key={`slot-${index}`}
                    className={`photo-slot-item ${slot ? 'filled' : 'empty'}`}
                    role="listitem"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleSlotDrop(e, index)}
                  >
                    {/* Slot Position Badge */}
                    <div className="slot-badge">
                      <span className="slot-index-num">#{index + 1}</span>
                    </div>

                    {slot ? (
                      /* Filled Slot View */
                      <div className="slot-content-filled">
                        <div
                          className="slot-thumbnail-wrap"
                          onClick={() => {
                            if (!slot.isPending && slot.originalDataUrl) {
                              setCropModalSlotIndex(index);
                            }
                          }}
                          title="Click to adjust 4:3 crop"
                        >
                          <img
                            src={slot.croppedDataUrl || slot.originalDataUrl}
                            alt={`Photo slot ${index + 1}`}
                            className="slot-thumbnail-img"
                          />
                          <span className="slot-crop-hint">✂️ CROP</span>
                        </div>

                        <div className="slot-info-col">
                          <span className="slot-filename" title={slot.filename}>
                            {slot.filename || `Photo ${index + 1}`}
                          </span>
                          <span className="slot-crop-badge">4:3 FRAMED</span>
                        </div>

                        <div className="slot-actions-col">
                          <button
                            type="button"
                            className="slot-action-btn action-crop"
                            onClick={() => setCropModalSlotIndex(index)}
                            disabled={slot.isPending || !slot.originalDataUrl}
                            title="Adjust 4:3 crop & framing"
                          >
                            ✂️ CROP
                          </button>
                          <button
                            type="button"
                            className="slot-action-btn action-move"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            title="Move photo up"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="slot-action-btn action-move"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === photoCount - 1}
                            title="Move photo down"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="slot-action-btn action-replace"
                            onClick={() => triggerSlotReplace(index)}
                            title="Replace photograph"
                          >
                            🔄
                          </button>
                          <button
                            type="button"
                            className="slot-action-btn action-remove"
                            onClick={() => handleRemoveSlot(index)}
                            title="Remove photograph"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Empty Slot View */
                      <div
                        className="slot-content-empty"
                        onClick={() => triggerSlotReplace(index)}
                      >
                        <span className="empty-slot-plus">+</span>
                        <div className="empty-slot-text">
                          <span className="empty-slot-title">SLOT #{index + 1} EMPTY</span>
                          <span className="empty-slot-sub">Click to select photo or drop image here</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Customization Controls & Live Strip Preview */}
          <section className="studio-right-column" aria-label="Strip customization and preview panel">
            {/* Customization Options Bar */}
            <div className="studio-card customization-card">
              <div className="card-header-badge">
                <span className="badge-step">STEP 3</span>
                <span className="badge-title">CUSTOMIZE STRIP DESIGN</span>
              </div>

              {/* Strip Width Selector */}
              <div className="custom-option-section">
                <div className="option-label-row">
                  <span className="option-title">FORMAT & WIDTH</span>
                </div>
                <div className="width-toggle-group">
                  {Object.values(STRIP_WIDTH_PRESETS).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`width-btn ${selectedWidthId === preset.id ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playLeverClick?.();
                        setSelectedWidthId(preset.id);
                      }}
                    >
                      <span className="width-btn-name">{preset.name}</span>
                      <span className="width-btn-sub">{preset.tag}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Strip Design Preset Selector */}
              <div className="custom-option-section">
                <div className="option-label-row">
                  <span className="option-title">PAPER & BORDER DESIGN</span>
                </div>
                <div className="designs-pill-grid">
                  {STRIP_DESIGNS.map((design) => (
                    <button
                      key={design.id}
                      type="button"
                      className={`design-pill-btn ${selectedDesignId === design.id ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playLeverClick?.();
                        setSelectedDesignId(design.id);
                      }}
                      title={design.description}
                    >
                      <span
                        className="design-swatch-dot"
                        style={{
                          background: design.swatchBg,
                          borderColor: design.swatchBorder
                        }}
                      />
                      <span className="design-pill-name">{design.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Solid Color Palette Selector (when Solid Colours design is selected) */}
              {isSolidTheme && (
                <div className="custom-option-section solid-colors-section">
                  <div className="option-label-row">
                    <span className="option-title">SOLID COLOUR PALETTE</span>
                  </div>
                  <div className="solid-palette-row">
                    {SOLID_COLOR_PALETTE.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        className={`solid-color-swatch-btn ${selectedSolidColorId === color.id ? 'active' : ''}`}
                        onClick={() => {
                          soundEngine.playLeverClick?.();
                          setSelectedSolidColorId(color.id);
                        }}
                        title={color.name}
                        style={{ backgroundColor: color.hex }}
                        aria-label={`Select ${color.name} solid background`}
                      >
                        {selectedSolidColorId === color.id && <span className="swatch-check">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Keepsake Caption Input */}
              <div className="custom-option-section">
                <div className="option-label-row">
                  <span className="option-title">KEEPSAKE CAPTION</span>
                  <span className="caption-length-count">{caption.length}/32</span>
                </div>
                <div className="caption-input-box">
                  <input
                    type="text"
                    maxLength={32}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value.toUpperCase())}
                    placeholder="ENTER VINTAGE CAPTION"
                    className="studio-caption-input"
                  />
                  {caption.length > 0 && (
                    <button
                      type="button"
                      className="caption-clear-btn"
                      onClick={() => setCaption('')}
                      title="Clear caption"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Strip Preview & Download Card */}
            <div className="studio-card preview-download-card">
              <div className="card-header-badge">
                <span className="badge-step">STEP 4</span>
                <span className="badge-title">PREVIEW & DOWNLOAD</span>
              </div>

              {/* Download Action Button */}
              <div className="studio-download-action-box">
                <button
                  type="button"
                  className={`studio-download-btn ${isAllFilled ? 'ready' : 'disabled'}`}
                  onClick={handleDownloadStrip}
                  disabled={!isAllFilled || isComposing}
                  title={
                    isAllFilled
                      ? 'Download your high-resolution custom vintage strip PNG'
                      : `Please fill all ${photoCount} photo slots before downloading`
                  }
                >
                  <span className="dl-icon">📥</span>
                  <span className="dl-text">
                    {isComposing
                      ? 'COMPOSING PHOTO STRIP...'
                      : isAllFilled
                      ? 'DOWNLOAD PHOTO STRIP (PNG)'
                      : `FILL ALL ${photoCount} SLOTS TO PRINT`}
                  </span>
                </button>

                {downloadNotice && <p className="studio-download-notice">{downloadNotice}</p>}
                {compositionError && <p className="studio-error-notice">⚠️ {compositionError}</p>}
              </div>

              {/* Physical Photo Strip Preview Container */}
              <div className="studio-preview-viewport">
                {isComposing && (
                  <div className="strip-composing-overlay">
                    <span className="crop-spinner" />
                    <span>Developing vintage print...</span>
                  </div>
                )}

                {composedStripUrl ? (
                  <div
                    className="studio-strip-card"
                    style={{
                      width: stripDims.cardWidthCss,
                      aspectRatio: stripDims.aspectRatioCss
                    }}
                  >
                    <img
                      src={composedStripUrl}
                      alt="Custom vintage photo strip preview"
                      className="studio-strip-img"
                    />
                  </div>
                ) : (
                  /* Placeholder when strip is not yet completely filled */
                  <div
                    className="studio-strip-placeholder-card"
                    style={{
                      width: stripDims.cardWidthCss,
                      aspectRatio: stripDims.aspectRatioCss
                    }}
                  >
                    <div className="placeholder-strip-header">
                      <span>THE VINTAGE BOOTH</span>
                    </div>
                    <div className="placeholder-strip-slots">
                      {[...Array(photoCount)].map((_, i) => (
                        <div
                          key={`ph-${i}`}
                          className={`placeholder-slot ${activeSlots[i] ? 'has-photo' : 'empty'}`}
                        >
                          {activeSlots[i] ? (
                            <img
                              src={activeSlots[i].croppedDataUrl || activeSlots[i].originalDataUrl}
                              alt={`Slot ${i + 1}`}
                            />
                          ) : (
                            <span>PHOTO #{i + 1}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="placeholder-strip-footer">
                      <span>• {filledCount} OF {photoCount} LOADED •</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Interactive 4:3 Crop Modal */}
      {cropModalSlotIndex !== null && activeSlots[cropModalSlotIndex] && (
        <PhotoCropModal
          isOpen={true}
          photo={activeSlots[cropModalSlotIndex]}
          onApply={handleApplyCrop}
          onCancel={handleCloseCropModal}
        />
      )}
    </main>
  );
}
