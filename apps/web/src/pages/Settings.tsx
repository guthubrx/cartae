import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MenuBar } from '../components/MenuBar/MenuBar';
import { StatusBar } from '../components/StatusBar/StatusBar';
import '../layouts/MainLayout.css';
import './Settings.css';
import { useShortcuts, ShortcutAction } from '../hooks/useShortcuts';
import { usePlatform } from '../hooks/usePlatform';
import { useToast } from '../hooks/useToast';
import { X } from 'lucide-react';
import { useAppSettings } from '../hooks/useAppSettings';
import { getAllInterfaceThemes } from '../themes/colorThemes';
import { getSettingsSections, onSettingsRegistryChange } from '../utils/settingsRegistry';
import {
  PluginManager,
  PermissionDialog,
  AuditDashboard,
  PolicyEditor,
  PluginDetailPage,
  PluginRepositorySettings,
} from '../components/plugins';
// EventMonitorPanel removed - now available as community plugin
// AdminPanel removed - now available as private plugin in cartae-private repo
// The admin section should be provided by the com.cartae.admin-panel plugin
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { GitHubLoginButton } from '../components/plugins/GitHubLoginButton';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DeveloperModeToggle } from '../components/plugins/DeveloperModeToggle';
import { pluginSystem, saveActivatedPlugins } from '../utils/pluginManager';
import type {
  PluginInfo,
  Permission,
  AuditEvent,
  AuditQueryFilters,
  Policy,
} from '@cartae/plugin-system';

const { registry, permissionManager, auditLogger, policyEngine } = pluginSystem;

