import React, { useRef, useEffect, useState, useCallback } from 'react';

// Declare MediaPipe Vision types for TypeScript
declare const mp_vision: any;

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

  const faceDetectorRef = useRef<any>(null);
  // FIX: `useRef` requires an initial value when a generic type argument is provided.
  const animationFrameId = useRef<number | undefined>(undefined);
  const trackedPeople = useRef<Map<number, TrackedPerson>>(new Map());
  const nextPersonId = useRef(0);
  const frameCount = useRef(0);

  const setupDetector = useCallback(async () => {
    try {
        // Poll for mp_vision to be loaded with a timeout
        await new Promise<void>((resolve, reject) => {
            const interval = setInterval(() => {
                if (typeof mp_vision !== 'undefined' && mp_vision.FaceDetector) {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    resolve(undefined);
                }
            }, 100);

            const timeout = setTimeout(() => {
                clearInterval(interval);
                reject(new Error("MediaPipe library not loaded yet. Please refresh."));
            }, 10000); // 10 second timeout
        });

      const { FaceDetector, FilesetResolver } = mp_vision;
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

    // Match new detections with existing tracked people
    for(const newDetection of newDetectionCenters) {
        let bestMatch: { id: number; distSq: number } | null = null;

        for (const [id, person] of trackedPeople.current.entries()) {
            if (matchedIds.has(id)) continue;
            const distSq = getDistanceSq(person.center, newDetection.center);
            if (distSq < (videoWidth * 0.2) * (videoWidth * 0.2)) { // Match threshold
                if (!bestMatch || distSq < bestMatch.distSq) {
                    bestMatch = { id, distSq };
                }
            }
        }

        if (bestMatch) {
            const person = trackedPeople.current.get(bestMatch.id)!;
            const prevCenter = person.center;
            
            // Check for line crossing
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
            // New person detected
            const newId = nextPersonId.current++;
            const newPerson: TrackedPerson = {
                id: newId,
                lastSeenFrame: now,
                hasCrossed: newDetection.center.x > linePosition, // Don't count people who spawn on the other side
                center: newDetection.center,
                box: newDetection.box,
            };
            currentDetections.set(newId, newPerson);
        }
    }
    
    // Prune old tracks
    for (const [id, person] of trackedPeople.current.entries()) {
        if (now - person.lastSeenFrame > 15) { // Remove after 15 frames of not being seen
             trackedPeople.current.delete(id);
        }
    }
    
    trackedPeople.current = currentDetections;

    // Set detections for rendering
    const boxesToRender: DetectionBox[] = Array.from(trackedPeople.current.values()).map(p => ({
        box: p.box,
        id: p.id,
    }));

    setDetections(boxesToRender);
  }, [onEntry, onExit]);


  const predictWebcam = useCallback(() => {
    const video = videoRef.current;
    if (!video || !faceDetectorRef.current) {
      animationFrameId.current = requestAnimationFrame(predictWebcam);
      return;
    }
    
    if (video.readyState < 2) {
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
    
    const initializeSequence = async () => {
        await setupDetector();

        if (!faceDetectorRef.current) return; // Stop if detector failed

        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (videoRef.current) {
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
        if (stream) stream.getTracks().forEach(track => track.stop());
        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.removeEventListener('loadeddata', predictWebcam);
        }
        if(animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
    };
  }, [setupDetector, predictWebcam]);

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
      {!error && (
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