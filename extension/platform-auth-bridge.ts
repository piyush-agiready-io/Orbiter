const STORAGE_KEYS = {
  ACCESS_TOKEN: 'orbiter_access_token',
  USER: 'orbiter_user',
  TOKEN_EXPIRY: 'orbiter_token_expiry',
};

const TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function storeAuth(accessToken: string, user: unknown) {
  chrome.storage.local.set({
    [STORAGE_KEYS.ACCESS_TOKEN]: accessToken,
    [STORAGE_KEYS.USER]: JSON.stringify(user),
    [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + TOKEN_DURATION_MS,
  });
}

// Intercept login/refresh/register responses to capture tokens
try {
  const fetchOriginal = window.fetch;
  window.fetch = async function (...args) {
    const response = await fetchOriginal.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      if (url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh') || url.includes('/api/v1/auth/register')) {
        const cloned = response.clone();
        const data = await cloned.json();
        if (data.success && data.data?.accessToken && data.data?.user) {
          storeAuth(data.data.accessToken, data.data.user);
        }
      }
    } catch {}
    return response;
  };
} catch {}

// Also try to get auth immediately on page load by calling refresh
(async () => {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data?.accessToken && data.data?.user) {
        storeAuth(data.data.accessToken, data.data.user);
      }
    }
  } catch {}
})();

// Handle CHECK_PLATFORM_AUTH from extension popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CHECK_PLATFORM_AUTH') {
    // First check storage
    chrome.storage.local.get(
      [STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN_EXPIRY],
      async (result) => {
        const token = result[STORAGE_KEYS.ACCESS_TOKEN];
        const userStr = result[STORAGE_KEYS.USER];
        const expiry = result[STORAGE_KEYS.TOKEN_EXPIRY];

        if (token && userStr && expiry && Date.now() < expiry) {
          try {
            sendResponse({ success: true, data: { accessToken: token, user: JSON.parse(userStr) } });
            return;
          } catch {}
        }

        // Storage empty/expired — try refresh (content script is on platform origin, cookie will be sent)
        try {
          const res = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data?.accessToken && data.data?.user) {
              storeAuth(data.data.accessToken, data.data.user);
              sendResponse({ success: true, data: { accessToken: data.data.accessToken, user: data.data.user } });
              return;
            }
          }
        } catch {}

        sendResponse({ success: false });
      },
    );
    return true;
  }
});
