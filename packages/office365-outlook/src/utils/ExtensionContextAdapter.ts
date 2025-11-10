/**
 * ExtensionContextAdapter - Enrichit PluginContext avec APIs extension
 *
 * Pattern: Adapter qui fournit browser.* et chrome.* APIs
 * aux services Office365 sans coupler le code à une extension spécifique
 *
 * Permet aux services O365 (StandardAuthService, DeviceCodeAuthService, EwsService)
 * de fonctionner EXACTEMENT comme dans une extension browser réelle,
 * tout en restant intégrés proprement dans le Cartae plugin system
 */

import type { PluginContext } from '@cartae/plugin-system'

/**
 * Extension API mock pour browser.storage.local
 */
interface ExtensionStorage {
  get: (keys?: string | string[] | object) => Promise<Record<string, any>>
  set: (items: Record<string, any>) => Promise<void>
  remove: (keys: string | string[]) => Promise<void>
  clear: () => Promise<void>
}

/**
 * Extension API mock pour browser.runtime
 */
interface ExtensionRuntime {
  getManifest: () => { name: string; version: string }
  getURL: (path: string) => string
  sendMessage: (message: any, options?: any) => Promise<any>
  onMessage: {
    addListener: (callback: any) => void
    removeListener: (callback: any) => void
  }
}

/**
 * Full Extension API mock
 */
interface ExtensionAPI {
  storage: { local: ExtensionStorage }
  runtime: ExtensionRuntime
}

/**
 * In-memory storage pour le plugin (persiste durant la session)
 */
const pluginExtensionStorage: Record<string, any> = {}

/**
 * Crée une instance d'API extension pour le plugin
 */
function createExtensionApi(): ExtensionAPI {
  return {
    storage: {
      local: {
        get: async (keys?: string | string[] | object) => {
          if (!keys) return { ...pluginExtensionStorage }

          if (typeof keys === 'string') {
            return { [keys]: pluginExtensionStorage[keys] }
          }

          if (Array.isArray(keys)) {
            const result: Record<string, any> = {}
            keys.forEach(key => {
              result[key] = pluginExtensionStorage[key]
            })
            return result
          }

          if (typeof keys === 'object') {
            const result: Record<string, any> = {}
            Object.keys(keys).forEach(key => {
              result[key] = pluginExtensionStorage[key] ?? keys[key]
            })
            return result
          }

          return {}
        },

        set: async (items: Record<string, any>) => {
          Object.assign(pluginExtensionStorage, items)
        },

        remove: async (keys: string | string[]) => {
          const keysToRemove = Array.isArray(keys) ? keys : [keys]
          keysToRemove.forEach(key => {
            delete pluginExtensionStorage[key]
          })
        },

        clear: async () => {
          Object.keys(pluginExtensionStorage).forEach(key => {
            delete pluginExtensionStorage[key]
          })
        },
      },
    },

    runtime: {
      getManifest: () => ({
        name: 'Office 365 Connector',
        version: '1.0.0',
      }),

      getURL: (path: string) => `cartae://office365-connector/${path}`,

      sendMessage: async (message: any) => {
        // Mock message passing
        return { success: true, message }
      },

      onMessage: {
        addListener: (callback: any) => {
          // Mock listener registration
        },
        removeListener: (callback: any) => {
          // Mock listener removal
        },
      },
    },
  }
}

/**
 * EnrichedPluginContext - PluginContext + Extension APIs
 *
 * Fournit à Office365 services:
 * - context.browser (standard W3C)
 * - context.chrome (Chrome compatibility)
 * - Tous les storage, runtime, messaging disponibles
 */
export class EnrichedPluginContext {
  readonly browser: ExtensionAPI
  readonly chrome: ExtensionAPI

  constructor(private pluginContext: PluginContext) {
    const extensionApi = createExtensionApi()
    this.browser = extensionApi
    this.chrome = extensionApi // Alias pour compatibility
  }

  /**
   * Proxy vers PluginContext original pour accès à tout ce qui est Cartae-specific
   */
  get originalContext(): PluginContext {
    return this.pluginContext
  }

  /**
   * Accès aux APIs mindmap Cartae
   */
  get mindMap() {
    return this.pluginContext
  }

  /**
   * Accès aux hooks Cartae
   */
  get hooks() {
    return this.pluginContext
  }

  /**
   * Accès au UI system Cartae
   */
  get ui() {
    return this.pluginContext
  }

  /**
   * Accès au storage Cartae
   */
  get storage() {
    return this.pluginContext
  }
}

/**
 * Helper pour créer EnrichedPluginContext
 */
export function enrichPluginContext(context: PluginContext): EnrichedPluginContext {
  return new EnrichedPluginContext(context)
}

/**
 * Type helper pour les services O365
 * Permet aux services d'être typés correctement avec browser.* APIs
 */
export interface Office365ServiceContext extends EnrichedPluginContext {
  browser: ExtensionAPI
  chrome: ExtensionAPI
}
