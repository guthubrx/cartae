/**
 * SharePointMVP - Composant React style Microsoft SharePoint
 *
 * Interface SharePoint-like pour afficher documents
 */

import React, { useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { TokenInterceptorService } from '../services/auth/TokenInterceptorService';
import { SharePointService, type SharePointDocument, type SharePointSite } from '../services/SharePointService';
import { useDebounce } from '../hooks';

interface SharePointMVPState {
  isLoading: boolean;
  error: string | null;
  documents: SharePointDocument[];
  sites: SharePointSite[];
  view: 'recent' | 'mydocs' | 'sites';
  searchQuery: string;
  filter: 'all' | 'recent' | 'shared' | 'favorites';
}

export const SharePointMVP: React.FC = () => {
  const [spService, setSpService] = useState<SharePointService | null>(null);
  const [state, setState] = useState<SharePointMVPState>({
    isLoading: false,
    error: null,
    documents: [],
    sites: [],
    view: 'recent',
    searchQuery: '',
    filter: 'all',
  });

  // Debounce search pour réduire les re-renders (300ms après dernière frappe)
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  // Initialisation
  useEffect(() => {
    const initService = async () => {
      // Vérifier extension
      if (typeof (window as any).cartaeBrowserStorage === 'undefined') {
        setState(prev => ({ ...prev, error: 'Extension Firefox requise' }));
        return;
      }

      // Initialiser TokenInterceptorService
      const tokenService = new TokenInterceptorService();
      await tokenService.startMonitoring();

      // Créer SharePointService
      const service = new SharePointService(tokenService);
      setSpService(service);

      // Charger documents récents
      loadRecentDocuments(service);
    };

    initService();
  }, []);

  const loadRecentDocuments = async (service?: SharePointService) => {
    const svc = service || spService;
    if (!svc) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, view: 'recent' }));

    try {
      // Augmenté à 200 pour trouver les .pptx dans l'historique
      const documents = await svc.listRecentDocuments(200);
      setState(prev => ({ ...prev, documents, isLoading: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  const loadMissingThumbnails = async () => {
    if (!spService) return;

    try {
      console.log('[SharePointMVP] Chargement thumbnails manquants...');
      const thumbnails = await spService.loadMissingThumbnails(state.documents);

      if (thumbnails.size === 0) {
        console.log('[SharePointMVP] Aucun thumbnail disponible');
        return;
      }

      // Mettre à jour les documents avec les nouveaux thumbnails
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(doc =>
          thumbnails.has(doc.id)
            ? { ...doc, thumbnailUrl: thumbnails.get(doc.id)! }
            : doc
        ),
      }));

      console.log(`[SharePointMVP] ✅ ${thumbnails.size} thumbnails ajoutés`);
    } catch (error: any) {
      console.error('[SharePointMVP] Erreur chargement thumbnails:', error);
    }
  };

  const loadMyDocuments = async () => {
    if (!spService) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, view: 'mydocs' }));

    try {
      const documents = await spService.listMyDocuments(undefined, 50);
      setState(prev => ({ ...prev, documents, isLoading: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  const loadSites = async () => {
    if (!spService) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, view: 'sites' }));

    try {
      const sites = await spService.listFollowedSites(25);
      setState(prev => ({ ...prev, sites, isLoading: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return `Aujourd'hui ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (days === 1) return `Hier ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (days < 7) return `Il y a ${days} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  const getFileIcon = (fileType?: string, isFolder?: boolean): string => {
    if (isFolder) return '📁';
    if (!fileType) return '📄';

    const icons: Record<string, string> = {
      'pdf': '📕',
      'docx': '📘',
      'doc': '📘',
      'xlsx': '📗',
      'xls': '📗',
      'pptx': '📙',
      'ppt': '📙',
      'txt': '📄',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'zip': '📦',
      'rar': '📦',
    };

    return icons[fileType] || '📄';
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredDocuments = state.documents.filter(doc =>
    doc.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  // DocumentRow component pour virtual scrolling
  const DocumentRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const doc = filteredDocuments[index];
    if (!doc) return null;

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #edebe9',
          backgroundColor: '#fff',
          padding: '12px 16px',
        }}
      >
        {/* Column 1: Name */}
        <div style={{ flex: '0 0 40%', minWidth: 0 }}>
          <a href={doc.webUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
            <span style={styles.icon}>{getFileIcon(doc.fileType, doc.isFolder)}</span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={styles.fileName}>{doc.name}</span>
              <span style={styles.fileInfo}>
                {doc.lastModifiedBy.displayName} • {doc.isFolder ? 'Folder' : formatFileSize(doc.size)}
              </span>
            </div>
          </a>
        </div>

        {/* Column 2: Modified */}
        <div style={{ flex: '0 0 20%', ...styles.modifiedCell }}>
          <span>{formatDate(doc.lastModifiedDateTime)}</span>
        </div>

        {/* Column 3: Owner */}
        <div style={{ flex: '0 0 20%', ...styles.ownerCell }}>
          <div style={styles.ownerAvatar}>
            {getInitials(doc.lastModifiedBy.displayName)}
          </div>
          <span>{doc.lastModifiedBy.displayName}</span>
        </div>

        {/* Column 4: Activity */}
        <div style={{ flex: '0 0 20%', ...styles.activityCell }}>
          <div style={styles.ownerAvatar}>
            {getInitials(doc.lastModifiedBy.displayName)}
          </div>
          <span>You recently opened this</span>
        </div>
      </div>
    );
  };

  // Fonction pour générer la section Recommended
  const renderRecommendedSection = () => {
    if (state.view !== 'recent' || state.isLoading || state.documents.length === 0) {
      return null;
    }

    // Chercher les documents Office récents (même sans thumbnail)
    const officeTypes = ['pptx', 'docx', 'xlsx', 'pdf'];

    // Prioriser pptx > docx/xlsx > pdf, puis par date
    let recommendedDocs = state.documents
      .filter(doc => officeTypes.includes(doc.fileType || ''))
      .sort((a, b) => {
        // Priorité pptx
        if (a.fileType === 'pptx' && b.fileType !== 'pptx') return -1;
        if (b.fileType === 'pptx' && a.fileType !== 'pptx') return 1;

        // Puis par date
        return b.lastModifiedDateTime.getTime() - a.lastModifiedDateTime.getTime();
      })
      .slice(0, 3);

    console.log(`[SharePoint] ${recommendedDocs.length} documents Office trouvés pour Recommended`);

    if (recommendedDocs.length === 0) {
      console.log('[SharePoint] Aucun document Office trouvé');
      return null;
    }

    return (
      <>
        <div style={styles.recommendedHeader}>
          <h2 style={styles.recommendedTitle}>Recommended</h2>
          <div style={styles.recommendedNav}>
            <button style={styles.navArrow}>‹</button>
            <button style={styles.navArrow}>›</button>
          </div>
        </div>
        <div style={styles.recommendedGrid}>
          {recommendedDocs.map(doc => (
          <a
            key={doc.id}
            href={doc.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.recommendedCard}
          >
            <div style={styles.recommendedPreview}>
              {doc.thumbnailUrl ? (
                <img
                  src={doc.thumbnailUrl}
                  alt={doc.name}
                  style={styles.recommendedImage}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '80px',
                  backgroundColor: '#f5f5f5',
                }}>
                  {getFileIcon(doc.fileType, doc.isFolder)}
                </div>
              )}
            </div>
            <div style={styles.recommendedInfo}>
              <div style={styles.recommendedLabel}>
                You recently opened
              </div>
              <div style={styles.recommendedDate}>{formatDate(doc.lastModifiedDateTime)}</div>
              <div style={styles.recommendedName}>{doc.name}</div>
            </div>
          </a>
          ))}
        </div>
      </>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📁 SharePoint</h1>
        <div style={styles.actions}>
          <input
            type="text"
            placeholder="Rechercher..."
            value={state.searchQuery}
            onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
            style={styles.searchInput}
          />
          <button onClick={loadMissingThumbnails} style={styles.button}>
            🖼️ Charger thumbnails
          </button>
          <button onClick={() => loadRecentDocuments()} style={styles.button}>
            🔄 Rafraîchir
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div style={styles.nav}>
        <button
          onClick={() => loadRecentDocuments()}
          style={{
            ...styles.navButton,
            ...(state.view === 'recent' ? styles.navButtonActive : {}),
          }}
        >
          📋 Récents
        </button>
        <button
          onClick={loadMyDocuments}
          style={{
            ...styles.navButton,
            ...(state.view === 'mydocs' ? styles.navButtonActive : {}),
          }}
        >
          💾 Mes documents
        </button>
        <button
          onClick={loadSites}
          style={{
            ...styles.navButton,
            ...(state.view === 'sites' ? styles.navButtonActive : {}),
          }}
        >
          🏢 Sites
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {state.error && (
          <div style={styles.error}>{state.error}</div>
        )}

        {state.isLoading && (
          <div style={styles.loading}>Chargement...</div>
        )}

        {/* Section Recommended - 3 grandes cartes */}
        {renderRecommendedSection()}

        {/* Filtres */}
        {state.view !== 'sites' && !state.isLoading && (
          <div style={styles.filtersBar}>
            <button
              onClick={() => setState(prev => ({ ...prev, filter: 'all' }))}
              style={{
                ...styles.filterButton,
                ...(state.filter === 'all' ? styles.filterButtonActive : {}),
              }}
            >
              📋 All
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, filter: 'recent' }))}
              style={{
                ...styles.filterButton,
                ...(state.filter === 'recent' ? styles.filterButtonActive : {}),
              }}
            >
              🕐 Recently opened
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, filter: 'shared' }))}
              style={{
                ...styles.filterButton,
                ...(state.filter === 'shared' ? styles.filterButtonActive : {}),
              }}
            >
              👥 Shared
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, filter: 'favorites' }))}
              style={{
                ...styles.filterButton,
                ...(state.filter === 'favorites' ? styles.filterButtonActive : {}),
              }}
            >
              ⭐ Favorites
            </button>
          </div>
        )}

        {/* Documents List - Virtual Scrolling (Recent et My Docs) */}
        {state.view !== 'sites' && !state.isLoading && (
          <div style={styles.table}>
            {/* Table Header */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#f3f2f1',
                borderBottom: '1px solid #edebe9',
                padding: '12px 16px',
              }}
            >
              <div style={{ flex: '0 0 40%', ...styles.th }}>Name</div>
              <div style={{ flex: '0 0 20%', ...styles.th }}>Modified</div>
              <div style={{ flex: '0 0 20%', ...styles.th }}>Owner</div>
              <div style={{ flex: '0 0 20%', ...styles.th }}>Activity</div>
            </div>

            {/* Virtual Scrolling List */}
            {filteredDocuments.length > 0 ? (
              <List
                height={window.innerHeight - 400} // Hauteur disponible
                itemCount={filteredDocuments.length}
                itemSize={80}
                width="100%"
              >
                {DocumentRow}
              </List>
            ) : (
              <div style={styles.emptyState}>Aucun document trouvé</div>
            )}
          </div>
        )}

        {/* Sites Grid */}
        {state.view === 'sites' && !state.isLoading && (
          <div style={styles.sitesGrid}>
            {state.sites.map(site => (
              <div key={site.id} style={styles.siteCard}>
                <div style={styles.siteIcon}>🏢</div>
                <a href={site.webUrl} target="_blank" rel="noopener noreferrer" style={styles.siteLink}>
                  <div style={styles.siteName}>{site.displayName}</div>
                </a>
                <div style={styles.siteDescription}>{site.description || 'Aucune description'}</div>
              </div>
            ))}

            {state.sites.length === 0 && (
              <div style={styles.emptyState}>
                Aucun site trouvé
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Styles SharePoint-like (light theme)
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#faf9f8',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #edebe9',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#323130',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #8a8886',
    borderRadius: '2px',
    fontSize: '14px',
    outline: 'none',
    width: '200px',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#0078d4',
    color: '#fff',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  nav: {
    display: 'flex',
    padding: '0 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #edebe9',
  },
  navButton: {
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#323130',
    fontWeight: 500,
  },
  navButtonActive: {
    borderBottomColor: '#0078d4',
    color: '#0078d4',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  table: {
    width: '100%',
    backgroundColor: '#fff',
    borderCollapse: 'collapse',
    boxShadow: '0 1.6px 3.6px rgba(0,0,0,.13)',
  },
  tableHeader: {
    backgroundColor: '#f3f2f1',
    borderBottom: '1px solid #edebe9',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: '#323130',
    textTransform: 'uppercase',
  },
  tableRow: {
    borderBottom: '1px solid #edebe9',
    cursor: 'pointer',
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#323130',
  },
  link: {
    color: '#0078d4',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    marginRight: '8px',
    fontSize: '16px',
  },
  sitesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  siteCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '2px',
    boxShadow: '0 1.6px 3.6px rgba(0,0,0,.13)',
    textAlign: 'center',
  },
  siteIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  siteLink: {
    textDecoration: 'none',
  },
  siteName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0078d4',
    marginBottom: '8px',
  },
  siteDescription: {
    fontSize: '14px',
    color: '#605e5c',
  },
  loading: {
    padding: '32px',
    textAlign: 'center',
    color: '#605e5c',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fde7e9',
    color: '#a80000',
    marginBottom: '16px',
    borderRadius: '2px',
    border: '1px solid #a80000',
  },
  emptyState: {
    padding: '32px',
    textAlign: 'center',
    color: '#605e5c',
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
    padding: '16px 0',
  },
  documentCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: '4px',
    overflow: 'hidden',
    boxShadow: '0 1.6px 3.6px rgba(0,0,0,.13)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    textDecoration: 'none',
    color: 'inherit',
    cursor: 'pointer',
  },
  documentPreview: {
    width: '100%',
    height: '160px',
    backgroundColor: '#f3f2f1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e1dfdd',
  },
  thumbnailIcon: {
    fontSize: '64px',
  },
  documentInfo: {
    padding: '12px',
  },
  documentName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#323130',
    marginBottom: '8px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  documentMeta: {
    fontSize: '12px',
    color: '#605e5c',
    marginBottom: '4px',
  },
  documentSize: {
    fontSize: '11px',
    color: '#8a8886',
  },
  recommendedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  recommendedTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#323130',
  },
  recommendedNav: {
    display: 'flex',
    gap: '8px',
  },
  navArrow: {
    width: '32px',
    height: '32px',
    border: '1px solid #8a8886',
    backgroundColor: '#fff',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  recommendedCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: '4px',
    overflow: 'hidden',
    boxShadow: '0 1.6px 3.6px rgba(0,0,0,.13)',
    textDecoration: 'none',
    color: 'inherit',
    cursor: 'pointer',
  },
  recommendedPreview: {
    width: '100%',
    height: '200px',
    backgroundColor: '#f3f2f1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  recommendedImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  recommendedPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e1dfdd',
  },
  recommendedIcon: {
    fontSize: '80px',
  },
  recommendedInfo: {
    padding: '16px',
  },
  recommendedLabel: {
    fontSize: '11px',
    color: '#605e5c',
    marginBottom: '4px',
  },
  recommendedDate: {
    fontSize: '11px',
    color: '#605e5c',
    marginBottom: '8px',
  },
  recommendedName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#323130',
  },
  filtersBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    borderBottom: '1px solid #edebe9',
    paddingBottom: '8px',
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#323130',
    transition: 'border-color 0.2s',
  },
  filterButtonActive: {
    borderBottomColor: '#0078d4',
    color: '#0078d4',
  },
  fileName: {
    fontSize: '14px',
    color: '#0078d4',
    fontWeight: 500,
  },
  fileInfo: {
    fontSize: '12px',
    color: '#605e5c',
    marginTop: '2px',
  },
  modifiedCell: {
    fontSize: '13px',
    color: '#323130',
  },
  ownerCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  ownerAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#0078d4',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    flexShrink: 0,
  },
  activityCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#605e5c',
  },
};
