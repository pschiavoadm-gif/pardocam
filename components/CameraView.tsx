import React, { useRef, useEffect, useState, useCallback } from 'react';

// Declare MediaPipe Vision types for TypeScript, making it available on the window object
declare global {
  interface Window {
    mp_vision: any;
  }
}

interface CameraViewProps {
  onEntry: () => void;
  onExit: () => void;
}

interface DetectionBox {
  box: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  id: number;
}

interface TrackedPerson {
  id: number;
  lastSeenFrame: number;
  hasCrossed: boolean;
  center: { x: number; y: number };
  box: DetectionBox['box'];
}

// Calculates the squared distance between two points
const getDistanceSq = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
    return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
};

const CameraView: React.FC<CameraViewProps> = ({ onEntry, onExit }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const faceDetectorRef = useRef<any>(null);
  const animationFrameId = useRef<number | undefined>(undefined);
  const trackedPeople = useRef<Map<number, TrackedPerson>>(new Map());
  const nextPersonId = useRef(0);
  const frameCount = useRef(0);
  
  // Effect to load MediaPipe scripts dynamically and reliably
  useEffect(() => {
    if (window.mp_vision) {
        setScriptLoaded(true);
        return;
    }

    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/js/vision_bundle.js";
    script.crossOrigin = "anonymous";

    script.onload = () => {
        const checkInterval = setInterval(() => {
            if (window.mp_vision) {
                clearInterval(checkInterval);
                setScriptLoaded(true);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkInterval);
            if (!window.mp_vision) {
                setError("MediaPipe library loaded but failed to initialize. Please refresh.");
                setIsLoading(false);
            }
        }, 5000); // 5-second timeout for initialization
    };

    script.onerror = () => {
        setError("Failed to load MediaPipe script. Check network connection and refresh.");
        setIsLoading(false);
    };
    
    document.head.appendChild(script);
  }, []);

  const setupDetector = useCallback(async () => {
    try {
      if (!window.mp_vision || !window.mp_vision.FaceDetector) {
        throw new Error("MediaPipe library is not available.");
      }
      const { FaceDetector, FilesetResolver } = window.mp_vision;
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
          delegate: "GPU",
        },
        runningMode: 'VIDEO',
      });
      faceDetectorRef.current = detector;
      setIsLoading(false);
    } catch (e: any) {
      console.error("Failed to initialize detector:", e);
      setError(e.message || "Failed to initialize face detector.");
      setIsLoading(false);
    }
  }, []);

  const trackAndCount = useCallback((newDetections: any[], videoWidth: number, linePosition: number) => {
    const now = frameCount.current;
    const currentDetections = new Map<number, TrackedPerson>();
    const matchedIds = new Set<number>();
    
    const newDetectionCenters = newDetections.map(d => ({
        center: {
            x: (d.boundingBox.originX + d.boundingBox.width / 2),
            y: (d.boundingBox.originY + d.boundingBox.height / 2)
        },
        box: d.boundingBox
    }));

    for(const newDetection of newDetectionCenters) {
        let bestMatch: { id: number; distSq: number } | null = null;
        for (const [id, person] of trackedPeople.current.entries()) {
            if (matchedIds.has(id)) continue;
            const distSq = getDistanceSq(person.center, newDetection.center);
            if (distSq < (videoWidth * 0.2) * (videoWidth * 0.2)) {
                if (!bestMatch || distSq < bestMatch.distSq) {
                    bestMatch = { id, distSq };
                }
            }
        }

        if (bestMatch) {
            const person = trackedPeople.current.get(bestMatch.id)!;
            const prevCenter = person.center;
            
            if (!person.hasCrossed) {
                if(prevCenter.x < linePosition && newDetection.center.x >= linePosition) {
                    onEntry();
                    person.hasCrossed = true;
                } else if (prevCenter.x > linePosition && newDetection.center.x <= linePosition) {
                    onExit();
                    person.hasCrossed = true;
                }
            }

            person.center = newDetection.center;
            person.box = newDetection.box;
            person.lastSeenFrame = now;
            currentDetections.set(person.id, person);
            matchedIds.add(person.id);
        } else {
            const newId = nextPersonId.current++;
            const newPerson: TrackedPerson = {
                id: newId,
                lastSeenFrame: now,
                hasCrossed: newDetection.center.x > linePosition,
                center: newDetection.center,
                box: newDetection.box,
            };
            currentDetections.set(newId, newPerson);
        }
    }
    
    for (const [id, person] of trackedPeople.current.entries()) {
        if (now - person.lastSeenFrame > 15) {
             trackedPeople.current.delete(id);
        }
    }
    
    trackedPeople.current = currentDetections;

    const boxesToRender: DetectionBox[] = Array.from(trackedPeople.current.values()).map(p => ({
        box: p.box,
        id: p.id,
    }));

    setDetections(boxesToRender);
  }, [onEntry, onExit]);


  const predictWebcam = useCallback(() => {
    const video = videoRef.current;
    if (!video || !faceDetectorRef.current || video.readyState < 2) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
      return;
    }
    
    const results = faceDetectorRef.current.detectForVideo(video, performance.now());
    frameCount.current++;

    if (results.detections) {
      const linePosition = video.videoWidth / 2;
      trackAndCount(results.detections, video.videoWidth, linePosition);
    }
    
    animationFrameId.current = requestAnimationFrame(predictWebcam);
  }, [trackAndCount]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;
    
    const initializeSequence = async () => {
        if (!scriptLoaded) return;

        await setupDetector();

        if (!isMounted || !faceDetectorRef.current) return;

        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (isMounted && videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.addEventListener('loadeddata', predictWebcam);
                }
            } else {
                setError("Your browser does not support camera access.");
            }
        } catch (err) {
            console.error("Error accessing camera: ", err);
            setError("Camera access was denied.");
        }
    };
    
    initializeSequence();

    return () => {
        isMounted = false;
        if (stream) stream.getTracks().forEach(track => track.stop());
        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.removeEventListener('loadeddata', predictWebcam);
        }
        if(animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    };
  }, [scriptLoaded, setupDetector, predictWebcam]);

  const videoWidth = videoRef.current?.clientWidth ?? 1;
  const videoHeight = videoRef.current?.clientHeight ?? 1;

  return (
    <div className="relative w-full aspect-[4/3] bg-gray-900 flex items-center justify-center text-white overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
      {(error || isLoading) && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center p-4 text-center">
            {isLoading && <p className="font-medium text-lg animate-pulse">Iniciando motor de IA...</p>}
            {error && <p className="text-red-400 font-medium">{error}</p>}
        </div>
      )}
      {!error && !isLoading && (
        <>
            <div className="absolute w-1.5 bg-[#1178C0] shadow-[0_0_15px_rgba(17,120,192,0.9)]"
                style={{ left: '50%', top: 0, bottom: 0, transform: 'translateX(-50%)' }}
            />
            {detections.map(d => (
                <div key={d.id} className="absolute border-2 border-[#1178C0] rounded-md bg-[#1178c0]/20"
                    style={{
                        left: `${videoWidth - d.box.originX - d.box.width}px`,
                        top: `${d.box.originY}px`,
                        width: `${d.box.width}px`,
                        height: `${d.box.height}px`,
                    }}>
                </div>
            ))}
        </>
      )}
    </div>
  );
};

export default CameraView;