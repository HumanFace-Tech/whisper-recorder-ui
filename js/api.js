// API management for Whisper transcription and LLM processing

class APIHelper {
  static async parseResponse(response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  static extractText(data) {
    if (!data) return '';
    if (typeof data === 'string') return data.trim();
    
    // Standard OpenAI/Groq path
    if (data.choices?.[0]?.message?.content) return data.choices[0].message.content.trim();
    if (data.choices?.[0]?.text) return data.choices[0].text.trim();
    
    // Ollama /api/generate path
    if (data.response) return data.response.trim();
    
    // Ollama /api/chat path
    if (data.message?.content) return data.message.content.trim();
    
    // Various fallbacks
    const fallback = data.text || data.content || data.generated_text || data.output || data.result;
    if (fallback) return String(fallback).trim();
    
    // If it's an object but we don't recognize the keys, return stringified or empty
    return typeof data === 'object' ? JSON.stringify(data) : String(data);
  }
}

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
    
    // Some local servers expect 'audio_file', others 'file'
    const tryTranscribe = async (fieldName) => {
      const formData = new FormData();
      formData.append(fieldName, audioBlob, 'recording.wav');
      formData.append('task', 'transcribe');
      formData.append('language', 'auto');
      formData.append('output', 'txt');

      const response = await fetch(whisper.endpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await APIHelper.parseResponse(response);
      return APIHelper.extractText(result);
    };

    try {
      return await tryTranscribe('audio_file');
    } catch (error) {
      console.warn('Failed with audio_file, trying file...', error);
      try {
        return await tryTranscribe('file');
      } catch (retryError) {
        console.error('Local Whisper API error:', retryError);
        throw new Error(`Transcription failed: ${retryError.message}`);
      }
    }
  }

  async transcribeOpenAI(audioBlob) {
    const { whisper } = this.config;
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('model', whisper.model);
    formData.append('response_format', 'json'); // More reliable than 'text' for parsing

    try {
      const response = await fetch(whisper.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whisper.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await APIHelper.parseResponse(response);
        const msg = errorData.error?.message || response.statusText;
        throw new Error(`API error: ${response.status} - ${msg}`);
      }

      const result = await APIHelper.parseResponse(response);
      return APIHelper.extractText(result);
    } catch (error) {
      console.error('OpenAI Whisper API error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  async testConnection() {
    const { whisper } = this.config;
    if (!whisper.endpoint) throw new Error('Endpoint is required');

    try {
      if (whisper.apiFormat === 'local') {
        // Local Whisper: test the root endpoint
        const response = await fetch(whisper.endpoint.replace('/asr', '/'), { method: 'GET' });
        if (!response.ok) throw new Error(`Server returned status ${response.status}`);
        return true;
      } else {
        // OpenAI/Groq Compatible: test /models endpoint instead of /audio/transcriptions
        // because /audio/transcriptions blocks OPTIONS preflight but actual POST works fine
        const baseUrl = whisper.endpoint.split('/audio/transcriptions')[0];
        const headers = whisper.apiKey ? { 'Authorization': `Bearer ${whisper.apiKey}` } : {};
        const response = await fetch(`${baseUrl}/models`, { headers });
        
        if (response.status === 401) throw new Error('Invalid API Key');
        if (!response.ok) throw new Error(`Server status: ${response.status}`);
        return true;
      }
    } catch (error) {
      // Provide helpful message for CORS errors
      if (error.message.includes('fetch')) {
        throw new Error(`Connection failed. Note: Recording may still work even if this test fails due to CORS restrictions.`);
      }
      throw new Error(`Connection failed: ${error.message}`);
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

  async testConnection() {
    const { llm } = this.config;
    if (!llm.endpoint) throw new Error('Endpoint is required');

    try {
      if (llm.apiFormat === 'ollama') {
        const baseUrl = new URL(llm.endpoint).origin;
        const response = await fetch(`${baseUrl}/api/tags`);
        if (!response.ok) throw new Error(`Ollama status: ${response.status}`);
        return true;
      } else if (llm.apiFormat === 'openai') {
        const baseUrl = llm.endpoint.split('/chat/completions')[0];
        const response = await fetch(`${baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${llm.apiKey}` }
        });
        if (response.status === 401) throw new Error('Invalid API Key');
        if (!response.ok) throw new Error(`Server status: ${response.status}`);
        return true;
      }
      return true;
    } catch (error) {
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  async processOllama(text) {
    const { llm } = this.config;
    const isChat = llm.endpoint.includes('/api/chat');

    try {
      const body = isChat ? {
        model: llm.model,
        messages: [
          { role: 'system', content: llm.systemPrompt },
          { role: 'user', content: text }
        ],
        stream: false
      } : {
        model: llm.model,
        system: llm.systemPrompt,
        prompt: `Raw Transcribed Text: ${text}`,
        stream: false
      };

      const response = await fetch(llm.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Ollama error! status: ${response.status}`);
      }

      const data = await APIHelper.parseResponse(response);
      return APIHelper.extractText(data) || 'Error processing text.';
    } catch (error) {
      console.error('Ollama API error:', error);
      throw new Error(`Text processing failed: ${error.message}`);
    }
  }

  async processOpenAI(text) {
    const { llm } = this.config;
    
    try {
      const requestBody = {
        model: llm.model,
        messages: [
          { role: 'system', content: llm.systemPrompt },
          { role: 'user', content: `Raw Transcribed Text: ${text}` }
        ],
        temperature: llm.temperature || 0.3
      };

      const response = await fetch(llm.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${llm.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await APIHelper.parseResponse(response);
        const msg = errorData.error?.message || response.statusText;
        throw new Error(`API error: ${response.status} - ${msg}`);
      }

      const data = await APIHelper.parseResponse(response);
      return APIHelper.extractText(data) || 'Error processing text.';
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
          system: llm.systemPrompt,
          // Support chat-like custom endpoints too
          messages: [
            { role: 'system', content: llm.systemPrompt },
            { role: 'user', content: text }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await APIHelper.parseResponse(response);
      return APIHelper.extractText(data) || 'Error processing text.';
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
