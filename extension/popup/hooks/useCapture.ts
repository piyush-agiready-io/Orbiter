import { useState, useCallback, useEffect } from 'react';
import type { CapturedData, ExtMessageResponse } from '@ext/shared/types';

interface UseCaptureReturn {
  capturedData: CapturedData | null;
  screenshotDataUrl: string | null;
  isCapturing: boolean;
  captureError: string | null;
  capture: () => Promise<void>;
}

export function useCapture(): UseCaptureReturn {
  const [capturedData, setCapturedData] = useState<CapturedData | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    setIsCapturing(true);
    setCaptureError(null);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) {
        setCaptureError('No active tab found');
        return;
      }

      let pageData: CapturedData | null = null;
      try {
        const pageResponse: ExtMessageResponse<CapturedData> =
          await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_PAGE_DATA' });
        if (pageResponse.success && pageResponse.data) {
          pageData = pageResponse.data;
        }
      } catch {
        pageData = {
          url: tab.url || 'Unknown',
          consoleLogs: [],
          networkLogs: [],
          screenshot: null,
          device: 'Desktop',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Unknown',
          os: navigator.platform.includes('Win') ? 'Windows' :
              navigator.platform.includes('Mac') ? 'macOS' : 'Unknown',
          viewport: { width: tab.width || 0, height: tab.height || 0 },
        };
      }

      let screenshot: string | null = null;
      try {
        const screenshotResponse: ExtMessageResponse<string> =
          await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' });
        if (screenshotResponse.success && screenshotResponse.data) {
          screenshot = screenshotResponse.data;
        }
      } catch {
        // Screenshot capture may fail on restricted pages
      }

      if (pageData) {
        setCapturedData(pageData);
      }
      setScreenshotDataUrl(screenshot);
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : 'Capture failed');
    } finally {
      setIsCapturing(false);
    }
  }, []);

  useEffect(() => {
    capture();
  }, [capture]);

  return { capturedData, screenshotDataUrl, isCapturing, captureError, capture };
}
