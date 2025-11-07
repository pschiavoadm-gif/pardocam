import React, { useRef, useEffect, useState } from 'react';

interface CameraViewProps {
  onEntry: () => void;
  onExit: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onEntry, onExit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          setError("Your browser does not support camera access.");
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
        setError("Camera access was denied. Please allow camera permissions in your browser settings.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] bg-gray-900 flex items-center justify-center text-white overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {error && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}
      {!error && (
        <>
            {/* Virtual Line */}
            <div className="absolute top-2/3 left-0 w-full h-1.5 bg-[#1178C0] shadow-[0_0_15px_rgba(17,120,192,0.9)]"></div>
            
            {/* Simulation Trigger Zones */}
            <div 
                className="absolute bottom-0 left-0 w-full h-2/3 cursor-pointer group"
                onClick={onEntry}
                title="Simulate Entry"
            >
                <div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-20 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-white font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Simulate Entry</span>
                </div>
            </div>
            <div 
                className="absolute top-0 left-0 w-full h-1/3 cursor-pointer group"
                onClick={onExit}
                title="Simulate Exit"
            >
                <div className="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-20 transition-opacity flex items-start justify-center pt-4">
                     <span className="text-white font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Simulate Exit</span>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default CameraView;