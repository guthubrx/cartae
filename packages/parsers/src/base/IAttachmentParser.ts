/**
 * Interface commune pour tous les parsers d'attachments
 *
 * Chaque parser implémente cette interface pour garantir
 * une API uniforme et un cloisonnement des responsabilités.
 */

import type { ParsedAttachment, ParseOptions } from './ParsedAttachment';

/**
 * Interface de base pour tous les parsers
 */
export interface IAttachmentParser {
  /**
   * Types MIME supportés par ce parser
   */
  readonly supportedMimeTypes: string[];

  /**
   * Extensions de fichier supportées
   */
  readonly supportedExtensions: string[];

  /**
   * Nom du parser (pour logging/debugging)
   */
  readonly name: string;

  /**
   * Parse un fichier depuis son contenu base64
   *
   * @param contentBytes - Contenu du fichier en base64
   * @param mimeType - Type MIME du fichier
   * @param options - Options de parsing
   * @returns Résultat de parsing
   */
  parse(contentBytes: string, mimeType: string, options?: ParseOptions): Promise<ParsedAttachment>;

  /**
   * Vérifie si ce parser peut traiter ce type MIME
   *
   * @param mimeType - Type MIME à vérifier
   * @returns true si supporté
   */
  canParse(mimeType: string): boolean;
}

/**
 * Classe de base abstraite pour simplifier implémentation
 */
export abstract class BaseAttachmentParser implements IAttachmentParser {
  abstract readonly supportedMimeTypes: string[];

  abstract readonly supportedExtensions: string[];

  abstract readonly name: string;

  abstract parse(
    contentBytes: string,
    mimeType: string,
    options?: ParseOptions
  ): Promise<ParsedAttachment>;

  canParse(mimeType: string): boolean {
    return this.supportedMimeTypes.includes(mimeType);
  }

  /**
   * Convertit base64 en ArrayBuffer
   * Méthode utilitaire commune à tous les parsers
   */
  protected base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const { length } = binaryString;
    const buffer = new ArrayBuffer(length);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < length; i++) {
      view[i] = binaryString.charCodeAt(i);
    }

    return buffer;
  }

  /**
   * Crée un Blob URL pour prévisualisation
   */
  protected createBlobUrl(buffer: ArrayBuffer, mimeType: string): string {
    const blob = new Blob([buffer], { type: mimeType });
    return URL.createObjectURL(blob);
  }

  /**
   * Limite la longueur d'un texte
   */
  protected limitText(text: string, limit?: number): string {
    if (!limit || text.length <= limit) {
      return text;
    }
    return `${text.slice(0, limit)}...`;
  }
}
