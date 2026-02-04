
import React, { useRef, useEffect, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Command } from '../types';

interface GestureCameraProps {
  onGesture: (cmd: Command) => void;
  isActive: boolean;
}

const ANALYZE_INTERVAL = 1500; // 1.5 seconds between AI checks

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
          video: { facingMode: 'user' } 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        startAnalysisLoop();
      } catch (err) {
        setError('Camera Access Denied');
      }
    };

    const startAnalysisLoop = async () => {
      if (!activeRef.current) return;

      if (videoRef.current && canvasRef.current && !isProcessing) {
        setIsProcessing(true);
        try {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);

          const base64Image = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
          
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp', // Fast vision model
            contents: [
              {
                parts: [
                  { text: "Look at the person's hands. Determine if they are signaling a direction: FORWARD (palm up/forward), BACKWARD (palm back), LEFT (pointing left), RIGHT (pointing right), or STOP (fist or flat hand). Respond with ONLY one word from that list. If nothing detected, respond NONE." },
                  { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
                ]
              }
            ]
          });

          const result = response.text.trim().toUpperCase();
          if (['FORWARD', 'BACKWARD', 'LEFT', 'RIGHT', 'STOP'].includes(result)) {
            setCurrentGesture(result);
            onGesture(result as Command);
          } else {
            setCurrentGesture('Scanning...');
          }
        } catch (err) {
          console.error("AI Error:", err);
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
    <div className="relative h-full w-full rounded-[32px] overflow-hidden bg-slate-900 border border-white/10 shadow-inner">
      {!isActive ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 z-10 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-white/5">
            <i className="fa-solid fa-video-slash text-xl"></i>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Vision Disconnected</p>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover grayscale-[0.2] opacity-80"
            style={{ transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-indigo-600 px-3 py-1.5 rounded-full border border-white/20 shadow-lg z-20">
            <div className={`w-1.5 h-1.5 rounded-full bg-white ${isProcessing ? 'animate-ping' : ''}`}></div>
            <span className="text-[9px] font-black uppercase tracking-widest">AI Vision</span>
          </div>

          <div className="absolute inset-x-0 bottom-6 flex justify-center z-20 px-4">
             <div className="px-8 py-3 bg-white text-slate-950 rounded-2xl font-black text-lg tracking-tighter shadow-2xl transition-all duration-300 transform scale-100">
               {currentGesture}
             </div>
          </div>
        </>
      )}
      {error && !isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-600/20 backdrop-blur-sm z-50 text-white p-6 text-center">
          <p className="font-bold text-xs uppercase tracking-widest bg-red-600 px-4 py-2 rounded-lg shadow-xl">{error}</p>
        </div>
      )}
    </div>
  );
};

export default GestureCamera;
