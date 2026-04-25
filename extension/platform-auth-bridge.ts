const STORAGE_KEYS = {
  ACCESS_TOKEN: 'orbiter_access_token',
  USER: 'orbiter_user',
  TOKEN_EXPIRY: 'orbiter_token_expiry',
};

const TOKEN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function tryExtractAuth() {
  try {
    const scriptTags = document.querySelectorAll('script[id="__NEXT_DATA__"]');
    if (scriptTags.length > 0) return;

    const zustandStoreEl = document.querySelector('[data-zustand-store]');
    if (zustandStoreEl) return;

    const fetchOriginal = window.fetch;
    window.fetch = async function (...args) {
      const response = await fetchOriginal.apply(this, args);

      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

        if (url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/refresh') || url.includes('/api/v1/auth/register')) {
          const cloned = response.clone();
          const data = await cloned.json();

          if (data.success && data.data?.accessToken && data.data?.user) {
            chrome.storage.local.set({
              [STORAGE_KEYS.ACCESS_TOKEN]: data.data.accessToken,
              [STORAGE_KEYS.USER]: JSON.stringify(data.data.user),
              [STORAGE_KEYS.TOKEN_EXPIRY]: Date.now() + TOKEN_DURATION_MS,
            });
          }
        }
      } catch {}

      return response;
    };
  } catch {}
}

tryExtractAuth();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'CHECK_PLATFORM_AUTH') {
    chrome.storage.local.get(
      [STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN_EXPIRY],
      (result) => {
        const token = result[STORAGE_KEYS.ACCESS_TOKEN];
        const userStr = result[STORAGE_KEYS.USER];
        const expiry = result[STORAGE_KEYS.TOKEN_EXPIRY];

        if (token && userStr && expiry && Date.now() < expiry) {
          try {
            sendResponse({ success: true, data: { accessToken: token, user: JSON.parse(userStr) } });
          } catch {
            sendResponse({ success: false });
          }
        } else {
          sendResponse({ success: false });
        }
      },
    );
    return true;
  }
});
