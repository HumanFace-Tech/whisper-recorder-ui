// Main application logic

class WhisperRecorderApp {
  constructor() {
    this.audioRecorder = new AudioRecorder();
    this.whisperAPI = null;
    this.llmAPI = null;
    this.currentText = '';
    this.processedText = '';
    
    this.initializeElements();
    this.initializeEventListeners();
    
    // Load configuration FIRST, then initialize APIs with loaded config
    configManager.load();
    this.initializeAPIs();
    
    configManager.addListener((config) => {
      this.initializeAPIs();
    });
  }

  initializeElements() {
    this.recordButton = document.getElementById('recordButton');
    this.transcribeStatus = document.getElementById('transcribeStatus');
    this.processStatus = document.getElementById('processStatus');
    this.contentBox = document.getElementById('contentBox');
    this.actionButtons = document.getElementById('actionButtons');
    this.retryButton = document.getElementById('retryButton');
    this.copyButton = document.getElementById('copyButton');
    
    // Check if all elements are found
    const requiredElements = {
      recordButton: this.recordButton,
      transcribeStatus: this.transcribeStatus,
      processStatus: this.processStatus,
      contentBox: this.contentBox,
      actionButtons: this.actionButtons,
      retryButton: this.retryButton,
      copyButton: this.copyButton
    };
    
    const missingElements = Object.entries(requiredElements)
      .filter(([name, element]) => !element)
      .map(([name]) => name);
    
    if (missingElements.length > 0) {
      throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
    }
  }

