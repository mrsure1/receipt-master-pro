import React, { useRef, useEffect, useState } from 'react';
import { X, Camera, RefreshCw, Zap, ZapOff } from 'lucide-react';

interface CameraModalProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      if (stream) {
        stopCamera();
      }
      
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError('');
    } catch (err) {
      console.error("Camera Error:", err);
      setError('카메라를 실행할 수 없습니다. 권한을 확인해주세요.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        // Flip horizontally if using front camera
        if (facingMode === 'user') {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            onClose(); // Close modal after capture
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 left-0 right-0 z-10">
        <button onClick={onClose} className="text-white p-2 rounded-full bg-gray-800/50">
          <X size={24} />
        </button>
        <span className="text-white font-medium">사진 촬영</span>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white text-center p-4">
            <p className="mb-4">{error}</p>
            <button 
              onClick={() => startCamera()}
              className="bg-blue-600 px-4 py-2 rounded-lg"
            >
              재시도
            </button>
          </div>
        ) : (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-8 pb-12 flex justify-around items-center">
        <button 
          onClick={toggleCamera}
          className="text-white p-4 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={24} />
        </button>
        
        <button 
          onClick={handleCapture}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/40 transition-colors active:scale-95"
        >
          <div className="w-16 h-16 bg-white rounded-full"></div>
        </button>
        
        <div className="w-14"></div> {/* Spacer for balance */}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;
