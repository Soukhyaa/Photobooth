// Vintage Photo Booth Film Filter Definitions
// Active selection simplified to TWO core filters:
// 1. Soft B&W
// 2. Golden Hour
// (Dreamy Digicam, Natural Glow, and Flash Pop are preserved in ALL_FILTERS for future use)

export const ALL_FILTERS = [
  {
    id: 'soft-bw',
    name: 'Soft B&W',
    subtitle: 'Light Monochrome & Faded Shadows',
    era: 'B&W',
    cssFilter: 'grayscale(1) contrast(1.06) brightness(1.1) sepia(0.04)',
    sampleColor: '#64748b'
  },
  {
    id: 'dreamy-digicam',
    name: 'Dreamy Digicam',
    subtitle: 'Analog Chromatin • Cool Lo-Fi Grain',
    era: 'Y2K',
    cssFilter: 'contrast(1.08) brightness(1.05) saturate(1.12) hue-rotate(-8deg)',
    sampleColor: '#818cf8',
    hasCustomOverlay: true
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    subtitle: 'Warm Sun-Kissed Amber Glow',
    era: 'SUN',
    cssFilter: 'sepia(0.34) saturate(1.32) brightness(1.06) contrast(1.08) hue-rotate(-12deg)',
    sampleColor: '#f59e0b'
  },
  {
    id: 'natural-glow',
    name: 'Natural Glow',
    subtitle: 'Dania Makeup • Rosy Flush & Gloss',
    era: 'GLOW',
    cssFilter: 'brightness(1.09) contrast(1.04) saturate(1.18) hue-rotate(2deg)',
    sampleColor: '#fb7185',
    hasCustomOverlay: true
  },
  {
    id: 'flash-pop',
    name: 'Flash Pop',
    subtitle: 'Bright 2000s Direct Party Flash',
    era: 'FLASH',
    cssFilter: 'contrast(1.24) brightness(1.14) saturate(1.22)',
    sampleColor: '#ec4899'
  }
];

// Active filters displayed in the UI:
export const RETRO_FILTERS = [
  ALL_FILTERS[0], // Soft B&W
  ALL_FILTERS[2]  // Golden Hour
];

export const DEFAULT_FILTER = RETRO_FILTERS[0];
