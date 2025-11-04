/**
 * AI Plugin Registry
 *
 * Registry centralisé pour gérer l'écosystème de plugins AI dans Cartae.
 *
 * Responsabilités :
 * - Enregistrement et découverte de plugins AI
 * - Orchestration des analyses (appel de plusieurs plugins en parallèle)
 * - Agrégation des résultats
 * - Cache des analyses
 * - Event emission (via EventBus)
 *
 * @module AIPluginRegistry
 */

import type { CartaeItem } from '@cartae/core';
import type { AIPlugin, Insight } from '@cartae/ai-types';

/**
 * Options pour l'analyse d'items
 */
export interface AnalyzeOptions {
  /**
   * Plugins à utiliser (si non spécifié, tous les plugins actifs)
   */
  plugins?: string[];

  /**
   * Exécuter en parallèle ou séquentiellement
   * @default true (parallèle)
   */
  parallel?: boolean;

  /**
   * Timeout par plugin (ms)
   * @default 30000 (30s)
   */
  timeout?: number;

  /**
   * Continuer si un plugin échoue
   * @default true
   */
  continueOnError?: boolean;
}

/**
 * Résultat d'analyse agrégé
 */
export interface AnalysisResult {
  /**
   * Item analysé
   */
  item: CartaeItem;

  /**
   * Item enrichi avec métadonnées AI
   */
  enrichedItem: CartaeItem;

  /**
   * Résultats par plugin
   */
  pluginResults: Map<string, PluginAnalysisResult>;

  /**
   * Insights agrégés de tous les plugins
   */
  insights: Insight[];

  /**
   * Timestamp de l'analyse
   */
  analyzedAt: Date;

  /**
   * Durée totale (ms)
   */
  durationMs: number;
}

/**
 * Résultat d'analyse d'un plugin individuel
 */
export interface PluginAnalysisResult {
  /**
   * ID du plugin
   */
  pluginId: string;

  /**
   * Succès ou échec
   */
  success: boolean;

  /**
   * Item enrichi (si succès)
   */
  enrichedItem?: CartaeItem;

  /**
   * Erreur (si échec)
   */
  error?: Error;

  /**
   * Durée d'exécution (ms)
   */
  durationMs: number;
}

/**
 * AI Plugin Registry
 */
export class AIPluginRegistry {
  private plugins = new Map<string, AIPlugin>();
  private activePlugins = new Set<string>();

