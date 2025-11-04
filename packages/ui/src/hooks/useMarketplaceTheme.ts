/**
 * FR: Hook pour gérer les thèmes du Marketplace UI
 * EN: Hook to manage Marketplace UI themes
 *
 * Session 61 - Marketplace UI Theme Customization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  MarketplaceTheme,
  MarketplaceThemeConfig,
  MarketplaceThemeStorage,
  MarketplaceLayoutConfig,
  MarketplaceThemeEvent,
  MarketplaceThemeEventCallback,
  CreateMarketplaceThemeOptions,
} from '@cartae/design';
import { marketplaceDefaultThemes } from '../data/marketplace-themes';

/**
 * FR: Nom de la clé de stockage IndexedDB
 * EN: IndexedDB storage key name
 */
const STORAGE_KEY = 'cartae-marketplace-theme';
const STORAGE_VERSION = '1.0.0';

/**
 * FR: Nom de la base de données IndexedDB
 * EN: IndexedDB database name
 */
const DB_NAME = 'CartaeMarketplaceTheme';
const DB_VERSION = 1;
const STORE_NAME = 'themes';

/**
 * FR: Interface pour le hook
 * EN: Hook interface
 */
export interface UseMarketplaceThemeReturn {
  // State
  currentTheme: MarketplaceTheme | null;
  layoutConfig: MarketplaceLayoutConfig;
  availableThemes: MarketplaceTheme[];
  customThemes: MarketplaceTheme[];
  isLoading: boolean;
  error: string | null;

  // Theme operations
  changeTheme: (themeId: string) => Promise<void>;
  createCustomTheme: (options: CreateMarketplaceThemeOptions) => Promise<MarketplaceTheme>;
  deleteCustomTheme: (themeId: string) => Promise<void>;
  resetToDefault: () => Promise<void>;

  // Layout operations
  updateLayout: (config: Partial<MarketplaceLayoutConfig>) => Promise<void>;
  resetLayout: () => Promise<void>;

  // Preferences
  toggleAutoDarkMode: () => Promise<void>;
  toggleReduceMotion: () => Promise<void>;
  toggleHighContrast: () => Promise<void>;
  toggleSyncWithObsidian: () => Promise<void>;
  setFontSizeScale: (scale: number) => Promise<void>;

  // Events
  addEventListener: (callback: MarketplaceThemeEventCallback) => () => void;
}

/**
 * FR: Ouvrir la base de données IndexedDB
 * EN: Open IndexedDB database
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * FR: Charger le stockage depuis IndexedDB
 * EN: Load storage from IndexedDB
 */
