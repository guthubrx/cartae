/**
 * Content Script - Cartae Office 365 Token Interceptor
 *
 * Injecté dans la page Cartae (localhost:5174)
 * Expose l'API browser.storage à la page web via window.postMessage
 */

console.log('[Cartae O365 Content Script] 🚀 Chargé dans la page');

// Inject browser API wrapper into page context
const script = document.createElement('script');
script.textContent = `
  (function() {
    console.log('[Cartae O365] 💉 API browser.storage injectée dans window');

    // Expose API to page via window.cartaeBrowserStorage
    window.cartaeBrowserStorage = {
      get: function(keys) {
        return new Promise((resolve) => {
          window.postMessage({
            type: 'CARTAE_STORAGE_GET',
            keys: keys
          }, '*');

          const handler = (event) => {
            if (event.data && event.data.type === 'CARTAE_STORAGE_GET_RESPONSE') {
              window.removeEventListener('message', handler);
              resolve(event.data.result);
            }
          };

          window.addEventListener('message', handler);
        });
      },

      set: function(items) {
        return new Promise((resolve) => {
          window.postMessage({
            type: 'CARTAE_STORAGE_SET',
            items: items
          }, '*');

          const handler = (event) => {
            if (event.data && event.data.type === 'CARTAE_STORAGE_SET_RESPONSE') {
              window.removeEventListener('message', handler);
              resolve();
            }
          };

          window.addEventListener('message', handler);
        });
      }
    };
  })();
`;
document.documentElement.appendChild(script);
script.remove();

// Listen for messages from page
window.addEventListener('message', async event => {
  // Only accept messages from same origin
  if (event.source !== window) return;

  if (event.data.type === 'CARTAE_STORAGE_GET') {
    console.log('[Cartae O365 Content Script] 📖 Lecture storage:', event.data.keys);

    try {
      const result = await browser.storage.local.get(event.data.keys);
      console.log('[Cartae O365 Content Script] ✅ Données lues:', Object.keys(result));

      window.postMessage(
        {
          type: 'CARTAE_STORAGE_GET_RESPONSE',
          result: result,
        },
        '*'
      );
    } catch (error) {
      console.error('[Cartae O365 Content Script] ❌ Erreur lecture:', error);
      window.postMessage(
        {
          type: 'CARTAE_STORAGE_GET_RESPONSE',
          result: {},
        },
        '*'
      );
    }
  }

  if (event.data.type === 'CARTAE_STORAGE_SET') {
    console.log('[Cartae O365 Content Script] 💾 Écriture storage:', Object.keys(event.data.items));

    try {
      await browser.storage.local.set(event.data.items);
      console.log('[Cartae O365 Content Script] ✅ Données écrites');

      window.postMessage(
        {
          type: 'CARTAE_STORAGE_SET_RESPONSE',
        },
        '*'
      );
    } catch (error) {
      console.error('[Cartae O365 Content Script] ❌ Erreur écriture:', error);
      window.postMessage(
        {
          type: 'CARTAE_STORAGE_SET_RESPONSE',
        },
        '*'
      );
    }
  }
});

console.log('[Cartae O365 Content Script] ✅ Prêt - Écoute des messages window.postMessage');
