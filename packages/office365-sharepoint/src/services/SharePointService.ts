/**
 * SharePointService - SharePoint/OneDrive via Graph API
 *
 * Service pour documents SharePoint via Graph API v1.0
 *
 * Endpoints :
 * - GET /me/drive/recent - Documents récents
 * - GET /me/drive/root/children - Documents racine OneDrive
 * - GET /sites - Sites SharePoint
 *
 * Documentation : https://learn.microsoft.com/graph/api/resources/onedrive
 */

import type { IAuthService } from '../types/auth.types';
import { globalCache, CacheTTL } from './CacheService';
import { fetchWithRetry } from '../utils/retryRequest';

/**
 * Interface pour un document SharePoint/OneDrive
 */
export interface SharePointDocument {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  createdDateTime: Date;
  lastModifiedDateTime: Date;
  lastModifiedBy: {
    displayName: string;
    email: string;
  };
  createdBy: {
    displayName: string;
    email: string;
  };
  isFolder: boolean;
  fileType?: string; // pdf, docx, xlsx, etc.
  thumbnailUrl?: string;
}

/**
 * Interface pour un site SharePoint
 */
export interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
  description: string;
  createdDateTime: Date;
}

/**
 * Service SharePoint/OneDrive
 */
export class SharePointService {
  private readonly GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';

  constructor(private authService: IAuthService) {
    console.log('[SharePointService] Initialisé');
  }

