/**
 * Office365SyncTab - Composant de synchronisation Office365
 *
 * Extrait de CartaeDemoPage.tsx pour gérer la synchronisation
 * des emails, Teams et Planner avec PostgreSQL
 */

import React, { useState } from 'react';
import { CartaeItemCard, CartaeItemDetail } from '@cartae/ui';
import type { CartaeItem } from '@cartae/core/types/CartaeItem';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { BackendStatusBanner } from '../components/BackendStatusBanner';

const Office365SyncTab: React.FC = () => {
  // Office365 Sync State
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    itemsImported?: number;
    itemsSkipped?: number;
    totalProcessed?: number;
    errors?: string[];
    error?: string;
  } | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);

  // Teams Sync State
  const [teamsSyncLoading, setTeamsSyncLoading] = useState(false);
  const [teamsSyncResult, setTeamsSyncResult] = useState<{
    success: boolean;
    itemsImported?: number;
    itemsSkipped?: number;
    totalProcessed?: number;
    errors?: string[];
    error?: string;
  } | null>(null);

  // Planner Sync State
  const [plannerSyncLoading, setPlannerSyncLoading] = useState(false);
  const [plannerSyncResult, setPlannerSyncResult] = useState<{
    success: boolean;
    itemsImported?: number;
    itemsSkipped?: number;
    totalProcessed?: number;
    plansProcessed?: number;
    errors?: string[];
    error?: string;
  } | null>(null);

  // Planner SSE Progress State
  const [plannerProgress, setPlannerProgress] = useState<{
    phase: string;
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Office365 Items State
  const [office365Items, setOffice365Items] = useState<CartaeItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CartaeItem | null>(null);

  // Backend Health Check (Session 127 - vérification backend disponible)
  const { state: backendHealthState, recheck: recheckBackendHealth } = useBackendHealth();

  // Charger le token depuis browser.storage au chargement (avec retry pour race condition)
  React.useEffect(() => {
    let retryCount = 0;
    const MAX_RETRIES = 20; // 20 secondes max
    let timeoutId: number | null = null;

    const checkAndLoadToken = () => {
      const browserStorage = (window as any).cartaeBrowserStorage;

      if (!browserStorage) {
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          console.log(
            `[Office365] Extension pas encore prête, retry ${retryCount}/${MAX_RETRIES}...`
          );
          timeoutId = window.setTimeout(checkAndLoadToken, 1000); // Retry après 1 sec
          return;
        }
        console.warn(
          '[Office365] Extension non disponible après 20s (window.cartaeBrowserStorage manquant)'
        );
        return;
      }

      console.log('[Office365] Extension détectée, lecture token...');

      // Lire le token OWA depuis browser.storage.local
      browserStorage
        .get(['cartae-o365-token-owa', 'cartae-o365-token-owa-captured-at'])
        .then((result: any) => {
          const token = result['cartae-o365-token-owa'];
          const capturedAt = result['cartae-o365-token-owa-captured-at'];

          if (token) {
            console.log(`[Office365] ✅ Token OWA trouvé (capturé à ${capturedAt})`);
            console.log('[Office365] Token (début):', `${token.substring(0, 50)}...`);
            setCurrentToken(token);
          } else {
            console.log(
              '[Office365] ℹ️ Pas de token OWA dans storage - allez sur outlook.office.com pour vous connecter'
            );
          }
        })
        .catch((error: any) => {
          console.error('[Office365] Erreur lecture token:', error);
        });
    };

    // Démarrer la vérification
    checkAndLoadToken();

    // Cleanup : annuler le timeout si le composant unmount
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  // Fetch Office365 Items from Database
  const fetchOffice365Items = async () => {
    setItemsLoading(true);
    try {
      console.log('[Office365] Récupération des items depuis PostgreSQL...');

      const response = await fetch(
        'http://localhost:3001/api/office365/items?userId=4397e804-31e5-44c4-b89e-82058fa8502b&limit=100'
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP ${response.status}`);
      }

      console.log(`[Office365] ✅ ${data.count} items récupérés:`, data.items);
      setOffice365Items(data.items);
    } catch (error) {
      console.error('[Office365] ❌ Erreur récupération items:', error);
      setOffice365Items([]);
    } finally {
      setItemsLoading(false);
    }
  };

  // Fetch All Sources Items (Unified Architecture Session 119)
  const fetchAllSourcesItems = async () => {
    console.log('[AllSources] 🔄 Récupération items de toutes les sources...');

    const userId = '4397e804-31e5-44c4-b89e-82058fa8502b'; // Demo user UUID
    const allFetchedItems: CartaeItem[] = [];

    // 1. Récupérer items Mail (Office365)
    try {
      console.log('[AllSources] → Récupération Mail...');
      const mailResponse = await fetch(
        `http://localhost:3001/api/office365/items?userId=${userId}&limit=100`
      );
      if (mailResponse.ok) {
        const mailData = await mailResponse.json();
        const mailItems = mailData.items || [];
        console.log(`[AllSources] ✅ Mail: ${mailItems.length} items`);
        allFetchedItems.push(...mailItems);
      } else {
        console.warn('[AllSources] ⚠️ Mail API erreur:', mailResponse.status);
      }
    } catch (error) {
      console.error('[AllSources] ❌ Mail fetch error:', error);
    }

    // 2. Récupérer items Teams (Office365)
    try {
      console.log('[AllSources] → Récupération Teams...');
      const teamsResponse = await fetch(
        `http://localhost:3001/api/office365/teams/items?userId=${userId}&limit=100`
      );
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        const teamsItems = teamsData.items || [];
        console.log(`[AllSources] ✅ Teams: ${teamsItems.length} items`);
        allFetchedItems.push(...teamsItems);
      } else {
        console.warn('[AllSources] ⚠️ Teams API erreur:', teamsResponse.status);
      }
    } catch (error) {
      console.error('[AllSources] ❌ Teams fetch error:', error);
    }

    // 3. Récupérer items Planner (Office365)
    try {
      console.log('[AllSources] → Récupération Planner...');
      const plannerResponse = await fetch(
        `http://localhost:3001/api/office365/planner/items?userId=${userId}&limit=100`
      );
      if (plannerResponse.ok) {
        const plannerData = await plannerResponse.json();
        const plannerItems = plannerData.items || [];
        console.log(`[AllSources] ✅ Planner: ${plannerItems.length} items`);
        allFetchedItems.push(...plannerItems);
      } else {
        console.warn('[AllSources] ⚠️ Planner API erreur:', plannerResponse.status);
      }
    } catch (error) {
      console.error('[AllSources] ❌ Planner fetch error:', error);
    }

    // 4. Trier par date DESC (mélanger tous les types)
    allFetchedItems.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA; // DESC (plus récent en premier)
    });

    console.log(
      `[AllSources] 🎯 Total items réels: ${allFetchedItems.length} (Mail + Teams + Planner, triés par date DESC)`
    );
  };

  // Office365 Sync Function
  const handleOffice365Sync = async () => {
    setSyncLoading(true);
    setSyncResult(null);

    try {
      // Vérifier que l'extension est présente
      const browserStorage = (window as any).cartaeBrowserStorage;
      if (!browserStorage) {
        throw new Error(
          "Extension Cartae non détectée. Installez l'extension Firefox pour synchroniser Office365."
        );
      }

      console.log('[Office365] Lecture token depuis browser.storage...');

      // Récupérer le token OWA (a Mail.Read) au lieu de Graph (n'a que Chat.Read)
      const result = await browserStorage.get(['cartae-o365-token-owa', 'cartae-o365-token-graph']);
      // Préférer OWA pour les emails (a Mail.Read), fallback sur Graph
      const token = result['cartae-o365-token-owa'] || result['cartae-o365-token-graph'];

      console.log('[Office365] Token récupéré:', token ? `${token.substring(0, 20)}...` : 'null');

      if (!token) {
        throw new Error(
          '🔑 Token Outlook non disponible.\n\n' +
            '📍 Visitez Outlook pour obtenir un token :\n' +
            '   • https://outlook.office.com/mail\n\n' +
            "⚠️ L'extension va capturer automatiquement le token lors de votre connexion."
        );
      }

      // Appeler l'API backend
      console.log('[Office365] Appel API backend /api/office365/sync...');
      const response = await fetch('http://localhost:3001/api/office365/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Office365-Token': token,
        },
        body: JSON.stringify({
          userId: '4397e804-31e5-44c4-b89e-82058fa8502b', // Demo user UUID
          maxEmails: 50,
          folder: 'Inbox',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP ${response.status}`);
      }

      console.log('[Office365] ✅ Synchronisation réussie:', data);
      setSyncResult(data);

      // Récupérer les items après synchronisation réussie
      if (data.success) {
        await fetchOffice365Items(); // Pour l'onglet Office365 (legacy)
        await fetchAllSourcesItems(); // Pour l'affichage unifié (Session 119)
      }
    } catch (error) {
      console.error('[Office365] ❌ Erreur synchronisation:', error);
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Teams Sync Function
  const handleTeamsSync = async () => {
    setTeamsSyncLoading(true);
    setTeamsSyncResult(null);

    try {
      // Vérifier que l'extension est présente
      const browserStorage = (window as any).cartaeBrowserStorage;
      if (!browserStorage) {
        throw new Error(
          "Extension Cartae non détectée. Installez l'extension Firefox pour synchroniser Teams."
        );
      }

      console.log('[Teams] Lecture tokens depuis browser.storage...');

      // ✅ Utiliser token Graph (Session 70 qui marchait !)
      // Après reconnexion à Teams, token Graph aura Chat.Read
      const result = await browserStorage.get([
        'cartae-o365-token-graph',
        'cartae-o365-token-teams',
      ]);

      let token = result['cartae-o365-token-graph'];
      let tokenSource = 'graph';

      if (!token) {
        token = result['cartae-o365-token-teams'];
        tokenSource = 'teams-legacy';
      }

      console.log(
        '[Teams] Token récupéré:',
        token ? `${token.substring(0, 20)}... (source: ${tokenSource})` : 'null'
      );

      if (!token) {
        throw new Error(
          '🔑 Aucun token Microsoft disponible.\n\n' +
            '📍 ÉTAPES POUR RÉSOUDRE:\n' +
            "1. Rechargez l'extension Firefox (about:debugging)\n" +
            '2. Ouvrez https://teams.microsoft.com\n' +
            '3. Reconnectez-vous si nécessaire\n' +
            "4. L'extension capturera automatiquement les tokens\n" +
            '5. Rechargez cette page et retestez\n\n' +
            "ℹ️  L'extension a été mise à jour pour mieux distinguer les tokens Teams."
        );
      }

      // Appeler l'API backend Teams
      console.log('[Teams] Appel API backend /api/office365/teams/sync...');
      const response = await fetch('http://localhost:3001/api/office365/teams/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Office365-Token': token,
        },
        body: JSON.stringify({
          userId: '4397e804-31e5-44c4-b89e-82058fa8502b', // Demo user UUID
          maxChats: 50,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur HTTP ${response.status}`);
      }

      console.log('[Teams] ✅ Synchronisation réussie:', data);
      setTeamsSyncResult(data);

      // Récupérer les items après synchronisation réussie
      if (data.success) {
        await fetchAllSourcesItems(); // Recharger l'affichage unifié (Session 119)
      }
    } catch (error) {
      console.error('[Teams] ❌ Erreur synchronisation:', error);
      setTeamsSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    } finally {
      setTeamsSyncLoading(false);
    }
  };

  // Planner Sync Function avec SSE Streaming
  const handlePlannerSync = async () => {
    setPlannerSyncLoading(true);
    setPlannerSyncResult(null);
    setPlannerProgress(null);

    try {
      // Vérifier que l'extension est présente
      const browserStorage = (window as any).cartaeBrowserStorage;
      if (!browserStorage) {
        throw new Error(
          "Extension Cartae non détectée. Installez l'extension Firefox pour synchroniser Planner."
        );
      }

      console.log('[Planner] Lecture token depuis browser.storage...');

      // Utiliser token Graph (nécessaire pour Planner API)
      const result = await browserStorage.get(['cartae-o365-token-graph']);
      const token = result['cartae-o365-token-graph'];

      console.log('[Planner] Token récupéré:', token ? `${token.substring(0, 20)}...` : 'null');

      if (!token) {
        throw new Error(
          '🔑 Token Graph non disponible.\n\n' +
            '📍 Visitez Teams pour obtenir un token Graph :\n' +
            '   • https://teams.microsoft.com\n\n' +
            "⚠️ L'extension va capturer automatiquement le token lors de votre connexion."
        );
      }

      // Utiliser fetch() avec SSE streaming (plus flexible qu'EventSource)
      console.log('[Planner] Ouverture connexion SSE /sync-stream...');

      const response = await fetch('http://localhost:3001/api/office365/planner/sync-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Office365-Token': token,
        },
        body: JSON.stringify({
          userId: '4397e804-31e5-44c4-b89e-82058fa8502b',
          maxTasks: 100,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const eventMatch = line.match(/^event: (.+)$/m);
          const dataMatch = line.match(/^data: (.+)$/m);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1];
            const eventData = JSON.parse(dataMatch[1]);

            console.log(`[Planner SSE] ${eventType}:`, eventData);

            if (eventType === 'progress') {
              setPlannerProgress(eventData);
            } else if (eventType === 'complete') {
              setPlannerSyncResult(eventData);
              setPlannerProgress(null);
              setPlannerSyncLoading(false);

              if (eventData.success) {
                fetchAllSourcesItems();
              }
              return; // Fin du stream
            } else if (eventType === 'error') {
              setPlannerSyncResult({
                success: false,
                error: eventData.error || 'Erreur serveur',
              });
              setPlannerProgress(null);
              setPlannerSyncLoading(false);
              return;
            }
          }
        }
      }

      setPlannerSyncLoading(false);
    } catch (error) {
      console.error('[Planner] ❌ Erreur synchronisation:', error);
      setPlannerSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
      setPlannerProgress(null);
      setPlannerSyncLoading(false);
    }
  };

  // Debug Tokens Function - Affiche tous les tokens capturés et leurs scopes
  const debugTokens = async () => {
    try {
      const browserStorage = (window as any).cartaeBrowserStorage;
      if (!browserStorage) {
        console.error('❌ Extension non détectée');
        return;
      }

      console.log('🔍 ====== DEBUG TOKENS O365 ======');

      // Liste de tous les tokens à vérifier
      const tokenKeys = [
        'cartae-o365-token-owa',
        'cartae-o365-token-graph',
        'cartae-o365-token-sharepoint',
        'cartae-o365-token-teams',
      ];

      for (const key of tokenKeys) {
        console.log(`\n📋 ${key}:`);
        const result = await browserStorage.get([key, `${key}-captured-at`]);
        const token = result[key];
        const capturedAt = result[`${key}-captured-at`];

        if (!token) {
          console.log('  ⚪ Aucun token disponible');
          continue;
        }

        console.log(`  ✅ Token présent (capturé: ${capturedAt || 'inconnu'})`);
        console.log(`  📝 Preview: ${token.substring(0, 30)}...`);

        // Décoder le JWT pour afficher les scopes
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('  🔐 Scopes:', payload.scp || payload.scope || 'Aucun scope trouvé');
            console.log('  👤 Audience:', payload.aud || 'Inconnu');
            console.log(
              '  ⏰ Expire:',
              payload.exp ? new Date(payload.exp * 1000).toISOString() : 'Inconnu'
            );
          }
        } catch (decodeError) {
          console.log('  ⚠️  Impossible de décoder le token JWT');
        }
      }

      console.log('\n🔍 ====== FIN DEBUG TOKENS ======');
    } catch (error) {
      console.error('❌ Erreur debug tokens:', error);
    }
  };

  return (
    <>
      {/* Animation CSS pour les progress bars */}
      <style>{`
        @keyframes progress-slide {
          0% {
            left: -30%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>

      <div>
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          {/* Backend Health Check Banner (Session 127) */}
          <BackendStatusBanner
            status={backendHealthState.status}
            error={backendHealthState.error}
            onRecheck={recheckBackendHealth}
          />

          <h2 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: 600 }}>
            Synchronisation Office365 → PostgreSQL
          </h2>

          <p style={{ margin: '0 0 24px', color: '#6b7280', lineHeight: 1.6 }}>
            Synchronise vos emails Office365 directement dans PostgreSQL en utilisant le token
            fourni par l'extension Firefox.
          </p>

          <div
            style={{
              padding: '16px',
              background: '#f3f4f6',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            <strong>Prérequis :</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
              <li>Extension Firefox Cartae installée et connectée à Office365</li>
              <li>Backend database-api en cours d'exécution (port 3001)</li>
              <li>PostgreSQL avec table cartae_items créée</li>
            </ul>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <button
              type="button"
              onClick={handleOffice365Sync}
              disabled={syncLoading}
              style={{
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#ffffff',
                background: syncLoading ? '#9ca3af' : '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                cursor: syncLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: syncLoading ? 'none' : '0 2px 4px rgba(59, 130, 246, 0.3)',
              }}
            >
              {syncLoading ? '⏳ Synchronisation...' : '📧 Synchroniser Emails'}
            </button>

            <button
              type="button"
              onClick={handleTeamsSync}
              disabled={teamsSyncLoading}
              style={{
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#ffffff',
                background: teamsSyncLoading ? '#9ca3af' : '#8b5cf6',
                border: 'none',
                borderRadius: '8px',
                cursor: teamsSyncLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: teamsSyncLoading ? 'none' : '0 2px 4px rgba(139, 92, 246, 0.3)',
              }}
            >
              {teamsSyncLoading ? '⏳ Synchronisation...' : '💬 Synchroniser Teams'}
            </button>

            <button
              type="button"
              onClick={handlePlannerSync}
              disabled={plannerSyncLoading}
              style={{
                padding: '16px 24px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#ffffff',
                background: plannerSyncLoading ? '#9ca3af' : '#10b981',
                border: 'none',
                borderRadius: '8px',
                cursor: plannerSyncLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: plannerSyncLoading ? 'none' : '0 2px 4px rgba(16, 185, 129, 0.3)',
              }}
            >
              {plannerSyncLoading ? '⏳ Synchronisation...' : '✅ Synchroniser Planner'}
            </button>

            <button
              type="button"
              onClick={debugTokens}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#6b7280',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                gridColumn: 'span 3',
              }}
            >
              🔍 Debug Tokens
            </button>
          </div>

          {/* Progress bars de synchronisation */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            {/* Progress bar Emails */}
            {syncLoading && (
              <div style={{ width: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: '30%',
                      background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                      borderRadius: '3px',
                      animation: 'progress-slide 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '12px',
                    color: '#3b82f6',
                    fontWeight: 500,
                  }}
                >
                  📧 Synchronisation emails en cours...
                </p>
              </div>
            )}

            {/* Progress bar Teams */}
            {teamsSyncLoading && (
              <div style={{ width: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: '30%',
                      background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                      borderRadius: '3px',
                      animation: 'progress-slide 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '12px',
                    color: '#8b5cf6',
                    fontWeight: 500,
                  }}
                >
                  💬 Synchronisation Teams en cours...
                </p>
              </div>
            )}

            {/* Progress bar Planner avec compteur temps réel */}
            {plannerSyncLoading && (
              <div style={{ width: '100%' }}>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: '#e5e7eb',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: plannerProgress
                        ? `${Math.min(100, (plannerProgress.current / Math.max(1, plannerProgress.total)) * 100)}%`
                        : '10%',
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: '12px',
                    color: '#10b981',
                    fontWeight: 500,
                  }}
                >
                  {plannerProgress
                    ? `✅ ${plannerProgress.message} (${plannerProgress.current}/${plannerProgress.total})`
                    : '✅ Synchronisation Planner en cours...'}
                </p>
              </div>
            )}
          </div>

          {/* Résultats de la synchronisation Emails */}
          {syncResult && (
            <div
              style={{
                marginTop: '8px',
                padding: '20px',
                background: syncResult.success ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${syncResult.success ? '#86efac' : '#fca5a5'}`,
                borderRadius: '8px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: syncResult.success ? '#166534' : '#991b1b',
                }}
              >
                {syncResult.success
                  ? '✅ Synchronisation Emails réussie'
                  : '❌ Erreur synchronisation Emails'}
              </h3>

              {syncResult.success ? (
                <div style={{ color: '#166534', fontSize: '14px', lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Emails importés :</strong> {syncResult.itemsImported || 0}
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Emails ignorés (déjà existants) :</strong>{' '}
                    {syncResult.itemsSkipped || 0}
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Total traité :</strong> {syncResult.totalProcessed || 0}
                  </p>

                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                        ⚠️ Erreurs partielles ({syncResult.errors.length}) :
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                        {syncResult.errors.map((err, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                  {syncResult.error || 'Une erreur inconnue est survenue'}
                </p>
              )}
            </div>
          )}

          {/* Résultats de la synchronisation Teams */}
          {teamsSyncResult && (
            <div
              style={{
                marginTop: '8px',
                padding: '20px',
                background: teamsSyncResult.success ? '#f5f3ff' : '#fef2f2',
                border: `2px solid ${teamsSyncResult.success ? '#c4b5fd' : '#fca5a5'}`,
                borderRadius: '8px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: teamsSyncResult.success ? '#5b21b6' : '#991b1b',
                }}
              >
                {teamsSyncResult.success
                  ? '✅ Synchronisation Teams réussie'
                  : '❌ Erreur synchronisation Teams'}
              </h3>

              {teamsSyncResult.success ? (
                <div style={{ color: '#5b21b6', fontSize: '14px', lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Chats importés :</strong> {teamsSyncResult.itemsImported || 0}
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Chats ignorés (déjà existants) :</strong>{' '}
                    {teamsSyncResult.itemsSkipped || 0}
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Total traité :</strong> {teamsSyncResult.totalProcessed || 0}
                  </p>

                  {teamsSyncResult.errors && teamsSyncResult.errors.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                        ⚠️ Erreurs partielles ({teamsSyncResult.errors.length}) :
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                        {teamsSyncResult.errors.map((err, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                  {teamsSyncResult.error || 'Une erreur inconnue est survenue'}
                </p>
              )}
            </div>
          )}

          {/* Résultats de la synchronisation Planner */}
          {plannerSyncResult && (
            <div
              style={{
                marginTop: '8px',
                padding: '20px',
                background: plannerSyncResult.success ? '#f0fdf4' : '#fef2f2',
                border: `2px solid ${plannerSyncResult.success ? '#86efac' : '#fca5a5'}`,
                borderRadius: '8px',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: plannerSyncResult.success ? '#166534' : '#991b1b',
                }}
              >
                {plannerSyncResult.success
                  ? '✅ Synchronisation Planner réussie'
                  : '❌ Erreur synchronisation Planner'}
              </h3>

              {plannerSyncResult.success ? (
                <div style={{ color: '#166534', fontSize: '14px', lineHeight: 1.6 }}>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Tâches importées :</strong> {plannerSyncResult.itemsImported || 0}
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Tâches ignorées (déjà existantes) :</strong>{' '}
                    {plannerSyncResult.itemsSkipped || 0}
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Total traité :</strong> {plannerSyncResult.totalProcessed || 0}
                  </p>
                  <p style={{ margin: '0 0 8px' }}>
                    <strong>Plans traités :</strong> {plannerSyncResult.plansProcessed || 0}
                  </p>

                  {plannerSyncResult.errors && plannerSyncResult.errors.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <p style={{ margin: '0 0 8px', fontWeight: 600 }}>
                        ⚠️ Erreurs partielles ({plannerSyncResult.errors.length}) :
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                        {plannerSyncResult.errors.map((err, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                  {plannerSyncResult.error || 'Une erreur inconnue est survenue'}
                </p>
              )}
            </div>
          )}

          {/* Affichage des emails importés */}
          {office365Items.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  📧 Emails importés ({office365Items.length})
                </h3>
                <button
                  type="button"
                  onClick={fetchOffice365Items}
                  disabled={itemsLoading}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#3b82f6',
                    background: '#ffffff',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    cursor: itemsLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {itemsLoading ? '⏳ Chargement...' : '🔄 Actualiser'}
                </button>
              </div>

              {/* Liste dépliante d'emails */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {office365Items.map(item => (
                  <div key={item.id}>
                    {/* Carte email */}
                    <CartaeItemCard
                      item={item}
                      onClick={() => {
                        // Toggle : si déjà sélectionné, on ferme, sinon on ouvre
                        setSelectedItem(selectedItem?.id === item.id ? null : item);
                      }}
                      showActions
                      style={{
                        cursor: 'pointer',
                        border:
                          selectedItem?.id === item.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        background: selectedItem?.id === item.id ? '#eff6ff' : '#ffffff',
                      }}
                    />

                    {/* Détail déplié */}
                    {selectedItem?.id === item.id && (
                      <div
                        style={{
                          marginTop: '8px',
                          marginLeft: '16px',
                          padding: '20px',
                          background: '#f9fafb',
                          borderLeft: '3px solid #3b82f6',
                          borderRadius: '0 8px 8px 0',
                        }}
                      >
                        <CartaeItemDetail
                          item={item}
                          mode="inline"
                          showRelationships={false}
                          showAIInsights={false}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bouton pour charger les emails si liste vide */}
          {office365Items.length === 0 && !itemsLoading && !syncResult && (
            <div
              style={{
                marginTop: '32px',
                padding: '24px',
                background: '#f9fafb',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 16px', color: '#6b7280' }}>
                Aucun email importé pour le moment.
              </p>
              <button
                type="button"
                onClick={fetchOffice365Items}
                style={{
                  padding: '12px 24px',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#ffffff',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                📥 Charger les emails existants
              </button>
            </div>
          )}

          {/* Indicateur de chargement */}
          {itemsLoading && (
            <div
              style={{
                marginTop: '32px',
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280',
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                }}
              >
                ⏳
              </div>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
                Chargement des emails...
              </p>
            </div>
          )}

          {/* Informations techniques */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#6b7280',
              lineHeight: 1.6,
            }}
          >
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>ℹ️ Informations techniques</p>
            <p style={{ margin: '0 0 4px' }}>
              • <strong>Backend API :</strong> http://localhost:3001/api/office365/sync
            </p>
            <p style={{ margin: '0 0 4px' }}>
              • <strong>User ID :</strong> 4397e804-31e5-44c4-b89e-82058fa8502b (demo@cartae.local)
            </p>
            <p style={{ margin: '0 0 4px' }}>
              • <strong>Limite :</strong> 50 emails maximum par synchronisation
            </p>
            <p style={{ margin: '0' }}>
              • <strong>Dossier :</strong> Inbox
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Office365SyncTab;
