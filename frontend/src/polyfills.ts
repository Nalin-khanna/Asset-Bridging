// Polyfills for browser environment
import { Buffer } from 'buffer';

// Global Buffer polyfill
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (window as any).global = window;
  global.Buffer = global.Buffer || Buffer;
  global.process = global.process || {} as any;
  global.process.version = global.process.version || 'v16.0.0';
  global.process.browser = true;
}