function SettingsPage() {
  const navigate = useNavigate();
  const accentColor = useAppSettings(s => s.accentColor);
  const setAccentColor = useAppSettings(s => s.setAccentColor);
  const themeId = useAppSettings(s => s.themeId);
  const setTheme = useAppSettings(s => s.setTheme);
  const showMinimap = useAppSettings(s => s.showMinimap);
  const setShowMinimap = useAppSettings(s => s.setShowMinimap);
  const reopenFilesOnStartup = useAppSettings(s => s.reopenFilesOnStartup);
  const setReopenFilesOnStartup = useAppSettings(s => s.setReopenFilesOnStartup);
  const defaultNodeFontSize = useAppSettings(s => s.defaultNodeFontSize);
  const setDefaultNodeFontSize = useAppSettings(s => s.setDefaultNodeFontSize);
  const defaultNodeWidth = useAppSettings(s => s.defaultNodeWidth);
  const setDefaultNodeWidth = useAppSettings(s => s.setDefaultNodeWidth);
  const defaultNodeHeight = useAppSettings(s => s.defaultNodeHeight);
  const setDefaultNodeHeight = useAppSettings(s => s.setDefaultNodeHeight);
  const defaultNodeFontFamily = useAppSettings(s => s.defaultNodeFontFamily);
  const setDefaultNodeFontFamily = useAppSettings(s => s.setDefaultNodeFontFamily);
  const allInterfaceThemes = getAllInterfaceThemes();
  const shortcuts = useShortcuts(s => s.map);
  const setShortcut = useShortcuts(s => s.setShortcut);
  const resetShortcuts = useShortcuts(s => s.resetDefaults);
  const [searchParams] = useSearchParams();
  const [section, setSection] = useState<
    'appearance' | 'shortcuts' | 'plugins' | 'sources' | 'github'
  >('appearance');
  const platform = usePlatform();
  const { info: showInfo, success: showSuccess } = useToast();

  // Plugin management state
  const [pluginView, setPluginView] = useState<'plugins' | 'audit' | 'policy' | 'panels'>(
    'plugins'
  );
  const [pluginCardWidth, setPluginCardWidth] = useState<'compact' | 'normal' | 'wide'>('normal');
  const [plugins, setPlugins] = useState<Map<string, PluginInfo>>(new Map());
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null); // NEW: Selected plugin for detail view
  const [permissionRequest, setPermissionRequest] = useState<{
    pluginId: string;
    pluginName: string;
    permissions: Permission[];
    resolve: (approved: boolean) => void;
  } | null>(null);
  const [policyEditing, setPolicyEditing] = useState<string | null>(null);

  // Force re-render of dynamic settings sections when plugins change
  const [settingsVersion, setSettingsVersion] = useState(0);

  // Check URL params for section (e.g., /settings?section=plugins)
  useEffect(() => {
    const sectionParam = searchParams.get('section');
    if (
      sectionParam === 'plugins' ||
      sectionParam === 'appearance' ||
      sectionParam === 'shortcuts' ||
      sectionParam === 'sources' ||
      sectionParam === 'github'
    ) {
      setSection(sectionParam);
    }
  }, [searchParams]);

  // Load plugins
  useEffect(() => {
    const updatePlugins = () => {
      setPlugins(registry.getAllPlugins());
    };

    updatePlugins();

    // Listen to plugin events
    registry.on('plugin:registered', updatePlugins);
    registry.on('plugin:activated', updatePlugins);
    registry.on('plugin:deactivated', updatePlugins);
    registry.on('plugin:unregistered', updatePlugins);

    return () => {
      registry.off('plugin:registered', updatePlugins);
      registry.off('plugin:activated', updatePlugins);
      registry.off('plugin:deactivated', updatePlugins);
      registry.off('plugin:unregistered', updatePlugins);
    };
  }, []);

  // Listen to settings registry changes
  useEffect(() => {
    // eslint-disable-next-line no-console

    // Force initial render to pick up any sections already registered
    setSettingsVersion(v => v + 1);

    const unsubscribe = onSettingsRegistryChange(() => {
      // eslint-disable-next-line no-console
      setSettingsVersion(v => v + 1);
    });

    return unsubscribe;
  }, []);

  // Plugin handlers
  const saveActivationState = () => {
    const activePluginIds: string[] = [];
    registry.getAllPlugins().forEach((info, pluginId) => {
      if (info.state === 'active') {
        activePluginIds.push(pluginId);
      }
    });
    saveActivatedPlugins(activePluginIds);
  };

  const handlePermissionApprove = () => {
    if (permissionRequest) {
      permissionRequest.resolve(true);
      setPermissionRequest(null);
    }
  };

  const handlePermissionDeny = () => {
    if (permissionRequest) {
      permissionRequest.resolve(false);
      setPermissionRequest(null);
    }
  };

  const handleActivate = async (pluginId: string) => {
    try {
      await registry.activate(pluginId);
      await auditLogger.logPluginActivated(pluginId);
      saveActivationState();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to activate plugin:', error);
      await auditLogger.logSecurityAlert(
        pluginId,
        `Failed to activate: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleDeactivate = async (pluginId: string) => {
    await registry.deactivate(pluginId);
    saveActivationState();
  };

  const handleUninstall = async (pluginId: string) => {
    await registry.unregister(pluginId);
    saveActivationState();
  };

  const handleInstall = async (pluginId: string) => {
    // eslint-disable-next-line no-console

    // Import the installer service dynamically
    const { installPlugin } = await import('../services/PluginInstaller');

    // Download and install the plugin (errors will propagate to PluginManager)
    const plugin = await installPlugin(pluginId);
    // eslint-disable-next-line no-console

    // Register the plugin in the registry
    await registry.register(plugin, false); // Don't auto-activate
    // eslint-disable-next-line no-console

    // Activate the plugin
    await handleActivate(pluginId);
    // eslint-disable-next-line no-console

    // Success notification will be handled by PluginManager
  };

  const handleViewPermissions = (pluginId: string) => {
    const summary = permissionManager.getSecuritySummary(pluginId);
    showInfo(`Permissions pour ${pluginId} : voir la console pour les détails`);
    // eslint-disable-next-line no-console
    console.info('Security Summary:', summary);
  };

  const handleQueryAudit = async (filters: AuditQueryFilters): Promise<AuditEvent[]> =>
    auditLogger.query(filters);

  const handleSavePolicy = async (pluginId: string, policy: Policy) => {
    policyEngine.registerPolicy(pluginId, policy);
    setPolicyEditing(null);
    showSuccess('Politique sauvegardée avec succès!');
  };

  const toAccelerator = (e: React.KeyboardEvent<HTMLInputElement>): string => {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push(platform.isMac ? 'Cmd' : 'Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    const { key } = e;
    // ignore modifier-only
    if (key && !['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      let main = key;
      if (key === '+') main = 'Plus';
      if (key.length === 1) main = key.toUpperCase();
      else if (key === ' ') main = 'Space';
      parts.push(main);
    }
    return parts.join('+');
  };

  return (
    <div className="main-layout">
      <div className="frameset-vertical-1">
        <div className="menu-bar-container">
          <MenuBar />
        </div>
        <div style={{ padding: 16, flex: '1 1 auto', overflow: 'hidden' }}>
          <div className="settings-container">
            <button
              type="button"
              aria-label="Fermer les paramètres"
              className="btn settings-close-btn"
              onClick={() => navigate('/')}
            >
              <X className="icon-small" />
            </button>
            {/* Sidebar */}
            <aside className="settings-sidebar">
              <div className="settings-sidebar-title">Paramètres</div>
              <nav>
                <button
                  type="button"
                  className={`btn settings-nav-btn ${section === 'appearance' ? 'active' : ''}`}
                  onClick={() => setSection('appearance')}
                >
                  Apparence
                </button>
                <button
                  type="button"
                  className={`btn settings-nav-btn ${section === 'shortcuts' ? 'active' : ''}`}
                  onClick={() => setSection('shortcuts')}
                >
                  Raccourcis clavier
                </button>
                <button
                  type="button"
                  className={`btn settings-nav-btn ${section === 'plugins' ? 'active' : ''}`}
                  onClick={() => setSection('plugins')}
                >
                  🔌 Plugins
                </button>
                <button
                  type="button"
                  className={`btn settings-nav-btn ${section === 'sources' ? 'active' : ''}`}
                  onClick={() => setSection('sources')}
                >
                  📦 Sources de Plugins
                </button>
                <button
                  type="button"
                  className={`btn settings-nav-btn ${section === 'github' ? 'active' : ''}`}
                  onClick={() => setSection('github')}
                >
                  🔐 Connexion GitHub
                </button>
              </nav>
            </aside>

            {/* Content */}
            <section className="settings-content">
              {section === 'appearance' && (
                <div className="settings-section">
                  <h2 className="settings-section-title">Apparence</h2>
                  {(() => {
                    const sections = getSettingsSections('appearance');
                    return null;
                  })()}

                  {/* FR: Sélecteur de thème d'interface */}
                  {/* EN: Interface theme selector */}
                  <div className="settings-field">
                    <span className="settings-label">Thème d&apos;interface</span>
                    <select
                      id="theme"
                      value={themeId}
                      onChange={e => setTheme(e.target.value)}
                      className="settings-select"
                      aria-label="Sélectionner un thème d'interface"
                    >
                      {allInterfaceThemes.map(theme => (
                        <option key={theme.id} value={theme.id}>
                          {theme.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FR: Couleur d'accent personnalisée */}
                  {/* EN: Custom accent color */}
                  <div className="settings-field">
                    <span className="settings-label">Couleur d&apos;accent personnalisée</span>
                    <input
                      id="accentColor"
                      type="color"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      aria-label="Choisir une couleur d'accent"
                      className="settings-color-input"
                    />
                    <span className="settings-color-value">{accentColor}</span>
                  </div>

                  {/* FR: Affichage de la minimap */}
                  {/* EN: Minimap display */}
                  <div className="settings-field">
                    <span className="settings-label">Afficher la minimap</span>
                    <input
                      id="showMinimap"
                      type="checkbox"
                      checked={showMinimap}
                      onChange={e => setShowMinimap(e.target.checked)}
                      aria-label="Afficher la minimap"
                      className="settings-checkbox"
                    />
                  </div>

                  {/* FR: Réouverture des fichiers au démarrage */}
                  {/* EN: Reopen files on startup */}
                  <div className="settings-field">
                    <span className="settings-label">Réouvrir les cartes au démarrage</span>
                    <input
                      id="reopenFilesOnStartup"
                      type="checkbox"
                      checked={reopenFilesOnStartup}
                      onChange={e => setReopenFilesOnStartup(e.target.checked)}
                      aria-label="Réouvrir les cartes au démarrage"
                      className="settings-checkbox"
                    />
                  </div>

                  {/* FR: Sections dynamiques injectées par les plugins */}
                  {/* EN: Dynamic sections injected by plugins */}
                  {getSettingsSections('appearance').map(settingsSection => {
                    const Component = settingsSection.component;
                    return <Component key={`${settingsSection.id}-${settingsVersion}`} />;
                  })}

                  <h3 className="settings-subsection-title">Style par défaut des nœuds</h3>

                  {/* FR: Taille de police par défaut */}
                  {/* EN: Default font size */}
                  <div className="settings-field">
                    <span className="settings-label">Taille de police par défaut</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        id="defaultNodeFontSize"
                        type="number"
                        min="8"
                        max="72"
                        value={defaultNodeFontSize}
                        onChange={e => setDefaultNodeFontSize(Number(e.target.value))}
                        aria-label="Taille de police par défaut des nœuds"
                        style={{ width: '100px' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--fg-secondary)' }}>px</span>
                    </div>
                  </div>

                  {/* FR: Largeur par défaut */}
                  {/* EN: Default width */}
                  <div className="settings-field">
                    <span className="settings-label">Largeur par défaut des nœuds</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        id="defaultNodeWidth"
                        type="number"
                        min="100"
                        max="800"
                        step="10"
                        value={defaultNodeWidth}
                        onChange={e => setDefaultNodeWidth(Number(e.target.value))}
                        aria-label="Largeur par défaut des nœuds"
                        style={{ width: '100px' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--fg-secondary)' }}>px</span>
                    </div>
                  </div>

                  {/* FR: Hauteur par défaut */}
                  {/* EN: Default height */}
                  <div className="settings-field">
                    <span className="settings-label">Hauteur par défaut des nœuds</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        id="defaultNodeHeight"
                        type="number"
                        min="0"
                        max="400"
                        step="10"
                        value={defaultNodeHeight}
                        onChange={e => setDefaultNodeHeight(Number(e.target.value))}
                        aria-label="Hauteur par défaut des nœuds"
                        style={{ width: '100px' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--fg-secondary)' }}>
                        px (0 = automatique)
                      </span>
                    </div>
                  </div>

                  {/* FR: Police par défaut */}
                  {/* EN: Default font family */}
                  <div className="settings-field">
                    <span className="settings-label">Police par défaut des nœuds</span>
                    <select
                      id="defaultNodeFontFamily"
                      value={defaultNodeFontFamily}
                      onChange={e => setDefaultNodeFontFamily(e.target.value)}
                      className="settings-select"
                      aria-label="Police par défaut des nœuds"
                    >
                      <option value="inherit">Par défaut (Système)</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                      <option value="'Times New Roman', Times, serif">Times New Roman</option>
                      <option value="Georgia, serif">Georgia</option>
                      <option value="'Courier New', Courier, monospace">Courier New</option>
                      <option value="'Monaco', 'Menlo', monospace">Monaco</option>
                    </select>
                  </div>
                </div>
              )}

              {section === 'shortcuts' && (
                <div>
                  <h2 className="settings-shortcuts-title">Raccourcis clavier</h2>
                  {(() => {
                    const groups: Record<string, Array<[string, string]>> = {};
                    Object.entries(shortcuts).forEach(([action, acc]) => {
                      const cat = action.split('.')[0] || 'autres';
                      (groups[cat] = groups[cat] || []).push([action, acc]);
                    });
                    const order = ['file', 'edit', 'view', 'insert', 'tools', 'autres'];
                    return order
                      .filter(k => groups[k] && groups[k].length)
                      .map(cat => (
                        <div key={cat} className="settings-shortcuts-group">
                          <div className="settings-shortcuts-group-title">{cat}</div>
                          <div className="settings-shortcuts-grid">
                            {groups[cat].map(([action, acc]) => {
                              const inputId = `shortcut-${action}`;
                              return (
                                <React.Fragment key={action}>
                                  <label htmlFor={inputId} className="settings-shortcuts-label">
                                    {action.split('.')[1] || action}
                                  </label>
                                  <input
                                    id={inputId}
                                    type="text"
                                    value={acc}
                                    onChange={e =>
                                      setShortcut(action as ShortcutAction, e.target.value)
                                    }
                                    onKeyDown={e => {
                                      e.preventDefault();
                                      const accel = toAccelerator(e);
                                      if (accel) setShortcut(action as ShortcutAction, accel);
                                    }}
                                    className="input settings-shortcuts-input"
                                    placeholder="Appuyez sur une combinaison…"
                                  />
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      ));
                  })()}
                  <div className="settings-shortcuts-reset">
                    <button type="button" className="btn" onClick={resetShortcuts}>
                      Réinitialiser par défaut
                    </button>
                  </div>
                </div>
              )}

              {/* {section === 'developer' && (
                <div className="settings-section">
                  <h2 className="settings-section-title">Mode Développeur</h2>
                  <p style={{ color: 'var(--fg-secondary)', marginBottom: '24px' }}>
                    Outils pour développer et publier des plugins community
                  </p>

                  <div style={{ marginBottom: '24px' }}>
                    <h3 className="settings-subsection-title">Activer le mode développeur</h3>
                    <DeveloperModeToggle />
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h3 className="settings-subsection-title">Authentification GitHub</h3>
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--fg-secondary)',
                        marginBottom: '12px',
                      }}
                    >
                      Connectez-vous avec votre compte GitHub pour publier des plugins
                    </p>
                    <GitHubLoginButton />
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                    }}
                  >
                    <h3 style={{ marginTop: 0, marginBottom: '12px' }}>
                      Comment développer un plugin
                    </h3>
                    <ol
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: 'var(--fg-secondary)',
                        paddingLeft: '20px',
                      }}
                    >
                      <li>Activez le mode développeur ci-dessus</li>
                      <li>Connectez-vous avec votre compte GitHub</li>
                      <li>
                        Dans la section Plugins, les boutons de développement apparaîtront sur les
                        plugins community
                      </li>
                      <li>
                        Cliquez sur &quot;Clone for Dev&quot; pour télécharger un plugin dans votre
                        environnement local
                      </li>
                      <li>Modifiez le code du plugin selon vos besoins</li>
                      <li>
                        Cliquez sur &quot;Publish to Registry&quot; pour publier vos modifications
                        (nécessite d&apos;être l&apos;auteur)
                      </li>
                    </ol>
                  </div>
                </div>
              )} */}

              {section === 'plugins' &&
                (() => {
                  // Calculate card width based on selected preset
                  const cardWidthMap = {
                    compact: '70%',
                    normal: '100%',
                    wide: '1400px',
                  };

                  return (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '24px',
                        }}
                      >
                        <h2 className="settings-section-title">Gestion des Plugins</h2>
                        {/* Width controls */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[
                            { id: 'compact' as const, label: 'Compact', width: '70%' },
                            { id: 'normal' as const, label: 'Normal', width: '100%' },
                            { id: 'wide' as const, label: 'Large', width: '1400px' },
                          ].map(({ id, label }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setPluginCardWidth(id)}
                              style={{
                                padding: '6px 12px',
                                border:
                                  pluginCardWidth === id
                                    ? '2px solid var(--accent-color)'
                                    : '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor:
                                  pluginCardWidth === id ? 'var(--accent-color-10)' : 'transparent',
                                color:
                                  pluginCardWidth === id
                                    ? 'var(--accent-color)'
                                    : 'var(--fg-secondary)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: pluginCardWidth === id ? 600 : 400,
                                transition: 'all 0.2s',
                              }}
                              title={`Largeur: ${label}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Plugin card container */}
                      <div
                        style={{
                          width: cardWidthMap[pluginCardWidth],
                          margin: '0 auto',
                          padding: '24px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {/* Plugin sub-navigation */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            marginBottom: '24px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {[
                            { id: 'plugins' as const, label: 'Gestionnaire', icon: '🔌' },
                            { id: 'panels' as const, label: 'Panels', icon: '🖼️' },
                            { id: 'audit' as const, label: 'Audit', icon: '📊' },
                            { id: 'policy' as const, label: 'Politiques', icon: '🔐' },
                          ].map(({ id, label, icon }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setPluginView(id)}
                              style={{
                                padding: '8px 16px',
                                border:
                                  pluginView === id
                                    ? '2px solid var(--accent-color)'
                                    : '1px solid #d1d5db',
                                borderRadius: '6px',
                                backgroundColor:
                                  pluginView === id ? 'var(--accent-color-10)' : 'transparent',
                                color:
                                  pluginView === id ? 'var(--accent-color)' : 'var(--fg-primary)',
                                fontWeight: pluginView === id ? 600 : 400,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              {icon} {label}
                            </button>
                          ))}
                        </div>

                        {/* Plugin content */}
                        {pluginView === 'plugins' &&
                          (selectedPlugin ? (
                            <PluginDetailPage
                              plugin={plugins.get(selectedPlugin)!}
                              onBack={() => setSelectedPlugin(null)}
                              onActivate={
                                plugins.get(selectedPlugin)?.state === 'active'
                                  ? undefined
                                  : async () => {
                                      await handleActivate(selectedPlugin);
                                      setSelectedPlugin(null);
                                    }
                              }
                              onDeactivate={
                                plugins.get(selectedPlugin)?.state === 'active'
                                  ? async () => {
                                      await handleDeactivate(selectedPlugin);
                                      setSelectedPlugin(null);
                                    }
                                  : undefined
                              }
                            />
                          ) : (
                            <PluginManager
                              plugins={plugins}
                              onActivate={handleActivate}
                              onDeactivate={handleDeactivate}
                              onUninstall={handleUninstall}
                              onViewPermissions={handleViewPermissions}
                              onInstall={handleInstall}
                            />
                          ))}

                        {pluginView === 'panels' && (
                          <div>
                            <div style={{ marginBottom: '16px' }}>
                              <h3>Panneaux des Plugins</h3>
                              <p
                                style={{
                                  color: 'var(--fg-secondary)',
                                  fontSize: '14px',
                                }}
                              >
                                Interface créée par les plugins actifs
                              </p>
                              <div
                                style={{
                                  padding: '20px',
                                  textAlign: 'center',
                                  color: 'var(--fg-secondary)',
                                }}
                              >
                                Les panneaux des plugins apparaissent ici lorsque les plugins sont
                                activés.
                              </div>
                            </div>
                          </div>
                        )}

                        {pluginView === 'audit' && <AuditDashboard onQuery={handleQueryAudit} />}

                        {pluginView === 'policy' && (
                          <div>
                            <div style={{ marginBottom: '16px' }}>
                              <h3>Politiques ABAC</h3>
                              <p
                                style={{
                                  color: 'var(--fg-secondary)',
                                  fontSize: '14px',
                                }}
                              >
                                Définissez des règles d&apos;accès basées sur les attributs pour
                                chaque plugin.
                              </p>
                            </div>

                            {policyEditing ? (
                              <PolicyEditor
                                pluginId={policyEditing}
                                onSave={async policy => handleSavePolicy(policyEditing, policy)}
                                onCancel={() => setPolicyEditing(null)}
                              />
                            ) : (
                              <div>
                                {Array.from(plugins.keys()).map(pluginId => (
                                  <div
                                    key={pluginId}
                                    style={{
                                      padding: '12px',
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '6px',
                                      marginBottom: '8px',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <span>{pluginId}</span>
                                    <button
                                      type="button"
                                      onClick={() => setPolicyEditing(pluginId)}
                                      style={{
                                        padding: '6px 12px',
                                        border: '1px solid var(--accent-color)',
                                        borderRadius: '4px',
                                        backgroundColor: 'transparent',
                                        color: 'var(--accent-color)',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Éditer la politique
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Permission Dialog */}
                        {permissionRequest && (
                          <PermissionDialog
                            pluginId={permissionRequest.pluginId}
                            pluginName={permissionRequest.pluginName}
                            permissions={permissionRequest.permissions}
                            onApprove={handlePermissionApprove}
                            onDeny={handlePermissionDeny}
                          />
                        )}
                      </div>
                      {/* End of card container */}
                    </div>
                  );
                })()}

              {/* Sources de Plugins Section */}
              {section === 'sources' && (
                <div className="settings-section">
                  <PluginRepositorySettings />
                </div>
              )}

              {/* GitHub Connection Section */}
              {section === 'github' && (
                <div className="settings-section">
                  <h2 className="settings-section-title">Connexion GitHub</h2>
                  <p style={{ color: 'var(--fg-secondary)', marginBottom: '24px' }}>
                    Connectez-vous avec votre compte GitHub pour accéder aux fonctionnalités
                    administrateur et à la gestion du marketplace.
                  </p>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <GitHubLoginButton />
                  </div>
                </div>
              )}

              {/* Administration Section removed - provided by com.cartae.admin-panel private plugin */}
            </section>
          </div>
        </div>
        <div className="status-bar-container">
          <StatusBar />
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