  /**
   * Enregistre un plugin AI
   */
  register(plugin: AIPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[AIPluginRegistry] Plugin ${plugin.id} déjà enregistré, remplacement`);
    }

    this.plugins.set(plugin.id, plugin);
    console.log(`[AIPluginRegistry] Plugin ${plugin.id} enregistré`);
  }

  /**
   * Désenregistre un plugin
   */
  unregister(pluginId: string): boolean {
    const removed = this.plugins.delete(pluginId);
    this.activePlugins.delete(pluginId);

    if (removed) {
      console.log(`[AIPluginRegistry] Plugin ${pluginId} désenregistré`);
    }

    return removed;
  }

  /**
   * Active un plugin
   */
  async activate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Activer le plugin
    if (plugin.initialize) {
      await plugin.initialize();
    }

    this.activePlugins.add(pluginId);
    console.log(`[AIPluginRegistry] Plugin ${pluginId} activé`);
  }

  /**
   * Désactive un plugin
   */
  async deactivate(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    // Désactiver le plugin
    if (plugin.destroy) {
      await plugin.destroy();
    }

    this.activePlugins.delete(pluginId);
    console.log(`[AIPluginRegistry] Plugin ${pluginId} désactivé`);
  }

  /**
   * Analyse un item avec tous les plugins actifs (ou plugins spécifiés)
   */
  async analyze(item: CartaeItem, options?: AnalyzeOptions): Promise<AnalysisResult> {
    const startTime = performance.now();

    const opts: Required<AnalyzeOptions> = {
      plugins: options?.plugins ?? [...this.activePlugins],
      parallel: options?.parallel ?? true,
      timeout: options?.timeout ?? 30000,
      continueOnError: options?.continueOnError ?? true,
    };

    // Filtrer plugins à utiliser
    const pluginsToUse = opts.plugins
      .map((id) => this.plugins.get(id))
      .filter((p): p is AIPlugin => p !== undefined);

    if (pluginsToUse.length === 0) {
      throw new Error('No plugins available for analysis');
    }

    // Exécuter analyses
    const pluginResults = new Map<string, PluginAnalysisResult>();

    if (opts.parallel) {
      // Parallèle
      const promises = pluginsToUse.map((plugin) =>
        this.analyzeWithPlugin(plugin, item, opts.timeout).then((result) => {
          pluginResults.set(plugin.id, result);
        }),
      );

      if (opts.continueOnError) {
        await Promise.allSettled(promises);
      } else {
        await Promise.all(promises);
      }
    } else {
      // Séquentiel
      for (const plugin of pluginsToUse) {
        try {
          const result = await this.analyzeWithPlugin(plugin, item, opts.timeout);
          pluginResults.set(plugin.id, result);
        } catch (error) {
          if (!opts.continueOnError) {
            throw error;
          }
        }
      }
    }

    // Agréger résultats
    let enrichedItem = { ...item };
    const insights: Insight[] = [];

    for (const [_pluginId, result] of pluginResults.entries()) {
      if (result.success && result.enrichedItem) {
        // Fusionner métadonnées AI
        enrichedItem = {
          ...enrichedItem,
          metadata: {
            ...enrichedItem.metadata,
            aiInsights: {
              ...enrichedItem.metadata.aiInsights,
              ...result.enrichedItem.metadata.aiInsights,
            },
          },
        };
      }
    }

    const durationMs = performance.now() - startTime;

    return {
      item,
      enrichedItem,
      pluginResults,
      insights,
      analyzedAt: new Date(),
      durationMs,
    };
  }

  /**
   * Analyse avec un plugin individuel
   */
  private async analyzeWithPlugin(
    plugin: AIPlugin,
    item: CartaeItem,
    timeout: number,
  ): Promise<PluginAnalysisResult> {
    const startTime = performance.now();

    try {
      // Race entre analyse et timeout
      const enrichedItem = await Promise.race([
        plugin.analyze(item),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout (${timeout}ms)`)), timeout),
        ),
      ]);

      const durationMs = performance.now() - startTime;

      return {
        pluginId: plugin.id,
        success: true,
        enrichedItem,
        durationMs,
      };
    } catch (error) {
      const durationMs = performance.now() - startTime;

      console.error(`[AIPluginRegistry] Plugin ${plugin.id} failed:`, error);

      return {
        pluginId: plugin.id,
        success: false,
        error: error as Error,
        durationMs,
      };
    }
  }

  /**
   * Génère des insights agrégés depuis tous les plugins actifs
   */
  async generateInsights(items: CartaeItem[]): Promise<Insight[]> {
    const allInsights: Insight[] = [];

    // Collecter insights de chaque plugin
    for (const pluginId of this.activePlugins) {
      const plugin = this.plugins.get(pluginId);

      if (!plugin || !plugin.generateInsights) {
        continue;
      }

      try {
        const insights = await plugin.generateInsights(items);
        allInsights.push(...insights);
      } catch (error) {
        console.error(`[AIPluginRegistry] Plugin ${pluginId} generateInsights failed:`, error);
      }
    }

    // Trier par priorité décroissante
    allInsights.sort((a, b) => b.priority - a.priority);

    return allInsights;
  }

  /**
   * Obtient un plugin par ID
   */
  getPlugin(pluginId: string): AIPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Obtient tous les plugins enregistrés
   */
  getAllPlugins(): AIPlugin[] {
    return [...this.plugins.values()];
  }

  /**
   * Obtient les plugins actifs
   */
  getActivePlugins(): AIPlugin[] {
    return [...this.activePlugins]
      .map((id) => this.plugins.get(id))
      .filter((p): p is AIPlugin => p !== undefined);
  }

  /**
   * Vérifie si un plugin est actif
   */
  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  /**
   * Obtient des statistiques sur le registry
   */
  getStats() {
    return {
      totalPlugins: this.plugins.size,
      activePlugins: this.activePlugins.size,
      inactivePlugins: this.plugins.size - this.activePlugins.size,
      plugins: [...this.plugins.keys()],
    };
  }
}

/**
 * Instance singleton du registry
 */
export const aiPluginRegistry = new AIPluginRegistry();
