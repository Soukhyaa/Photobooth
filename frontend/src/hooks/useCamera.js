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

  // Keep refs updated for event listeners & asynchronous callbacks to prevent stale closures
  const cameraStatusRef = useRef(cameraStatus);
  const facingModeRef = useRef(facingMode);
  const wasActiveBeforeHideRef = useRef(null);
  const isMountedRef = useRef(true);
  const isStartingCameraRef = useRef(false);

  useEffect(() => {
    cameraStatusRef.current = cameraStatus;
  }, [cameraStatus]);

  useEffect(() => {
    facingModeRef.current = facingMode;
  }, [facingMode]);

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

  // Stop current active stream and release hardware tracks safely
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      const stream = streamRef.current;
      streamRef.current = null;
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
  }, []);

  // Start live webcam stream
  const startCamera = useCallback(async (mode) => {
    stopStream();

    const targetMode = mode || facingModeRef.current;

    // Do not start camera if document/tab is currently hidden
    if (typeof document !== 'undefined' && document.hidden) {
      setCameraStatus('idle');
      return;
    }

    if (!isMountedRef.current) return;

    isStartingCameraRef.current = true;
    setCameraStatus('requesting');
    setErrorMessage('');

    if (!navigator?.mediaDevices?.getUserMedia) {
      isStartingCameraRef.current = false;
      setCameraStatus('error');
      setErrorMessage('Camera access is not supported by this browser.');
      return;
    }

    try {
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 960 },
          facingMode: targetMode
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Race condition check: Did tab become hidden or component unmount while waiting for getUserMedia?
      if (!isMountedRef.current || (typeof document !== 'undefined' && document.hidden)) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {}
        });
        isStartingCameraRef.current = false;
        if (isMountedRef.current) {
          setCameraStatus('idle');
        }
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
        };
      }

      isStartingCameraRef.current = false;
      setCameraStatus('active');
      await checkDevices();
    } catch (err) {
      isStartingCameraRef.current = false;
      console.warn('Camera access issue:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setErrorMessage('Camera permission was not granted. You can use Test Mode instead!');
      } else {
        setCameraStatus('error');
        setErrorMessage('Unable to connect to camera. You can use Test Mode instead.');
      }
    }
  }, [stopStream, checkDevices]);

  // Flip front/back camera
  const flipCamera = useCallback(() => {
    const nextMode = facingModeRef.current === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  }, [startCamera]);

  // Enable synthetic test portrait mode (fallback)
  const enableMockMode = useCallback(() => {
    stopStream();
    setCameraStatus('mock');
  }, [stopStream]);

  // Visibility change handling & unmount cleanup
  useEffect(() => {
    isMountedRef.current = true;

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;

      if (document.hidden) {
        // Document became hidden: record state before stopping
        if (
          cameraStatusRef.current === 'active' ||
          isStartingCameraRef.current ||
          cameraStatusRef.current === 'requesting'
        ) {
          wasActiveBeforeHideRef.current = 'active';
        } else if (cameraStatusRef.current === 'mock') {
          wasActiveBeforeHideRef.current = 'mock';
        } else {
          wasActiveBeforeHideRef.current = null;
        }

        // Release hardware camera tracks and clear stream reference safely
        stopStream();
      } else {
        // Document became visible again
        const previousState = wasActiveBeforeHideRef.current;
        wasActiveBeforeHideRef.current = null;

        // Only restore if component is still mounted and camera was previously active
        if (isMountedRef.current) {
          if (previousState === 'active') {
            startCamera(facingModeRef.current);
          } else if (previousState === 'mock') {
            enableMockMode();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopStream();
    };
  }, [startCamera, stopStream, enableMockMode]);

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
