import React, { useState, useEffect, useMemo } from 'react';
import { POSE_CATEGORIES, POSE_LIBRARY } from '../data/poseLibrary';

export default function PoseInspirationModal({
  isOpen,
  onClose,
  onStepInside
}) {
  // Navigation State: 'solo' | 'couples' | 'groups'
  const [activeTab, setActiveTab] = useState('solo');
  const [inspectedPose, setInspectedPose] = useState(null);

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (inspectedPose) {
          setInspectedPose(null);
        } else {
          onClose?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inspectedPose, onClose]);

  // Tab switch handler
  const handleTabChange = (category) => {
    setActiveTab(category);
    setInspectedPose(null);
  };

  // Poses for the active category
  const currentCategoryPoses = useMemo(() => {
    return POSE_LIBRARY.filter((pose) => pose.category === activeTab);
  }, [activeTab]);

  if (!isOpen) return null;

  return (
    <div
      className="pose-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pose-modal-headline"
    >
      <div className="pose-modal-window">
        {/* Vintage Marquee Header */}
        <header className="pose-modal-header">
          <div className="pose-header-left"></div>

          <div className="pose-header-center">
            <span className="pose-marquee-star">✦</span>
            <h2 id="pose-modal-headline" className="pose-modal-title">
              THE VINTAGE POSE LOOKBOOK
            </h2>
            <span className="pose-marquee-star">✦</span>
          </div>

          <div className="pose-header-right">
            <button
              type="button"
              className="pose-close-btn"
              onClick={onClose}
              title="Close Lookbook (Esc)"
              aria-label="Close Lookbook"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Category Tabs: SOLO | COUPLES | FRIENDS */}
        <div className="pose-nav-toolbar">
          <div className="pose-category-tabs" role="tablist" aria-label="Pose Categories">
            {POSE_CATEGORIES.map((cat) => {
              const isActive = activeTab === cat.id;
              const count = POSE_LIBRARY.filter((p) => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`pose-cat-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleTabChange(cat.id)}
                >
                  <span className="pose-cat-icon">{cat.icon}</span>
                  <div className="pose-cat-labels">
                    <span className="pose-cat-name">{cat.name}</span>
                    <span className="pose-cat-sub">({count})</span>
                  </div>
                  {isActive && <span className="pose-cat-active-indicator" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Content Area: Pure Photo Gallery */}
        <div className="pose-modal-scroll-body">
          <div className="poses-view-section">
            <div className="poses-grid" role="list">
              {currentCategoryPoses.map((pose) => (
                <article
                  key={pose.id}
                  className="pose-grid-card"
                  role="listitem"
                  onClick={() => setInspectedPose(pose)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setInspectedPose(pose);
                    }
                  }}
                  title="Click to view photograph & tip"
                >
                  <div className="pose-card-art-frame">
                    {pose.image ? (
                      <img
                        src={pose.image}
                        alt="Pose reference"
                        className="pose-card-photo-img"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="pose-card-svg-wrap"
                        dangerouslySetInnerHTML={{ __html: pose.svg }}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Individual Photo Viewer (when clicking a photograph) */}
        {inspectedPose && (
          <div
            className="pose-inspector-backdrop"
            onClick={() => setInspectedPose(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspector-tip-title"
          >
            <div
              className="pose-inspector-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inspector-header">
                <div className="inspector-title-group">
                  <span className="inspector-cat-badge">
                    {inspectedPose.category === 'groups' ? 'FRIENDS' : inspectedPose.category.toUpperCase()}
                  </span>
                </div>
                <button
                  type="button"
                  className="inspector-close-btn"
                  onClick={() => setInspectedPose(null)}
                  title="Close inspector"
                  aria-label="Close inspector"
                >
                  ✕
                </button>
              </div>

              <div className="inspector-body">
                {/* Left side: Show the selected photograph in its larger view */}
                <div className="inspector-art-col">
                  {inspectedPose.image ? (
                    <div className="inspector-photo-container">
                      <img
                        src={inspectedPose.image}
                        alt="Pose reference photograph"
                        className="inspector-photo-img"
                      />
                    </div>
                  ) : (
                    <div
                      className="inspector-svg-container"
                      dangerouslySetInnerHTML={{ __html: inspectedPose.svg }}
                    />
                  )}
                </div>

                {/* Right side: Show only the short photography tip associated with that photograph */}
                <div className="inspector-info-col">
                  <div className="inspector-tip-box">
                    <span id="inspector-tip-title" className="tip-box-label">📸 PHOTOGRAPHY TIP:</span>
                    <p className="tip-box-text">{inspectedPose.proTip}</p>
                  </div>

                  <div className="inspector-footer-actions">
                    <button
                      type="button"
                      className="inspector-done-btn"
                      onClick={() => setInspectedPose(null)}
                    >
                      GOT IT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lookbook Bottom Footer */}
        <footer className="pose-modal-footer">
          <div className="pose-footer-status"></div>

          <div className="pose-footer-actions">
            <button
              type="button"
              className="pose-footer-close-btn"
              onClick={onClose}
            >
              CLOSE LOOKBOOK
            </button>
            {onStepInside && (
              <button
                type="button"
                className="pose-footer-enter-btn"
                onClick={() => {
                  onClose?.();
                  onStepInside?.();
                }}
              >
                ENTER BOOTH ▶
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
