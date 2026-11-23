import React from 'react';

export default function HeaderBar({
  isMuted,
  onToggleMute,
  onOpenMemories,
  onOpenPoses,
  currentStage = 'landing',
  onOpenStudio,
  onReturnToBooth
}) {
  return (
    <header className="retro-header">
      <div className="header-brand">
        <span className="brand-star">★</span>
        <span className="brand-title">THE VINTAGE BOOTH</span>
        <span className="brand-star">★</span>
      </div>

      <div className="header-actions">
        {/* Navigation between Photo Booth & Create Strip Studio */}
        {currentStage === 'studio' ? (
          onReturnToBooth && (
            <button
              type="button"
              onClick={onReturnToBooth}
              className="header-studio-btn"
              title="Return to Photo Booth"
              aria-label="Return to Photo Booth"
            >
              <span className="studio-icon">📷</span>
              <span className="studio-label">PHOTO BOOTH</span>
            </button>
          )
        ) : (
          onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="header-studio-btn"
              title="Create a Strip from device photos"
              aria-label="Create a Strip"
            >
              <span className="studio-icon">🎞️</span>
              <span className="studio-label">CREATE A STRIP</span>
            </button>
          )
        )}

        {/* Pose Inspiration Lookbook */}
        {onOpenPoses && (
          <button
            type="button"
            onClick={onOpenPoses}
            className="header-poses-btn"
            title="Browse Pose Inspiration & 4-Shot Challenges"
            aria-label="Browse Pose Inspiration"
          >
            <span className="poses-icon">💡</span>
            <span className="poses-label">POSES</span>
          </button>
        )}

        {/* My Memories Album */}
        {onOpenMemories && (
          <button
            type="button"
            onClick={onOpenMemories}
            className="header-memories-btn"
            title="Open My Memories Album"
            aria-label="Open My Memories Album"
          >
            <span className="memories-icon">📖</span>
            <span className="memories-label">MY MEMORIES</span>
          </button>
        )}

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          className={`sound-toggle-btn ${isMuted ? 'muted' : ''}`}
          title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
        >
          <span className="sound-icon">{isMuted ? '🔇' : '🔊'}</span>
          <span className="sound-label">{isMuted ? 'SOUND OFF' : 'SOUND ON'}</span>
        </button>
      </div>
    </header>
  );
}
