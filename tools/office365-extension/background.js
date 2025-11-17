/**
 * Background Script - Intercepteur Multi-Tokens Office 365
 *
 * Inspiré de POC_Office365/poc_simple.js
 * Intercepte les tokens Microsoft pour:
 * - OWA (Outlook)
 * - Graph API (SharePoint, Teams, OneDrive, etc.)
 * - SharePoint sites
 * - Teams
 *
 * Flow:
 * 1. User ouvre OWA (outlook.office365.com/owa/)
 * 2. User se connecte normalement (email + mot de passe SNCF)
 * 3. OWA demande plusieurs tokens à Microsoft en arrière-plan
 * 4. Notre extension intercepte TOUS ces tokens
 * 5. On extrait access_token + refresh_token pour chaque service
 * 6. On stocke dans browser.storage.local
 */

console.log('[Cartae O365] 🚀 Extension démarrée - Multi-tokens interceptor');

/**
 * Déterminer le type de token selon le scope
 */
function getTokenType(scopes, requestUrl) {
  const scopeStr = scopes.join(' ');

  if (scopeStr.includes('outlook.office.com')) {
    return { type: 'owa', emoji: '📧', name: 'OWA' };
  }
  if (scopeStr.includes('graph.microsoft.com')) {
    return { type: 'graph', emoji: '🔷', name: 'Graph API' };
  }
  if (scopeStr.includes('sharepoint.com')) {
    return { type: 'sharepoint', emoji: '📁', name: 'SharePoint' };
  }
  if (scopeStr.includes('teams.microsoft.com')) {
    return { type: 'teams', emoji: '💬', name: 'Teams' };
  }

  // SharePoint Framework utilise des GUIDs comme scope
  // On détecte via l'URL de redirection
  if (requestUrl && requestUrl.includes('sharepoint.com')) {
    return { type: 'sharepoint', emoji: '📁', name: 'SharePoint (SPFx)' };
  }

  return null; // Token non pertinent
}

/**
 * Intercepteur principal - Écoute TOUTES les requêtes HTTP
 */
browser.webRequest.onBeforeRequest.addListener(
  details => {
    console.log('[Cartae O365] 📡 Requête interceptée:', details.url);

    // Vérifier si c'est une requête vers le endpoint token Microsoft
    if (!details.url.includes('/oauth2/v2.0/token')) {
      return; // Pas le endpoint token, ignorer
    }

    console.log('[Cartae O365] 🎯 Requête token détectée!');

    // Vérifier qu'on a le corps de la requête
    if (!details.requestBody || !details.requestBody.formData) {
      console.log('[Cartae O365] ⚠️ Pas de formData dans requête');
      return;
    }

    // Extraire grant_type et scope
    const grantType = details.requestBody.formData.grant_type || [];
    const scope = details.requestBody.formData.scope || [];
    const scopes = scope.join(' ').split(' ');

    console.log('[Cartae O365] 📋 grant_type:', grantType);
    console.log('[Cartae O365] 📋 scopes:', scopes);

    // Déterminer le type de token (on passe aussi l'URL pour détecter SharePoint Framework)
    const tokenType = getTokenType(scopes, details.url);

    if (!tokenType) {
      console.log('[Cartae O365] ℹ️ Token non pertinent, ignoré');
      return;
    }

    // Vérifier qu'on veut capturer ce token :
    // - authorization_code OU refresh_token pour TOUS les types
    const shouldCapture =
      grantType.includes('authorization_code') || grantType.includes('refresh_token');

    if (!shouldCapture) {
      console.log(
        `[Cartae O365] ℹ️ ${tokenType.emoji} ${tokenType.name} - grant_type non pertinent (${grantType[0]})`
      );
      return;
    }

    console.log(`[Cartae O365] ✅ ${tokenType.emoji} Requête token ${tokenType.name} confirmée!`);
    console.log('[Cartae O365] ⏳ Installation du filtre de capture...');

    // Installer le filtre pour capturer la réponse
    const filter = browser.webRequest.filterResponseData(details.requestId);
    const decoder = new TextDecoder('utf-8');
    let responseData = '';

    // Callback: Appelé pour chaque chunk de données reçu
    filter.ondata = event => {
      // IMPORTANT: Transférer les données à OWA (transparence)
      filter.write(event.data);

      // Accumuler les données pour nous
      responseData += decoder.decode(event.data, { stream: true });
    };

    // Callback: Appelé quand toute la réponse est reçue
    filter.onstop = async event => {
      filter.close();

      console.log(`[Cartae O365] 📥 Réponse ${tokenType.name} complète reçue`);

      try {
        // Parser JSON
        const data = JSON.parse(responseData);

        if (data.access_token) {
          const accessToken = data.access_token;
          const refreshToken = data.refresh_token || null;

          console.log(
            `[Cartae O365] 🎉 ${tokenType.emoji} TOKEN ${tokenType.name.toUpperCase()} CAPTURÉ!`
          );
          console.log('[Cartae O365] 📋 Token (début):', accessToken.substring(0, 50) + '...');
          console.log('[Cartae O365] 📋 Refresh token:', refreshToken ? '✅ Oui' : '❌ Non');
          console.log('[Cartae O365] 📋 Expire dans:', data.expires_in, 'secondes');

          // Sauvegarder dans storage avec clé spécifique au type
          const storageKey = `cartae-o365-token-${tokenType.type}`;
          await browser.storage.local.set({
            [storageKey]: accessToken,
            [`${storageKey}-refresh`]: refreshToken,
            [`${storageKey}-expires-in`]: data.expires_in,
            [`${storageKey}-captured-at`]: new Date().toISOString(),
          });

          console.log(`[Cartae O365] 💾 Token ${tokenType.name} sauvegardé (clé: ${storageKey})`);

          // Notifier popup (si ouvert)
          try {
            browser.runtime.sendMessage({
              type: 'token-captured',
              tokenType: tokenType.type,
              token: accessToken,
              expiresIn: data.expires_in,
            });
          } catch (e) {
            // Popup peut ne pas être ouvert, ignorer erreur
          }
        } else {
          console.log(`[Cartae O365] ⚠️ Réponse ${tokenType.name} sans access_token`);
        }
      } catch (error) {
        console.error('[Cartae O365] ❌ Erreur parsing token:', error);
        console.error('[Cartae O365] Response data:', responseData.substring(0, 500));
      }
    };

    // Callback erreur
    filter.onerror = event => {
      console.error(`[Cartae O365] ❌ Erreur filtre ${tokenType.name}:`, filter.error);
    };
  },
  // Filtre URL: Seulement endpoint token Microsoft
  {
    urls: ['https://login.microsoftonline.com/*/oauth2/v2.0/token*'],
  },
  // Options: Mode bloquant + accès au corps de la requête
  ['blocking', 'requestBody']
);