  /**
   * Liste les documents récents
   */
  async listRecentDocuments(limit: number = 50): Promise<SharePointDocument[]> {
    const cacheKey = `sharepoint:recent:${limit}`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log('[SharePointService] Liste documents récents...');

          // Expand thumbnails sans select spécifique - on récupère toutes les tailles
          const url = `${this.GRAPH_ENDPOINT}/me/drive/recent?$top=${limit}&$expand=thumbnails`;

          const response = await this.sendGraphRequest(url, { method: 'GET' });
          const data = JSON.parse(response);

          const documents: SharePointDocument[] = (data.value || []).map((item: any) => {
            // Essayer différentes tailles : c300x300 (crop) > large > medium > small
            let thumbnailUrl = item.thumbnails?.[0]?.c300x300?.url
              || item.thumbnails?.[0]?.large?.url 
              || item.thumbnails?.[0]?.medium?.url 
              || item.thumbnails?.[0]?.small?.url 
              || undefined;

            return {
              id: item.id,
              name: item.name,
              webUrl: item.webUrl,
              size: item.size || 0,
              createdDateTime: new Date(item.createdDateTime),
              lastModifiedDateTime: new Date(item.lastModifiedDateTime),
              lastModifiedBy: {
                displayName: item.lastModifiedBy?.user?.displayName || 'Unknown',
                email: item.lastModifiedBy?.user?.email || '',
              },
              createdBy: {
                displayName: item.createdBy?.user?.displayName || 'Unknown',
                email: item.createdBy?.user?.email || '',
              },
              isFolder: !!item.folder,
              fileType: this.getFileExtension(item.name),
              thumbnailUrl,
            };
          });

          console.log(`[SharePointService] ✅ ${documents.length} documents récupérés`);
          return documents;

        } catch (error) {
          console.error('[SharePointService] ❌ Erreur liste documents:', error);
          throw this.handleError(error, 'Impossible de lister les documents');
        }
      },
      CacheTTL.DOCUMENTS
    );
  }

  /**
   * Liste les sites SharePoint suivis
   */
  async listFollowedSites(limit: number = 25): Promise<SharePointSite[]> {
    try {
      console.log('[SharePointService] Liste sites SharePoint suivis...');

      const url = `${this.GRAPH_ENDPOINT}/me/followedSites?$top=${limit}`;

      const response = await this.sendGraphRequest(url, { method: 'GET' });
      const data = JSON.parse(response);

      const sites: SharePointSite[] = (data.value || []).map((site: any) => ({
        id: site.id,
        displayName: site.displayName || site.name || 'Unknown',
        webUrl: site.webUrl,
        description: site.description || '',
        createdDateTime: new Date(site.createdDateTime || Date.now()),
      }));

      console.log(`[SharePointService] ✅ ${sites.length} sites récupérés`);
      return sites;

    } catch (error) {
      console.error('[SharePointService] ❌ Erreur liste sites:', error);
      throw this.handleError(error, 'Impossible de lister les sites');
    }
  }

  /**
   * Liste les documents d'un dossier OneDrive
   */
  async listMyDocuments(folderId?: string, limit: number = 50): Promise<SharePointDocument[]> {
    const cacheKey = `sharepoint:docs:${folderId || 'root'}:${limit}`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log('[SharePointService] Liste documents OneDrive...');

          const endpoint = folderId
            ? `/me/drive/items/${folderId}/children`
            : '/me/drive/root/children';

          // Expand thumbnails sans select spécifique - on récupère toutes les tailles
          const url = `${this.GRAPH_ENDPOINT}${endpoint}?$top=${limit}&$expand=thumbnails`;

          const response = await this.sendGraphRequest(url, { method: 'GET' });
          const data = JSON.parse(response);

          const documents: SharePointDocument[] = (data.value || []).map((item: any) => {
            // Essayer différentes tailles : c300x300 (crop) > large > medium > small
            let thumbnailUrl = item.thumbnails?.[0]?.c300x300?.url
              || item.thumbnails?.[0]?.large?.url 
              || item.thumbnails?.[0]?.medium?.url 
              || item.thumbnails?.[0]?.small?.url 
              || undefined;

            return {
              id: item.id,
              name: item.name,
              webUrl: item.webUrl,
              size: item.size || 0,
              createdDateTime: new Date(item.createdDateTime),
              lastModifiedDateTime: new Date(item.lastModifiedDateTime),
              lastModifiedBy: {
                displayName: item.lastModifiedBy?.user?.displayName || 'Unknown',
                email: item.lastModifiedBy?.user?.email || '',
              },
              createdBy: {
                displayName: item.createdBy?.user?.displayName || 'Unknown',
                email: item.createdBy?.user?.email || '',
              },
              isFolder: !!item.folder,
              fileType: this.getFileExtension(item.name),
              thumbnailUrl,
            };
          });

          console.log(`[SharePointService] ✅ ${documents.length} documents récupérés`);
          return documents;

        } catch (error) {
          console.error('[SharePointService] ❌ Erreur liste documents:', error);
          throw this.handleError(error, 'Impossible de lister les documents');
        }
      },
      CacheTTL.DOCUMENTS
    );
  }

  /**
   * Récupère le thumbnail d'un document via l'API directe
   * @param itemId - ID du document
   * @param size - Taille du thumbnail (small=96x96, medium=176x176, large=800x800, c300x300=300x300 crop)
   * @returns URL du thumbnail ou null
   */
  async getThumbnail(itemId: string, size: 'small' | 'medium' | 'large' | 'c300x300' = 'large'): Promise<string | null> {
    const cacheKey = `sharepoint:thumbnail:${itemId}:${size}`;

    return globalCache.getOrFetch(
      cacheKey,
      async () => {
        try {
          console.log(`[SharePointService] Récupération thumbnail ${size} pour ${itemId}...`);

          // Essayer d'abord de récupérer les métadonnées du thumbnail
          const metaUrl = `${this.GRAPH_ENDPOINT}/me/drive/items/${itemId}/thumbnails`;
          const metaResponse = await this.sendGraphRequest(metaUrl, { method: 'GET' });
          const metaData = JSON.parse(metaResponse);

          if (metaData.value && metaData.value.length > 0) {
            const thumbnail = metaData.value[0];
            // Essayer différentes tailles
            const url = thumbnail[size]?.url
              || thumbnail.large?.url
              || thumbnail.medium?.url
              || thumbnail.small?.url;

            if (url) {
              console.log('[SharePointService] ✅ Thumbnail URL récupérée:', url);
              return url;
            }
          }

          console.log(`[SharePointService] Pas de thumbnail disponible pour ${itemId}`);
          return null;

        } catch (error) {
          console.log(`[SharePointService] ❌ Erreur thumbnail pour ${itemId}:`, error);
          return null;
        }
      },
      CacheTTL.THUMBNAILS
    );
  }

  /**
   * Charge les thumbnails manquants pour une liste de documents
   */
  async loadMissingThumbnails(documents: SharePointDocument[]): Promise<Map<string, string>> {
    const thumbnails = new Map<string, string>();

    // Filtrer les documents sans thumbnail (documents Office uniquement)
    const officeTypes = ['pptx', 'docx', 'xlsx', 'pdf'];
    const docsToLoad = documents.filter(doc =>
      !doc.thumbnailUrl && officeTypes.includes(doc.fileType || '')
    );

    if (docsToLoad.length === 0) {
      return thumbnails;
    }

    console.log(`[SharePointService] Chargement de ${docsToLoad.length} thumbnails manquants...`);

    // Charger en parallèle (max 10 à la fois pour éviter la surcharge)
    const batchSize = 10;
    for (let i = 0; i < docsToLoad.length; i += batchSize) {
      const batch = docsToLoad.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async doc => {
          const url = await this.getThumbnail(doc.id, 'c300x300');
          return { id: doc.id, url };
        })
      );

      results.forEach(({ id, url }) => {
        if (url) {
          thumbnails.set(id, url);
        }
      });
    }

    console.log(`[SharePointService] ✅ ${thumbnails.size} thumbnails récupérés`);
    return thumbnails;
  }

  /**
   * Récupère l'extension d'un fichier
   */
  private getFileExtension(filename: string): string | undefined {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : undefined;
  }

  /**
   * Envoie une requête Graph API avec retry automatique sur 503/504
   */
  private async sendGraphRequest(url: string, options: { method: string; body?: string }): Promise<string> {
    // TEMPORAIRE: Proxy Graph API timeout - utiliser fetch direct
    // TODO Session 29: Fixer content-script proxy timeout
    console.log('[SharePointService] 🌐 Fetch direct avec token + retry');
    const token = await this.authService.getToken('graph');

    const response = await fetchWithRetry(url, {
      method: options.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: options.body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const responseText = await response.text();
    return responseText;
  }

  /**
   * Envoie via proxy extension (évite CORS)
   */
  private async sendViaExtensionProxy(url: string, options: { method: string; body?: string }): Promise<string> {
    const requestId = Math.random().toString(36).slice(2, 15);

    return new Promise((resolve, reject) => {
      // Handler pour la réponse
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'CARTAE_GRAPH_RESPONSE' && event.data.requestId === requestId) {
          window.removeEventListener('message', handler);

          const response = event.data.response;

          if (!response.success) {
            reject(new Error(response.error || 'Extension proxy error'));
            return;
          }

          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`HTTP ${response.status}: ${response.body}`));
            return;
          }

          resolve(response.body);
        }
      };

      window.addEventListener('message', handler);

      // Timeout 30s
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('Extension proxy timeout'));
      }, 30000);

      // Envoyer requête via content script
      window.postMessage({
        type: 'CARTAE_GRAPH_REQUEST',
        requestId: requestId,
        url: url,
        method: options.method,
        headers: {},
        body: options.body
      }, '*');
    });
  }

  /**
   * Gère les erreurs
   */
  private handleError(error: any, context: string): Error {
    if (error instanceof Error) {
      return new Error(`${context}: ${error.message}`);
    }
    return new Error(`${context}: ${String(error)}`);
  }
}
