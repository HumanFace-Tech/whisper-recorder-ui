// tests/playthrough.spec.js
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const keysPath = path.join(__dirname, 'keys.json');
let realKeys = null;
if (fs.existsSync(keysPath)) {
  try {
    realKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
  } catch (e) {
    console.warn('Failed to parse keys.json');
  }
}

test.describe('Whisper Recorder UI Play-through', () => {
  test.beforeEach(async ({ page }) => {
    // Setup Mocks
    await page.addInitScript(() => {
      window.MediaRecorder = class MockMediaRecorder {
        constructor(stream) { this.state = 'inactive'; }
        start() {
          this.state = 'recording';
          setTimeout(() => {
            this.ondataavailable({ data: new Blob(['test'], { type: 'audio/webm' }) });
          }, 100);
        }
        stop() {
          this.state = 'inactive';
          setTimeout(() => this.onstop(), 100);
        }
        static isTypeSupported() { return true; }
      };

      navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [{ stop: () => {} }]
      });

      // Only mock if no real keys are provided or if explicitly told to mock
      const originalFetch = window.fetch;
      window.fetch = async (url, options) => {
        // Mock default behavior unless it's a localhost request (likely the dev server)
        const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
        const isExternalApi = !isLocalhost;

        if (isExternalApi && !window.__USE_REAL_APIS__) {
          if (url.includes('transcriptions')) return { 
            ok: true, 
            text: async () => "Mocked transcription.",
            json: async () => ({ text: "Mocked transcription." })
          };
          if (url.includes('completions') || url.includes('generate') || url.includes('chat')) return { 
            ok: true, 
            json: async () => ({ 
              choices: [{ message: { content: "Mocked AI output." } }],
              response: "Mocked AI output.",
              message: { content: "Mocked AI output." }
            }),
            text: async () => JSON.stringify({ response: "Mocked AI output." })
          };
          if (url.includes('models') || url.includes('tags')) return { ok: true, json: async () => ({ data: [] }) };
        }
        return originalFetch(url, options);
      };
    });

    await page.goto('http://localhost:8080');
  });

  test('full recording and processing flow with Groq preset', async ({ page }) => {
    // 1. Configure
    await page.click('#settingsToggle');
    await page.click('.preset-btn[data-preset="groq-everywhere"]');
    
    if (realKeys?.groq_api_key) {
      await page.fill('#llmApiKey', realKeys.groq_api_key);
      await page.fill('#whisperApiKey', realKeys.groq_api_key);
    }

    await page.click('#saveConfig');
    await page.click('#closeSettings');

    // 2. Record
    await page.click('#recordButton');
    await expect(page.locator('#recordButton')).toHaveClass(/recording/);
    
    await page.waitForTimeout(500);
    await page.click('#recordButton', { force: true });

    // 3. Verify Stages
    await expect(page.locator('#transcribeStatus')).toHaveClass(/completed/, { timeout: 10000 });
    await expect(page.locator('#processStatus')).toHaveClass(/completed/, { timeout: 10000 });

    // 4. Verify Final Output
    const content = await page.textContent('#contentBox');
    expect(content.length).toBeGreaterThan(0);
    await expect(page.locator('#contentBox')).toHaveClass(/processed/);
  });

  test('Test Connection functionality', async ({ page }) => {
    await page.click('#settingsToggle');
    
    // Voice tab test connection
    await page.click('.tab-btn[data-tab="voice"]');
    await page.click('#testWhisperConn');
    // In mock mode, this should succeed
    const whisperToast = page.locator('#toast');
    await expect(whisperToast).toHaveClass(/show success/);

    // Formatting tab test connection
    await page.click('.tab-btn[data-tab="formatting"]');
    await page.click('#testLLMConn');
    const llmToast = page.locator('#toast');
    await expect(llmToast).toHaveClass(/show success/);
  });
});
