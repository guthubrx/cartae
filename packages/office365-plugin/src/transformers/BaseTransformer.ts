/**
 * BaseTransformer
 * Classe abstraite partageant des méthodes communes pour tous les transformers
 */

import { v4 as uuidv4 } from 'uuid';
import { CartaeItem, CartaeItemType, CartaeSource } from '@cartae/core';

export abstract class BaseTransformer {
  protected abstract getItemType(): CartaeItemType;
  protected abstract getConnector(): string;

  /**
   * Génère un identifiant Cartae unique (UUID v4)
   */
  protected generateId(): string {
    return uuidv4();
  }

  /**
   * Génère les tags par défaut pour un type d'item
   */
  protected generateDefaultTags(itemType: CartaeItemType): string[] {
    const baseTag = `#${itemType}`;

    switch (itemType) {
      case 'email':
        return [baseTag, '#office365-email'];
      case 'message':
        return [baseTag, '#office365-chat'];
      case 'document':
        return [baseTag, '#office365-document'];
      case 'task':
        return [baseTag, '#office365-task'];
      default:
        return [baseTag];
    }
  }

  /**
   * Extrait la priorité basée sur des heuristiques
   */
  protected extractPriority(
    isImportant?: boolean,
    isFlagged?: boolean,
    isUrgent?: boolean
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (isUrgent) return 'urgent';
    if (isFlagged || isImportant) return 'high';
    return 'medium';
  }

  /**
   * Crée une CartaeSource pour les items Office365
   */
  protected createSource(originalId: string, url?: string): CartaeSource {
    return {
      connector: this.getConnector(),
      originalId,
      url,
      lastSync: new Date(),
    };
  }

  /**
   * Nettoie et tronque un contenu textuel
   */
  protected cleanContent(content: string | undefined, maxLength: number = 500): string {
    if (!content) return '';

    let cleaned = content
      .replace(/<[^>]*>/g, '') // Supprime les tags HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength) + '...';
    }

    return cleaned;
  }

  /**
   * Crée une CartaeItem basique avec les champs requis
   */
  protected createBaseCartaeItem(
    type: CartaeItemType,
    title: string,
    originalId: string,
    url?: string
  ): CartaeItem {
    const now = new Date();

    return {
      id: this.generateId(),
      type,
      title,
      metadata: {
        status: 'new',
      },
      tags: this.generateDefaultTags(type),
      source: this.createSource(originalId, url),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Ajoute un auteur aux métadonnées
   */
  protected addAuthor(item: CartaeItem, authorName?: string, authorEmail?: string): CartaeItem {
    if (authorName || authorEmail) {
      item.metadata.author = authorEmail || authorName;
    }
    return item;
  }

  /**
   * Ajoute une date d'échéance
   */
  protected addDueDate(item: CartaeItem, dueDate?: string): CartaeItem {
    if (dueDate) {
      const parsedDate = new Date(dueDate);
      if (!isNaN(parsedDate.getTime())) {
        item.metadata.dueDate = parsedDate;
      }
    }
    return item;
  }

  /**
   * Ajoute une date de création
   */
  protected addCreatedDate(item: CartaeItem, createdDate?: string): CartaeItem {
    if (createdDate) {
      const parsedDate = new Date(createdDate);
      if (!isNaN(parsedDate.getTime())) {
        // Utilise createdAt du CartaeItem
        item.createdAt = parsedDate;
      }
    }
    return item;
  }
}
