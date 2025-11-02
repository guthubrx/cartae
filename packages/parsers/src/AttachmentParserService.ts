/**
 * Service orchestrateur pour parsing de pièces jointes
 *
 * Responsabilités:
 * - Déléger parsing au bon parser (via Factory)
 * - Logging
 * - Statistiques
 *
 * Note: Le cache est géré par le plugin qui utilise ce service
 */

import { ParserFactory } from './ParserFactory';
import type { ParsedAttachment, ParseOptions } from './base/ParsedAttachment';

/**
 * Service principal pour parser attachments
 */
export class AttachmentParserService {
  private stats = {
    totalParsed: 0,
    successCount: 0,
    errorCount: 0,
  };

  constructor() {
    console.log('[AttachmentParserService] Initialisé');
    console.log(
      `[AttachmentParserService] ${ParserFactory.getSupportedMimeTypes().length} formats supportés`
    );
  }

  /**
   * Parse une pièce jointe
   *
   * @param attachmentId - ID unique (pour cache)
   * @param contentBytes - Contenu base64
   * @param mimeType - Type MIME
   * @param options - Options parsing (peut inclure fileName pour fallback extension)
   * @returns Résultat parsing
   */
  async parseAttachment(
    attachmentId: string,
    contentBytes: string,
    mimeType: string,
    options: ParseOptions & { fileName?: string } = {}
  ): Promise<ParsedAttachment> {
    this.stats.totalParsed++;

    // Récupérer parser approprié
    let parser = ParserFactory.getParser(mimeType);

    // Fallback: Si MIME type générique (octet-stream), détecter par extension
    if (!parser && options.fileName && mimeType === 'application/octet-stream') {
      console.log(
        `[AttachmentParserService] MIME générique, détection par extension: ${options.fileName}`
      );
      parser = ParserFactory.getParserByExtension(options.fileName);
    }

    if (!parser) {
      console.warn(`[AttachmentParserService] Format non supporté: ${mimeType}`);
      this.stats.errorCount++;

      return {
        type: 'unsupported',
        metadata: { size: 0 },
        error: `Format ${mimeType} non supporté`,
      };
    }

    console.log(`[AttachmentParserService] Parsing avec ${parser.name}`);

    try {
      // Parser
      const result = await parser.parse(contentBytes, mimeType, options);

      // Update stats
      if (!result.error) {
        this.stats.successCount++;
      } else {
        this.stats.errorCount++;
      }

      return result;
    } catch (error) {
      console.error(`[AttachmentParserService] Erreur parsing:`, error);
      this.stats.errorCount++;

      return {
        type: 'error',
        metadata: { size: 0 },
        error: `Erreur parsing: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Vérifie si un format est supporté
   */
  isFormatSupported(mimeType: string): boolean {
    return ParserFactory.isSupported(mimeType);
  }

  /**
   * Liste formats supportés
   */
  getSupportedFormats(): { mimeTypes: string[]; extensions: string[] } {
    return {
      mimeTypes: ParserFactory.getSupportedMimeTypes(),
      extensions: ParserFactory.getSupportedExtensions(),
    };
  }

  /**
   * Récupère statistiques parsing
   */
  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.totalParsed > 0
          ? `${((this.stats.successCount / this.stats.totalParsed) * 100).toFixed(1)}%`
          : '0%',
    };
  }

  /**
   * Reset statistiques
   */
  resetStats() {
    this.stats = {
      totalParsed: 0,
      successCount: 0,
      errorCount: 0,
    };
  }
}

/**
 * Instance globale du service
 */
export const attachmentParserService = new AttachmentParserService();