  initializeEventListeners() {
    // Record button
    this.recordButton.addEventListener('click', () => {
      this.toggleRecording();
    });

    // Status item clicks (tabs)
    this.transcribeStatus.addEventListener('click', () => {
      this.showTranscribedText();
    });

    this.processStatus.addEventListener('click', () => {
      this.showProcessedText();
    });

    // Retry button
    this.retryButton.addEventListener('click', () => {
      this.retryProcess();
    });

    // Copy button
    this.copyButton.addEventListener('click', () => {
      this.copyToClipboard();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        this.toggleRecording();
      }
    });

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.showInstallPrompt(e);
    });
  }

  initializeAPIs() {
    const config = configManager.config;
    this.whisperAPI = new WhisperAPI(config);
    this.llmAPI = new LLMAPI(config);
  }

  async toggleRecording() {
    if (this.audioRecorder.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      this.resetUI();
      LoadingManager.show('Starting recording...');
      
      await this.audioRecorder.startRecording();
      
      this.updateRecordButton(true);
      this.updateContent('Recording... Click to stop');
      LoadingManager.hide();
      
      Toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      LoadingManager.hide();
      Toast.error(error.message || 'Failed to start recording');
    }
  }

  async stopRecording() {
    try {
      LoadingManager.show('Stopping recording...');
      
      const audioBlob = await this.audioRecorder.stopRecording();
      
      this.updateRecordButton(false);
      LoadingManager.hide();
      
      // Start transcription process
      await this.processAudio(audioBlob);
      
    } catch (error) {
      console.error('Failed to stop recording:', error);
      LoadingManager.hide();
      Toast.error('Failed to stop recording');
    }
  }

  async processAudio(audioBlob) {
    try {
      // Step 1: Transcription
      this.updateStatusSection('transcribe', 'processing');
      LoadingManager.show('Transcribing audio...');
      
      this.currentText = await this.whisperAPI.transcribe(audioBlob);
      
      if (!this.currentText || this.currentText.trim() === '') {
        throw new Error('No text was transcribed from the audio');
      }
      
      // Mark transcription as complete (green) and show content
      this.updateStatusSection('transcribe', 'completed');
      this.updateContent(this.currentText);
      this.showActionButtons();
      
      // Step 2: LLM Processing
      this.updateStatusSection('process', 'processing');
      LoadingManager.show('Processing text...');
      
      this.processedText = await this.llmAPI.processText(this.currentText);
      
      // Mark processing as complete and show processed content
      this.updateStatusSection('process', 'completed');
      this.updateStatusSection('transcribe', 'clickable');
      this.updateContent(this.processedText, true);
      
      LoadingManager.hide();
      this.showActionButtons();
      
      // Auto-copy to clipboard
      await this.copyToClipboard();
      
      Toast.success('Processing complete!');
      
    } catch (error) {
      console.error('Processing failed:', error);
      LoadingManager.hide();
      
      this.updateStatusSection('transcribe', '');
      this.updateStatusSection('process', '');
      
      const errorMessage = error.message || 'Processing failed';
      this.updateContent(`Error: ${errorMessage}`);
      this.showRetryButton();
      
      Toast.error(errorMessage);
    }
  }

  updateRecordButton(isRecording) {
    const icon = this.recordButton.querySelector('.material-icons');
    const text = this.recordButton.querySelector('.record-text');
    
    if (isRecording) {
      this.recordButton.classList.add('recording');
      icon.textContent = 'stop';
      text.textContent = 'Stop';
      this.recordButton.setAttribute('aria-label', 'Stop Recording');
    } else {
      this.recordButton.classList.remove('recording');
      icon.textContent = 'mic';
      text.textContent = 'Record';
      this.recordButton.setAttribute('aria-label', 'Start Recording');
    }
  }

  updateStatusSection(section, state) {
    const element = document.getElementById(`${section}Status`);
    
    // Remove all state classes
    element.classList.remove('active', 'processing', 'clickable', 'completed');
    
    // Add new state class
    if (state) {
      element.classList.add(state);
    }

    // Make clickable if there's content to show
    if (section === 'transcribe' && this.currentText) {
      element.classList.add('clickable');
    }
    if (section === 'process' && this.processedText) {
      element.classList.add('clickable');
    }
  }

  showTranscribedText() {
    if (this.currentText) {
      this.updateContent(this.currentText, false);
      // Update visual state
      this.updateStatusSection('transcribe', 'active');
      this.updateStatusSection('process', this.processedText ? 'clickable' : 'completed');
    }
  }

  showProcessedText() {
    if (this.processedText) {
      this.updateContent(this.processedText, true);
      // Update visual state  
      this.updateStatusSection('process', 'active');
      this.updateStatusSection('transcribe', 'clickable');
    }
  }

  updateContent(text, isProcessed = false) {
    // Clear placeholder
    const placeholder = this.contentBox.querySelector('.placeholder');
    if (placeholder) {
      placeholder.remove();
    }
    
    this.contentBox.textContent = text;
    
    if (isProcessed) {
      this.contentBox.classList.add('processed');
    } else {
      this.contentBox.classList.remove('processed');
    }
  }

  showActionButtons() {
    DOMUtils.show(this.actionButtons);
    DOMUtils.hide(this.retryButton);
  }

  showRetryButton() {
    DOMUtils.hide(this.actionButtons);
    DOMUtils.show(this.retryButton);
  }

  resetUI() {
    // Reset record button
    this.updateRecordButton(false);
    
    // Reset status sections
    this.updateStatusSection('transcribe', '');
    this.updateStatusSection('process', '');
    
    // Reset content
    this.contentBox.innerHTML = `
      <div class="placeholder">
        <span class="material-icons">mic</span>
        <p>Recording...</p>
      </div>
    `;
    this.contentBox.classList.remove('processed');
    
    // Hide action buttons
    DOMUtils.hide(this.actionButtons);
    DOMUtils.hide(this.retryButton);
    
    // Clear text variables
    this.currentText = '';
    this.processedText = '';
  }

  async retryProcess() {
    this.resetUI();
    this.updateContent('Click record to start...');
  }

  async copyToClipboard() {
    const textToCopy = this.processedText || this.currentText;
    
    if (!textToCopy) {
      Toast.error('No text to copy');
      return;
    }
    
    try {
      const success = await ClipboardUtils.copy(textToCopy);
      
      if (success) {
        Toast.success('Copied to clipboard!');
      } else {
        Toast.error('Failed to copy to clipboard');
      }
    } catch (error) {
      console.error('Copy failed:', error);
      Toast.error('Copy failed - try again');
    }
  }

  showInstallPrompt(event) {
    // Show a custom install prompt
    const installToast = document.createElement('div');
    installToast.className = 'toast show';
    installToast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span>Install this app for a better experience</span>
        <button onclick="this.parentElement.parentElement.remove(); window.deferredPrompt?.prompt()" 
                style="background: white; color: var(--primary-color); border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
          Install
        </button>
      </div>
    `;
    
    document.body.appendChild(installToast);
    window.deferredPrompt = event;
    
    setTimeout(() => {
      installToast.remove();
    }, 10000);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add error handling for initialization
  try {
    // Ensure config manager is available
    if (!window.configManager) {
      throw new Error('ConfigManager not available');
    }
    
    // Initialize the app
    window.app = new WhisperRecorderApp();
    
    // Add some helpful console messages
    console.log('🎤 Whisper Recorder App loaded!');
    console.log('💡 Tip: Press Space to start/stop recording');
    console.log('⚙️ Access settings via the gear icon in the top-right corner');
    
    // Show a welcome toast
    setTimeout(() => {
      if (window.Toast) {
        Toast.info('Welcome! Click the gear icon to configure your APIs.');
      }
    }, 1000);
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Show error message in the UI
    const contentBox = document.getElementById('contentBox');
    if (contentBox) {
      contentBox.innerHTML = `
        <div style="color: #f44336; text-align: center; padding: 20px;">
          <h3>Initialization Error</h3>
          <p>${error.message}</p>
          <p><small>Check the browser console for details.</small></p>
        </div>
      `;
    }
  }
});
