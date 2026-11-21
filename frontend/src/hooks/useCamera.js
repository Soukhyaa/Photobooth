import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to handle camera initialization, switching, permission states,
 * and a reliable mock/test stream fallback.
 */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'requesting' | 'active' | 'denied' | 'error' | 'mock'
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Check for camera availability
  const checkDevices = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoInputs.length > 1);
    } catch {
      setHasMultipleCameras(false);
    }
  }, []);

  // Stop current active stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start live webcam stream
  const startCamera = useCallback(async (mode = facingMode) => {
    stopStream();
    setCameraStatus('requesting');
    setErrorMessage('');

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraStatus('error');
      setErrorMessage('Camera access is not supported by this browser.');
      return;
    }

    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 960 },
          facingMode: mode
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
        };
      }

      setCameraStatus('active');
      await checkDevices();
    } catch (err) {
      console.warn('Camera access issue:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setErrorMessage('Camera permission was not granted. You can use Test Mode instead!');
      } else {
        setCameraStatus('error');
        setErrorMessage('Unable to connect to camera. You can use Test Mode instead.');
      }
    }
  }, [facingMode, stopStream, checkDevices]);

  // Flip front/back camera
  const flipCamera = useCallback(() => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  // Enable synthetic test portrait mode (fallback)
  const enableMockMode = useCallback(() => {
    stopStream();
    setCameraStatus('mock');
  }, [stopStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Get active stream
  const getStream = useCallback(() => streamRef.current, []);

  return {
    videoRef,
    streamRef,
    getStream,
    cameraStatus,
    errorMessage,
    facingMode,
    hasMultipleCameras,
    startCamera,
    stopStream,
    flipCamera,
    enableMockMode
  };
}
