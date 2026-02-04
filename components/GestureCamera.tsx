
import React, { useRef, useEffect, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Command } from '../types';

interface GestureCameraProps {
  onGesture: (cmd: Command) => void;
  isActive: boolean;
}

const FRAME_RATE = 1; 
const JPEG_QUALITY = 0.5;

const GestureCamera: React.FC<GestureCameraProps> = ({ onGesture, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<string>('Standby');
  const intervalRef = useRef<number | null>(null);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  useEffect(() => {
    if (!isActive) {
      setCurrentGesture('Standby');
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }

    // Safety check for API Key to prevent crash
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError('Gemini API Key missing. Check environment variables.');
      return;
    }

    let session: any = null;
    const ai = new GoogleGenAI({ apiKey });

    const setupSession = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: `Return ONLY one of these labels: FORWARD, BACKWARD, LEFT, RIGHT, STOP. If no hand is seen or command unclear, return NONE. No speech. Respond ONLY with the command string.`,
            outputAudioTranscription: {},
          },
          callbacks: {
            onmessage: async (msg: LiveServerMessage) => {
              if (msg.serverContent?.outputTranscription) {
                const text = msg.serverContent.outputTranscription.text.trim().toUpperCase();
                if (['FORWARD', 'BACKWARD', 'LEFT', 'RIGHT', 'STOP'].includes(text)) {
                  setCurrentGesture(text);
                  onGesture(text as Command);
                } else if (text === 'NONE') {
                  setCurrentGesture('Detecting...');
                }
              }
            },
            onerror: (e) => {
              console.error('AI Error:', e);
              setError('AI Service Interrupted');
            },
          }
        });

        session = await sessionPromise;

        intervalRef.current = window.setInterval(() => {
          if (!videoRef.current || !canvasRef.current) return;
          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) return;
          
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          
          canvasRef.current.toBlob(async (blob) => {
            if (blob) {
              const base64Data = await blobToBase64(blob);
              sessionPromise.then((s) => {
                s.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'image/jpeg' }
                });
              });
            }
          }, 'image/jpeg', JPEG_QUALITY);
        }, 1000 / FRAME_RATE);

      } catch (err) {
        setError('Camera Access Denied');
        console.error(err);
      }
    };

    setupSession();

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (session) session.close();
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
          {error && <p className="mt-4 text-red-500 text-[10px] font-bold max-w-[200px]">{error}</p>}
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
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-widest">AI Live</span>
          </div>

          <div className="absolute inset-x-0 bottom-6 flex justify-center z-20">
             <div className="px-8 py-3 bg-white text-slate-950 rounded-2xl font-black text-lg tracking-tighter shadow-2xl animate-pulse-slow">
               {currentGesture}
             </div>
          </div>
        </>
      )}
      {error && !isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-600/10 backdrop-blur-sm z-50 text-white p-6 text-center">
          <div className="bg-red-600 p-6 rounded-3xl shadow-2xl">
            <i className="fa-solid fa-circle-exclamation text-3xl mb-3"></i>
            <p className="font-bold text-sm tracking-tight">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestureCamera;
