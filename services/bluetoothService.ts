
// Nordic UART Service UUIDs (common for micro:bit)
const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

export type BluetoothLog = {
  time: string;
  msg: string;
  type: 'info' | 'error' | 'tx';
};

export class BluetoothService {
  private device: any = null;
  private characteristic: any = null;
  private onLogListener: ((log: BluetoothLog) => void) | null = null;

  setLogListener(listener: (log: BluetoothLog) => void) {
    this.onLogListener = listener;
  }

  private log(msg: string, type: 'info' | 'error' | 'tx' = 'info') {
    const log: BluetoothLog = {
      time: new Date().toLocaleTimeString().split(' ')[0],
      msg,
      type
    };
    console.log(`[BT ${type.toUpperCase()}] ${msg}`);
    this.onLogListener?.(log);
  }

  async connect(): Promise<string> {
    const bluetooth = (navigator as any).bluetooth;
    
    if (!bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser.');
    }

    try {
      this.log('Requesting NovaQuest device...');
      this.device = await bluetooth.requestDevice({
        filters: [{ namePrefix: 'BBC micro:bit' }],
        optionalServices: [UART_SERVICE_UUID]
      });

      this.log(`Connecting to GATT server on ${this.device.name}...`);
      const server = await this.device.gatt?.connect();
      if (!server) throw new Error('Could not connect to GATT server.');

      this.log('Fetching UART Service...');
      const service = await server.getPrimaryService(UART_SERVICE_UUID);
      
      this.log('Fetching TX/RX characteristic...');
      // 0002 is the RX characteristic on the peripheral side (what we write to)
      this.characteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);

      this.device.addEventListener('gattserverdisconnected', () => {
        this.log('Device disconnected!', 'error');
        this.device = null;
        this.characteristic = null;
      });

      this.log('System ready for transmission.');
      return this.device.name || 'NovaQuest';
    } catch (error: any) {
      this.log(error.message, 'error');
      throw error;
    }
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.characteristic) {
      this.log('Cannot send: Not connected', 'error');
      return;
    }
    
    try {
      const mapped = this.mapCommandToString(command);
      if (mapped) {
        const encoder = new TextEncoder();
        const data = encoder.encode(mapped + '\n');
        // writeValue is standard for newer browsers
        await this.characteristic.writeValue(data);
        this.log(`SENT: "${mapped}"`, 'tx');
      }
    } catch (error: any) {
      this.log(`TX Fail: ${error.message}`, 'error');
    }
  }

  private mapCommandToString(cmd: string): string | null {
    switch (cmd) {
      case 'FORWARD': return 'up';
      case 'BACKWARD': return 'down';
      case 'LEFT': return 'left';
      case 'RIGHT': return 'right';
      case 'STOP': return 'stop';
      case 'ON': return 'on'; 
      case 'OFF': return 'off';
      default: return null;
    }
  }

  disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
      this.log('Manual disconnection initiated.');
    }
  }

  get isConnected(): boolean {
    return !!(this.device?.gatt?.connected && this.characteristic);
  }
}

export const bluetoothService = new BluetoothService();
