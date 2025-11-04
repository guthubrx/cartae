/**
 * SharePointTransformer
 * Transforme les documents SharePoint en CartaeItems
 */

import { CartaeItem } from '@cartae/core';
import { BaseTransformer } from './BaseTransformer';
import { SharePointDocument } from '../types/office365.types';

export class SharePointTransformer extends BaseTransformer {
  protected getItemType() {
    return 'document' as const;
  }

  protected getConnector() {
    return 'office365';
  }

  /**
   * Transforme un document SharePoint en CartaeItem
   */
  static toCartaeItem(document: SharePointDocument): CartaeItem {
    const transformer = new SharePointTransformer();
    return transformer.transform(document);
  }

  /**
   * Transforme une liste de documents
   */
  static toCartaeItems(documents: SharePointDocument[]): CartaeItem[] {
    return documents.map((doc) => SharePointTransformer.toCartaeItem(doc));
  }

  /**
   * Transforme un document individuel
   */
  private transform(document: SharePointDocument): CartaeItem {
    // Créer l'item de base
    const item = this.createBaseCartaeItem(
      'document',
      document.name,
      document.id,
      document.webUrl
    );

    // Ajouter l'auteur/créateur
    if (document.createdBy) {
      this.addAuthor(
        item,
        document.createdBy.user.displayName,
        document.createdBy.user.email
      );
    }

    // Ajouter les dates
    this.addCreatedDate(item, document.createdDateTime);
    item.metadata.dueDate = document.lastModifiedDateTime
      ? new Date(document.lastModifiedDateTime)
      : undefined;

    // Ajouter le statut et priorité
    item.metadata.status = 'new';
    item.metadata.priority = 'medium';

    // Ajouter les tags
    item.tags = this.generateDocumentTags(document);

    // Ajouter les métadonnées spécifiques Office365
    item.metadata.office365 = {
      documentId: document.id,
      fileType: this.extractFileType(document.name),
      mimeType: document.file?.mimeType,
      size: document.size,
      url: document.webUrl,
      lastModified: document.lastModifiedDateTime,
    };

    // JSON-LD pour compatibilité W3C
    item['@context'] = 'https://www.w3.org/ns/activitystreams';
    item['@type'] = 'Document';

    return item;
  }

  /**
   * Extrait le type de fichier à partir du nom
   */
  private extractFileType(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot + 1).toLowerCase();
  }

  /**
   * Extrait la catégorie de document basée sur l'extension
   */
  private getDocumentCategory(fileType: string): string {
    const docTypes: Record<string, string> = {
      pdf: 'PDF',
      doc: 'Word Document',
      docx: 'Word Document',
      xls: 'Spreadsheet',
      xlsx: 'Spreadsheet',
      ppt: 'Presentation',
      pptx: 'Presentation',
      txt: 'Text',
      csv: 'Data',
      jpg: 'Image',
      png: 'Image',
      gif: 'Image',
      zip: 'Archive',
      rar: 'Archive',
    };

    return docTypes[fileType.toLowerCase()] || 'Document';
  }

  /**
   * Génère les tags pour un document
   */
  private generateDocumentTags(document: SharePointDocument): string[] {
    const tags = this.generateDefaultTags('document');
    const fileType = this.extractFileType(document.name).toLowerCase();

    // Tags par type de fichier
    switch (fileType) {
      case 'pdf':
        tags.push('#pdf');
        break;
      case 'doc':
      case 'docx':
        tags.push('#word-document');
        break;
      case 'xls':
      case 'xlsx':
        tags.push('#spreadsheet');
        tags.push('#data');
        break;
      case 'ppt':
      case 'pptx':
        tags.push('#presentation');
        break;
      case 'txt':
        tags.push('#text-file');
        break;
      case 'csv':
        tags.push('#data');
        break;
      case 'jpg':
      case 'png':
      case 'gif':
      case 'jpeg':
        tags.push('#image');
        break;
      case 'zip':
      case 'rar':
      case '7z':
        tags.push('#archive');
        break;
      default:
        tags.push(`#${fileType}`);
    }

    // Tags basés sur la taille du fichier
    if (document.size > 10 * 1024 * 1024) {
      // > 10 MB
      tags.push('#large-file');
    }

    // Tags basés sur le nom du fichier
    const nameLower = document.name.toLowerCase();
    if (
      nameLower.includes('report') ||
      nameLower.includes('summary') ||
      nameLower.includes('analysis')
    ) {
      tags.push('#report');
    }

    if (
      nameLower.includes('template') ||
      nameLower.includes('sample') ||
      nameLower.includes('example')
    ) {
      tags.push('#template');
    }

    if (
      nameLower.includes('draft') ||
      nameLower.includes('wip') ||
      nameLower.includes('work-in-progress')
    ) {
      tags.push('#draft');
    }

    if (
      nameLower.includes('final') ||
      nameLower.includes('approved') ||
      nameLower.includes('published')
    ) {
      tags.push('#final');
    }

    // Deduplicates tags
    return Array.from(new Set(tags));
  }
}
