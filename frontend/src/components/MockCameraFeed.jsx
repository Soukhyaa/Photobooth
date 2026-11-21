import React from 'react';

/**
 * Animated vintage silhouette feed used when camera is unavailable,
 * denied, or explicitly switched to Test Mode.
 */
export default function MockCameraFeed({ activeFilter }) {
  return (
    <div className="mock-feed-container" style={{ filter: activeFilter.cssFilter }}>
      <div className="mock-backdrop">
        <div className="mock-curtain-bg"></div>
      </div>

      <div className="mock-portrait-wrapper">
        <svg
          className="mock-silhouette"
          viewBox="0 0 240 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Head & Hair */}
          <path
            d="M70 120 C 70 65, 170 65, 170 120 C 170 160, 150 180, 120 185 C 90 180, 70 160, 70 120 Z"
            fill="#3a1c14"
          />
          {/* Face */}
          <ellipse cx="120" cy="130" rx="38" ry="46" fill="#f5d6ba" />
          {/* Retro Sunglasses / Specs */}
          <rect x="94" y="118" width="22" height="15" rx="5" fill="#1f2937" />
          <rect x="124" y="118" width="22" height="15" rx="5" fill="#1f2937" />
          <line x1="116" y1="124" x2="124" y2="124" stroke="#1f2937" strokeWidth="2.5" />
          {/* Smile */}
          <path
            d="M108 152 Q 120 162 132 152"
            stroke="#b91c1c"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          {/* Shoulders / Retro Jacket */}
          <path
            d="M40 250 C 45 200, 80 190, 120 190 C 160 190, 195 200, 200 250 Z"
            fill="#701426"
          />
          <path
            d="M105 190 L 120 220 L 135 190 Z"
            fill="#fab839"
          />
        </svg>

        <div className="mock-test-tag">
          <span>TEST MODE • MOCK FEED</span>
        </div>
      </div>
    </div>
  );
}
