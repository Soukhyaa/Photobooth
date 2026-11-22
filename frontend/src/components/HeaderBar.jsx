import React from 'react';

export default function HeaderBar({ isMuted, onToggleMute }) {
  return (
    <header className="retro-header">
      <div className="header-brand">
        <span className="brand-star">★</span>
        <span className="brand-title">THE VINTAGE BOOTH</span>
        <span className="brand-star">★</span>
      </div>

      <div className="header-actions">
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
