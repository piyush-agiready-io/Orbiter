# Orbiter Chrome Extension

One-click bug capture for the Orbiter platform.

## What It Does

1. **Click the extension icon** -- Popup opens
2. **Auto-login** -- If you're logged into Orbiter in your browser, the extension auto-detects your session
3. **Auto-capture** -- Immediately captures:
   - Current page URL
   - Console errors and warnings
   - Browser/OS/device info
   - Viewport dimensions
   - Screenshot of the current tab
4. **Select project** -- Choose which project to file the bug against
5. **Describe the bug** -- Type or use voice input (Deepgram)
6. **Submit** -- Bug is created in Orbiter with all captured context

## Setup

1. Build: `cd extension && npm install && npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" -> select `extension/build/`
5. Pin the Orbiter extension in your toolbar

## Testing

1. Log into Orbiter at `http://localhost:3000`
2. Navigate to any webpage
3. Click the Orbiter extension icon
4. You should be auto-logged in (if logged into the platform)
5. Select a project, describe a bug, submit
6. Check Orbiter -> Bugs tab to see the captured bug with metadata
