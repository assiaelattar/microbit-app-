
export type Command = 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT' | 'STOP' | 'ON' | 'OFF';

export interface BluetoothState {
  connected: boolean;
  deviceName: string | null;
  error: string | null;
}

export interface GestureState {
  active: boolean;
  lastGesture: string | null;
  confidence: number;
}
