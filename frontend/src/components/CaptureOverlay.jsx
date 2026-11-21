import React from 'react';

/**
 * Capture Overlay:
 * - Unobstructed camera mirror view (no pose text or captions covering the screen).
 * - Small, subtle, elegant countdown badge placed in the top-right corner.
 * - Minimal top progress tracker and cancel control.
 * - Camera flash animation.
 */
export default function CaptureOverlay({
  currentPhotoIndex,
  countdownValue,
  isFlashing,
  onCancel
}) {
  return (
    <div className="capture-overlay-layer">
      {/* 1. Camera Flash Screen */}
      <div className={`camera-flash-screen ${isFlashing ? 'flashing' : ''}`} />

      {/* 2. Top HUD Bar with Progress & Top-Right Subtle Countdown */}
      <div className="capture-top-hud">
        {/* Step Indicator */}
        <div className="capture-step-badge">
          <span className="step-glow-dot"></span>
          <span>PHOTO {currentPhotoIndex} OF 4</span>
        </div>

        {/* 4-Slot Progress Tracker */}
        <div className="capture-slots-indicator">
          {[1, 2, 3, 4].map((slotNum) => {
            const isDone = slotNum < currentPhotoIndex;
            const isCurrent = slotNum === currentPhotoIndex;
            return (
              <div
                key={slotNum}
                className={`slot-dot ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                title={`Photo ${slotNum} of 4`}
              >
                {isDone ? '✓' : slotNum}
              </div>
            );
          })}
        </div>

        {/* Right Corner Group: Subtle Countdown & Cancel */}
        <div className="capture-top-right-group">
          {countdownValue > 0 && !isFlashing && (
            <div className="subtle-corner-countdown" key={`cd-${countdownValue}-${currentPhotoIndex}`}>
              <span className="countdown-label">READY</span>
              <span className="countdown-num">{countdownValue}</span>
            </div>
          )}

          <button
            type="button"
            className="capture-cancel-btn"
            onClick={onCancel}
            aria-label="Cancel photo capture session"
          >
            <span>✕ CANCEL</span>
          </button>
        </div>
      </div>
    </div>
  );
}
