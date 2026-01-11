# Whisper Recorder UI - Agent Guidelines

This document provides essential context and rules for AI agents working on the **Whisper Recorder UI** project.

## 1. Project Overview & Architecture
This is a **client-side only Progressive Web App (PWA)** for voice transcription and AI text refinement. It is designed to be zero-dependency, running directly in any modern browser without a build step.

- **Core Stack**: HTML5, CSS3, Vanilla JavaScript (ES6+).
- **No Build Tools**: Edits are immediate. No Webpack, Parcel, or npm dependencies.
- **Key Files**:
  - `index.html`: Entry point, UI structure, and script loading order.
  - `css/styles.css`: All application styling including themes and mobile-first responsiveness.
  - `js/app.js`: Orchestrates the flow between recording, transcribing, and processing.
  - `js/api.js`: Low-level API handlers for Whisper (ASR) and LLM providers.
  - `js/config.js`: Configuration management using `localStorage` and a singleton `ConfigManager`.
  - `js/utils.js`: Shared utility classes (`Toast`, `LoadingManager`, `AudioUtils`, `DOMUtils`).
  - `js/settings.js`: Management of the configuration UI and service presets.

## 2. Build, Lint, & Test Commands
As a vanilla JS project, standard `npm` or `node` commands do not apply.

- **"Build"**: Simply save your changes. The browser reflects them on refresh.
- **Linting**: No automated linter. Maintain code quality by:
  - Following existing indentation (2 spaces) and semicolon usage.
  - Using descriptive variable names and avoiding global scope pollution.
- **Testing**:
  - **Manual Testing**: Open `index.html` in a browser and verify functionality.
  - **Automated Validation**: Use `check.html` to verify that all core modules load without console errors.
  - **Single Test**: If you need to test a specific logic (e.g., API response handling), create a temporary `test-case.html` that imports the relevant JS files and asserts behavior.
  - **PWA Check**: Verify `sw.js` updates if core assets change.

### **Dealing with Browser Cache & Service Worker**
Since this is a PWA with aggressive caching, you may encounter stale code issues during development:

1. **Python HTTP Server**: If you're testing locally via `python3 -m http.server 8080`, **restart the server** after making code changes to ensure fresh files are served.
   ```bash
   # Find and kill the server
   ps aux | grep "http.server 8080" | grep -v grep
   kill <PID>
   
   # Restart
   python3 -m http.server 8080
   ```

2. **Service Worker Cache**: The PWA's service worker (`sw.js`) caches all assets. To force a refresh:
   - **Via Playwright**: Use `playwright_browser_press_key` with `Control+Shift+R` to perform a hard refresh
   - **Manually**: Ctrl+Shift+R (or Cmd+Shift+R on Mac) in the browser
   - **Programmatically**: Use `playwright_browser_evaluate` to unregister the service worker and clear caches:
     ```javascript
     async () => {
       const registrations = await navigator.serviceWorker.getRegistrations();
       for (let reg of registrations) await reg.unregister();
       const cacheNames = await caches.keys();
       for (let name of cacheNames) await caches.delete(name);
     }
     ```

3. **Cache Version**: When deploying changes, always increment the `CACHE_NAME` version in `sw.js` (e.g., `v2.3` → `v2.4`).

## 3. Code Style & Conventions

### JavaScript (ES6+)
- **Imports/Exports**: Native JS modules are NOT used. Scripts are loaded via `<script>` tags in a specific order:
  1. `js/config.js` -> `js/utils.js` -> `js/api.js` -> `js/settings.js` -> `js/app.js`
- **Classes**: Always use `class` syntax.
- **Async/Await**: Mandatory for API calls and hardware access.
- **DOM**: Use `document.getElementById` or `querySelector`. Cache elements in constructors.
- **Error Handling**: Wrap async flows in `try/catch`. Use `Toast.error(msg)` for user feedback.

## 4. Agent Operational Rules & Workflow

### **Available Agents**
Instead of inventing custom agents, utilize the specific sub-agents available in this environment:
- **`@explore` (Explorer)**: Fast, read-only codebase exploration. Use this to find files, understand flows, and plan *before* asking for code changes.
- **`@code` (Coder)**: The builder. Implements changes, runs tests, and ensures syntax correctness. It should receive clear, well-researched tasks.
- **`@oracle` (Oracle)**: Deep technical investigation. Use this when the `@code` agent gets stuck or when you need a high-confidence "second opinion" on a complex bug.
- **`@docs` (Writer)**: Documentation specialist. Use this for writing or updating documentation files (README, AGENTS.md, inline docs).
- **`@git-committer` (Git)**: Git operations specialist. Stages files and creates structured commits. **Always** use this agent to finalize a task.

### **The Orchestration Flow (Primary Agent)**
If you are the primary agent (Orchestrator), your job is to manage the process, not just write code immediately.
1. **Analyze**: Discuss with the user to clarify requirements.
2. **Research**: Delegate to **`@explore`** to map out the files and logic needing changes.
   - *Example*: "Find where the recording state is toggled in `js/app.js`."
3. **Plan & Execute**: Based on the exploration, formulate a concrete task for **`@code`** or **`@docs`**.
   - *Bad*: "Fix the bug."
   - *Good*: "Update `js/app.js` to handle the 'permission denied' error in `startRecording` by catching the error and calling `Toast.error`."
4. **Recover**: If **`@code`** fails or introduces regressions, use **`@oracle`** to diagnose the root cause, then instruct `@code` again with the fix.
5. **Finalize**: Once the task is complete and verified, use **`@git-committer`** to save the changes.

### **Sub-Agent Rules**
- **No Delegation**: If you are acting as a sub-agent (e.g., you were called as `@code`), **do not delegate further**. You are the worker node. Execute the specific task given to you using your tools (`edit`, `write`, `bash`).
- **Context is King**: When passing tasks to `@code`, ensure you provide the filenames and context discovered by `@explore`.

## 5. Deployment & PWA
- Deployment is automatic via GitHub Pages.
- **Service Worker**: `sw.js` manages caching. If you modify core assets, ensure the cache versioning or strategy is updated.
- **Paths**: Always use relative paths (`./js/...`).

## 6. API & Security
- **Config**: API keys and endpoints are stored in `localStorage`.
- **Keys**: NEVER hardcode API keys. Use the `configManager` to retrieve them.
- **Presets**: Keep "Quick Setup" presets in `js/settings.js` functional.

## 7. Interaction Flow
1. **User records audio**: `AudioRecorder` (API).
2. **Raw audio blob**: Sent to `WhisperAPI`.
3. **Transcription**: Returned to `WhisperRecorderApp` (App).
4. **Text refinement**: Sent to `LLMAPI` (API).
5. **Final Output**: Displayed & auto-copied via `ClipboardUtils`.
