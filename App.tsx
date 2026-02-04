
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { bluetoothService, BluetoothLog } from './services/bluetoothService';
import { Command, BluetoothState } from './types';
import ControlPad from './components/ControlPad';
import GestureCamera from './components/GestureCamera';

const App: React.FC = () => {
  const [btState, setBtState] = useState<BluetoothState>({
    connected: false,
    deviceName: null,
    error: null
  });
  const [powerOn, setPowerOn] = useState(false);
  const [gestureActive, setGestureActive] = useState(false);
  const [lastCmd, setLastCmd] = useState<string>('STOP');
  const [showInfo, setShowInfo] = useState(false);
  const [logs, setLogs] = useState<BluetoothLog[]>([]);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bluetoothService.setLogListener((log) => {
      setLogs(prev => [log, ...prev].slice(0, 20));
    });
  }, []);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = 0;
    }
  }, [logs]);

  const handleConnect = () => {
    bluetoothService.connect()
      .then(name => {
        setBtState({ connected: true, deviceName: name, error: null });
        setPowerOn(true); // Auto-ignite on connect
      })
      .catch((err: any) => {
        setBtState(prev => ({ 
          ...prev, 
          error: err.message || 'Connection failed' 
        }));
      });
  };

  const handleDisconnect = () => {
    bluetoothService.disconnect();
    setBtState({ connected: false, deviceName: null, error: null });
    setPowerOn(false);
  };

  const handleCommand = useCallback((cmd: Command) => {
    if (cmd === 'ON') setPowerOn(true);
    if (cmd === 'OFF') {
      setPowerOn(false);
      setGestureActive(false);
      bluetoothService.sendCommand('STOP');
    }
    
    setLastCmd(cmd);
    if (btState.connected && (powerOn || cmd === 'ON' || cmd === 'OFF')) {
      bluetoothService.sendCommand(cmd);
    }
  }, [btState.connected, powerOn]);

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-white overflow-hidden safe-top safe-bottom">
      {/* App Header */}
      <header className="px-6 py-4 flex items-center justify-between glass z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <i className="fa-solid fa-rocket text-sm"></i>
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tighter leading-none">NovaQuest</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-1.5 h-1.5 rounded-full ${btState.connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {btState.deviceName || 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
            onClick={btState.connected ? handleDisconnect : handleConnect}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              btState.connected 
                ? 'bg-red-600/10 text-red-500 border border-red-500/20' 
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
            }`}
          >
            {btState.connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </header>

      {/* Main Experience Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* AI Vision Center */}
        <div className="h-[40%] flex flex-col p-4">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-2">
               <i className="fa-solid fa-eye text-indigo-400 text-[10px]"></i>
               <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vision Drive</h2>
             </div>
             <label className="relative inline-flex items-center cursor-pointer scale-75">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={gestureActive}
                disabled={!powerOn || !btState.connected}
                onChange={() => setGestureActive(!gestureActive)}
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div className="flex-1">
            <GestureCamera isActive={gestureActive} onGesture={handleCommand} />
          </div>
        </div>

        {/* Debug Console */}
        <div className="px-4 py-2">
          <div className="bg-black/60 rounded-xl border border-white/5 h-20 overflow-y-auto p-2 font-mono text-[9px] text-slate-400" ref={consoleRef}>
             {logs.length === 0 && <div className="opacity-20 italic">Waiting for connection...</div>}
             {logs.map((log, i) => (
               <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' : log.type === 'tx' ? 'text-green-400' : ''}`}>
                 <span className="opacity-30">[{log.time}]</span>
                 <span>{log.msg}</span>
               </div>
             ))}
          </div>
        </div>

        {/* Controls Cockpit */}
        <div className="flex-1 bg-slate-900/50 backdrop-blur-xl border-t border-white/5 rounded-t-[40px] px-6 pt-4 pb-12 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
               <span className="text-[9px] font-mono text-indigo-400 uppercase font-bold tracking-tighter">
                STATUS: {lastCmd}
               </span>
            </div>
            <button
              onClick={() => handleCommand(powerOn ? 'OFF' : 'ON')}
              disabled={!btState.connected}
              className={`px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                powerOn 
                  ? 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                  : 'bg-green-600 text-white shadow-lg shadow-green-500/20'
              } ${!btState.connected ? 'opacity-20 grayscale' : 'active:scale-95'}`}
            >
              <i className="fa-solid fa-power-off mr-2"></i>
              {powerOn ? 'STOP SYSTEM' : 'START SYSTEM'}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <ControlPad 
              onCommand={handleCommand} 
              disabled={!btState.connected} 
              powerOn={powerOn}
            />
          </div>
        </div>
      </main>

      {/* Floating Info */}
      <button 
        onClick={() => setShowInfo(true)}
        className="fixed bottom-6 right-6 w-10 h-10 bg-slate-800 rounded-full border border-white/10 flex items-center justify-center text-slate-400 shadow-xl z-[100]"
      >
        <i className="fa-solid fa-code"></i>
      </button>

      {showInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-xs w-full">
            <h3 className="font-black text-xl italic mb-4">LOG_LEVEL: VERBOSE</h3>
            <div className="text-[11px] text-slate-400 space-y-2 mb-6 font-mono">
              <p>UUID_SRV: 6e400001</p>
              <p>UUID_RX: 6e400002</p>
              <p>BAUD: 115200 (Default)</p>
              <p>DATA_MAP: forward:'up', back:'down'</p>
            </div>
            <button 
              onClick={() => setShowInfo(false)}
              className="w-full py-4 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest"
            >
              Close Console
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
