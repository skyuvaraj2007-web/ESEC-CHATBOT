'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob, dataUrl: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !capturedUrl) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedUrl, facingMode]);

  const startCamera = async (currentFacingMode: 'environment' | 'user') => {
    setError(null);
    stopCamera();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser. Please use HTTPS or a supported browser.');
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: currentFacingMode,
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access was denied. Please enable camera permission in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device detected on this device.');
      } else {
        setError('Camera access was denied or unavailable. Please enable camera permission in your browser settings.');
      }
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedUrl(dataUrl);
          stopCamera();
        }
      },
      'image/jpeg',
      0.9
    );
  };

  const handleRetake = () => {
    setCapturedBlob(null);
    setCapturedUrl(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedBlob && capturedUrl) {
      onCapture(capturedBlob, capturedUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#101522] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#22D3EE]" />
            <h3 className="text-sm font-semibold text-white">Visual Capture Viewfinder</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            aria-label="Close Viewfinder"
            className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Content */}
        <div className="relative bg-[#080B14] aspect-video flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-red-400 space-y-3">
              <AlertCircle className="w-8 h-8 mx-auto" />
              <p className="text-xs max-w-xs mx-auto leading-relaxed">{error}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="mt-2 px-4 py-2 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white border border-white/10 transition"
              >
                Retry Camera
              </button>
            </div>
          ) : capturedUrl ? (
            <img src={capturedUrl} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Scanline overlay animation */}
              <div className="scan-line" />
              {/* Targeting HUD Reticle */}
              <div className="absolute inset-8 border border-[#22D3EE]/30 rounded-lg pointer-events-none flex items-center justify-center">
                <div className="w-8 h-8 border-t-2 border-l-2 border-[#22D3EE] absolute top-0 left-0" />
                <div className="w-8 h-8 border-t-2 border-r-2 border-[#22D3EE] absolute top-0 right-0" />
                <div className="w-8 h-8 border-b-2 border-l-2 border-[#22D3EE] absolute bottom-0 left-0" />
                <div className="w-8 h-8 border-b-2 border-r-2 border-[#22D3EE] absolute bottom-0 right-0" />
                <span className="text-[10px] font-mono text-[#22D3EE] tracking-widest uppercase bg-[#080B14]/60 px-2 py-0.5 rounded">
                  Target Centered ({facingMode === 'environment' ? 'Rear Camera' : 'Front Camera'})
                </span>
              </div>

              {/* Flip camera toggle button */}
              <button
                onClick={toggleFacingMode}
                title="Switch Camera (Front / Rear)"
                aria-label="Switch Camera"
                className="absolute top-3 right-3 min-w-[44px] min-h-[44px] p-2.5 rounded-full bg-[#080B14]/80 hover:bg-[#080B14] text-white border border-white/20 shadow-lg backdrop-blur-md flex items-center justify-center transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4 text-[#22D3EE]" />
              </button>
            </>
          )}
        </div>

        {/* Actions Toolbar */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between">
          {capturedUrl ? (
            <>
              <button
                onClick={handleRetake}
                className="btn-secondary px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                onClick={handleConfirm}
                className="btn-primary px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/30"
              >
                <Check className="w-4 h-4" />
                <span>Use Image</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="text-xs text-[#94A3B8] hover:text-white px-4 py-2.5 min-h-[44px] flex items-center justify-center"
              >
                Cancel
              </button>

              <button
                onClick={handleSnap}
                disabled={Boolean(error)}
                className="btn-primary px-6 py-2.5 min-h-[44px] rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#8B5CF6]/30 active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Capture Frame</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
