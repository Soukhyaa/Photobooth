import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getCropSourceCoordinates,
  renderCroppedDataUrl,
  loadImageElement,
  DEFAULT_EXPORT_WIDTH,
  DEFAULT_EXPORT_HEIGHT
} from '../utils/cropUtils';
import { soundEngine } from '../utils/audio';

export default function PhotoCropModal({
  isOpen,
  photo,
  onApply,
  onCancel
}) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [imageElement, setImageElement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const canvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ panX: 0, panY: 0 });

  const photoId = photo?.id;
  const photoSrc = photo?.originalDataUrl;
  const photoCropSettings = photo?.cropSettings;

  // Initialize or reset crop settings whenever a new photo opens
  useEffect(() => {
    if (!isOpen || !photoSrc) {
      setImageElement(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    const initialSettings = photoCropSettings || { zoom: 1, panX: 0, panY: 0 };
    setZoom(initialSettings.zoom || 1);
    setPanX(initialSettings.panX || 0);
    setPanY(initialSettings.panY || 0);

    loadImageElement(photoSrc)
      .then((img) => {
        if (isMounted) {
          setImageElement(img);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err.message || 'Failed to load photograph');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, photoId, photoSrc]);

  // Handle keyboard shortcuts (Escape to cancel)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Render the interactive 4:3 viewfinder preview on the modal canvas
  const drawViewfinder = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageElement) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const viewW = canvas.width;
    const viewH = canvas.height;

    ctx.clearRect(0, 0, viewW, viewH);

    // Get source coordinates in original image space
    const { srcX, srcY, cropW, cropH } = getCropSourceCoordinates(
      imageElement.naturalWidth || imageElement.width,
      imageElement.naturalHeight || imageElement.height,
      zoom,
      panX,
      panY
    );

    // Draw the cropped portion onto the viewfinder canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imageElement, srcX, srcY, cropW, cropH, 0, 0, viewW, viewH);

    // Subtle Rule-of-Thirds Grid Overlay
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Vertical grid lines
    ctx.beginPath();
    ctx.moveTo(viewW / 3, 0);
    ctx.lineTo(viewW / 3, viewH);
    ctx.moveTo((2 * viewW) / 3, 0);
    ctx.lineTo((2 * viewW) / 3, viewH);

    // Horizontal grid lines
    ctx.moveTo(0, viewH / 3);
    ctx.lineTo(viewW, viewH / 3);
    ctx.moveTo(0, (2 * viewH) / 3);
    ctx.lineTo(viewW, (2 * viewH) / 3);
    ctx.stroke();

    // Viewfinder Corner Brackets
    ctx.setLineDash([]);
    ctx.strokeStyle = '#fab839';
    ctx.lineWidth = 2.5;
    const bracketSize = 16;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(10, 10 + bracketSize);
    ctx.lineTo(10, 10);
    ctx.lineTo(10 + bracketSize, 10);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(viewW - 10 - bracketSize, 10);
    ctx.lineTo(viewW - 10, 10);
    ctx.lineTo(viewW - 10, 10 + bracketSize);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(10, viewH - 10 - bracketSize);
    ctx.lineTo(10, viewH - 10);
    ctx.lineTo(10 + bracketSize, viewH - 10);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(viewW - 10 - bracketSize, viewH - 10);
    ctx.lineTo(viewW - 10, viewH - 10);
    ctx.lineTo(viewW - 10, viewH - 10 - bracketSize);
    ctx.stroke();

    ctx.restore();
  }, [imageElement, zoom, panX, panY]);

  useEffect(() => {
    drawViewfinder();
  }, [drawViewfinder]);

  // Pointer / Mouse / Touch Dragging Handlers
  const handlePointerDown = (clientX, clientY) => {
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: clientX, y: clientY };
    panStartRef.current = { panX, panY };
  };

  const handlePointerMove = (clientX, clientY) => {
    if (!isDraggingRef.current || !canvasRef.current || !imageElement) return;

    const deltaX = clientX - dragStartPosRef.current.x;
    const deltaY = clientY - dragStartPosRef.current.y;

    const canvas = canvasRef.current;
    // Scale delta according to canvas display dimensions
    const sensitivity = 2.0;
    const normDeltaX = (deltaX / canvas.clientWidth) * sensitivity;
    const normDeltaY = (deltaY / canvas.clientHeight) * sensitivity;

    // Moving mouse to the right pans image content left (shows what's on the left)
    setPanX(Math.max(-1, Math.min(1, panStartRef.current.panX - normDeltaX)));
    setPanY(Math.max(-1, Math.min(1, panStartRef.current.panY - normDeltaY)));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Zoom controls
  const handleZoomChange = (newZoom) => {
    setZoom(Math.max(1, Math.min(3, Number(newZoom) || 1)));
  };

  const handleZoomStep = (delta) => {
    soundEngine.playLeverClick?.();
    setZoom((prev) => Math.max(1, Math.min(3, Number((prev + delta).toFixed(2)))));
  };

  const handleResetCenter = () => {
    soundEngine.playLeverClick?.();
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.max(1, Math.min(3, Number((prev + delta).toFixed(2)))));
  };

  // Apply Crop Action
  const handleApplyCrop = useCallback(() => {
    if (!imageElement) return;
    soundEngine.playShutter?.();

    const cropSettings = { zoom, panX, panY };
    const croppedDataUrl = renderCroppedDataUrl(
      imageElement,
      cropSettings,
      DEFAULT_EXPORT_WIDTH,
      DEFAULT_EXPORT_HEIGHT
    );

    onApply?.(croppedDataUrl, cropSettings);
  }, [imageElement, zoom, panX, panY, onApply]);

  if (!isOpen || !photo) return null;

  return (
    <div className="crop-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="crop-modal-title">
      <div className="crop-modal-container">
        {/* Modal Header */}
        <div className="crop-modal-header">
          <div className="crop-modal-title-box">
            <span className="crop-star">✦</span>
            <h2 id="crop-modal-title" className="crop-modal-title">ADJUST 4:3 FRAMING</h2>
            <span className="crop-star">✦</span>
          </div>
          <button
            type="button"
            className="crop-modal-close-btn"
            onClick={onCancel}
            title="Cancel and close"
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="crop-modal-body">
          {isLoading ? (
            <div className="crop-loading-state">
              <span className="crop-spinner" />
              <p>Loading photograph...</p>
            </div>
          ) : loadError ? (
            <div className="crop-error-state">
              <p>⚠️ {loadError}</p>
              <button type="button" onClick={onCancel} className="crop-cancel-btn">
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Interactive 4:3 Viewfinder Canvas */}
              <div className="crop-viewfinder-wrapper">
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={420}
                  className="crop-viewfinder-canvas"
                  onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                  onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  onTouchMove={(e) => {
                    if (e.touches.length === 1) {
                      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  onTouchEnd={handlePointerUp}
                  onWheel={handleWheel}
                  title="Click and drag to pan • Scroll to zoom"
                />
                <div className="crop-aspect-badge">4:3 VINTAGE FORMAT</div>
              </div>

              {/* Viewfinder Instructions */}
              <p className="crop-instructions">
                Drag to reposition • Scroll or use the slider to zoom
              </p>

              {/* Controls Toolbar */}
              <div className="crop-controls-toolbar">
                <div className="crop-zoom-group">
                  <span className="crop-control-label">ZOOM</span>
                  <button
                    type="button"
                    className="crop-step-btn"
                    onClick={() => handleZoomStep(-0.2)}
                    disabled={zoom <= 1}
                    title="Zoom out"
                  >
                    −
                  </button>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => handleZoomChange(e.target.value)}
                    className="crop-zoom-slider"
                    aria-label="Zoom level"
                  />
                  <button
                    type="button"
                    className="crop-step-btn"
                    onClick={() => handleZoomStep(0.2)}
                    disabled={zoom >= 3}
                    title="Zoom in"
                  >
                    +
                  </button>
                  <span className="crop-zoom-val">{zoom.toFixed(1)}×</span>
                </div>

                <button
                  type="button"
                  className="crop-reset-btn"
                  onClick={handleResetCenter}
                  title="Reset zoom and center framing"
                >
                  ⟲ CENTER
                </button>
              </div>
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="crop-modal-footer">
          <button
            type="button"
            className="crop-cancel-btn"
            onClick={onCancel}
          >
            DISCARD
          </button>
          <button
            type="button"
            className="crop-apply-btn"
            onClick={handleApplyCrop}
            disabled={isLoading || !!loadError}
          >
            APPLY CROP
          </button>
        </div>
      </div>
    </div>
  );
}
