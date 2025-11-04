import { useState, useEffect, useCallback } from 'react';
import { Theme, ThemeConfig, ThemeStorage } from '@cartae/design';

/**
 * FR: Hook pour gérer les thèmes UI
 * EN: Hook to manage UI themes
 */
export const useTheme = () => {
  const [currentTheme, setCurrentTheme] = useState<string>('default');
  const [availableThemes, setAvailableThemes] = useState<Theme[]>([]);
  const [customThemes, setCustomThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // FR: Charger les thèmes depuis le stockage
  // EN: Load themes from storage
  const loadThemes = useCallback(async () => {
    try {
      setIsLoading(true);

      // FR: Charger depuis IndexedDB
      // EN: Load from IndexedDB
      const stored = await loadThemeStorage();

      if (stored) {
        setCurrentTheme(stored.config.currentTheme);
        setAvailableThemes(stored.config.availableThemes);
        setCustomThemes(stored.config.customThemes);
      } else {
        // FR: Initialiser avec les thèmes par défaut
        // EN: Initialize with default themes
        const defaultThemes = await getDefaultThemes();
        setAvailableThemes(defaultThemes);
        setCustomThemes([]);
        setCurrentTheme('default');

        // FR: Sauvegarder la configuration initiale
        // EN: Save initial configuration
        await saveThemeStorage({
          config: {
            currentTheme: 'default',
            availableThemes: defaultThemes,
            customThemes: [],
          },
          userPreferences: {
            autoDarkMode: false,
            reduceMotion: false,
            highContrast: false,
            fontSizeScale: 1,
          },
        });
      }
    } catch (error) {
      console.error('Failed to load themes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // FR: Changer le thème actuel
  // EN: Change current theme
  const changeTheme = useCallback(async (themeId: string) => {
    try {
      const theme = [...availableThemes, ...customThemes].find(t => t.id === themeId);
      if (!theme) {
        throw new Error(`Theme ${themeId} not found`);
      }

      setCurrentTheme(themeId);

      // FR: Mettre à jour le stockage
      // EN: Update storage
      const stored = await loadThemeStorage();
      if (stored) {
        stored.config.currentTheme = themeId;
        await saveThemeStorage(stored);
      }

      // FR: Appliquer le thème au DOM
      // EN: Apply theme to DOM
      applyThemeToDOM(theme);
    } catch (error) {
      console.error('Failed to change theme:', error);
    }
  }, [availableThemes, customThemes]);

  // FR: Ajouter un thème personnalisé
  // EN: Add custom theme
  const addCustomTheme = useCallback(async (theme: Theme) => {
    try {
      const newCustomThemes = [...customThemes, { ...theme, isCustom: true }];
      setCustomThemes(newCustomThemes);

      const stored = await loadThemeStorage();
      if (stored) {
        stored.config.customThemes = newCustomThemes;
        await saveThemeStorage(stored);
      }
    } catch (error) {
      console.error('Failed to add custom theme:', error);
    }
  }, [customThemes]);

  // FR: Supprimer un thème personnalisé
  // EN: Remove custom theme
  const removeCustomTheme = useCallback(async (themeId: string) => {
    try {
      const newCustomThemes = customThemes.filter(t => t.id !== themeId);
      setCustomThemes(newCustomThemes);

      // FR: Si le thème supprimé était actif, revenir au thème par défaut
      // EN: If deleted theme was active, revert to default
      if (currentTheme === themeId) {
        await changeTheme('default');
      }

      const stored = await loadThemeStorage();
      if (stored) {
        stored.config.customThemes = newCustomThemes;
        await saveThemeStorage(stored);
      }
    } catch (error) {
      console.error('Failed to remove custom theme:', error);
    }
  }, [customThemes, currentTheme, changeTheme]);

  // FR: Charger les thèmes au montage
  // EN: Load themes on mount
  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  return {
    currentTheme,
    availableThemes,
    customThemes,
    isLoading,
    changeTheme,
    addCustomTheme,
    removeCustomTheme,
    reloadThemes: loadThemes,
  };
};

// FR: Fonctions utilitaires pour le stockage
// EN: Utility functions for storage

const DB_NAME = 'CartaeThemeDB';
const DB_VERSION = 1;
const STORE_NAME = 'themes';

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

async function loadThemeStorage(): Promise<ThemeStorage | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('themeConfig');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    console.error('Failed to load theme storage:', error);
    return null;
  }
}

async function saveThemeStorage(config: ThemeStorage): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(config, 'themeConfig');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Failed to save theme storage:', error);
  }
}

// FR: Thèmes par défaut
// EN: Default themes
async function getDefaultThemes(): Promise<Theme[]> {
  return [
    {
      id: 'default',
      name: 'Default',
      description: 'Thème par défaut de Cartae',
      author: 'Cartae Team',
      version: '1.0.0',
      category: 'light',
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#8b5cf6',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textMuted: '#64748b',
        border: '#e2e8f0',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fonts: {
        primary: 'Inter, system-ui, sans-serif',
        secondary: 'Inter, system-ui, sans-serif',
        mono: 'JetBrains Mono, monospace',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
    },
    {
      id: 'dark',
      name: 'Dark Mode',
      description: 'Thème sombre pour une utilisation nocturne',
      author: 'Cartae Team',
      version: '1.0.0',
      category: 'dark',
      colors: {
        primary: '#60a5fa',
        secondary: '#94a3b8',
        accent: '#a78bfa',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9',
        textMuted: '#94a3b8',
        border: '#334155',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa',
      },
      fonts: {
        primary: 'Inter, system-ui, sans-serif',
        secondary: 'Inter, system-ui, sans-serif',
        mono: 'JetBrains Mono, monospace',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.4)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.4)',
      },
    },
  ];
}

// FR: Appliquer le thème au DOM via CSS Custom Properties
// EN: Apply theme to DOM via CSS Custom Properties
function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement;

  // FR: Appliquer les couleurs
  // EN: Apply colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // FR: Appliquer les polices
  // EN: Apply fonts
  Object.entries(theme.fonts).forEach(([key, value]) => {
    root.style.setProperty(`--font-${key}`, value);
  });

  // FR: Appliquer les bordures
  // EN: Apply border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value);
  });

  // FR: Appliquer les ombres
  // EN: Apply shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value);
  });
}