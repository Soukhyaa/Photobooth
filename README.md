# 🎞️ Vintage Booth – Interactive Retro Photo Booth

An immersive, nostalgic retro arcade photo booth web application that recreates the authentic physical experience of stepping into a vintage photo booth.

Built with **React 19 + Vite + Plain CSS** and synthesized **Web Audio API** sound effects — running entirely in-browser with zero server-side photo persistence.

---

## ✨ Features

- **Vintage Arcade Aesthetic**: Authentic visual direction using a deep cherry lacquer cabinet, warm cream parlor walls, cheerful mustard yellow highlights, and polished chrome hardware accents.
- **Synthesized Acoustic & Mechanical Sound Engine**: Procedurally generated audio via Web Audio API:
  - Gentle velvet curtain sliding and rustling
  - Warm retro electronic countdown beeps
  - Dual-leaf mechanical camera shutter snap with flash capacitor whisper
  - Gentle motor gear whirr and soft paper tray drop
  - Working audio mute toggle
- **Curated Film Emulsions**:
  - **Soft B&W**: Light black-and-white with gentle contrast and faded shadows.
  - **Golden Hour**: Warm yellow-golden tones with sun-kissed highlights.
  - Mirrored live camera feed with WebRTC webcam support and a synthetic Test Feed fallback.
- **Still & Live Photos Modes**:
  - **Still Photos**: Classic four-pose sequence producing crisp high-resolution photographs.
  - **Live Photos**: Captures high-res still photos along with synchronized moving moments (~1.5s pre-shutter + ~1.2s post-shutter) using the browser `MediaRecorder` API.
  - Interactive photo strip allows clicking each photograph directly to play its moving moment.
- **Physical Dispensing Experience**:
  - Post-capture mechanical delivery sequence: photo strip slowly feeds out of a heavy chrome-bezeled slot.
  - Natural physics paper drop into the collection tray with subtle bounce and tilt.
  - Tactile collection prompt to retrieve the finished keepsake.
- **Standard Photo Strip Keepsake**:
  - Canvas-composed vertical photo strip at **600 × 1800 px** (standard 2 × 6″ print at 300 DPI).
  - Subtle stippled paper texture, authentic divider rules, typewriter date, and arcade mark.
  - Hardware-accelerated, zero-flicker live typewriter caption editor in *Special Elite* font.
  - High-res PNG export (`vintage-booth-strip.png`) and individual photo/clip downloads.
- **Strict Privacy**: All frames and video clips exist in-memory only. Zero backend uploads or persistent tracking.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/Soukhyaa/Photobooth.git

# Navigate to frontend
cd Photobooth/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Production Build
```bash
npm run build
```

---

## 📁 Project Structure

```
Photobooth/
├── .gitignore
├── README.md
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── BoothInterior.jsx       # Camera mirror, countdown, mode modal & dispenser
    │   │   ├── CaptureOverlay.jsx      # Top-right corner countdown & progress tracker
    │   │   ├── CurtainTransition.jsx   # Velvet drape transition animation
    │   │   ├── HeaderBar.jsx           # Marquee brand title and audio mute toggle
    │   │   ├── LandingBooth.jsx        # Exterior arcade parlor booth cabinet
    │   │   ├── MockCameraFeed.jsx      # Animated SVG silhouette test portrait feed
    │   │   ├── PhotoStripPreview.jsx   # Interactive photo strip review, caption & downloads
    │   │   └── ReviewSet.jsx
    │   ├── hooks/
    │   │   └── useCamera.js            # Webcam stream lifecycle & device switching
    │   ├── utils/
    │   │   ├── audio.js                # Web Audio API procedural synthesizer
    │   │   ├── capture.js              # Canvas snapshot & film optical effects
    │   │   ├── filters.js              # Retro filter definitions & presets
    │   │   ├── liveRecorder.js         # MediaRecorder pre/post-shutter clip coordinator
    │   │   └── stripComposer.js        # 600 × 1800 px Canvas compositor & downloads
    │   ├── App.css                     # Retro physical booth styling & animations
    │   ├── App.jsx                     # Top-level stage & curtain controller
    │   ├── index.css
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

---

## 📜 License

MIT License. Designed with retro arcade love.
