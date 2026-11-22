import React from 'react';

export default function LandingBooth({ onStepInside }) {
  return (
    <main className="landing-stage">
      {/* Warm Ambient Sconce Lighting */}
      <div className="ambient-glow-top" aria-hidden="true" />

      {/* The Physical Vintage Photo Booth Machine */}
      <div className="booth-physical-container">
        {/* Booth Crown: Prominent Marquee Sign at Top */}
        <div className="booth-roof">
          <div className="roof-trim-chrome" />

          <div className="marquee-box">
            <div className="marquee-chase-bulbs top-bulbs" aria-hidden="true">
              {[...Array(14)].map((_, i) => (
                <span key={`t-${i}`} className={`bulb bulb-${(i % 3) + 1}`} />
              ))}
            </div>

            <div className="marquee-face">
              <span className="marquee-star">✦</span>
              <h1 className="marquee-text">VINTAGE BOOTH</h1>
              <span className="marquee-star">✦</span>
            </div>

            <div className="marquee-chase-bulbs bottom-bulbs" aria-hidden="true">
              {[...Array(14)].map((_, i) => (
                <span key={`b-${i}`} className={`bulb bulb-${(i % 3) + 1}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Booth Main Cabinet: Two-Column Structure (Left: Controls & Slot, Right: Walk-In Doorway) */}
        <div className="booth-cabinet">
          {/* Chrome Corner Brackets */}
          <div className="chrome-bracket bracket-tl" aria-hidden="true" />
          <div className="chrome-bracket bracket-tr" aria-hidden="true" />
          <div className="chrome-bracket bracket-bl" aria-hidden="true" />
          <div className="chrome-bracket bracket-br" aria-hidden="true" />

          {/* LEFT SIDE: Upper-Left Instruction Panel & Lower-Left Collection Slot */}
          <aside className="booth-left-column">
            {/* Upper-Left: Instruction Panel */}
            <div className="booth-instruction-panel">
              <div className="vintage-plaque">
                <div className="plaque-header">
                  <span className="plaque-star">✦</span>
                  <span className="plaque-title">INSTRUCTIONS</span>
                  <span className="plaque-star">✦</span>
                </div>
                <ol className="plaque-steps">
                  <li>
                    <span className="step-num">1</span>
                    <span className="step-desc">Step inside & draw curtain</span>
                  </li>
                  <li>
                    <span className="step-num">2</span>
                    <span className="step-desc">Choose your film style</span>
                  </li>
                  <li>
                    <span className="step-num">3</span>
                    <span className="step-desc">Strike poses</span>
                  </li>
                  <li>
                    <span className="step-num">4</span>
                    <span className="step-desc">Collect photo strip below</span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Lower-Left: Photo Strip Collection Slot */}
            <div className="booth-collection-slot-module">
              <div className="collection-slot-header">
                <span className="slot-glow-lamp" aria-hidden="true" />
                <span className="collection-slot-label">COLLECT YOUR STRIPS</span>
                <span className="slot-glow-lamp" aria-hidden="true" />
              </div>

              <div className="dispense-slot-housing">
                <div className="chrome-slot-rim">
                  <span className="slot-emboss">PHOTOS</span>
                  <div className="slot-opening">
                    <div className="slot-shadow" />
                    {/* Realistic peek of a photo strip edge resting in tray */}
                    <div className="slot-sample-strip-peek" aria-hidden="true">
                      <div className="peek-strip-paper">
                        <span className="peek-strip-dot" />
                        <span className="peek-strip-dot" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="collection-tray-lip">
                  <span className="tray-label">COLLECT HERE</span>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT SIDE: Walk-In Doorway with Hanging Velvet Curtain */}
          <section className="booth-doorway-column" aria-label="Photo booth walk-in entrance">
            <div className="doorway-frame">
              {/* Brass Curtain Rail & Hanging Rings */}
              <div className="curtain-brass-rail" aria-hidden="true">
                <div className="rail-bracket bracket-left" />
                <div className="rail-rod">
                  {[...Array(8)].map((_, i) => (
                    <span key={`ring-${i}`} className="rail-ring" />
                  ))}
                </div>
                <div className="rail-bracket bracket-right" />
              </div>

              {/* Interior Peeking Glow through Doorway */}
              <div className="doorway-interior-view" aria-hidden="true">
                <div className="interior-mirror-glow" />
                <div className="interior-stool" />
                <div className="interior-back-wall" />
              </div>

              {/* Hanging Velvet Curtain with Rich Folds & Pleats */}
              <div className="doorway-velvet-curtain" aria-hidden="true">
                {/* Upper Curtain Valance */}
                <div className="curtain-top-drape" />

                {/* Left Velvet Drape */}
                <div className="doorway-curtain drape-left">
                  <div className="fabric-fold f1" />
                  <div className="fabric-fold f2" />
                  <div className="fabric-fold f3" />
                  <div className="fabric-fold f4" />
                </div>

                {/* Right Velvet Drape */}
                <div className="doorway-curtain drape-right">
                  <div className="fabric-fold f1" />
                  <div className="fabric-fold f2" />
                  <div className="fabric-fold f3" />
                  <div className="fabric-fold f4" />
                </div>

                {/* Golden Fringe along curtain hem */}
                <div className="curtain-bottom-fringe" />
              </div>

              {/* Interactive Step Inside Arcade Push-Button */}
              <div className="doorway-action-zone">
                <button
                  type="button"
                  className="step-inside-btn"
                  onClick={onStepInside}
                  aria-label="Step inside the photo booth"
                >
                  <div className="btn-bulb-ring" />
                  <div className="btn-inner">
                    <span className="btn-icon">🎟️</span>
                    <span className="btn-text">STEP INSIDE</span>
                    <span className="btn-subtext">CLICK TO ENTER</span>
                  </div>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Booth Floor Base & Kickplate */}
        <div className="booth-base-footer">
          <div className="kickplate-chrome" />
        </div>
      </div>

      {/* Arcade Parlor Floor Wainscoting / Shadow */}
      <div className="parlor-floor">
        <div className="floor-wood-line" />
        <div className="floor-perspective-shadow" />
      </div>
    </main>
  );
}
