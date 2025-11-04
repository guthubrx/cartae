/**
 * SharePointService
 * Service pour récupérer les documents SharePoint via l'API Microsoft Graph
 */

import { Office365AuthService } from './Office365AuthService';
import { SharePointDocument } from '../types/office365.types';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const SHAREPOINT_SITES_ENDPOINT = '/sites?$search=displayName:*&$top=10';
const SHAREPOINT_LISTS_ENDPOINT = (siteId: string) => `/sites/${siteId}/lists?$top=20`;
const SHAREPOINT_ITEMS_ENDPOINT = (siteId: string, listId: string) =>
  `/sites/${siteId}/lists/${listId}/items?$expand=fields&$top=50`;

export class SharePointService {
  constructor(private authService: Office365AuthService) {}

  /**
   * Récupère les documents SharePoint récents
   */
  async getRecentDocuments(limit: number = 50): Promise<SharePointDocument[]> {
    try {
      const token = await this.authService.getToken();

      // Récupérer les sites
      const sitesUrl = `${GRAPH_BASE_URL}${SHAREPOINT_SITES_ENDPOINT}`;
      const sitesResponse = await fetch(sitesUrl, {
        headers: this.buildHeaders(token),
      });

      if (!sitesResponse.ok) {
        console.warn(`SharePoint API error (sites): ${sitesResponse.status}`);
        return [];
      }

      const sitesData = await sitesResponse.json();
      const sites = sitesData.value || [];

      if (sites.length === 0) {
        return [];
      }

      // Récupérer les documents des premiers sites
      const allDocuments: SharePointDocument[] = [];
      const sitesToProcess = Math.min(sites.length, 3);

      for (let i = 0; i < sitesToProcess && allDocuments.length < limit; i++) {
        const site = sites[i];
        const docs = await this.getDocumentsFromSite(
          site.id,
          token,
          limit - allDocuments.length
        );
        allDocuments.push(...docs);
      }

      return allDocuments.slice(0, limit);
    } catch (error) {
      console.error('[SharePointService] Error fetching recent documents:', error);
      return [];
    }
  }

  /**
   * Recherche des documents (filtre côté client)
   */
  async searchDocuments(query: string): Promise<SharePointDocument[]> {
    try {
      // Récupérer tous les documents récents
      const allDocs = await this.getRecentDocuments(100);

      // Filtrer côté client
      const queryLower = query.toLowerCase();
      return allDocs.filter(
        (doc) =>
          doc.name.toLowerCase().includes(queryLower) ||
          doc.webUrl.toLowerCase().includes(queryLower)
      );
    } catch (error) {
      console.error('[SharePointService] Error searching documents:', error);
      return [];
    }
  }

  /**
   * Récupère les documents d'un site spécifique
   */
  private async getDocumentsFromSite(
    siteId: string,
    token: string,
    limit: number
  ): Promise<SharePointDocument[]> {
    try {
      // Récupérer les listes du site
      const listsUrl = `${GRAPH_BASE_URL}${SHAREPOINT_LISTS_ENDPOINT(siteId)}`;
      const listsResponse = await fetch(listsUrl, {
        headers: this.buildHeaders(token),
      });

      if (!listsResponse.ok) {
        console.warn(`SharePoint API error (lists): ${listsResponse.status}`);
        return [];
      }

      const listsData = await listsResponse.json();
      const lists = listsData.value || [];

      // Filtrer pour obtenir les listes de documents
      const docLists = lists.filter((list: any) => {
        const template = list.list?.template || '';
        return template === 'documentLibrary' || list.name.includes('Documents');
      });

      if (docLists.length === 0) {
        return [];
      }

      const allDocs: SharePointDocument[] = [];

      // Récupérer les items des listes
      for (const list of docLists) {
        if (allDocs.length >= limit) break;

        const itemsUrl =
          `${GRAPH_BASE_URL}${SHAREPOINT_ITEMS_ENDPOINT(siteId, list.id)}`;
        const itemsResponse = await fetch(itemsUrl, {
          headers: this.buildHeaders(token),
        });

        if (!itemsResponse.ok) {
          continue;
        }

        const itemsData = await itemsResponse.json();
        const items = itemsData.value || [];

        items.forEach((item: any) => {
          if (allDocs.length < limit && item.fields?.FileLeafRef) {
            allDocs.push({
              id: item.id,
              name: item.fields.FileLeafRef,
              webUrl: item.webUrl || '',
              lastModifiedDateTime: item.lastModifiedDateTime || new Date().toISOString(),
              createdDateTime: item.fields.Created || new Date().toISOString(),
              size: parseInt(item.fields.FileSizeDisplay) || 0,
              file: {
                mimeType: this.extractMimeType(item.fields.FileLeafRef),
              },
              createdBy: {
                user: {
                  displayName:
                    item.fields.Author?.displayName || 'Unknown',
                  email: item.fields.Author?.email || '',
                },
              },
            });
          }
        });
      }

      return allDocs;
    } catch (error) {
      console.error('[SharePointService] Error getting documents from site:', error);
      return [];
    }
  }

  /**
   * Extrait le MIME type à partir de l'extension de fichier
   */
  private extractMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      jpg: 'image/jpeg',
      png: 'image/png',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Construit les headers d'authentification
   */
  private buildHeaders(token: string): HeadersInit {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }
}
