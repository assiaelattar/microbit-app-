
import React, { useRef, useEffect, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Command } from '../types';

interface GestureCameraProps {
  onGesture: (cmd: Command) => void;
  isActive: boolean;
}

const ANALYZE_INTERVAL = 1000; // 1 second between AI checks for better responsiveness

const GestureCamera: React.FC<GestureCameraProps> = ({ onGesture, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<string>('Standby');
  const [isProcessing, setIsProcessing] = useState(false);
  const activeRef = useRef(isActive);

  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      setCurrentGesture('Standby');
      return;
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError('Gemini API Key missing.');
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    let timeoutId: number;

    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for video to be ready before starting loop
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            startAnalysisLoop();
          };
        }
      } catch (err: any) {
        console.error("Camera Error:", err);
        setError(`Camera Error: ${err.message || 'Access Denied'}`);
      }
    };

    const startAnalysisLoop = async () => {
      if (!activeRef.current) return;

      if (videoRef.current && canvasRef.current && !isProcessing) {
        setIsProcessing(true);
        try {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          
          if (video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);

            const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
            
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [
                {
                  parts: [
                    { text: "Analyze this image for hand gestures. Identify if the user is signaling: FORWARD, BACKWARD, LEFT, RIGHT, or STOP. Respond with ONLY the single command word. If no clear gesture is visible, respond with NONE." },
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
                  ]
                }
              ],
            });

            const result = response.text.trim().toUpperCase();
            // Match the command strictly
            if (['FORWARD', 'BACKWARD', 'LEFT', 'RIGHT', 'STOP'].some(c => result.includes(c))) {
              const cmdMatch = ['FORWARD', 'BACKWARD', 'LEFT', 'RIGHT', 'STOP'].find(c => result.includes(c)) as Command;
              setCurrentGesture(cmdMatch);
              onGesture(cmdMatch);
            } else {
              setCurrentGesture('Scanning...');
            }
          }
        } catch (err) {
          console.error("AI Analysis Error:", err);
        } finally {
          setIsProcessing(false);
        }
      }

      timeoutId = window.setTimeout(startAnalysisLoop, ANALYZE_INTERVAL);
    };

    setupCamera();

    return () => {
      clearTimeout(timeoutId);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [isActive, onGesture]);

  return (
    <div className="relative h-full w-full rounded-[32px] overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
      {!isActive ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-white/5 shadow-lg">
            <i className="fa-solid fa-video-slash text-xl"></i>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Vision System Offline</p>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover grayscale-[0.1] opacity-90"
            style={{ transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-indigo-600/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-xl z-30">
            <div className={`w-2 h-2 rounded-full bg-white ${isProcessing ? 'animate-pulse' : ''}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">AI Active</span>
          </div>

          <div className="absolute inset-x-0 bottom-8 flex justify-center z-30 px-4">
             <div className="px-10 py-4 bg-white/95 backdrop-blur shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-slate-950 rounded-3xl font-black text-xl tracking-tighter transition-all duration-300 transform border border-white">
               {currentGesture}
             </div>
          </div>
        </>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 backdrop-blur-sm z-50 text-white p-6 text-center">
          <div className="bg-red-600 px-6 py-4 rounded-2xl shadow-2xl border border-red-400">
            <i className="fa-solid fa-circle-exclamation text-2xl mb-2"></i>
            <p className="font-bold text-xs uppercase tracking-widest">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestureCamera;
