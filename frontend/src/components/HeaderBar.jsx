import React from 'react';

export default function HeaderBar({ isMuted, onToggleMute, onOpenMemories }) {
  return (
    <header className="retro-header">
      <div className="header-brand">
        <span className="brand-star">★</span>
        <span className="brand-title">THE VINTAGE BOOTH</span>
        <span className="brand-star">★</span>
      </div>

      <div className="header-actions">
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
