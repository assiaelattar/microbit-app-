
import React from 'react';
import { Command } from '../types';

interface ControlPadProps {
  onCommand: (cmd: Command) => void;
  disabled: boolean;
  powerOn: boolean;
}

const ControlPad: React.FC<ControlPadProps> = ({ onCommand, disabled, powerOn }) => {
  const isAvailable = !disabled && powerOn;

  const btnClass = (color: string = 'indigo') => `
    w-16 h-16 sm:w-20 sm:h-20 rounded-[24px] flex items-center justify-center text-2xl transition-all duration-150 touch-none
    ${!isAvailable 
      ? 'bg-slate-800 text-slate-700 opacity-40 cursor-not-allowed' 
      : `bg-${color}-600/10 border-2 border-${color}-500/20 text-${color}-400 active:scale-90 active:bg-${color}-500 active:text-white shadow-lg shadow-${color}-500/5`
    }
  `;

  const handlePointerDown = (cmd: Command) => {
    if (isAvailable) onCommand(cmd);
  };

  const handlePointerUp = () => {
    if (isAvailable) onCommand('STOP');
  };

  return (
    <div className="flex justify-center items-center">
      <div className="control-grid">
        <div style={{ gridArea: 'up' }}>
          <button 
            onPointerDown={() => handlePointerDown('FORWARD')}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={!isAvailable}
            className={btnClass()}
          >
            <i className="fa-solid fa-caret-up"></i>
          </button>
        </div>
        <div style={{ gridArea: 'left' }}>
          <button 
            onPointerDown={() => handlePointerDown('LEFT')}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={!isAvailable}
            className={btnClass()}
          >
            <i className="fa-solid fa-caret-left"></i>
          </button>
        </div>
        <div style={{ gridArea: 'stop' }}>
          <button 
            onClick={() => onCommand('STOP')}
            disabled={!isAvailable}
            className={btnClass('red')}
          >
            <i className="fa-solid fa-stop text-sm"></i>
          </button>
        </div>
        <div style={{ gridArea: 'right' }}>
          <button 
            onPointerDown={() => handlePointerDown('RIGHT')}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={!isAvailable}
            className={btnClass()}
          >
            <i className="fa-solid fa-caret-right"></i>
          </button>
        </div>
        <div style={{ gridArea: 'down' }}>
          <button 
            onPointerDown={() => handlePointerDown('BACKWARD')}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            disabled={!isAvailable}
            className={btnClass()}
          >
            <i className="fa-solid fa-caret-down"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPad;
