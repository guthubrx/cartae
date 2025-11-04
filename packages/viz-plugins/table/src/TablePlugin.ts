import type { Plugin, PluginManifest, IPluginContext } from '@cartae/plugin-system';

/**
 * Table Plugin (WIP) - Affiche les CartaeItems dans un tableau interactif
 *
 * NOTES: Version minimale pour Session 40A
 * - Intégration basique du plugin système
 * - Interface utilisateur complète à venir en Session 40C
 * - Pour le moment, gère juste la transformation de données
 */
export class TablePlugin implements Plugin {
  readonly manifest: PluginManifest = {
    id: '@cartae/table-plugin',
    name: 'Table Plugin',
    version: '0.1.0',
    description:
      'Interactive data table with filtering, sorting, and search (Coming in Session 40C)',
    author: 'Cartae Team',
    main: './dist/index.js',
    permissions: ['storage'],
  };

  private context?: IPluginContext;

  /**
   * Active le plugin
   */
  async activate(_context: IPluginContext): Promise<void> {
    this.context = _context;
  }

  /**
   * Désactive le plugin
   */
  async deactivate(): Promise<void> {
    this.context = undefined;
  }

  /**
   * Transforme des CartaeItems en données tableau
   * Version minimale - interface UI complète en Session 40C
   */
  transform(items: any[]): {
    rows: any[];
    columnCount: number;
    totalItems: number;
  } {
    return {
      rows: items,
      columnCount: 5, // id, title, content, tags, type
      totalItems: items.length,
    };
  }
}
