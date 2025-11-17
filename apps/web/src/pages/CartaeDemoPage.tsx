/**
 * CartaeDemoPage - Page de démo pour les composants Session 119
 *
 * Affiche tous les composants UI créés avec des données mock
 */

import React, { useState } from 'react';
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

// Mock data
const mockItems: CartaeItem[] = [
  {
    id: 'item-1',
    title: 'Réunion projet Cartae',
    type: 'event',
    content: 'Discuter de l\'architecture et des prochaines étapes du projet',
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
    content: 'Documenter tous les endpoints REST de l\'API Cartae avec exemples',
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
  const [selectedTab, setSelectedTab] = useState<'items' | 'sources'>('items');
  const [selectedItemSubTab, setSelectedItemSubTab] = useState<'list' | 'detail' | 'editor' | 'timeline' | 'search'>('list');
  const [selectedSourceSubTab, setSelectedSourceSubTab] = useState<'list' | 'detail' | 'config' | 'mapping' | 'sync'>('list');
  const [selectedItem, setSelectedItem] = useState<CartaeItem | null>(mockItems[0]);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(mockSources[0]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: '#ffffff',
        borderBottom: '2px solid #e5e7eb',
        padding: '20px 32px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1f2937' }}>
          Session 119 - UI Components Demo
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#6b7280' }}>
          Exploration interactive des 18 composants créés (~11,900 LOC)
        </p>
      </div>

      {/* Main Tabs */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px',
      }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          {['items', 'sources'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedTab(tab as any)}
              style={{
                padding: '16px 0',
                fontSize: '15px',
                fontWeight: 600,
                color: selectedTab === tab ? '#3b82f6' : '#6b7280',
                background: 'transparent',
                border: 'none',
                borderBottom: selectedTab === tab ? '3px solid #3b82f6' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab === 'items' ? 'CartaeItem Components' : 'Source Management Components'}
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
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}>
              {[
                { key: 'list', label: 'List & Cards' },
                { key: 'detail', label: 'Detail & Preview' },
                { key: 'editor', label: 'Editor & Form' },
                { key: 'timeline', label: 'Timeline & Relations' },
                { key: 'search', label: 'Search & Filter' },
              ].map((subTab) => (
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
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemList</h3>
                  <CartaeItemList
                    items={mockItems}
                    onItemClick={(item) => setSelectedItem(item)}
                    showFilters={true}
                    showSearch={true}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemCard (individual)</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                    {mockItems.map((_item) => (
                      <CartaeItemCard
                        key={_item.id}
                        item={_item}
                        onClick={(item) => setSelectedItem(item)}
                        showActions={true}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Detail & Preview */}
            {selectedItemSubTab === 'detail' && selectedItem && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemDetail</h3>
                  <CartaeItemDetail
                    item={selectedItem}
                    mode="inline"
                    showRelationships={true}
                    showAIInsights={true}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemPreview</h3>
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
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemEditor (mode inline)</h3>
                  <CartaeItemEditor
                    item={selectedItem || undefined}
                    onSave={() => {/* Item saved */}}
                    onCancel={() => {/* Editing cancelled */}}
                    mode="inline"
                    showDelete={true}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemForm (simplifié)</h3>
                  <CartaeItemForm
                    onSave={() => {/* Item saved */}}
                    onCancel={() => {/* Form cancelled */}}
                    showMetadata={true}
                  />
                </div>
              </div>
            )}

            {/* Timeline & Relations */}
            {selectedItemSubTab === 'timeline' && selectedItem && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemTimeline</h3>
                  <CartaeItemTimeline
                    item={selectedItem}
                    relativeTime={true}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemRelationships</h3>
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
                    groupByType={true}
                  />
                </div>
              </div>
            )}

            {/* Search & Filter */}
            {selectedItemSubTab === 'search' && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemSearch</h3>
                  <CartaeItemSearch
                    items={mockItems}
                    showSuggestions={true}
                    showHistory={true}
                    onItemClick={(item) => setSelectedItem(item)}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>CartaeItemFilter</h3>
                  <CartaeItemFilter
                    filters={{}}
                    onFiltersChange={() => {/* Filters changed */}}
                    availableTags={['projet', 'cartae', 'urgent', 'client', 'dev']}
                    availableSources={['office365-mail', 'office365-calendar', 'obsidian']}
                    showResetButton={true}
                    showActiveCount={true}
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
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}>
              {[
                { key: 'list', label: 'Source List' },
                { key: 'detail', label: 'Source Detail' },
                { key: 'config', label: 'Config Form' },
                { key: 'mapping', label: 'Mapping Editor' },
                { key: 'sync', label: 'Sync Monitoring' },
              ].map((subTab) => (
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
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>SourceList</h3>
                <SourceList
                  sources={mockSources}
                  onSourceClick={(source) => setSelectedSource(source)}
                  onSync={() => {/* Source sync triggered */}}
                  onConfigure={() => {/* Source configure triggered */}}
                  onTogglePause={() => {/* Source pause toggled */}}
                  onDelete={() => {/* Source deleted */}}
                  onCreateNew={() => {/* New source creation */}}
                  view="grid"
                  showSearch={true}
                />
              </div>
            )}

            {/* Source Detail */}
            {selectedSourceSubTab === 'detail' && selectedSource && (
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>SourceDetail</h3>
                <SourceDetail
                  source={selectedSource}
                  mode="inline"
                  showLogs={true}
                  onEdit={() => {/* Source edited */}}
                  onSync={() => {/* Source synced */}}
                  onDelete={() => {/* Source deleted */}}
                />
              </div>
            )}

            {/* Config Form */}
            {selectedSourceSubTab === 'config' && (
              <div>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>SourceConfigForm</h3>
                <SourceConfigForm
                  connectorType="office365-mail"
                  onSave={() => {/* Config saved */}}
                  onCancel={() => {/* Config cancelled */}}
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
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>SourceMappingEditor</h3>
                <SourceMappingEditor
                  connectorType="office365-mail"
                  mappings={[
                    { id: '1', sourceField: 'subject', targetField: 'title' },
                    { id: '2', sourceField: 'bodyPreview', targetField: 'content' },
                    { id: '3', sourceField: 'from.emailAddress.address', targetField: 'metadata.author' },
                    { id: '4', sourceField: 'receivedDateTime', targetField: 'metadata.startDate', transform: 'date' },
                  ]}
                  onMappingsChange={() => {/* Mappings changed */}}
                  sourceFields={['subject', 'bodyPreview', 'from.emailAddress.address', 'receivedDateTime', 'categories']}
                  showTransforms={true}
                />
              </div>
            )}

            {/* Sync Monitoring */}
            {selectedSourceSubTab === 'sync' && selectedSource && (
              <div style={{ display: 'grid', gap: '24px' }}>
                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>SourceSyncStatus (en cours)</h3>
                  <SourceSyncStatus
                    source={selectedSource}
                    syncStatus={mockSyncStatus}
                    onCancel={() => {/* Sync cancelled */}}
                    onRetry={() => {/* Sync retry */}}
                    onTogglePause={() => {/* Sync pause toggled */}}
                    showLogs={false}
                    compact={false}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>SourceSyncHistory</h3>
                  <SourceSyncHistory
                    source={selectedSource}
                    history={mockSyncHistory}
                    maxEntries={50}
                    showFilters={true}
                    onExport={() => {/* History exported */}}
                  />
                </div>

                <div>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>SourceTestConnection</h3>
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
      </div>
    </div>
  );
};

export default CartaeDemoPage;
