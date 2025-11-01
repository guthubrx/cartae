/**
 * Plugin Manager Component
 * Main interface for managing plugins - Refactored with modern marketplace UI
 */

import React, { useState, useMemo, useEffect } from 'react';
import type { PluginInfo } from '@cartae/plugin-system';
import { PluginState } from '@cartae/plugin-system';
import { PluginCard } from './PluginCard';
import { PluginFilters, type PluginStatus, type PluginCategory } from './PluginFilters';
import { PluginDetailModal } from './PluginDetailModal';
import { BulkActionsBar } from './BulkActionsBar';
import { CloneInstructionsModal } from './CloneInstructionsModal';
import { PublishInstructionsModal } from './PublishInstructionsModal';
import {
  gitHubPluginRegistry,
  type PluginRegistryEntry,
} from '../../services/GitHubPluginRegistry';
import { installPlugin } from '../../services/PluginInstaller';
import { pluginDevService } from '../../services/PluginDevService';
import { useDeveloperMode } from './DeveloperModeToggle';
import type { PluginManifest } from '@cartae/plugin-system';
import { Toast, type ToastType } from '../ui/Toast';
import { canDisablePlugin, isCorePlugin } from '../../utils/pluginUtils';
import './PluginManager.css';

export interface PluginManagerProps {
  plugins: Map<string, PluginInfo>;
  onActivate: (pluginId: string) => Promise<void>;
  onDeactivate: (pluginId: string) => Promise<void>;
  onUninstall: (pluginId: string) => Promise<void>;
  onViewPermissions: (pluginId: string) => void;
  onInstall?: (pluginId: string) => Promise<void>;
}

