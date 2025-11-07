import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraViewProps {
  onEntry: () => void;
  onExit: () => void;
}

type Gender = 'M' | 'F';

interface Person {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  direction: 1 | -1; // 1 for right (entry), -1 for left (exit)
  age: number;
  gender: Gender;
  clientId: string;
  hasCrossed: boolean;
}

const generatePerson = (id: number, containerWidth: number, containerHeight: number): Person => {
  const direction = Math.random() > 0.5 ? 1 : -1;
  return {
    id,
    x: direction === 1 ? -50 : containerWidth + 50,
    y: Math.random() * (containerHeight - 100) + 20,
    size: Math.random() * 30 + 70, // size between 70px and 100px
    speed: Math.random() * 1 + 0.5,
    direction,
    age: Math.floor(Math.random() * 50) + 18,
    gender: Math.random() > 0.5 ? 'M' : 'F',
    clientId: `C-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    hasCrossed: false,
  };
};

const CameraView: React.FC<CameraViewProps> = ({ onEntry, onExit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);

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

  const updateSim = useCallback(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const linePosition = width / 2;

    setPeople(prevPeople => {
      const updatedPeople = prevPeople.map(p => {
        const newX = p.x + p.speed * p.direction;
        
        // Check for crossing
        if (!p.hasCrossed) {
          const pastPosition = p.x + (p.size / 2);
          const newPosition = newX + (p.size / 2);

          if (p.direction === 1 && pastPosition < linePosition && newPosition >= linePosition) {
            onEntry();
            return { ...p, x: newX, hasCrossed: true };
          }
          if (p.direction === -1 && pastPosition > linePosition && newPosition <= linePosition) {
            onExit();
            return { ...p, x: newX, hasCrossed: true };
          }
        }
        return { ...p, x: newX };
      });
      
      // Filter out people who are off-screen and add new ones
      const visiblePeople = updatedPeople.filter(p => p.direction === 1 ? p.x < width + 50 : p.x > -100);
      if (Math.random() < 0.015 && visiblePeople.length < 5) { // Add new person periodically
         visiblePeople.push(generatePerson(Date.now(), width, height));
      }
      
      return visiblePeople;
    });
  }, [onEntry, onExit]);

  useEffect(() => {
    const animationFrame = requestAnimationFrame(function animate() {
      updateSim();
      requestAnimationFrame(animate);
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [updateSim]);

  return (
    <div ref={containerRef} className="relative w-full aspect-[4/3] bg-gray-900 flex items-center justify-center text-white overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {error && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}
      {!error && (
        <>
            {/* Virtual Vertical Line */}
            <div 
                className="absolute w-1.5 bg-[#1178C0] shadow-[0_0_15px_rgba(17,120,192,0.9)]"
                style={{
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    transform: 'translateX(-50%)',
                }}
            />
            
            {/* Simulated People */}
            {people.map(person => (
                <div key={person.id} className="absolute border-2 border-[#1178C0] rounded-md bg-[#1178c0]/20"
                    style={{
                        left: `${person.x}px`,
                        top: `${person.y}px`,
                        width: `${person.size}px`,
                        height: `${person.size * 1.6}px`,
                        transition: 'left 0.1s linear, top 0.1s linear',
                    }}>
                    <div className="absolute -top-6 left-0 text-xs bg-[#1178C0] text-white px-1.5 py-0.5 rounded">
                        {person.clientId} | {person.age} {person.gender}
                    </div>
                </div>
            ))}
        </>
      )}
    </div>
  );
};

export default CameraView;
