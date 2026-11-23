import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  POSE_CATEGORIES,
  POSE_VIBES,
  POSE_LIBRARY,
  FOUR_SHOT_CHALLENGES,
  getPoseById
} from '../data/poseLibrary';
import { soundEngine } from '../utils/audio';

export default function PoseInspirationModal({
  isOpen,
  onClose,
  selectedSequenceId = null,
  onSelectSequence,
  onStepInside
}) {
  // Navigation State
  const [activeTab, setActiveTab] = useState('solo'); // 'solo' | 'couples' | 'groups'
  const [viewMode, setViewMode] = useState('challenges'); // 'challenges' | 'poses'
  const [activeVibe, setActiveVibe] = useState('all');
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
    soundEngine.playLeverClick?.();
    setActiveTab(category);
    setActiveVibe('all');
    setInspectedPose(null);
  };

  // View mode toggle
  const handleViewModeToggle = (mode) => {
    soundEngine.playLeverClick?.();
    setViewMode(mode);
    setInspectedPose(null);
  };

  // Vibe filter
  const handleVibeChange = (vibe) => {
    soundEngine.playLeverClick?.();
    setActiveVibe(vibe);
  };

  // Sequence selection toggle
  const handleToggleSequence = useCallback((seq) => {
    soundEngine.playLeverClick?.();
    if (selectedSequenceId === seq.id) {
      onSelectSequence?.(null);
    } else {
      onSelectSequence?.(seq);
    }
  }, [selectedSequenceId, onSelectSequence]);

  // Filtered poses
  const filteredPoses = useMemo(() => {
    return POSE_LIBRARY.filter((pose) => {
      if (pose.category !== activeTab) return false;
      if (activeVibe !== 'all' && pose.vibe !== activeVibe) return false;
      return true;
    });
  }, [activeTab, activeVibe]);

  // Filtered challenges for current category
  const currentChallenges = useMemo(() => {
    return FOUR_SHOT_CHALLENGES.filter((c) => c.category === activeTab);
  }, [activeTab]);

  // Total count of poses in active category
  const categoryPosesCount = useMemo(() => {
    return POSE_LIBRARY.filter((p) => p.category === activeTab).length;
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
          <div className="pose-header-left">
            <span className="pose-vintage-badge">EST. 1974</span>
          </div>

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

        {/* Subtitle Banner */}
        <div className="pose-modal-banner">
          <p className="pose-banner-text">
            Curated posing inspiration & four-shot strip challenges • Browse freely before entering the booth
          </p>
        </div>

        {/* Main Navigation Toolbar */}
        <div className="pose-nav-toolbar">
          {/* Category Tabs: SOLO | COUPLES | FRIENDS & GROUPS */}
          <div className="pose-category-tabs" role="tablist" aria-label="Pose Categories">
            {POSE_CATEGORIES.map((cat) => {
              const isActive = activeTab === cat.id;
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
                    <span className="pose-cat-sub">{cat.label} ({POSE_LIBRARY.filter((p) => p.category === cat.id).length})</span>
                  </div>
                  {isActive && <span className="pose-cat-active-indicator" />}
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: 4-Shot Challenges vs Individual Poses */}
          <div className="pose-view-mode-toggle" role="group" aria-label="Lookbook View Mode">
            <button
              type="button"
              className={`pose-mode-btn ${viewMode === 'challenges' ? 'active' : ''}`}
              onClick={() => handleViewModeToggle('challenges')}
            >
              <span className="mode-btn-icon">🎞️</span>
              <span>4-SHOT CHALLENGES</span>
            </button>
            <button
              type="button"
              className={`pose-mode-btn ${viewMode === 'poses' ? 'active' : ''}`}
              onClick={() => handleViewModeToggle('poses')}
            >
              <span className="mode-btn-icon">📸</span>
              <span>INDIVIDUAL POSES ({categoryPosesCount})</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="pose-modal-scroll-body">
          {/* ================= VIEW 1: FOUR-SHOT STRIP CHALLENGES ================= */}
          {viewMode === 'challenges' && (
            <div className="challenges-view-section">
              <div className="challenges-section-header">
                <div className="challenges-header-text">
                  <span className="sec-step-pill">STRIP STORYLINES</span>
                  <h3 className="challenges-sec-title">
                    Four-Shot Sequence Challenges ({activeTab.toUpperCase()})
                  </h3>
                  <p className="challenges-sec-desc">
                    Follow an authentic four-frame story for your vintage strip. You can mark a sequence to remember it, or simply browse for ideas!
                  </p>
                </div>
              </div>

              <div className="challenges-cards-list">
                {currentChallenges.map((challenge) => {
                  const isSelected = selectedSequenceId === challenge.id;
                  return (
                    <article
                      key={challenge.id}
                      className={`challenge-card ${isSelected ? 'is-selected' : ''}`}
                    >
                      {/* Challenge Card Header */}
                      <div className="challenge-card-top">
                        <div className="challenge-meta-block">
                          <div className="challenge-badge-row">
                            <span className="challenge-pill">4-SHOT SEQUENCE</span>
                            <span className="challenge-cat-tag">{activeTab.toUpperCase()}</span>
                            {isSelected && (
                              <span className="challenge-selected-tag">★ SELECTED SEQUENCE</span>
                            )}
                          </div>
                          <h4 className="challenge-title">{challenge.title}</h4>
                          <span className="challenge-subtitle">{challenge.subtitle}</span>
                          <p className="challenge-desc">{challenge.description}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="challenge-actions">
                          <button
                            type="button"
                            className={`challenge-select-btn ${isSelected ? 'active' : ''}`}
                            onClick={() => handleToggleSequence(challenge)}
                          >
                            {isSelected ? '✓ SEQUENCE SELECTED' : '★ SELECT SEQUENCE'}
                          </button>
                          {onStepInside && (
                            <button
                              type="button"
                              className="challenge-enter-booth-btn"
                              onClick={() => {
                                handleToggleSequence(challenge);
                                onClose?.();
                                onStepInside?.();
                              }}
                              title="Step inside the photo booth with this sequence"
                            >
                              ENTER BOOTH ▶
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Four-Shot Timeline Ribbon */}
                      <div className="challenge-shots-ribbon">
                        {challenge.shots.map((shot) => {
                          const poseData = getPoseById(shot.poseId);
                          return (
                            <div key={`shot-${shot.step}`} className="ribbon-shot-step">
                              <div className="shot-step-header">
                                <span className="shot-step-badge">SHOT #{shot.step}</span>
                              </div>

                              <div
                                className="shot-art-box"
                                onClick={() => poseData && setInspectedPose(poseData)}
                                title="Click to view full pose details"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    poseData && setInspectedPose(poseData);
                                  }
                                }}
                              >
                                {poseData?.image ? (
                                  <img
                                    src={poseData.image}
                                    alt={shot.title}
                                    className="ribbon-photo-img"
                                    loading="lazy"
                                  />
                                ) : poseData?.svg ? (
                                  <div
                                    className="ribbon-svg-preview"
                                    dangerouslySetInnerHTML={{ __html: poseData.svg }}
                                  />
                                ) : (
                                  <div className="ribbon-placeholder">📸</div>
                                )}
                                <span className="ribbon-zoom-hint">🔍 VIEW</span>
                              </div>

                              <div className="shot-step-info">
                                <span className="shot-step-title">{shot.title}</span>
                                <span className="shot-step-cue">{shot.cue}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= VIEW 2: INDIVIDUAL POSES ================= */}
          {viewMode === 'poses' && (
            <div className="poses-view-section">
              {/* Vibe Filter Pills */}
              <div className="vibe-filters-row" role="radiogroup" aria-label="Pose Vibe Filter">
                <span className="vibe-filter-label">FILTER BY VIBE:</span>
                {POSE_VIBES.map((vibe) => (
                  <button
                    key={vibe.id}
                    type="button"
                    className={`vibe-pill ${activeVibe === vibe.id ? 'active' : ''}`}
                    onClick={() => handleVibeChange(vibe.id)}
                    role="radio"
                    aria-checked={activeVibe === vibe.id}
                  >
                    {vibe.label}
                  </button>
                ))}
              </div>

              {/* Pose Cards Grid */}
              <div className="poses-grid" role="list">
                {filteredPoses.map((pose) => (
                  <article
                    key={pose.id}
                    className="pose-grid-card"
                    role="listitem"
                    onClick={() => setInspectedPose(pose)}
                  >
                    {/* Visual Art Preview */}
                    <div className="pose-card-art-frame">
                      {pose.image ? (
                        <img
                          src={pose.image}
                          alt={pose.title}
                          className="pose-card-photo-img"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="pose-card-svg-wrap"
                          dangerouslySetInnerHTML={{ __html: pose.svg }}
                        />
                      )}
                      <span className="pose-card-vibe-badge">{pose.vibeLabel}</span>
                    </div>

                    {/* Card Content */}
                    <div className="pose-card-body">
                      <div className="pose-card-meta">
                        <span className="pose-card-cat-tag">{pose.category.toUpperCase()}</span>
                      </div>
                      <h4 className="pose-card-title">{pose.title}</h4>
                      <p className="pose-card-tagline">{pose.tagline}</p>
                      <p className="pose-card-instruction">{pose.instruction}</p>

                      <div className="pose-card-footer">
                        <span className="pose-pro-tip-tag">PRO TIP:</span>
                        <span className="pose-pro-tip-text">{pose.proTip}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Inspector Modal (when clicking a pose to magnify) */}
        {inspectedPose && (
          <div
            className="pose-inspector-backdrop"
            onClick={() => setInspectedPose(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspector-title"
          >
            <div
              className="pose-inspector-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="inspector-header">
                <div className="inspector-title-group">
                  <span className="inspector-cat-badge">{inspectedPose.category.toUpperCase()}</span>
                  <h3 id="inspector-title" className="inspector-title">
                    {inspectedPose.title}
                  </h3>
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
                <div className="inspector-art-col">
                  {inspectedPose.image ? (
                    <div className="inspector-photo-container">
                      <img
                        src={inspectedPose.image}
                        alt={inspectedPose.title}
                        className="inspector-photo-img"
                      />
                    </div>
                  ) : (
                    <div
                      className="inspector-svg-container"
                      dangerouslySetInnerHTML={{ __html: inspectedPose.svg }}
                    />
                  )}
                  <span className="inspector-vibe-pill">{inspectedPose.vibeLabel}</span>
                </div>

                <div className="inspector-info-col">
                  <span className="inspector-tagline">“{inspectedPose.tagline}”</span>

                  <div className="inspector-instruction-box">
                    <span className="instruction-box-label">HOW TO STRIKE THIS POSE:</span>
                    <p className="instruction-box-text">{inspectedPose.instruction}</p>
                  </div>

                  <div className="inspector-tip-box">
                    <span className="tip-box-label">📸 PHOTOGRAPHER'S TIP:</span>
                    <p className="tip-box-text">{inspectedPose.proTip}</p>
                  </div>

                  <div className="inspector-footer-actions">
                    <button
                      type="button"
                      className="inspector-done-btn"
                      onClick={() => setInspectedPose(null)}
                    >
                      GOT IT!
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lookbook Bottom Footer */}
        <footer className="pose-modal-footer">
          <div className="pose-footer-status">
            {selectedSequenceId ? (
              <span className="footer-sequence-active">
                ★ Active Sequence: <strong>{FOUR_SHOT_CHALLENGES.find((c) => c.id === selectedSequenceId)?.title}</strong>
              </span>
            ) : (
              <span className="footer-sequence-none">
                No sequence selected • Select one above or pose freestyle!
              </span>
            )}
          </div>

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