export function PluginManager({
  plugins,
  onActivate,
  onDeactivate,
  onUninstall,
  onViewPermissions,
  onInstall,
}: PluginManagerProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PluginStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<PluginCategory>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [remotePlugins, setRemotePlugins] = useState<PluginRegistryEntry[]>([]);
  const [gridColumns, setGridColumns] = useState(3);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    core: false,
    featured: false,
    optional: false,
  });
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPluginIds, setSelectedPluginIds] = useState<Set<string>>(new Set());

  // Clone instructions modal state
  const [cloneInstructions, setCloneInstructions] = useState<{
    pluginName: string;
    files: Array<{ name: string; content: string }>;
    localPath: string;
  } | null>(null);

  // Publish instructions modal state
  const [publishInstructions, setPublishInstructions] = useState<{
    pluginName: string;
    instructions: string[];
  } | null>(null);

  // Developer mode state
  const developerMode = useDeveloperMode();

  // Detect screen size with breakpoints
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setScreenSize('mobile');
      } else if (width <= 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Calculate effective grid columns based on screen size
  const effectiveGridColumns = (() => {
    if (screenSize === 'mobile') return 1;
    if (screenSize === 'tablet') return Math.min(gridColumns, 2);
    return gridColumns;
  })();

  // Load remote plugins from GitHub
  useEffect(() => {
    // eslint-disable-next-line no-console

    const loadRemote = async () => {
      try {
        // eslint-disable-next-line no-console
        const registry = await gitHubPluginRegistry.fetchRegistry();
        // eslint-disable-next-line no-console
        setRemotePlugins(registry);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[PluginManager] Failed to load remote plugins:', error);
      }
    };

    loadRemote();
  }, []);

  const pluginList = Array.from(plugins.values());

  // Create unified plugin list (builtin + remote)
  const unifiedPlugins = useMemo(() => {
    const installed = new Set(pluginList.map(p => p.plugin.manifest.id));
    const unified: Array<{
      type: 'builtin' | 'remote';
      manifest: PluginManifest;
      isActive?: boolean;
      isInstalled: boolean;
      entry?: PluginRegistryEntry;
    }> = [];

    // Add builtin plugins
    pluginList.forEach(info => {
      unified.push({
        type: 'builtin',
        manifest: info.plugin.manifest,
        isActive: info.state === PluginState.ACTIVE,
        isInstalled: true,
      });
    });

    // Add remote plugins that are not yet installed
    remotePlugins.forEach(entry => {
      if (!installed.has(entry.id)) {
        // Convert PluginRegistryEntry to PluginManifest with repository metadata
        const manifest: PluginManifest & {
          repositoryId?: string;
          repositoryUrl?: string;
          repositoryName?: string;
        } = {
          id: entry.id,
          name: entry.name,
          version: entry.version,
          description: entry.description,
          author: entry.author,
          main: '',
          icon: entry.icon,
          category: entry.category as any,
          tags: entry.tags,
          source: entry.source as any,
          featured: entry.featured,
          downloads: entry.downloads,
          rating: entry.rating,
          reviewCount: entry.reviewCount,
          repositoryId: entry.repositoryId,
          repositoryUrl: entry.repositoryUrl,
          repositoryName: entry.repositoryName,
        };

        unified.push({
          type: 'remote',
          manifest,
          isActive: false,
          isInstalled: false,
          entry,
        });
      }
    });

    return unified;
  }, [pluginList, remotePlugins]);

  // Filter and search plugins
  const filteredPlugins = useMemo(
    () =>
      unifiedPlugins.filter(item => {
        const { manifest } = item;

        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesName = manifest.name.toLowerCase().includes(query);
          const matchesDesc = manifest.description?.toLowerCase().includes(query);
          const matchesId = manifest.id.toLowerCase().includes(query);
          const matchesTags = manifest.tags?.some(tag => tag.toLowerCase().includes(query));

          if (!matchesName && !matchesDesc && !matchesId && !matchesTags) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all') {
          const isActive = item.isActive ?? false;
          if (statusFilter === 'active' && !isActive) return false;
          if (statusFilter === 'inactive' && (isActive || !item.isInstalled)) return false;
        }

        // Category filter
        if (categoryFilter !== 'all') {
          if (manifest.category !== categoryFilter) return false;
        }

        return true;
      }),
    [unifiedPlugins, searchQuery, statusFilter, categoryFilter]
  );

  // Helper function to check if plugin is from Cartae repository
  const isCartaePlugin = (item: (typeof filteredPlugins)[0]): boolean => {
    const manifest = item.manifest as PluginManifest & {
      repositoryId?: string;
      repositoryUrl?: string;
      repositoryName?: string;
    };

    // Check if repositoryId or repositoryName contains 'cartae'
    if (manifest.repositoryId?.toLowerCase().includes('cartae')) return true;
    if (manifest.repositoryName?.toLowerCase().includes('cartae')) return true;
    if (manifest.repositoryUrl?.toLowerCase().includes('cartae')) return true;

    // Also check if it's from guthubrx organization (Cartae's GitHub org)
    if (manifest.repositoryUrl?.toLowerCase().includes('guthubrx')) return true;

    return false;
  };

  // Organize plugins into sections: CORE, FEATURED (Cartae only), puis OPTIONAL
  const { corePlugins, featuredPlugins, optionalPlugins } = useMemo(() => {
    const core: typeof filteredPlugins = [];
    const featured: typeof filteredPlugins = [];
    const optional: typeof filteredPlugins = [];

    filteredPlugins.forEach(item => {
      if (isCorePlugin(item.manifest)) {
        core.push(item);
      } else if (item.manifest.featured && isCartaePlugin(item)) {
        // Only show featured plugins from Cartae repositories
        featured.push(item);
      } else {
        optional.push(item);
      }
    });

    return {
      corePlugins: core,
      featuredPlugins: featured,
      optionalPlugins: optional,
    };
  }, [filteredPlugins]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  // Calculate pagination
  const paginateItems = <T,>(items: T[]): { items: T[]; totalPages: number; hasMore: boolean } => {
    if (itemsPerPage >= 999999) {
      return { items, totalPages: 1, hasMore: false };
    }

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalPages,
      hasMore: currentPage < totalPages,
    };
  };

  // Handlers
  const handleAction = async (action: () => Promise<void>, pluginId: string) => {
    setLoading(pluginId);
    try {
      await action();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Plugin action failed:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleToggle = (pluginId: string, isActive: boolean) => {
    if (isActive) {
      handleAction(() => onDeactivate(pluginId), pluginId);
    } else {
      handleAction(() => onActivate(pluginId), pluginId);
    }
  };

  const handleViewDetails = (pluginId: string) => {
    setSelectedPlugin(pluginId);
  };

  const handleCloseModal = () => {
    setSelectedPlugin(null);
  };

  const handleInstall = async (pluginId: string) => {
    setLoading(pluginId);
    setToast({ message: 'Installation en cours...', type: 'loading' });

    try {
      // eslint-disable-next-line no-console

      // Get plugin name from remote plugins list
      const pluginEntry = remotePlugins.find(p => p.id === pluginId);
      const pluginName = pluginEntry?.name || pluginId;

      // If onInstall prop is provided, use it
      if (onInstall) {
        await onInstall(pluginId);
      } else {
        // Otherwise, use default installation logic
        await installPlugin(pluginId);
        // eslint-disable-next-line no-console
      }

      // Show success notification (for both cases)
      setToast({
        message: `${pluginName} installé avec succès !`,
        type: 'success',
      });

      // Refresh the remote plugins list
      const registry = await gitHubPluginRegistry.fetchRegistry();
      setRemotePlugins(registry);

      // eslint-disable-next-line no-console
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[PluginManager] Failed to install plugin ${pluginId}:`, error);
      setToast({
        message: `Échec de l'installation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        type: 'error',
      });
    } finally {
      setLoading(null);
    }
  };

  // Developer mode handlers
  const handleCloneForDev = async (pluginId: string) => {
    try {
      setToast({ message: 'Téléchargement du plugin...', type: 'loading' });
      const result = await pluginDevService.clonePlugin(pluginId);

      if (result.success) {
        // Vérifier si c'est un clonage manuel (instructions disponibles)
        const instructions = sessionStorage.getItem(`clone-instructions-${pluginId}`);

        if (instructions) {
          // Clonage manuel - afficher la modale
          const data = JSON.parse(instructions);

          setCloneInstructions({
            pluginName: data.pluginName,
            files: data.files,
            localPath: data.localPath,
          });
          setToast(null);
        } else {
          // Clonage automatique réussi
          setToast({
            message: result.message,
            type: 'success',
          });
        }
      } else {
        setToast({ message: `Erreur: ${result.message}`, type: 'error' });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[PluginManager] Clone failed:', error);
      setToast({
        message: `Échec du clonage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        type: 'error',
      });
    }
  };

  const handlePublish = async (pluginId: string, manifest: PluginManifest) => {
    try {
      const result = await pluginDevService.publishPlugin(pluginId, manifest);
      if (result.success && result.instructions) {
        // Afficher la modale avec les instructions
        const pluginName = manifest.name;
        setPublishInstructions({
          pluginName,
          instructions: result.instructions,
        });
      } else {
        setToast({ message: `Erreur: ${result.message}`, type: 'error' });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[PluginManager] Publish failed:', error);
      setToast({
        message: `Échec de la publication: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        type: 'error',
      });
    }
  };

  const handleOpenInVSCode = (pluginId: string) => {
    pluginDevService.openInVSCode(pluginId);
  };

  // Selection mode handlers
  const handleEnterSelectionMode = (pluginId: string) => {
    setSelectionMode(true);
    setSelectedPluginIds(new Set([pluginId]));
  };

  const handleExitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPluginIds(new Set());
  };

  const handleToggleSelection = (pluginId: string) => {
    setSelectedPluginIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pluginId)) {
        newSet.delete(pluginId);
      } else {
        newSet.add(pluginId);
      }
      return newSet;
    });
  };

  // Bulk actions
  const handleBulkInstall = async () => {
    const pluginsToInstall = Array.from(selectedPluginIds).filter(id => {
      const item = unifiedPlugins.find(p => p.manifest.id === id);
      return item && !item.isInstalled;
    });

    if (pluginsToInstall.length === 0) return;

    setToast({
      message: `Installation de ${pluginsToInstall.length} plugin(s)...`,
      type: 'loading',
    });

    for (const pluginId of pluginsToInstall) {
      try {
        await handleInstall(pluginId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to install ${pluginId}:`, error);
      }
    }

    handleExitSelectionMode();
  };

  const handleBulkActivate = async () => {
    const pluginsToActivate = Array.from(selectedPluginIds).filter(id => {
      const item = unifiedPlugins.find(p => p.manifest.id === id);
      return item && item.isInstalled && !item.isActive;
    });

    if (pluginsToActivate.length === 0) return;

    setToast({
      message: `Activation de ${pluginsToActivate.length} plugin(s)...`,
      type: 'loading',
    });

    for (const pluginId of pluginsToActivate) {
      try {
        await onActivate(pluginId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to activate ${pluginId}:`, error);
      }
    }

    setToast({ message: `${pluginsToActivate.length} plugin(s) activé(s)`, type: 'success' });
    handleExitSelectionMode();
  };

  const handleBulkDeactivate = async () => {
    const pluginsToDeactivate = Array.from(selectedPluginIds).filter(id => {
      const item = unifiedPlugins.find(p => p.manifest.id === id);
      return item && item.isActive;
    });

    if (pluginsToDeactivate.length === 0) return;

    setToast({
      message: `Désactivation de ${pluginsToDeactivate.length} plugin(s)...`,
      type: 'loading',
    });

    for (const pluginId of pluginsToDeactivate) {
      try {
        await onDeactivate(pluginId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to deactivate ${pluginId}:`, error);
      }
    }

    setToast({ message: `${pluginsToDeactivate.length} plugin(s) désactivé(s)`, type: 'success' });
    handleExitSelectionMode();
  };

  const handleBulkUninstall = async () => {
    const pluginsToUninstall = Array.from(selectedPluginIds).filter(id => {
      const item = unifiedPlugins.find(p => p.manifest.id === id);
      return item && item.isInstalled && canDisablePlugin(item.manifest);
    });

    if (pluginsToUninstall.length === 0) return;

    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer ${pluginsToUninstall.length} plugin(s) ?`
    );
    if (!confirmed) return;

    setToast({
      message: `Suppression de ${pluginsToUninstall.length} plugin(s)...`,
      type: 'loading',
    });

    for (const pluginId of pluginsToUninstall) {
      try {
        await onUninstall(pluginId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to uninstall ${pluginId}:`, error);
      }
    }

    setToast({ message: `${pluginsToUninstall.length} plugin(s) supprimé(s)`, type: 'success' });
    handleExitSelectionMode();
  };

  // Handle ESC key to exit selection mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectionMode) {
        handleExitSelectionMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionMode]);

  // Calculate available bulk actions
  const bulkActionCapabilities = useMemo(() => {
    const selectedItems = Array.from(selectedPluginIds)
      .map(id => unifiedPlugins.find(p => p.manifest.id === id))
      .filter(Boolean);

    const canInstall = selectedItems.some(item => item && !item.isInstalled);
    const canActivate = selectedItems.some(item => item && item.isInstalled && !item.isActive);
    const canDeactivate = selectedItems.some(item => item && item.isActive);
    const canUninstall = selectedItems.some(
      item => item && item.isInstalled && canDisablePlugin(item.manifest)
    );

    return { canInstall, canActivate, canDeactivate, canUninstall };
  }, [selectedPluginIds, unifiedPlugins]);

  // Render plugin section
  const renderSection = (
    sectionId: string,
    title: string,
    subtitle: string,
    items: typeof filteredPlugins
  ) => {
    if (items.length === 0) return null;

    const { items: paginatedItems, totalPages } = paginateItems(items);
    const isCollapsed = collapsedSections[sectionId] ?? false;

    const toggleSection = () => {
      setCollapsedSections(prev => ({
        ...prev,
        [sectionId]: !prev[sectionId],
      }));
    };

    return (
      <section
        className={`plugin-manager__section ${sectionId === 'featured' ? 'plugin-manager__section--featured' : ''}`}
      >
        <div
          className="plugin-manager__section-header"
          onClick={toggleSection}
          onKeyDown={e => e.key === 'Enter' && toggleSection()}
          role="button"
          tabIndex={0}
        >
          <div className="plugin-manager__section-header-content">
            <h3 className="plugin-manager__section-title">
              <span className="plugin-manager__section-collapse-icon">
                {isCollapsed ? '▶' : '▼'}
              </span>
              {title}
            </h3>
            <p className="plugin-manager__section-subtitle">
              {subtitle} ({items.length} plugin
              {items.length > 1 ? 's' : ''})
            </p>
          </div>
        </div>

        {!isCollapsed && (
          <>
            <div
              className="plugin-manager__grid"
              style={{
                gridTemplateColumns: `repeat(${effectiveGridColumns}, minmax(0, 1fr))`,
              }}
            >
              {paginatedItems.map(item => {
                const isActive = item.isActive ?? false;
                const { isInstalled } = item;
                const isCommunity = item.manifest.source === 'community';

                return (
                  <PluginCard
                    key={item.manifest.id}
                    manifest={item.manifest}
                    isActive={isActive}
                    canDisable={canDisablePlugin(item.manifest)}
                    isInstalled={isInstalled}
                    onToggle={() => {
                      if (!canDisablePlugin(item.manifest)) return;
                      if (!isInstalled) {
                        handleInstall(item.manifest.id);
                      } else {
                        handleToggle(item.manifest.id, isActive);
                      }
                    }}
                    onConfigure={() => onViewPermissions(item.manifest.id)}
                    onViewDetails={() => handleViewDetails(item.manifest.id)}
                    onUninstall={() =>
                      handleAction(() => onUninstall(item.manifest.id), item.manifest.id)
                    }
                    developerMode={false}
                    onCloneForDev={undefined}
                    onPublish={undefined}
                    onOpenInVSCode={undefined}
                    selectionMode={selectionMode}
                    isSelected={selectedPluginIds.has(item.manifest.id)}
                    hasSelection={selectedPluginIds.size > 0}
                    onEnterSelectionMode={() => handleEnterSelectionMode(item.manifest.id)}
                    onToggleSelection={() => handleToggleSelection(item.manifest.id)}
                  />
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="plugin-manager__pagination">
                <button
                  type="button"
                  className="plugin-manager__pagination-btn"
                  onClick={e => {
                    e.stopPropagation();
                    setCurrentPage(prev => Math.max(1, prev - 1));
                  }}
                  disabled={currentPage === 1}
                >
                  ← Précédent
                </button>
                <span className="plugin-manager__pagination-info">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="plugin-manager__pagination-btn"
                  onClick={e => {
                    e.stopPropagation();
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  }}
                  disabled={currentPage === totalPages}
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    );
  };

  return (
    <div className="plugin-manager">
      {/* Header */}
      <div className="plugin-manager__header">
        <h2 className="plugin-manager__title">Marketplace de Plugins</h2>
        <p className="plugin-manager__description">
          Découvrez et gérez les plugins pour étendre les fonctionnalités de BigMind
        </p>
      </div>

      {/* Bulk Actions Bar - Sticky at top */}
      {selectionMode && selectedPluginIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedPluginIds.size}
          canInstall={bulkActionCapabilities.canInstall}
          canActivate={bulkActionCapabilities.canActivate}
          canDeactivate={bulkActionCapabilities.canDeactivate}
          canUninstall={bulkActionCapabilities.canUninstall}
          onInstall={handleBulkInstall}
          onActivate={handleBulkActivate}
          onDeactivate={handleBulkDeactivate}
          onUninstall={handleBulkUninstall}
          onCancel={handleExitSelectionMode}
        />
      )}

      {/* Filters */}
      {!selectionMode && (
        <div className="plugin-manager__filter-bar-wrapper">
          <PluginFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            category={categoryFilter}
            onCategoryChange={setCategoryFilter}
            totalCount={unifiedPlugins.length}
            filteredCount={filteredPlugins.length}
            gridColumns={gridColumns}
            onGridColumnsChange={setGridColumns}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            screenSize={screenSize}
          />
        </div>
      )}

      {/* Plugin Sections */}
      {renderSection(
        'core',
        'Plugins Core',
        'Plugins essentiels et non-désactivables',
        corePlugins
      )}

      {renderSection('featured', 'En Vedette', 'Plugins recommandés', featuredPlugins)}

      {renderSection(
        'optional',
        'Plugins Optionnels',
        'Plugins officiels et communautaires',
        optionalPlugins
      )}

      {/* Empty State */}
      {filteredPlugins.length === 0 && (
        <div className="plugin-manager__empty">
          <p>Aucun plugin trouvé avec les critères de recherche actuels</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPlugin &&
        (() => {
          const selectedItem = unifiedPlugins.find(item => item.manifest.id === selectedPlugin);
          if (!selectedItem) return null;

          return (
            <PluginDetailModal
              manifest={selectedItem.manifest}
              isActive={selectedItem.isActive ?? false}
              canDisable={canDisablePlugin(selectedItem.manifest)}
              onClose={handleCloseModal}
              onToggle={() => {
                if (canDisablePlugin(selectedItem.manifest) && selectedItem.isInstalled) {
                  handleToggle(selectedPlugin, selectedItem.isActive ?? false);
                  handleCloseModal();
                }
              }}
            />
          );
        })()}

      {/* Toast notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Clone Instructions Modal */}
      {cloneInstructions && (
        <CloneInstructionsModal
          pluginName={cloneInstructions.pluginName}
          files={cloneInstructions.files}
          localPath={cloneInstructions.localPath}
          onClose={() => setCloneInstructions(null)}
        />
      )}

      {/* Publish Instructions Modal */}
      {publishInstructions && (
        <PublishInstructionsModal
          pluginName={publishInstructions.pluginName}
          instructions={publishInstructions.instructions}
          onClose={() => setPublishInstructions(null)}
        />
      )}
    </div>
  );
}
