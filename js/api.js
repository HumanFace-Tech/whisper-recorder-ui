// API management for Whisper transcription and LLM processing

class WhisperAPI {
  constructor(config) {
    this.config = config;
  }

  async transcribe(audioBlob) {
    const { whisper } = this.config;
    
    if (whisper.apiFormat === 'local') {
      return this.transcribeLocal(audioBlob);
    } else if (whisper.apiFormat === 'openai') {
      return this.transcribeOpenAI(audioBlob);
    }
    
    throw new Error('Unsupported Whisper API format');
  }

  async transcribeLocal(audioBlob) {
    const { whisper } = this.config;
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'recording.wav');
    formData.append('task', 'transcribe');
    formData.append('language', 'auto');
    formData.append('output', 'txt');

    try {
      const response = await fetch(whisper.endpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.text();
      return result.trim();
    } catch (error) {
      console.error('Local Whisper API error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  async transcribeOpenAI(audioBlob) {
    const { whisper } = this.config;
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', whisper.model);
    formData.append('response_format', 'text');

    try {
      const response = await fetch(whisper.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whisper.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.text();
      return result.trim();
    } catch (error) {
      console.error('OpenAI Whisper API error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }
}

class LLMAPI {
  constructor(config) {
    this.config = config;
  }

  async processText(text) {
    const { llm } = this.config;
    
    switch (llm.apiFormat) {
      case 'ollama':
        return this.processOllama(text);
      case 'openai':
        return this.processOpenAI(text);
      case 'custom':
        return this.processCustom(text);
      default:
        throw new Error('Unsupported LLM API format');
    }
  }

  async processOllama(text) {
    const { llm } = this.config;
    const prompt = `${llm.systemPrompt}\n\nText to process:\n${text}`;

    try {
      const response = await fetch(llm.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: llm.model,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'Error processing text.';
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Text processing failed: ${error.message}`);
    }
  }

  async processOpenAI(text) {
    const { llm } = this.config;
    
    try {
      const response = await fetch(llm.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llm.apiKey}`
        },
        body: JSON.stringify({
          model: llm.model,
          messages: [
            { role: 'system', content: llm.systemPrompt },
            { role: 'user', content: text }
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Error processing text.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Text processing failed: ${error.message}`);
    }
  }

  async processCustom(text) {
    const { llm } = this.config;
    
    try {
      const response = await fetch(llm.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(llm.apiKey && { 'Authorization': `Bearer ${llm.apiKey}` })
        },
        body: JSON.stringify({
          model: llm.model,
          prompt: text,
          system: llm.systemPrompt
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Generic handler for various response formats
      return data.text || 
             data.content || 
             data.response || 
             data.generated_text || 
             data.output ||
             'Error processing text.';
    } catch (error) {
      console.error('Custom API error:', error);
      throw new Error(`Text processing failed: ${error.message}`);
    }
  }
}

// Audio recording manager
class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.isRecording = false;
  }

  async startRecording() {
    try {
      this.stream = await AudioUtils.requestMicrophoneAccess();
      this.chunks = [];
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.getSupportedMimeType()
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error('No active recording to stop');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = await AudioUtils.createAudioFile(
            this.chunks, 
            this.mediaRecorder.mimeType
          );
          this.cleanup();
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.chunks = [];
    this.isRecording = false;
  }

  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/wav',
      'audio/mp3',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }
}

// Export classes for global use
window.WhisperAPI = WhisperAPI;
window.LLMAPI = LLMAPI;
window.AudioRecorder = AudioRecorder;
