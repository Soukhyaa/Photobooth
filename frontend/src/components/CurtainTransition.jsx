import React from 'react';

export default function CurtainTransition({ isOpen, onExited }) {
  return (
    <div
      className={`curtain-transition-overlay ${isOpen ? 'open' : 'closed'}`}
      onTransitionEnd={(e) => {
        if (e.propertyName === 'transform' && onExited) {
          onExited();
        }
      }}
      aria-hidden="true"
    >
      <div className="curtain-panel curtain-left">
        <div className="curtain-pleats"></div>
        <div className="curtain-gold-trim"></div>
      </div>
      <div className="curtain-panel curtain-right">
        <div className="curtain-pleats"></div>
        <div className="curtain-gold-trim"></div>
      </div>
    </div>
  );
}
