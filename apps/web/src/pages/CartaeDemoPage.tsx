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
import { office365TokenRefresher } from '@cartae/ui';
import Office365SyncTab from './Office365SyncTab';

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
    connectorType: 'custom',
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

  // Unified View Filters/Sort State
  const [unifiedSearchText, setUnifiedSearchText] = useState('');
  const [unifiedSortMode, setUnifiedSortMode] = useState<
    'date-desc' | 'date-asc' | 'title-asc' | 'title-desc'
  >('date-desc');
  const [unifiedTypeFilter, setUnifiedTypeFilter] = useState<'all' | 'email' | 'message' | 'task'>(
    'all'
  );

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

  // Démarrer le rafraîchissement automatique des tokens Office365
  useEffect(() => {
    console.log(
      '[CartaeDemoPage] 🚀 Démarrage du rafraîchissement automatique des tokens Office365'
    );
    office365TokenRefresher.start();

    // Cleanup : arrêter le refresher au démontage du composant
    return () => {
      console.log('[CartaeDemoPage] ⏹️ Arrêt du rafraîchissement automatique des tokens');
      office365TokenRefresher.stop();
    };
  }, []);

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
    setAllItems(allFetchedItems);
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
                        <option value="task">✅ Tâches Planner uniquement</option>
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
          {selectedTab === 'office365' && <Office365SyncTab />}
        </div>
      </div>
    </>
  );
};

export default CartaeDemoPage;
