/**
 * Plugin Admin - Contrôle et Monitoring du Système Cartae
 *
 * Ce plugin permet aux administrateurs de :
 * - Contrôler la source du marketplace (Git vs Cloudflare CDN)
 * - Monitorer les statistiques du système
 * - Gérer les configurations globales
 * - Voir les health checks et performances
 */

import type { PluginContext } from '@cartae/plugin-sdk';

// Type pour plugin conforme au SDK
interface AdminPluginType {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email: string;
  };
  onLoad?: (context: PluginContext) => Promise<void>;
  onUnload?: (context: PluginContext) => Promise<void>;
  settings?: any;
}

export const AdminPlugin: AdminPluginType = {
  id: 'com.cartae.admin',
  name: 'Cartae Admin Panel',
  version: '1.0.0',
  description:
    'Panneau de contrôle administrateur pour gérer les sources marketplace et monitorer le système',
  author: {
    name: 'Cartae Team',
    email: 'team@cartae.com',
  },

  async onLoad(_context: PluginContext) {
    // Les commandes seront enregistrées via l'app principale
  },

  async onUnload(_context: PluginContext) {
    // Cleanup si nécessaire
  },

  settings: {
    schema: {
      enableMonitoring: {
        type: 'boolean',
        default: true,
        title: 'Enable Monitoring',
        description: 'Active le monitoring des performances système',
      },
      refreshIntervalSeconds: {
        type: 'number',
        default: 30,
        title: 'Refresh Interval (seconds)',
        description: 'Intervalle de rafraîchissement des stats',
      },
    },
  },
};

export default AdminPlugin;
