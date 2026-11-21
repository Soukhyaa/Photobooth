import React from 'react';

/**
 * Visual Lens Overlay Component
 * Accurately recreates:
 * 1. Filter 2 (Dreamy Digicam) -> Analog Chromatin by Hitesh
 *    - Pronounced analog film grain
 *    - Distinctive red-blue chromatic shifts (RGB chromatic fringing)
 *    - Cool bluish/lavender tones & VHS lo-fi scanline texture
 *    - Lifted shadows & dreamy analog vignette
 * 
 * 2. Filter 4 (Natural Glow) -> Natural Makeup by Dania
 *    - Fresh bright complexion with light skin smoothing
 *    - Soft naturally blended rosy-peach blush across cheeks & nose bridge
 *    - Natural pink glossy lips with specular shine highlight
 *    - Gentle sun-kissed warmth & healthy dewy glow
 */
export default function FilterOverlay({ activeFilter }) {
  if (!activeFilter || !activeFilter.hasCustomOverlay) {
    return null;
  }

  // 1. Analog Chromatin by Hitesh (Dreamy Digicam)
  if (activeFilter.id === 'dreamy-digicam') {
    return (
      <div className="filter-live-overlay analog-chromatin-overlay" aria-hidden="true">
        {/* Cool, bluish analog tone wash */}
        <div className="chromatin-cool-wash" />
        
        {/* Red-Blue Chromatic Color Fringe Shifter */}
        <div className="chromatin-rgb-split">
          <div className="chromatic-channel channel-red" />
          <div className="chromatic-channel channel-cyan" />
        </div>

        {/* Retro Lo-Fi & VHS Interlace Texture */}
        <div className="chromatin-vhs-scanlines" />

        {/* Pronounced Analog Film Grain */}
        <div className="chromatin-analog-grain" />

        {/* Lifted Lo-Fi Blacks / Faded Shadows */}
        <div className="chromatin-shadow-lift" />

        {/* Soft Dreamy Vignette */}
        <div className="chromatin-dreamy-vignette" />
      </div>
    );
  }

  // 2. Natural Makeup by Dania (Natural Glow)
  if (activeFilter.id === 'natural-glow') {
    return (
      <div className="filter-live-overlay dania-makeup-overlay" aria-hidden="true">
        {/* Fresh, bright complexion diffusion & sun-kissed warmth */}
        <div className="dania-luminous-base" />
        <div className="dania-sunkissed-warmth" />

        {/* Naturally blended rosy blush: Left Apple, Right Apple & Nose Bridge */}
        <div className="dania-blush-left" />
        <div className="dania-blush-right" />
        <div className="dania-blush-nose-bridge" />

        {/* Subtle Pink Lips + Glossy Specular Shine */}
        <div className="dania-lip-tint" />
        <div className="dania-lip-gloss-shine" />

        {/* Dewy Cheekbone & Forehead Glow */}
        <div className="dania-dewy-glow-left" />
        <div className="dania-dewy-glow-right" />
        <div className="dania-dewy-forehead" />
      </div>
    );
  }

  return null;
}
