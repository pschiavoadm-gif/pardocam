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

  // Polygon shapes for perspective trigger zones, matching the line's angle.
  const entryZoneStyle = { clipPath: 'polygon(0 70%, 100% 60%, 100% 100%, 0% 100%)' };
  const exitZoneStyle = { clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0 70%)' };

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
            {/* Virtual Line with perspective, positioned to match the clip-paths */}
            <div 
                className="absolute h-1.5 bg-[#1178C0] shadow-[0_0_15px_rgba(17,120,192,0.9)]"
                style={{
                    top: '65%', // Midpoint between 70% and 60%
                    left: '-5%',
                    width: '110%',
                    transform: 'translateY(-50%) rotate(-5.7deg)',
                }}
            />
            
            {/* Simulation Trigger Zones with perspective clip-path */}
            <div 
                className="absolute inset-0 cursor-pointer group"
                style={entryZoneStyle}
                onClick={onEntry}
                title="Simulate Entry"
            >
                <div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-20 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-white font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">Simulate Entry</span>
                </div>
            </div>
            <div 
                className="absolute inset-0 cursor-pointer group"
                style={exitZoneStyle}
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
