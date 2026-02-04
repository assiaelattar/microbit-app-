
import React, { useState, useCallback } from 'react';
import { bluetoothService } from './services/bluetoothService';
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

  const handleConnect = () => {
    bluetoothService.connect()
      .then(name => {
        setBtState({ connected: true, deviceName: name, error: null });
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
      {/* App Header / Status Bar */}
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
                {btState.deviceName || 'No Connection'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
            onClick={() => setShowInfo(!showInfo)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 active:bg-white/10"
           >
            <i className="fa-solid fa-circle-info"></i>
           </button>
           <button
            onClick={btState.connected ? handleDisconnect : handleConnect}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              btState.connected 
                ? 'bg-slate-800 text-slate-400 border border-slate-700' 
                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
            }`}
          >
            {btState.connected ? 'Eject' : 'Link'}
          </button>
        </div>
      </header>

      {/* Main Experience Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Error HUD */}
        {btState.error && (
          <div className="absolute top-4 left-4 right-4 z-[60] p-4 bg-red-500/90 backdrop-blur rounded-2xl flex items-start gap-3 border border-red-400 shadow-xl">
            <i className="fa-solid fa-triangle-exclamation mt-1"></i>
            <div className="flex-1">
              <p className="text-xs font-bold leading-tight">{btState.error}</p>
            </div>
            <button onClick={() => setBtState(s => ({...s, error: null}))}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* AI Vision Center */}
        <div className="flex-1 flex flex-col p-4 pb-2">
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
               <i className="fa-solid fa-eye text-indigo-400 text-xs"></i>
               <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-400">AI Gesture Control</h2>
             </div>
             <label className="relative inline-flex items-center cursor-pointer scale-75">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={gestureActive}
                disabled={!powerOn || !btState.connected}
                onChange={() => setGestureActive(!gestureActive)}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div className="flex-1 min-h-0">
            <GestureCamera isActive={gestureActive} onGesture={handleCommand} />
          </div>
        </div>

        {/* Controls Cockpit */}
        <div className="bg-slate-900/50 backdrop-blur-xl border-t border-white/5 rounded-t-[40px] px-6 pt-6 pb-12">
          <div className="flex justify-between items-center mb-6">
            <div className="bg-black/40 px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
               <span className="text-[10px] font-mono text-amber-500 uppercase font-bold tracking-tighter">
                UART > {lastCmd}
               </span>
            </div>
            <button
              onClick={() => handleCommand(powerOn ? 'OFF' : 'ON')}
              disabled={!btState.connected}
              className={`px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                powerOn 
                  ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                  : 'bg-green-500 text-white shadow-lg shadow-green-500/20'
              } ${!btState.connected ? 'opacity-20' : 'active:scale-95'}`}
            >
              <i className="fa-solid fa-power-off mr-2"></i>
              {powerOn ? 'Shut Down' : 'Ignition'}
            </button>
          </div>

          <ControlPad 
            onCommand={handleCommand} 
            disabled={!btState.connected} 
            powerOn={powerOn}
          />
        </div>
      </main>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-xs w-full shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-black text-xl italic tracking-tighter">PROTOCOL.TXT</h3>
              <button onClick={() => setShowInfo(false)} className="text-slate-500"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-6">
              NovaQuest transmits real-time UART pulses over BLE. <br/><br/>
              Expected delimiters: <code className="text-indigo-400">\n</code><br/>
              Forward: <code className="text-indigo-400">"up"</code><br/>
              Backward: <code className="text-indigo-400">"down"</code><br/>
              Neutral: <code className="text-indigo-400">"stop"</code>
            </p>
            <button 
              onClick={() => setShowInfo(false)}
              className="w-full py-4 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