async function loadStorage(): Promise<MarketplaceThemeStorage | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(STORAGE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    console.error('Failed to load from IndexedDB:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }
}

/**
 * FR: Sauvegarder le stockage dans IndexedDB
 * EN: Save storage to IndexedDB
 */
async function saveStorage(storage: MarketplaceThemeStorage): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.put(storage, STORAGE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Failed to save to IndexedDB:', error);
    // Fallback to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  }
}

/**
 * FR: Appliquer un thème au DOM
 * EN: Apply theme to DOM
 */
function applyThemeToDom(theme: MarketplaceTheme): void {
  const root = document.documentElement;

  // Apply base theme colors
  root.style.setProperty('--marketplace-primary', theme.colors.primary);
  root.style.setProperty('--marketplace-secondary', theme.colors.secondary);
  root.style.setProperty('--marketplace-accent', theme.colors.accent);
  root.style.setProperty('--marketplace-background', theme.colors.background);
  root.style.setProperty('--marketplace-surface', theme.colors.surface);
  root.style.setProperty('--marketplace-text', theme.colors.text);
  root.style.setProperty('--marketplace-text-muted', theme.colors.textMuted);
  root.style.setProperty('--marketplace-border', theme.colors.border);
  root.style.setProperty('--marketplace-success', theme.colors.success);
  root.style.setProperty('--marketplace-warning', theme.colors.warning);
  root.style.setProperty('--marketplace-error', theme.colors.error);
  root.style.setProperty('--marketplace-info', theme.colors.info);

  // Apply marketplace-specific variables
  Object.entries(theme.marketplaceVars).forEach(([key, value]) => {
    const cssVarName = `--marketplace-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });

  // Apply border radius
  root.style.setProperty('--marketplace-radius-sm', theme.borderRadius.sm);
  root.style.setProperty('--marketplace-radius-md', theme.borderRadius.md);
  root.style.setProperty('--marketplace-radius-lg', theme.borderRadius.lg);
  root.style.setProperty('--marketplace-radius-xl', theme.borderRadius.xl);

  // Apply shadows
  root.style.setProperty('--marketplace-shadow-sm', theme.shadows.sm);
  root.style.setProperty('--marketplace-shadow-md', theme.shadows.md);
  root.style.setProperty('--marketplace-shadow-lg', theme.shadows.lg);

  // Apply fonts
  root.style.setProperty('--marketplace-font-primary', theme.fonts.primary);
  root.style.setProperty('--marketplace-font-secondary', theme.fonts.secondary);
  root.style.setProperty('--marketplace-font-mono', theme.fonts.mono);

  // Add theme class to body
  document.body.classList.remove('marketplace-theme-light', 'marketplace-theme-dark');
  document.body.classList.add(`marketplace-theme-${theme.category}`);
}

/**
 * FR: Appliquer la configuration du layout au DOM
 * EN: Apply layout configuration to DOM
 */
function applyLayoutToDom(config: MarketplaceLayoutConfig): void {
  const root = document.documentElement;

  // Layout mode
  root.setAttribute('data-marketplace-layout', config.layoutMode);

  // Sidebar position
  root.setAttribute('data-marketplace-sidebar', config.sidebarPosition);

  // Search position
  root.setAttribute('data-marketplace-search', config.searchPosition);

  // Grid columns
  root.style.setProperty('--marketplace-grid-columns', config.gridColumns.toString());

  // Card size
  root.setAttribute('data-marketplace-card-size', config.cardSize);

  // Toggles
  root.setAttribute('data-marketplace-show-previews', config.showPreviews.toString());
  root.setAttribute('data-marketplace-show-stats', config.showStats.toString());
  root.setAttribute('data-marketplace-show-ratings', config.showRatings.toString());
}

/**
 * FR: Hook principal pour gérer les thèmes marketplace
 * EN: Main hook to manage marketplace themes
 */
export function useMarketplaceTheme(): UseMarketplaceThemeReturn {
  const [currentTheme, setCurrentTheme] = useState<MarketplaceTheme | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<MarketplaceLayoutConfig>(
    marketplaceDefaultThemes[0].layoutConfig!
  );
  const [availableThemes, setAvailableThemes] = useState<MarketplaceTheme[]>(marketplaceDefaultThemes);
  const [customThemes, setCustomThemes] = useState<MarketplaceTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const eventListeners = useRef<Set<MarketplaceThemeEventCallback>>(new Set());

  /**
   * FR: Émettre un événement
   * EN: Emit an event
   */
  const emitEvent = useCallback((event: MarketplaceThemeEvent) => {
    eventListeners.current.forEach(callback => callback(event));
  }, []);

  /**
   * FR: Charger l'état initial
   * EN: Load initial state
   */
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        setError(null);

        const storage = await loadStorage();

        if (storage) {
          // Restore from storage
          setLayoutConfig(storage.config.layoutConfig);
          setCustomThemes(storage.config.customThemes);

          const theme = [...availableThemes, ...storage.config.customThemes].find(
            t => t.id === storage.config.currentTheme
          );

          if (theme) {
            setCurrentTheme(theme);
            applyThemeToDom(theme);
            applyLayoutToDom(storage.config.layoutConfig);
          } else {
            // Fallback to default
            setCurrentTheme(marketplaceDefaultThemes[0]);
            applyThemeToDom(marketplaceDefaultThemes[0]);
            applyLayoutToDom(layoutConfig);
          }
        } else {
          // Initialize with defaults
          const defaultTheme = marketplaceDefaultThemes[0];
          setCurrentTheme(defaultTheme);
          applyThemeToDom(defaultTheme);
          applyLayoutToDom(layoutConfig);

          // Save initial state
          await saveStorage({
            config: {
              currentTheme: defaultTheme.id,
              layoutConfig,
              availableThemes: marketplaceDefaultThemes,
              customThemes: [],
              installedTemplates: [],
              userPreferences: {
                autoDarkMode: false,
                reduceMotion: false,
                highContrast: false,
                fontSizeScale: 1,
                syncWithObsidian: false,
              },
            },
            version: STORAGE_VERSION,
            lastUpdated: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Failed to initialize marketplace theme:', err);
        setError('Failed to load theme');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  /**
   * FR: Changer le thème actuel
   * EN: Change current theme
   */
  const changeTheme = useCallback(async (themeId: string) => {
    try {
      const theme = [...availableThemes, ...customThemes].find(t => t.id === themeId);
      if (!theme) {
        throw new Error(`Theme ${themeId} not found`);
      }

      setCurrentTheme(theme);
      applyThemeToDom(theme);

      const storage = await loadStorage();
      if (storage) {
        storage.config.currentTheme = themeId;
        storage.lastUpdated = new Date().toISOString();
        await saveStorage(storage);
      }

      emitEvent({ type: 'theme-changed', themeId });
    } catch (err) {
      console.error('Failed to change theme:', err);
      setError('Failed to change theme');
      throw err;
    }
  }, [availableThemes, customThemes, emitEvent]);

  /**
   * FR: Créer un thème personnalisé
   * EN: Create custom theme
   */
  const createCustomTheme = useCallback(async (
    options: CreateMarketplaceThemeOptions
  ): Promise<MarketplaceTheme> => {
    try {
      const baseTheme = options.baseThemeId
        ? [...availableThemes, ...customThemes].find(t => t.id === options.baseThemeId)
        : marketplaceDefaultThemes[0];

      if (!baseTheme) {
        throw new Error('Base theme not found');
      }

      const newTheme: MarketplaceTheme = {
        ...baseTheme,
        id: `custom-${Date.now()}`,
        name: options.name,
        description: options.description,
        category: 'custom',
        isCustom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        marketplaceVars: {
          ...baseTheme.marketplaceVars,
          ...options.customColors,
        },
        layoutConfig: {
          ...baseTheme.layoutConfig!,
          ...options.layoutConfig,
        },
      };

      const newCustomThemes = [...customThemes, newTheme];
      setCustomThemes(newCustomThemes);

      const storage = await loadStorage();
      if (storage) {
        storage.config.customThemes = newCustomThemes;
        storage.lastUpdated = new Date().toISOString();
        await saveStorage(storage);
      }

      emitEvent({ type: 'theme-created', theme: newTheme });

      return newTheme;
    } catch (err) {
      console.error('Failed to create custom theme:', err);
      setError('Failed to create custom theme');
      throw err;
    }
  }, [availableThemes, customThemes, emitEvent]);

  /**
   * FR: Supprimer un thème personnalisé
   * EN: Delete custom theme
   */
  const deleteCustomTheme = useCallback(async (themeId: string) => {
    try {
      const newCustomThemes = customThemes.filter(t => t.id !== themeId);
      setCustomThemes(newCustomThemes);

      // If deleting current theme, switch to default
      if (currentTheme?.id === themeId) {
        await changeTheme(marketplaceDefaultThemes[0].id);
      }

      const storage = await loadStorage();
      if (storage) {
        storage.config.customThemes = newCustomThemes;
        storage.lastUpdated = new Date().toISOString();
        await saveStorage(storage);
      }

      emitEvent({ type: 'theme-deleted', themeId });
    } catch (err) {
      console.error('Failed to delete custom theme:', err);
      setError('Failed to delete custom theme');
      throw err;
    }
  }, [customThemes, currentTheme, changeTheme, emitEvent]);

  /**
   * FR: Réinitialiser au thème par défaut
   * EN: Reset to default theme
   */
  const resetToDefault = useCallback(async () => {
    await changeTheme(marketplaceDefaultThemes[0].id);
  }, [changeTheme]);

  /**
   * FR: Mettre à jour la configuration du layout
   * EN: Update layout configuration
   */
  const updateLayout = useCallback(async (config: Partial<MarketplaceLayoutConfig>) => {
    try {
      const newConfig = { ...layoutConfig, ...config };
      setLayoutConfig(newConfig);
      applyLayoutToDom(newConfig);

      const storage = await loadStorage();
      if (storage) {
        storage.config.layoutConfig = newConfig;
        storage.lastUpdated = new Date().toISOString();
        await saveStorage(storage);
      }

      emitEvent({ type: 'layout-changed', layoutConfig: newConfig });
    } catch (err) {
      console.error('Failed to update layout:', err);
      setError('Failed to update layout');
      throw err;
    }
  }, [layoutConfig, emitEvent]);

  /**
   * FR: Réinitialiser le layout
   * EN: Reset layout
   */
  const resetLayout = useCallback(async () => {
    await updateLayout(marketplaceDefaultThemes[0].layoutConfig!);
  }, [updateLayout]);

  /**
   * FR: Basculer le mode sombre automatique
   * EN: Toggle auto dark mode
   */
  const toggleAutoDarkMode = useCallback(async () => {
    const storage = await loadStorage();
    if (storage) {
      storage.config.userPreferences.autoDarkMode = !storage.config.userPreferences.autoDarkMode;
      storage.lastUpdated = new Date().toISOString();
      await saveStorage(storage);

      // Auto-switch based on system preference
      if (storage.config.userPreferences.autoDarkMode) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const targetTheme = prefersDark ? 'marketplace-dark' : 'marketplace-light';
        await changeTheme(targetTheme);
      }
    }
  }, [changeTheme]);

  /**
   * FR: Basculer réduction des animations
   * EN: Toggle reduce motion
   */
  const toggleReduceMotion = useCallback(async () => {
    const storage = await loadStorage();
    if (storage) {
      storage.config.userPreferences.reduceMotion = !storage.config.userPreferences.reduceMotion;
      storage.lastUpdated = new Date().toISOString();
      await saveStorage(storage);

      document.documentElement.setAttribute(
        'data-reduce-motion',
        storage.config.userPreferences.reduceMotion.toString()
      );
    }
  }, []);

  /**
   * FR: Basculer haut contraste
   * EN: Toggle high contrast
   */
  const toggleHighContrast = useCallback(async () => {
    const storage = await loadStorage();
    if (storage) {
      storage.config.userPreferences.highContrast = !storage.config.userPreferences.highContrast;
      storage.lastUpdated = new Date().toISOString();
      await saveStorage(storage);

      document.documentElement.setAttribute(
        'data-high-contrast',
        storage.config.userPreferences.highContrast.toString()
      );
    }
  }, []);

  /**
   * FR: Basculer synchronisation avec Obsidian
   * EN: Toggle sync with Obsidian
   */
  const toggleSyncWithObsidian = useCallback(async () => {
    const storage = await loadStorage();
    if (storage) {
      storage.config.userPreferences.syncWithObsidian = !storage.config.userPreferences.syncWithObsidian;
      storage.lastUpdated = new Date().toISOString();
      await saveStorage(storage);
    }
  }, []);

  /**
   * FR: Définir l'échelle de police
   * EN: Set font size scale
   */
  const setFontSizeScale = useCallback(async (scale: number) => {
    const storage = await loadStorage();
    if (storage) {
      storage.config.userPreferences.fontSizeScale = scale;
      storage.lastUpdated = new Date().toISOString();
      await saveStorage(storage);

      document.documentElement.style.setProperty('--marketplace-font-scale', scale.toString());
    }
  }, []);

  /**
   * FR: Ajouter un écouteur d'événements
   * EN: Add event listener
   */
  const addEventListener = useCallback((callback: MarketplaceThemeEventCallback) => {
    eventListeners.current.add(callback);
    return () => eventListeners.current.delete(callback);
  }, []);

  return {
    // State
    currentTheme,
    layoutConfig,
    availableThemes,
    customThemes,
    isLoading,
    error,

    // Theme operations
    changeTheme,
    createCustomTheme,
    deleteCustomTheme,
    resetToDefault,

    // Layout operations
    updateLayout,
    resetLayout,

    // Preferences
    toggleAutoDarkMode,
    toggleReduceMotion,
    toggleHighContrast,
    toggleSyncWithObsidian,
    setFontSizeScale,

    // Events
    addEventListener,
  };
}
