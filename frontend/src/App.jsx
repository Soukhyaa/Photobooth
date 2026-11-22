import React, { useState } from 'react';
import HeaderBar from './components/HeaderBar';
import LandingBooth from './components/LandingBooth';
import BoothInterior from './components/BoothInterior';
import CurtainTransition from './components/CurtainTransition';
import MemoriesDrawer from './components/MemoriesDrawer';
import { DEFAULT_FILTER } from './utils/filters';
import { soundEngine } from './utils/audio';
import './App.css';

export default function App() {
  // Application Stage State: 'landing' | 'interior'
  const [stage, setStage] = useState('landing');
  const [isCurtainClosed, setIsCurtainClosed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(DEFAULT_FILTER);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);

  // Sound mute toggle
  const handleToggleMute = () => {
    const nextMuted = soundEngine.toggleMute();
    setIsMuted(nextMuted);
  };

  // Step Inside flow:
  // Uses ONLY the soft velvet curtain movement sound
  const handleStepInside = () => {
    soundEngine.playCurtain();
    setIsCurtainClosed(true);

    setTimeout(() => {
      setStage('interior');
      setTimeout(() => {
        setIsCurtainClosed(false);
        soundEngine.playCurtain();
      }, 350);
    }, 700);
  };

  // Step Outside flow:
  // Return to exterior view
  const handleStepOutside = () => {
    soundEngine.playCurtain();
    setIsCurtainClosed(true);

    setTimeout(() => {
      setStage('landing');
      setTimeout(() => {
        setIsCurtainClosed(false);
        soundEngine.playCurtain();
      }, 350);
    }, 700);
  };

  return (
    <div className="app-container">
      {/* Subtle Noise / Film Grain texture across the whole app */}
      <div className="film-grain-overlay" aria-hidden="true" />

      {/* Retro Navigation Header */}
      <HeaderBar
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenMemories={() => setIsMemoriesOpen(true)}
      />

      {/* Dynamic Stage Render */}
      {stage === 'landing' ? (
        <LandingBooth onStepInside={handleStepInside} />
      ) : (
        <BoothInterior
          onStepOutside={handleStepOutside}
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Dramatic Full-screen Velvet Curtain Transition */}
      <CurtainTransition isOpen={!isCurtainClosed} />

      {/* My Memories Vintage Photo Album Drawer */}
      <MemoriesDrawer
        isOpen={isMemoriesOpen}
        onClose={() => setIsMemoriesOpen(false)}
      />
    </div>
  );
}