console.log('[Cartae O365] 👂 Écoute des requêtes /oauth2/v2.0/token');

/**
 * Écouter messages depuis popup
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Cartae O365] 📨 Message reçu:', message);

  if (message.type === 'get-token') {
    // Popup demande tous les tokens
    browser.storage.local
      .get([
        // OWA
        'cartae-o365-token-owa',
        'cartae-o365-token-owa-refresh',
        'cartae-o365-token-owa-captured-at',
        'cartae-o365-token-owa-expires-in',
        // Graph API
        'cartae-o365-token-graph',
        'cartae-o365-token-graph-refresh',
        'cartae-o365-token-graph-captured-at',
        'cartae-o365-token-graph-expires-in',
        // SharePoint
        'cartae-o365-token-sharepoint',
        'cartae-o365-token-sharepoint-refresh',
        'cartae-o365-token-sharepoint-captured-at',
        'cartae-o365-token-sharepoint-expires-in',
        // Teams
        'cartae-o365-token-teams',
        'cartae-o365-token-teams-refresh',
        'cartae-o365-token-teams-captured-at',
        'cartae-o365-token-teams-expires-in',
      ])
      .then(data => {
        sendResponse({
          success: true,
          // Tokens OWA (pour compatibilité avec ancien code popup)
          token: data['cartae-o365-token-owa'],
          refreshToken: data['cartae-o365-token-owa-refresh'],
          capturedAt: data['cartae-o365-token-owa-captured-at'],
          expiresIn: data['cartae-o365-token-owa-expires-in'],
          // Tous les tokens
          tokens: {
            owa: {
              token: data['cartae-o365-token-owa'],
              refresh: data['cartae-o365-token-owa-refresh'],
              capturedAt: data['cartae-o365-token-owa-captured-at'],
              expiresIn: data['cartae-o365-token-owa-expires-in'],
            },
            graph: {
              token: data['cartae-o365-token-graph'],
              refresh: data['cartae-o365-token-graph-refresh'],
              capturedAt: data['cartae-o365-token-graph-captured-at'],
              expiresIn: data['cartae-o365-token-graph-expires-in'],
            },
            sharepoint: {
              token: data['cartae-o365-token-sharepoint'],
              refresh: data['cartae-o365-token-sharepoint-refresh'],
              capturedAt: data['cartae-o365-token-sharepoint-captured-at'],
              expiresIn: data['cartae-o365-token-sharepoint-expires-in'],
            },
            teams: {
              token: data['cartae-o365-token-teams'],
              refresh: data['cartae-o365-token-teams-refresh'],
              capturedAt: data['cartae-o365-token-teams-captured-at'],
              expiresIn: data['cartae-o365-token-teams-expires-in'],
            },
          },
        });
      });

    return true; // Réponse asynchrone
  }

  if (message.type === 'clear-token') {
    // Popup demande de nettoyer tous les tokens
    browser.storage.local
      .remove([
        'cartae-o365-token-owa',
        'cartae-o365-token-owa-refresh',
        'cartae-o365-token-owa-captured-at',
        'cartae-o365-token-owa-expires-in',
        'cartae-o365-token-graph',
        'cartae-o365-token-graph-refresh',
        'cartae-o365-token-graph-captured-at',
        'cartae-o365-token-graph-expires-in',
        'cartae-o365-token-sharepoint',
        'cartae-o365-token-sharepoint-refresh',
        'cartae-o365-token-sharepoint-captured-at',
        'cartae-o365-token-sharepoint-expires-in',
        'cartae-o365-token-teams',
        'cartae-o365-token-teams-refresh',
        'cartae-o365-token-teams-captured-at',
        'cartae-o365-token-teams-expires-in',
      ])
      .then(() => {
        console.log('[Cartae O365] 🧹 Tous les tokens nettoyés');

        sendResponse({ success: true });
      });

    return true; // Réponse asynchrone
  }
});

console.log('[Cartae O365] 📬 Écoute des messages depuis popup - Multi-tokens ready');
