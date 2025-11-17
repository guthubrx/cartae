/**
 * Browser feature detection utility
 *
 * FR: Utilitaire de détection des fonctionnalités navigateur
 * EN: Browser feature detection utility
 *
 * Usage:
 * ```typescript
 * import { browserSupport, isSupported, checkBrowserSupport } from './utils/browserSupport';
 *
 * // Check specific feature
 * if (browserSupport.crypto()) {
 *   // Use WebCrypto API
 * }
 *
 * // Check overall support
 * if (!isSupported()) {
 *   alert('Browser not fully supported');
 * }
 *
 * // Auto-check on app load
 * checkBrowserSupport();
 * ```
 */

/**
 * Browser feature detection functions
 *
 * FR: Fonctions de détection des fonctionnalités navigateur
 * EN: Browser feature detection functions
 */
export const browserSupport = {
  /**
   * WebCrypto API (required for Vault encryption)
   *
   * FR: API WebCrypto (requise pour le chiffrement Vault)
   * EN: WebCrypto API (required for Vault encryption)
   */
  crypto: (): boolean => {
    return Boolean(window.crypto && window.crypto.subtle);
  },

  /**
   * IndexedDB (required for Dexie local storage)
   *
   * FR: IndexedDB (requise pour le stockage local Dexie)
   * EN: IndexedDB (required for Dexie local storage)
   */
  indexedDB: (): boolean => {
    return Boolean(window.indexedDB);
  },

  /**
   * Service Workers (optional, for PWA)
   *
   * FR: Service Workers (optionnel, pour PWA)
   * EN: Service Workers (optional, for PWA)
   */
  serviceWorker: (): boolean => {
    return 'serviceWorker' in navigator;
  },

  /**
   * Web Workers (optional, for background processing)
   *
   * FR: Web Workers (optionnel, pour traitement en arrière-plan)
   * EN: Web Workers (optional, for background processing)
   */
  worker: (): boolean => {
    return typeof Worker !== 'undefined';
  },

  /**
   * LocalStorage (required for basic storage)
   *
   * FR: LocalStorage (requis pour stockage basique)
   * EN: LocalStorage (required for basic storage)
   */
  localStorage: (): boolean => {
    try {
      const test = '__test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * SessionStorage (optional)
   *
   * FR: SessionStorage (optionnel)
   * EN: SessionStorage (optional)
   */
  sessionStorage: (): boolean => {
    try {
      const test = '__test__';
      window.sessionStorage.setItem(test, test);
      window.sessionStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * CSS Grid (required for modern layouts)
   *
   * FR: CSS Grid (requis pour layouts modernes)
   * EN: CSS Grid (required for modern layouts)
   */
  cssGrid: (): boolean => {
    return CSS.supports('display', 'grid');
  },

  /**
   * CSS Custom Properties (CSS Variables)
   *
   * FR: Propriétés CSS personnalisées (Variables CSS)
   * EN: CSS Custom Properties (CSS Variables)
   */
  cssVars: (): boolean => {
    return CSS.supports('--test', '0');
  },

  /**
   * CSS Flexbox (required for layouts)
   *
   * FR: CSS Flexbox (requis pour layouts)
   * EN: CSS Flexbox (required for layouts)
   */
  flexbox: (): boolean => {
    return CSS.supports('display', 'flex');
  },

  /**
   * Optional Chaining (ES2020)
   *
   * FR: Optional Chaining (ES2020)
   * EN: Optional Chaining (ES2020)
   */
  optionalChaining: (): boolean => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const test: any = null;
      return test?.prop === undefined;
    } catch {
      return false;
    }
  },

  /**
   * Nullish Coalescing (ES2020)
   *
   * FR: Nullish Coalescing (ES2020)
   * EN: Nullish Coalescing (ES2020)
   */
  nullishCoalescing: (): boolean => {
    try {
      const test = null ?? 'default';
      return test === 'default';
    } catch {
      return false;
    }
  },

  /**
   * Dynamic Import (ES2020)
   *
   * FR: Import dynamique (ES2020)
   * EN: Dynamic Import (ES2020)
   */
  dynamicImport: (): boolean => {
    // Dynamic imports sont standard ES2020, supportés par tous les navigateurs modernes
    // TypeScript ne peut pas évaluer typeof import directement (mot-clé réservé)
    return true;
  },

  /**
   * WebP image format
   *
   * FR: Format d'image WebP
   * EN: WebP image format
   */
  webp: async (): Promise<boolean> => {
    if (!('createImageBitmap' in window)) {
      return false;
    }

    const webpData = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';

    try {
      const blob = await fetch(webpData).then(r => r.blob());
      return await createImageBitmap(blob).then(() => true, () => false);
    } catch {
      return false;
    }
  },

  /**
   * Clipboard API (for copy/paste)
   *
   * FR: API Clipboard (pour copier/coller)
   * EN: Clipboard API (for copy/paste)
   */
  clipboard: (): boolean => {
    return Boolean(navigator.clipboard);
  },

  /**
   * Notification API (for push notifications)
   *
   * FR: API Notification (pour notifications push)
   * EN: Notification API (for push notifications)
   */
  notifications: (): boolean => {
    return 'Notification' in window;
  },
};

/**
 * Check if browser is fully supported
 *
 * FR: Vérifier si le navigateur est entièrement supporté
 * EN: Check if browser is fully supported
 *
 * @returns true if browser supports all critical features
 */
export const isSupported = (): boolean => {
  return (
    browserSupport.crypto() &&
    browserSupport.indexedDB() &&
    browserSupport.localStorage() &&
    browserSupport.cssGrid() &&
    browserSupport.flexbox()
  );
};

/**
 * Show warning if browser not supported
 *
 * FR: Afficher un avertissement si le navigateur n'est pas supporté
 * EN: Show warning if browser not supported
 *
 * Usage:
 * ```typescript
 * // In App.tsx or main.tsx
 * checkBrowserSupport();
 * ```
 */
export const checkBrowserSupport = (): void => {
  if (!isSupported()) {
    const message =
      'Votre navigateur n\'est pas entièrement supporté. ' +
      'Veuillez le mettre à jour pour une meilleure expérience.\n\n' +
      'Your browser is not fully supported. ' +
      'Please update it for a better experience.';

    // eslint-disable-next-line no-alert
    alert(message);

    // Log error details (development only)
    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      // eslint-disable-next-line no-console
      console.error('Browser support check failed:', {
        crypto: browserSupport.crypto(),
        indexedDB: browserSupport.indexedDB(),
        localStorage: browserSupport.localStorage(),
        cssGrid: browserSupport.cssGrid(),
        flexbox: browserSupport.flexbox(),
      });
    }
  }
};

/**
 * Get detailed browser support report
 *
 * FR: Obtenir un rapport détaillé du support navigateur
 * EN: Get detailed browser support report
 *
 * @returns object with all feature detection results
 */
export const getBrowserSupportReport = async (): Promise<{
  critical: Record<string, boolean>;
  optional: Record<string, boolean>;
  advanced: Record<string, boolean>;
  isSupported: boolean;
}> => {
  return {
    critical: {
      crypto: browserSupport.crypto(),
      indexedDB: browserSupport.indexedDB(),
      localStorage: browserSupport.localStorage(),
      cssGrid: browserSupport.cssGrid(),
      flexbox: browserSupport.flexbox(),
    },
    optional: {
      serviceWorker: browserSupport.serviceWorker(),
      worker: browserSupport.worker(),
      sessionStorage: browserSupport.sessionStorage(),
      clipboard: browserSupport.clipboard(),
      notifications: browserSupport.notifications(),
    },
    advanced: {
      cssVars: browserSupport.cssVars(),
      optionalChaining: browserSupport.optionalChaining(),
      nullishCoalescing: browserSupport.nullishCoalescing(),
      dynamicImport: browserSupport.dynamicImport(),
      webp: await browserSupport.webp(),
    },
    isSupported: isSupported(),
  };
};

/**
 * Log browser support report to console
 *
 * FR: Logger le rapport de support navigateur dans la console
 * EN: Log browser support report to console
 *
 * Usage:
 * ```typescript
 * // In development mode
 * if (import.meta.env.DEV) {
 *   logBrowserSupportReport();
 * }
 * ```
 */
export const logBrowserSupportReport = async (): Promise<void> => {
  const report = await getBrowserSupportReport();

  // Log report to console (development only)
  if (typeof window !== 'undefined' && (window as any).__DEV__) {
    // eslint-disable-next-line no-console
    console.group('Browser Support Report');
    // eslint-disable-next-line no-console
    console.log('Overall Support:', report.isSupported ? '✅ Supported' : '❌ Not Supported');

    // eslint-disable-next-line no-console
    console.group('Critical Features');
    Object.entries(report.critical).forEach(([feature, supported]) => {
      // eslint-disable-next-line no-console
      console.log(`${supported ? '✅' : '❌'} ${feature}`);
    });
    // eslint-disable-next-line no-console
    console.groupEnd();

    // eslint-disable-next-line no-console
    console.group('Optional Features');
    Object.entries(report.optional).forEach(([feature, supported]) => {
      // eslint-disable-next-line no-console
      console.log(`${supported ? '✅' : '⚠️'} ${feature}`);
    });
    // eslint-disable-next-line no-console
    console.groupEnd();

    // eslint-disable-next-line no-console
    console.group('Advanced Features');
    Object.entries(report.advanced).forEach(([feature, supported]) => {
      // eslint-disable-next-line no-console
      console.log(`${supported ? '✅' : '⚠️'} ${feature}`);
    });
    // eslint-disable-next-line no-console
    console.groupEnd();

    // eslint-disable-next-line no-console
    console.groupEnd();
  }
};

/**
 * Get user agent info
 *
 * FR: Obtenir les informations du user agent
 * EN: Get user agent info
 */
export const getUserAgentInfo = (): {
  userAgent: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
} => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
  };
};

/**
 * Check storage quota (IndexedDB/LocalStorage)
 *
 * FR: Vérifier le quota de stockage (IndexedDB/LocalStorage)
 * EN: Check storage quota (IndexedDB/LocalStorage)
 */
export const checkStorageQuota = async (): Promise<{
  usage: number;
  quota: number;
  percent: number;
} | null> => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percent = quota > 0 ? Math.round((usage / quota) * 100) : 0;

      return { usage, quota, percent };
    } catch (error) {
      // Log error (development only)
      if (typeof window !== 'undefined' && (window as any).__DEV__) {
        // eslint-disable-next-line no-console
        console.error('Failed to estimate storage quota:', error);
      }
      return null;
    }
  }
  return null;
};

/**
 * Format bytes to human-readable size
 *
 * FR: Formater des octets en taille lisible
 * EN: Format bytes to human-readable size
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
