/**
 * CartaeDemoPage - Page de démo pour les composants Session 119
 *
 * Affiche tous les composants UI créés avec des données mock
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CartaeItemCard,
  CartaeItemList,
  CartaeItemDetail,
  CartaeItemEditor,
  CartaeItemForm,
  CartaeItemTimeline,
  CartaeItemRelationships,
  CartaeItemSearch,
  CartaeItemFilter,
  SourceList,
  SourceDetail,
  SourceConfigForm,
  SourceMappingEditor,
  SourceSyncStatus,
  SourceSyncHistory,
  SourceTestConnection,
} from '@cartae/ui';
import type { CartaeItem } from '@cartae/core/types/CartaeItem';
import type { DataSource, SyncStatus, SyncHistoryEntry } from '@cartae/ui';
import { SourceManager } from '@cartae/core/sources/SourceManager';
import { IndexedDBSourceStorage } from '@cartae/core/sources/IndexedDBSourceStorage';
import {
  Office365MailBackendConnector,
  Office365TeamsBackendConnector,
} from '@cartae/core/sources/connectors';

// Mock data
const mockItems: CartaeItem[] = [
  {
    id: 'item-1',
    title: 'Réunion projet Cartae',
    type: 'event',
    content: "Discuter de l'architecture et des prochaines étapes du projet",
    tags: ['projet', 'cartae', 'réunion'],
    categories: ['work'],
    source: { connector: 'office365-calendar', sourceId: 'cal-123' },
    metadata: {
      priority: 'high',
      status: 'in_progress',
      startDate: new Date('2025-01-20T10:00:00'),
      endDate: new Date('2025-01-20T11:00:00'),
      location: 'Salle de réunion A',
      participants: ['alice@example.com', 'bob@example.com'],
      author: 'alice@example.com',
    },
    archived: false,
    favorite: true,
    createdAt: new Date('2025-01-15T09:00:00'),
    updatedAt: new Date('2025-01-18T14:30:00'),
  },
  {
    id: 'item-2',
    title: 'Email client XYZ - Budget 2025',
    type: 'email',
    content: 'Bonjour, suite à notre échange téléphonique, voici le budget prévisionnel...',
    tags: ['client', 'budget', 'urgent'],
    categories: ['work', 'finance'],
    source: { connector: 'office365-mail', sourceId: 'msg-456' },
    metadata: {
      priority: 'urgent',
      status: 'new',
      author: 'client@xyz.com',
      participants: ['me@example.com'],
      startDate: new Date('2025-01-19T08:15:00'),
    },
    archived: false,
    favorite: false,
    createdAt: new Date('2025-01-19T08:15:00'),
    updatedAt: new Date('2025-01-19T08:15:00'),
  },
  {
    id: 'item-3',
    title: 'TODO: Finir documentation API',
    type: 'task',
    content: "Documenter tous les endpoints REST de l'API Cartae avec exemples",
    tags: ['documentation', 'api', 'dev'],
    categories: ['development'],
    source: { connector: 'obsidian', sourceId: 'note-789' },
    metadata: {
      priority: 'medium',
      status: 'in_progress',
      progress: 65,
      dueDate: new Date('2025-01-25T17:00:00'),
      author: 'dev@example.com',
    },
    archived: false,
    favorite: true,
    createdAt: new Date('2025-01-10T11:00:00'),
    updatedAt: new Date('2025-01-19T16:45:00'),
  },
];

const mockSources: DataSource[] = [
  {
    id: 'source-1',
    name: 'Mon compte Office 365',
    connectorType: 'office365-mail',
    status: 'active',
    config: {
      tenantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      clientId: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
      scopes: ['Mail.Read', 'Mail.ReadWrite'],
    },
    mappings: {
      subject: 'title',
      bodyPreview: 'content',
      'from.emailAddress.address': 'metadata.author',
    },
    lastSync: new Date('2025-01-19T10:30:00'),
    nextSync: new Date('2025-01-19T10:45:00'),
    itemsCount: 1247,
    createdAt: new Date('2025-01-01T00:00:00'),
    updatedAt: new Date('2025-01-19T10:30:00'),
  },
  {
    id: 'source-2',
    name: 'Vault Obsidian Personnel',
    connectorType: 'obsidian',
    status: 'syncing',
    config: {
      vaultPath: '/Users/me/Documents/ObsidianVault',
      parseWikiLinks: true,
      parseTags: true,
    },
    mappings: {
      'frontmatter.title': 'title',
      content: 'content',
      'frontmatter.tags': 'tags',
    },
    lastSync: new Date('2025-01-19T09:15:00'),
    itemsCount: 523,
    createdAt: new Date('2025-01-05T00:00:00'),
    updatedAt: new Date('2025-01-19T10:35:00'),
  },
  {
    id: 'source-3',
    name: 'Gmail Pro',
    connectorType: 'gmail',
    status: 'error',
    config: {
      clientId: 'xxxxx.apps.googleusercontent.com',
    },
    mappings: {},
    lastSync: new Date('2025-01-18T22:00:00'),
    itemsCount: 89,
    error: 'Authentification expirée - Veuillez reconnecter votre compte',
    createdAt: new Date('2025-01-12T00:00:00'),
    updatedAt: new Date('2025-01-19T10:00:00'),
  },
  {
    id: 'source-4',
    name: 'Microsoft Teams',
    connectorType: 'office365-teams-backend',
    status: 'active',
    config: {
      tenantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      clientId: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
      scopes: ['Chat.Read', 'Chat.ReadWrite'],
    },
    mappings: {
      topic: 'title',
      'lastMessagePreview.body.content': 'content',
    },
    lastSync: new Date('2025-01-19T10:20:00'),
    itemsCount: 0,
    createdAt: new Date('2025-01-01T00:00:00'),
    updatedAt: new Date('2025-01-19T10:20:00'),
  },
];

const mockSyncStatus: SyncStatus = {
  sourceId: 'source-2',
  status: 'syncing',
  progress: 73,
  itemsProcessed: 381,
  itemsTotal: 523,
  itemsSuccess: 375,
  itemsError: 6,
  speed: 8.5,
  elapsed: 45000,
  eta: 17000,
  startedAt: new Date(Date.now() - 45000),
};

const mockSyncHistory: SyncHistoryEntry[] = [
  {
    id: 'sync-1',
    sourceId: 'source-1',
    startedAt: new Date('2025-01-19T10:30:00'),
    finishedAt: new Date('2025-01-19T10:31:23'),
    status: 'success',
    itemsProcessed: 42,
    itemsSuccess: 42,
    itemsError: 0,
    duration: 83000,
  },
  {
    id: 'sync-2',
    sourceId: 'source-1',
    startedAt: new Date('2025-01-19T10:15:00'),
    finishedAt: new Date('2025-01-19T10:16:18'),
    status: 'success',
    itemsProcessed: 38,
    itemsSuccess: 38,
    itemsError: 0,
    duration: 78000,
  },
  {
    id: 'sync-3',
    sourceId: 'source-1',
    startedAt: new Date('2025-01-18T22:00:00'),
    finishedAt: new Date('2025-01-18T22:00:15'),
    status: 'error',
    itemsProcessed: 0,
    itemsSuccess: 0,
    itemsError: 0,
    duration: 15000,
    error: 'Authentification échouée',
  },
];

export const CartaeDemoPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'items' | 'sources' | 'office365'>('items');
  const [selectedItemSubTab, setSelectedItemSubTab] = useState<
    'list' | 'detail' | 'editor' | 'timeline' | 'search'
  >('list');
  const [selectedSourceSubTab, setSelectedSourceSubTab] = useState<
    'list' | 'detail' | 'config' | 'mapping' | 'sync'
  >('list');
  const [selectedItem, setSelectedItem] = useState<CartaeItem | null>(mockItems[0]);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(mockSources[0]);

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

  // Office365 Items State
  const [office365Items, setOffice365Items] = useState<CartaeItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  // Unified View Filters/Sort State
  const [unifiedSearchText, setUnifiedSearchText] = useState('');
  const [unifiedSortMode, setUnifiedSortMode] = useState<
    'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'
  >('date-desc');
  const [unifiedTypeFilter, setUnifiedTypeFilter] = useState<'all' | 'email' | 'message'>('all');

  // SourceManager State (Session 119 unified architecture)
  const sourceManagerRef = useRef<SourceManager | null>(null);
  const [sourceManagerReady, setSourceManagerReady] = useState(false);
  const [allItems, setAllItems] = useState<CartaeItem[]>([]);

  // Initialize SourceManager with Mail + Teams connectors
  useEffect(() => {
    const initSourceManager = async () => {
      console.log('[SourceManager] Initialisation...');

      // Create storage (IndexedDB)
      const storage = new IndexedDBSourceStorage();

      // Create SourceManager
      const manager = new SourceManager({ storage });

      // Register connectors
      const mailConnector = new Office365MailBackendConnector();
      const teamsConnector = new Office365TeamsBackendConnector();

      manager.registerConnector(mailConnector);
      manager.registerConnector(teamsConnector);

      console.log(
        '[SourceManager] ✅ Connecteurs enregistrés:',
        mailConnector.type,
        teamsConnector.type
      );

      sourceManagerRef.current = manager;
      setSourceManagerReady(true);
    };

    initSourceManager();
  }, []);

  // Charger les items de toutes les sources au démarrage
  useEffect(() => {
    if (sourceManagerReady) {
      console.log('[AllSources] SourceManager ready, fetching all items...');
      fetchAllSourcesItems();
    }
  }, [sourceManagerReady]);

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

    // 3. Trier par date DESC (mélanger tous les types)
    allFetchedItems.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA; // DESC (plus récent en premier)
    });

    console.log(
      `[AllSources] 🎯 Total items réels: ${allFetchedItems.length} (Mail + Teams, triés par date DESC)`
    );
    setAllItems(allFetchedItems);
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

  // Filtrer et trier les items pour la vue unifiée
  const filteredUnifiedItems = useMemo(() => {
    let filtered = [...allItems];

    // 1. Filtre par type
    if (unifiedTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === unifiedTypeFilter);
    }

    // 2. Filtre par recherche (titre + contenu)
    if (unifiedSearchText.trim()) {
      const search = unifiedSearchText.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.title.toLowerCase().includes(search) || item.content?.toLowerCase().includes(search)
      );
    }

    // 3. Tri
    filtered.sort((a, b) => {
      switch (unifiedSortMode) {
        case 'date-desc': {
          const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
          const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
          return dateB - dateA;
        }
        case 'date-asc': {
          const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
          const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
          return dateA - dateB;
        }
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allItems, unifiedTypeFilter, unifiedSearchText, unifiedSortMode]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '2px solid #e5e7eb',
          padding: '20px 32px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1f2937' }}>
          Session 119 - UI Components Demo
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#6b7280' }}>
          Exploration interactive des 18 composants créés (~11,900 LOC)
        </p>
      </div>

      {/* Main Tabs */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 32px',
        }}
      >
        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { key: 'items', label: 'CartaeItem Components' },
            { key: 'sources', label: 'Source Management Components' },
            { key: 'office365', label: 'Office365 Sync (Live)' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key as any)}
              style={{
                padding: '16px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: selectedTab === tab.key ? '#3b82f6' : '#6b7280',
                background: 'transparent',
                border: 'none',
                borderBottom:
                  selectedTab === tab.key ? '3px solid #3b82f6' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '32px' }}>
        {/* CartaeItem Tab */}
        {selectedTab === 'items' && (
          <div>
            {/* Sub Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                flexWrap: 'wrap',
              }}
            >
              {[
                { key: 'list', label: 'List & Cards' },
                { key: 'detail', label: 'Detail & Preview' },
                { key: 'editor', label: 'Editor & Form' },
                { key: 'timeline', label: 'Timeline & Relations' },
                { key: 'search', label: 'Search & Filter' },
              ].map(subTab => (
                <button
                  key={subTab.key}
                  type="button"
                  onClick={() => setSelectedItemSubTab(subTab.key as any)}
                  style={{
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: selectedItemSubTab === subTab.key ? '#ffffff' : '#6b7280',
                    background: selectedItemSubTab === subTab.key ? '#3b82f6' : '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            {/* List & Cards */}
            {selectedItemSubTab === 'list' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    Vue Unifiée - Toutes les sources (Mail + Teams)
                  </h3>

                  {/* Info box avec compteur */}
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px',
                      background: '#f0f9ff',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
                      📊 <strong>{filteredUnifiedItems.length}</strong> item
                      {filteredUnifiedItems.length > 1 ? 's' : ''} affiché
                      {filteredUnifiedItems.length > 1 ? 's' : ''} sur{' '}
                      <strong>{allItems.length}</strong> total
                    </p>
                  </div>

                  {/* Contrôles : Recherche + Tri + Filtre Type */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      gap: '12px',
                      marginBottom: '16px',
                      alignItems: 'center',
                    }}
                  >
                    {/* Recherche */}
                    <input
                      type="text"
                      placeholder="🔍 Rechercher dans titre ou contenu..."
                      value={unifiedSearchText}
                      onChange={e => setUnifiedSearchText(e.target.value)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        outline: 'none',
                      }}
                    />

                    {/* Sélecteur de tri */}
                    <select
                      value={unifiedSortMode}
                      onChange={e => setUnifiedSortMode(e.target.value as any)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        background: '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="date-desc">📅 Date ↓ (récent)</option>
                      <option value="date-asc">📅 Date ↑ (ancien)</option>
                      <option value="title-asc">🔤 Titre A→Z</option>
                      <option value="title-desc">🔤 Titre Z→A</option>
                    </select>

                    {/* Filtre par type */}
                    <select
                      value={unifiedTypeFilter}
                      onChange={e => setUnifiedTypeFilter(e.target.value as any)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '14px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        background: '#ffffff',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="all">📋 Tous les types</option>
                      <option value="email">📧 Emails uniquement</option>
                      <option value="message">💬 Teams uniquement</option>
                    </select>
                  </div>

                  {/* Liste dépliante de TOUS les items (pattern Office365 Sync) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredUnifiedItems.length === 0 ? (
                      <div
                        style={{
                          padding: '40px',
                          textAlign: 'center',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          color: '#6b7280',
                        }}
                      >
                        <p style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 500 }}>
                          {allItems.length === 0 ? 'Aucun item à afficher' : 'Aucun résultat'}
                        </p>
                        <p style={{ margin: 0, fontSize: '14px' }}>
                          {allItems.length === 0
                            ? "Synchronisez Office365 depuis l'onglet correspondant"
                            : 'Modifiez les filtres ou la recherche'}
                        </p>
                      </div>
                    ) : (
                      filteredUnifiedItems.map(item => (
                        <div key={item.id}>
                          {/* Carte item */}
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
                                selectedItem?.id === item.id
                                  ? '2px solid #3b82f6'
                                  : '1px solid #e5e7eb',
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
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Detail & Preview */}
            {selectedItemSubTab === 'detail' && selectedItem && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    CartaeItemDetail
                  </h3>
                  <CartaeItemDetail
                    item={selectedItem}
                    mode="inline"
                    showRelationships
                    showAIInsights
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    CartaeItemPreview
                  </h3>
                  <div style={{ padding: '40px', background: '#ffffff', borderRadius: '8px' }}>
                    <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                      Survolez la carte ci-dessous pour voir le preview:
                    </p>
                    <div style={{ maxWidth: '400px' }}>
                      <CartaeItemCard item={selectedItem} onClick={() => {}} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Editor & Form */}
            {selectedItemSubTab === 'editor' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    CartaeItemEditor (mode inline)
                  </h3>
                  <CartaeItemEditor
                    item={selectedItem || undefined}
                    onSave={() => {
                      /* Item saved */
                    }}
                    onCancel={() => {
                      /* Editing cancelled */
                    }}
                    mode="inline"
                    showDelete
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    CartaeItemForm (simplifié)
                  </h3>
                  <CartaeItemForm
                    onSave={() => {
                      /* Item saved */
                    }}
                    onCancel={() => {
                      /* Form cancelled */
                    }}
                    showMetadata
                  />
                </div>
              </div>
            )}

            {/* Timeline & Relations */}
            {selectedItemSubTab === 'timeline' && selectedItem && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    CartaeItemTimeline
                  </h3>
                  <CartaeItemTimeline item={selectedItem} relativeTime />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    CartaeItemRelationships
                  </h3>
                  <CartaeItemRelationships
                    item={selectedItem}
                    relations={[
                      {
                        id: 'rel-1',
                        type: 'wikilink',
                        direction: 'bidirectional',
                        targetItem: mockItems[1],
                        strength: 0.8,
                      },
                      {
                        id: 'rel-2',
                        type: 'tag',
                        direction: 'outgoing',
                        targetItem: mockItems[2],
                        strength: 0.6,
                      },
                    ]}
                    view="list"
                    groupByType
                  />
                </div>
              </div>
            )}

            {/* Search & Filter */}
            {selectedItemSubTab === 'search' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    CartaeItemSearch
                  </h3>
                  <CartaeItemSearch
                    items={mockItems}
                    showSuggestions
                    showHistory
                    onItemClick={item => setSelectedItem(item)}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    CartaeItemFilter
                  </h3>
                  <CartaeItemFilter
                    filters={{}}
                    onFiltersChange={() => {
                      /* Filters changed */
                    }}
                    availableTags={['projet', 'cartae', 'urgent', 'client', 'dev']}
                    availableSources={['office365-mail', 'office365-calendar', 'obsidian']}
                    showResetButton
                    showActiveCount
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Source Management Tab */}
        {selectedTab === 'sources' && (
          <div>
            {/* Sub Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                flexWrap: 'wrap',
              }}
            >
              {[
                { key: 'list', label: 'Source List' },
                { key: 'detail', label: 'Source Detail' },
                { key: 'config', label: 'Config Form' },
                { key: 'mapping', label: 'Mapping Editor' },
                { key: 'sync', label: 'Sync Monitoring' },
              ].map(subTab => (
                <button
                  key={subTab.key}
                  type="button"
                  onClick={() => setSelectedSourceSubTab(subTab.key as any)}
                  style={{
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: selectedSourceSubTab === subTab.key ? '#ffffff' : '#6b7280',
                    background: selectedSourceSubTab === subTab.key ? '#3b82f6' : '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            {/* Source List */}
            {selectedSourceSubTab === 'list' && (
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                  SourceList
                </h3>
                <SourceList
                  sources={mockSources}
                  onSourceClick={source => setSelectedSource(source)}
                  onSync={() => {
                    /* Source sync triggered */
                  }}
                  onConfigure={() => {
                    /* Source configure triggered */
                  }}
                  onTogglePause={() => {
                    /* Source pause toggled */
                  }}
                  onDelete={() => {
                    /* Source deleted */
                  }}
                  onCreateNew={() => {
                    /* New source creation */
                  }}
                  view="grid"
                  showSearch
                />
              </div>
            )}

            {/* Source Detail */}
            {selectedSourceSubTab === 'detail' && selectedSource && (
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                  SourceDetail
                </h3>
                <SourceDetail
                  source={selectedSource}
                  mode="inline"
                  showLogs
                  onEdit={() => {
                    /* Source edited */
                  }}
                  onSync={() => {
                    /* Source synced */
                  }}
                  onDelete={() => {
                    /* Source deleted */
                  }}
                />
              </div>
            )}

            {/* Config Form */}
            {selectedSourceSubTab === 'config' && (
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                  SourceConfigForm
                </h3>
                <SourceConfigForm
                  connectorType="office365-mail"
                  onSave={() => {
                    /* Config saved */
                  }}
                  onCancel={() => {
                    /* Config cancelled */
                  }}
                  onTestConnection={async () => ({
                    success: true,
                    message: 'Connexion réussie!',
                    details: {
                      endpoint: 'https://graph.microsoft.com/v1.0',
                      auth: 'ok',
                      permissions: ['Mail.Read', 'User.Read'],
                      latency: 145,
                    },
                  })}
                />
              </div>
            )}

            {/* Mapping Editor */}
            {selectedSourceSubTab === 'mapping' && (
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                  SourceMappingEditor
                </h3>
                <SourceMappingEditor
                  connectorType="office365-mail"
                  mappings={[
                    { id: '1', sourceField: 'subject', targetField: 'title' },
                    { id: '2', sourceField: 'bodyPreview', targetField: 'content' },
                    {
                      id: '3',
                      sourceField: 'from.emailAddress.address',
                      targetField: 'metadata.author',
                    },
                    {
                      id: '4',
                      sourceField: 'receivedDateTime',
                      targetField: 'metadata.startDate',
                      transform: 'date',
                    },
                  ]}
                  onMappingsChange={() => {
                    /* Mappings changed */
                  }}
                  sourceFields={[
                    'subject',
                    'bodyPreview',
                    'from.emailAddress.address',
                    'receivedDateTime',
                    'categories',
                  ]}
                  showTransforms
                />
              </div>
            )}

            {/* Sync Monitoring */}
            {selectedSourceSubTab === 'sync' && selectedSource && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    SourceSyncStatus (en cours)
                  </h3>
                  <SourceSyncStatus
                    source={selectedSource}
                    syncStatus={mockSyncStatus}
                    onCancel={() => {
                      /* Sync cancelled */
                    }}
                    onRetry={() => {
                      /* Sync retry */
                    }}
                    onTogglePause={() => {
                      /* Sync pause toggled */
                    }}
                    showLogs={false}
                    compact={false}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    SourceSyncHistory
                  </h3>
                  <SourceSyncHistory
                    source={selectedSource}
                    history={mockSyncHistory}
                    maxEntries={50}
                    showFilters
                    onExport={() => {
                      /* History exported */
                    }}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
                    SourceTestConnection
                  </h3>
                  <SourceTestConnection
                    connectorType={selectedSource.connectorType}
                    config={selectedSource.config}
                    onTest={async () => ({
                      success: true,
                      message: 'Connexion établie avec succès',
                      details: {
                        endpoint: 'https://graph.microsoft.com/v1.0',
                        auth: 'ok',
                        permissions: ['Mail.Read', 'Mail.ReadWrite', 'User.Read'],
                        latency: 128,
                        sampleData: {
                          subject: 'Test Email',
                          from: { emailAddress: { address: 'test@example.com' } },
                        },
                      },
                    })}
                    autoTest={false}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Office365 Sync Tab */}
        {selectedTab === 'office365' && (
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
                  gridTemplateColumns: '1fr 1fr',
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
                  }}
                >
                  🔍 Debug Tokens
                </button>
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
                              selectedItem?.id === item.id
                                ? '2px solid #3b82f6'
                                : '1px solid #e5e7eb',
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
                  • <strong>User ID :</strong> 4397e804-31e5-44c4-b89e-82058fa8502b
                  (demo@cartae.local)
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
        )}
      </div>
    </div>
  );
};

export default CartaeDemoPage;
