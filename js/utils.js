// Utility functions for the app

// Toast notification system
class Toast {
  static show(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    
    // Remove existing type classes
    toast.classList.remove('success', 'error', 'info', 'warning');
    
    // Add the current type class and show
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  static success(message, duration = 3000) {
    this.show(message, 'success', duration);
  }

  static error(message, duration = 4000) {
    this.show(message, 'error', duration);
  }

  static info(message, duration = 3000) {
    this.show(message, 'info', duration);
  }

  static warning(message, duration = 3500) {
    this.show(message, 'warning', duration);
  }
}

// Loading overlay management
class LoadingManager {
  static show(text = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    loadingText.textContent = text;
    overlay.classList.remove('hidden');
  }

  static hide() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.add('hidden');
  }

  static setText(text) {
    const loadingText = document.getElementById('loadingText');
    loadingText.textContent = text;
  }
}

// File utilities
class FileUtils {
  static downloadJSON(data, filename = 'whisper-config.json') {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}

// Audio utilities
class AudioUtils {
  static async requestMicrophoneAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      return stream;
    } catch (error) {
      console.error('Microphone access denied:', error);
      throw new Error('Microphone access is required for recording');
    }
  }

  static async convertToMp3(audioBlob) {
    // For now, just return the original blob
    // In a production app, you could use libraries like lamejs for MP3 encoding
    return audioBlob;
  }

  static async createAudioFile(chunks, mimeType = 'audio/wav') {
    const blob = new Blob(chunks, { type: mimeType });
    return blob;
  }
}

// DOM utilities
class DOMUtils {
  static show(element) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    element?.classList.remove('hidden');
  }

  static hide(element) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    element?.classList.add('hidden');
  }

  static toggle(element) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    element?.classList.toggle('hidden');
  }

  static addClass(element, className) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    element?.classList.add(className);
  }

  static removeClass(element, className) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    element?.classList.remove(className);
  }

  static hasClass(element, className) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    return element?.classList.contains(className) || false;
  }
}

// Clipboard utilities
class ClipboardUtils {
  static async copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (fallbackError) {
        console.error('Clipboard copy failed:', fallbackError);
        return false;
      }
    }
  }
}

// Validation utilities
class ValidationUtils {
  static isValidURL(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  static isValidJSON(string) {
    try {
      JSON.parse(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  static sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Debounce utility
function debounce(func, wait, immediate) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
}

// Throttle utility
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Event emitter for loose coupling
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

// Global event emitter
window.eventEmitter = new EventEmitter();

// Make utilities globally available
window.Toast = Toast;
window.LoadingManager = LoadingManager;
window.FileUtils = FileUtils;
window.AudioUtils = AudioUtils;
window.DOMUtils = DOMUtils;
window.ClipboardUtils = ClipboardUtils;
window.ValidationUtils = ValidationUtils;
window.debounce = debounce;
window.throttle = throttle;
