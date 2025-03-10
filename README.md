# Portable Whisper ASR Recorder UI

A standalone, fully browser-based transcription tool that combines speech recognition with AI text formatting - requires no server to run!

## Introduction

This tool allows you to record audio directly in your browser, transcribe it using Whisper ASR (Automatic Speech Recognition), and then process the transcription with an LLM (Large Language Model) to improve formatting, fix grammar, and clean up the text.

![Whisper ASR Recorder UI Demo](https://nikro.me/static/74b20604596fcb78ffa333bbfc8d552e/example.gif)

### How It Works

1. **Recording**: Captures audio directly from your browser using the Web Audio API
2. **Transcription**: Sends the audio to a Whisper ASR service (either local or cloud-based)
3. **Processing**: Sends the raw transcription to an LLM for formatting and refinement
4. **Output**: Displays both the raw transcription and the processed text, with an option to copy to clipboard

The entire app runs in a single HTML file with no dependencies, making it highly portable and easy to use without installation.

For more information read the [Voice to Code - Blog Article](https://nikro.me/articles/professional/whisper-voice-code/).

## Setup Guide

### Quick Start

1. Download the `index.html` file
2. Open it directly in your browser
3. Click the ⚙️ icon to configure your settings
4. Start recording!

### Detailed Setup Options

#### Option 1: Local Setup (Self-hosted Services)

This configuration uses locally running instances of Whisper ASR and Ollama for LLM processing:

1. **Install and Run Local Whisper ASR Service**:
   ```bash
   # Using Docker
   docker pull onerahmet/openai-whisper-asr-webservice:latest
   docker run -d -p 9100:9000 onerahmet/openai-whisper-asr-webservice:latest
   ```

2. **Install and Run Ollama**:
   ```bash
   # Install Ollama (MacOS/Linux)
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Pull a model
   ollama pull qwen2.5-coder:14b
   
   # Start Ollama service (it runs on port 11434 by default)
   ollama serve
   ```

3. **Configure the App**:
   - Whisper API Endpoint: `http://localhost:9100/asr`
   - Whisper API Format: `Local Whisper`
   - LLM Provider: `Ollama`
   - LLM Endpoint: `http://localhost:11434/api/generate`
   - LLM Model: `qwen2.5-coder:14b`

Alternatively - you can use this fork: https://github.com/HumanFace-Tech/whisper-asr-with-ui

#### Option 2: Cloud-based Setup with Groq (No Local Services)

This configuration uses cloud services for both ASR and LLM processing:

1. **Sign Up for Groq**:
   - Create an account at [groq.com](https://groq.com)
   - Generate an API key from the dashboard
   - Note: Groq offers both LLM APIs as well as Whisper APIs through their OpenAI-compatible endpoints

2. **Configure the App for Groq**:
   - Whisper API Endpoint: `https://api.groq.com/openai/v1/audio/transcriptions`
   - Whisper API Format: `OpenAI/Groq Compatible`
   - Whisper API Key: `[Your Groq API Key]`
   - Whisper Model: `whisper-large-v3`
   - LLM Provider: `OpenAI-compatible`
   - LLM Endpoint: `https://api.groq.com/openai/v1/chat/completions`
   - LLM Model: `gemma2-9b-it` (from our tests - it works the best and is cost-effective)
   - API Key: `[Your Groq API Key]`

#### Option 3: Hybrid Setup (Local Whisper + Cloud LLM)

This combines local Whisper ASR with a cloud LLM service like Groq:

1. **Install and Run Local Whisper ASR Service** (as in Option 1)

2. **Configure the App**:
   - Whisper API Endpoint: `http://localhost:9100/asr`
   - Whisper API Format: `Local Whisper`
   - LLM Provider: `OpenAI-compatible`
   - LLM Endpoint: `https://api.groq.com/openai/v1/chat/completions`
   - LLM Model: `gemma2-9b-it`
   - API Key: `[Your Groq API Key]`

## Troubleshooting

- **Transcription fails**: Check that your Whisper service is running and accessible
- **API Connection Issues**: If connecting to external services, ensure your API key is valid and correctly entered
- **LLM processing fails**: Verify the model name exists and is spelled correctly
- **No audio recording**: Ensure your browser has microphone permissions
- **Cross-Origin Errors**: If using the app directly from a file, some services might block requests due to CORS policies

## Customizing the System Prompt

The default system prompt instructs the LLM how to format and clean up the transcribed text. You can customize this in the configuration panel to suit your specific needs:

- For more thorough corrections, emphasize grammar and spelling fixes
- For minimal interference, specify that the LLM should preserve the original wording
- For specialized formats (like code snippets), instruct the LLM to detect and format these elements properly

## Contributing

This tool is designed to be flexible and expandable. We welcome contributions to support additional ASR or LLM providers:

- **Supporting New LLM Providers**: Fork the repository and add handlers for new API formats
- **Improving Transcription**: Enhancements to audio processing or format conversion are welcome
- **UI Improvements**: Suggestions for better usability while maintaining the single-file approach

If you'd like to contribute or have suggestions, please feel free to fork the project or submit your ideas.

## License

This project is licensed under the MIT License.
