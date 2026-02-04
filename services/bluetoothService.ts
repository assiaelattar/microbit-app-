
// Nordic UART Service UUIDs (common for micro:bit)
const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

type BluetoothDevice = any;
type BluetoothRemoteGATTCharacteristic = any;

export class BluetoothService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  /**
   * Connects to a micro:bit via Web Bluetooth.
   * Note: This MUST be called directly from a user gesture (like a click)
   * to satisfy browser security policies.
   */
  async connect(): Promise<string> {
    const bluetooth = (navigator as any).bluetooth;
    
    if (!bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
      // Step 1: Request the device.
      // The browser checks the 'Permissions Policy' here.
      this.device = await bluetooth.requestDevice({
        filters: [{ namePrefix: 'BBC micro:bit' }],
        optionalServices: [UART_SERVICE_UUID]
      });

      // Step 2: Connect to the GATT server
      const server = await this.device.gatt?.connect();
      if (!server) throw new Error('Could not connect to NovaQuest GATT server.');

      // Step 3: Get the UART service
      const service = await server.getPrimaryService(UART_SERVICE_UUID);
      
      // Step 4: Get the TX characteristic
      this.characteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);

      // Setup disconnection listener
      this.device.addEventListener('gattserverdisconnected', () => {
        console.log('NovaQuest disconnected');
        this.device = null;
        this.characteristic = null;
      });

      return this.device.name || 'NovaQuest';
    } catch (error: any) {
      console.error('Bluetooth Connection Error:', error);
      
      // Handle the specific 'Permissions Policy' error
      if (error.name === 'SecurityError' || error.message.toLowerCase().includes('permissions policy')) {
        throw new Error('Bluetooth access is disallowed by your browser\'s permissions policy. If you are using an editor preview, try opening the app in a new window/tab.');
      }
      
      if (error.name === 'NotFoundError') {
        throw new Error('No NovaQuest device was selected.');
      }
      
      throw error;
    }
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.characteristic) return;
    try {
      const encoder = new TextEncoder();
      const mapped = this.mapCommandToString(command);
      if (mapped) {
        // Send command + newline as expected by micro:bit MakeCode UART
        await this.characteristic.writeValue(encoder.encode(mapped + '\n'));
      }
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  }

  private mapCommandToString(cmd: string): string | null {
    switch (cmd) {
      case 'FORWARD': return 'up';
      case 'BACKWARD': return 'down';
      case 'LEFT': return 'left';
      case 'RIGHT': return 'right';
      case 'STOP': return 'stop';
      case 'ON': return 'stop'; 
      case 'OFF': return 'stop';
      default: return null;
    }
  }

  disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }

  get isConnected(): boolean {
    return !!(this.device?.gatt?.connected && this.characteristic);
  }
}

export const bluetoothService = new BluetoothService();
