import React from 'react';

export default function LandingBooth({ onStepInside }) {
  return (
    <main className="landing-stage">
      {/* Warm Ambient Sconce Lighting */}
      <div className="ambient-glow-top"></div>
      
      {/* Retro Venue Wall & Header Placard */}
      <div className="parlor-wall-accent">
        <div className="wall-crest">
          <span className="crest-line"></span>
          <span className="crest-text">ARCADE ATTRACTIONS • NO. 44</span>
          <span className="crest-line"></span>
        </div>
      </div>

      {/* The Physical Vintage Booth */}
      <div className="booth-physical-container">
        {/* Booth Crown / Roof Header with Marquee */}
        <div className="booth-roof">
          <div className="roof-trim-chrome"></div>
          
          <div className="marquee-box">
            <div className="marquee-chase-bulbs top-bulbs">
              {[...Array(12)].map((_, i) => (
                <span key={`t-${i}`} className={`bulb bulb-${(i % 3) + 1}`}></span>
              ))}
            </div>

            <div className="marquee-face">
              <span className="marquee-star">✦</span>
              <h1 className="marquee-text">PHOTO BOOTH</h1>
              <span className="marquee-star">✦</span>
            </div>

            <div className="marquee-chase-bulbs bottom-bulbs">
              {[...Array(12)].map((_, i) => (
                <span key={`b-${i}`} className={`bulb bulb-${(i % 3) + 1}`}></span>
              ))}
            </div>
          </div>
        </div>

        {/* Booth Main Body (Deep Cherry Lacquer Finish) */}
        <div className="booth-cabinet">
          {/* Chrome Corner Rivets & Hardware */}
          <div className="chrome-bracket bracket-tl"></div>
          <div className="chrome-bracket bracket-tr"></div>
          <div className="chrome-bracket bracket-bl"></div>
          <div className="chrome-bracket bracket-br"></div>

          {/* Left Panel: Vintage Instructions & Mechanical Coin Slot */}
          <aside className="booth-side-panel">
            <div className="vintage-plaque">
              <div className="plaque-header">INSTRUCTIONS</div>
              <ol className="plaque-steps">
                <li><span>1</span> Step inside & pull curtain</li>
                <li><span>2</span> Select your favorite film style</li>
                <li><span>3</span> 4 automated flashes</li>
                <li><span>4</span> Collect strip from lower slot</li>
              </ol>
              <div className="plaque-footer">AUTOMATIC • DRY IN SECONDS</div>
            </div>

            <div className="coin-slot-assembly">
              <div className="coin-plate">
                <span className="coin-label">INSERT COIN</span>
                <div className="coin-slit"></div>
                <span className="coin-denom">25¢ ONLY</span>
              </div>
            </div>
          </aside>

          {/* Center: Booth Doorway with Velvet Drapes */}
          <section className="booth-doorway" aria-label="Photo booth entrance">
            {/* Interior Peeking Glow */}
            <div className="doorway-interior-view">
              <div className="interior-stool"></div>
              <div className="interior-mirror-glow"></div>
              <div className="interior-back-wall"></div>
            </div>

            {/* Draped Curtains in doorway */}
            <div className="doorway-curtain drape-left">
              <div className="fabric-fold f1"></div>
              <div className="fabric-fold f2"></div>
              <div className="fabric-fold f3"></div>
            </div>
            <div className="doorway-curtain drape-right">
              <div className="fabric-fold f1"></div>
              <div className="fabric-fold f2"></div>
              <div className="fabric-fold f3"></div>
            </div>

            {/* Step Inside Floating Action */}
            <div className="doorway-action-zone">
              <button
                type="button"
                className="step-inside-btn"
                onClick={onStepInside}
                aria-label="Step inside the photo booth"
              >
                <div className="btn-bulb-ring"></div>
                <div className="btn-inner">
                  <span className="btn-icon">🎟️</span>
                  <span className="btn-text">STEP INSIDE</span>
                  <span className="btn-subtext">CLICK TO ENTER</span>
                </div>
              </button>
            </div>
          </section>

          {/* Right Panel: Feature Badges & Photo Dispenser Preview */}
          <aside className="booth-dispenser-panel">
            <div className="feature-badge-plate">
              <div className="badge-vintage-star">★ ★ ★</div>
              <div className="badge-title">INSTANT PRINT</div>
              <div className="badge-subtitle">GENUINE PHOTO PAPER FINISH</div>
            </div>

            {/* Dispensing Slot (Preview for Stage 5) */}
            <div className="dispense-slot-housing">
              <div className="chrome-slot-rim">
                <span className="slot-emboss">PHOTOS</span>
                <div className="slot-opening">
                  <div className="slot-shadow"></div>
                </div>
              </div>
              <div className="collection-tray-lip">
                <span className="tray-label">COLLECT HERE</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Booth Floor Base & Shadow */}
        <div className="booth-base-footer">
          <div className="kickplate-chrome"></div>
        </div>
      </div>

      {/* Arcade Parlor Floor Wainscoting / Shadow */}
      <div className="parlor-floor">
        <div className="floor-wood-line"></div>
        <div className="floor-perspective-shadow"></div>
      </div>
    </main>
  );
}
