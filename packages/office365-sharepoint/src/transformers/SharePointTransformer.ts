/**
 * SharePointTransformer - Transforme SharePoint data → CartaeItem
 *
 * Convertit les documents SharePoint/OneDrive (Graph API) en format universel CartaeItem.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CartaeItem, CartaeItemType } from '@cartae/core/types/CartaeItem';
import type { CartaeMetadata } from '@cartae/core/types/CartaeMetadata';
import type { SharePointDocument } from '../services/SharePointService';

/**
 * Transforme un SharePointDocument en CartaeItem
 *
 * @param document - Document SharePoint à transformer
 * @param options - Options de transformation (optionnel)
 * @returns CartaeItem formaté
 */
export function transformDocumentToCartaeItem(
  document: SharePointDocument,
  options?: {
    addDefaultTags?: boolean;
  }
): CartaeItem {
  const now = new Date();

  // Tags par défaut
  const tags: string[] = options?.addDefaultTags
    ? ['sharepoint', 'document', 'office365']
    : [];

  // Tags auto depuis type fichier
  if (document.fileType) {
    tags.push(document.fileType);
  }
  if (document.isFolder) {
    tags.push('folder');
  } else {
    tags.push('file');
  }

  // Métadonnées
  const metadata: CartaeMetadata = {
    author: document.createdBy.email,
    participants: [document.lastModifiedBy.email],

    // Champs extensibles SharePoint
    sharepoint: {
      documentId: document.id,
      webUrl: document.webUrl,
      size: document.size,
      isFolder: document.isFolder,
      fileType: document.fileType,
      thumbnailUrl: document.thumbnailUrl,
      createdBy: {
        displayName: document.createdBy.displayName,
        email: document.createdBy.email,
      },
      lastModifiedBy: {
        displayName: document.lastModifiedBy.displayName,
        email: document.lastModifiedBy.email,
      },
      createdDateTime: document.createdDateTime,
      lastModifiedDateTime: document.lastModifiedDateTime,
    },
  };

  const cartaeItem: CartaeItem = {
    id: uuidv4(),
    type: document.isFolder ? 'document' : 'file' as CartaeItemType,
    title: document.name,

    // Pas de contenu texte pour documents (parsing nécessaire)
    content: undefined,

    metadata,
    tags,

    source: {
      connector: 'office365',
      originalId: document.id,
      url: document.webUrl,
      lastSync: now,
      metadata: {
        service: 'sharepoint-graph-api',
        version: 'v1.0',
      },
    },

    createdAt: document.createdDateTime,
    updatedAt: document.lastModifiedDateTime,

    archived: false,
    favorite: false,
  };

  return cartaeItem;
}

/**
 * Transforme un batch de documents en CartaeItems
 */
export function transformDocumentsToCartaeItems(
  documents: SharePointDocument[],
  options?: Parameters<typeof transformDocumentToCartaeItem>[1]
): CartaeItem[] {
  return documents.map(doc => transformDocumentToCartaeItem(doc, options));
}

/**
 * Type guard pour vérifier si un CartaeItem est un document SharePoint
 */
export function isSharePointDocument(item: CartaeItem): boolean {
  return (
    (item.type === 'document' || item.type === 'file') &&
    item.source.connector === 'office365' &&
    typeof item.metadata.sharepoint === 'object'
  );
}

/**
 * Helper pour formater la taille de fichier lisible
 *
 * @param bytes - Taille en bytes
 * @returns Taille formatée (ex: "1.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Helper pour extraire l'extension de fichier
 *
 * @param fileName - Nom du fichier
 * @returns Extension (ex: "docx", "pdf")
 */
export function getFileExtension(fileName: string): string | undefined {
  const match = fileName.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : undefined;
}
