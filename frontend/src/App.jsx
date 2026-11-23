import React, { useState } from 'react';
import HeaderBar from './components/HeaderBar';
import LandingBooth from './components/LandingBooth';
import BoothInterior from './components/BoothInterior';
import CreateStripStudio from './components/CreateStripStudio';
import CurtainTransition from './components/CurtainTransition';
import MemoriesDrawer from './components/MemoriesDrawer';
import PoseInspirationModal from './components/PoseInspirationModal';
import { DEFAULT_FILTER } from './utils/filters';
import { soundEngine } from './utils/audio';
import './App.css';

export default function App() {
  // Application Stage State: 'landing' | 'interior' | 'studio'
  const [stage, setStage] = useState('landing');
  const [isCurtainClosed, setIsCurtainClosed] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(DEFAULT_FILTER);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(false);
  const [isPoseModalOpen, setIsPoseModalOpen] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(null);

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

  // Open Create a Strip Studio flow
  const handleOpenStudio = () => {
    soundEngine.playCurtain();
    setIsCurtainClosed(true);

    setTimeout(() => {
      setStage('studio');
      setTimeout(() => {
        setIsCurtainClosed(false);
        soundEngine.playCurtain();
      }, 350);
    }, 700);
  };

  // Return to Booth exterior from Studio
  const handleReturnToBooth = () => {
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
        onOpenPoses={() => setIsPoseModalOpen(true)}
        currentStage={stage}
        onOpenStudio={handleOpenStudio}
        onReturnToBooth={handleReturnToBooth}
      />

      {/* Dynamic Stage Render */}
      {stage === 'landing' ? (
        <LandingBooth
          onStepInside={handleStepInside}
          onOpenStudio={handleOpenStudio}
          onOpenPoses={() => setIsPoseModalOpen(true)}
        />
      ) : stage === 'studio' ? (
        <CreateStripStudio
          onReturnToBooth={handleReturnToBooth}
          onStepInside={handleStepInside}
        />
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

      {/* Pose Inspiration Lookbook Modal */}
      <PoseInspirationModal
        isOpen={isPoseModalOpen}
        onClose={() => setIsPoseModalOpen(false)}
        selectedSequenceId={selectedSequence?.id}
        onSelectSequence={setSelectedSequence}
        onStepInside={handleStepInside}
      />
    </div>
  );
}
