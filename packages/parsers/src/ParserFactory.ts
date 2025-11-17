/**
 * Factory pour instancier le bon parser selon le type MIME
 *
 * Pattern Factory pour garantir:
 * - Séparation des responsabilités
 * - Single Responsibility Principle
 * - Open/Closed Principle (extensible sans modifier)
 */

import type { IAttachmentParser } from './base/IAttachmentParser';

// Imports parsers
import { DocxParser } from './parsers/office/DocxParser';
import { XlsxParser } from './parsers/office/XlsxParser';
import { PptxParser } from './parsers/office/PptxParser';
import { PdfParser } from './parsers/pdf/PdfParser';
import { TxtParser } from './parsers/text/TxtParser';
import { CsvParser } from './parsers/text/CsvParser';
import { RtfParser } from './parsers/text/RtfParser';
import { ImageParser } from './parsers/image/ImageParser';
import { OdtParser } from './parsers/openoffice/OdtParser';
import { OdsParser } from './parsers/openoffice/OdsParser';
import { OdpParser } from './parsers/openoffice/OdpParser';
import { MsgParser } from './parsers/email/MsgParser';
import { EmlParser } from './parsers/email/EmlParser';
import { IcsParser } from './parsers/calendar/IcsParser';
import { VcfParser } from './parsers/calendar/VcfParser';
import { ZipParser } from './parsers/archive/ZipParser';
import { JsonParser } from './parsers/data/JsonParser';
import { MarkdownAttachmentParser } from './parsers/markdown/MarkdownAttachmentParser';

/**
 * Factory pour créer parsers
 */
export class ParserFactory {
  private static parsers: IAttachmentParser[] | null = null;

  /**
   * Récupère tous les parsers disponibles (singleton lazy)
   */
  private static getAllParsers(): IAttachmentParser[] {
    if (!this.parsers) {
      this.parsers = [
        // Office (P1)
        new DocxParser(),
        new XlsxParser(),
        new PptxParser(),

        // PDF (P1)
        new PdfParser(),

        // Texte (P1 + P3)
        new TxtParser(),
        new CsvParser(),
        new RtfParser(),
        new MarkdownAttachmentParser(),

        // Images (P1)
        new ImageParser(),

        // OpenOffice (P2)
        new OdtParser(),
        new OdsParser(),
        new OdpParser(),

        // Email (P2)
        new MsgParser(),
        new EmlParser(),

        // Calendar (P2)
        new IcsParser(),
        new VcfParser(),

        // Archive (P2)
        new ZipParser(),

        // Data (P3)
        new JsonParser(),
      ];
    }

    return this.parsers;
  }

  /**
   * Trouve le parser approprié pour un type MIME
   *
   * @param mimeType - Type MIME du fichier
   * @returns Parser approprié ou null
   */
  static getParser(mimeType: string): IAttachmentParser | null {
    const parsers = this.getAllParsers();

    for (const parser of parsers) {
      if (parser.canParse(mimeType)) {
        return parser;
      }
    }

    return null;
  }

  /**
   * Liste tous les types MIME supportés
   */
  static getSupportedMimeTypes(): string[] {
    const parsers = this.getAllParsers();
    const mimeTypes = new Set<string>();

    for (const parser of parsers) {
      for (const mimeType of parser.supportedMimeTypes) {
        mimeTypes.add(mimeType);
      }
    }

    return Array.from(mimeTypes).sort();
  }

  /**
   * Liste toutes les extensions supportées
   */
  static getSupportedExtensions(): string[] {
    const parsers = this.getAllParsers();
    const extensions = new Set<string>();

    for (const parser of parsers) {
      for (const ext of parser.supportedExtensions) {
        extensions.add(ext);
      }
    }

    return Array.from(extensions).sort();
  }

  /**
   * Vérifie si un type MIME est supporté
   */
  static isSupported(mimeType: string): boolean {
    return this.getParser(mimeType) !== null;
  }

  /**
   * Récupère le nom du parser pour un type MIME
   */
  static getParserName(mimeType: string): string | null {
    const parser = this.getParser(mimeType);
    return parser ? parser.name : null;
  }

  /**
   * Trouve le parser approprié par extension de fichier
   *
   * @param fileName - Nom du fichier avec extension
   * @returns Parser approprié ou null
   */
  static getParserByExtension(fileName: string): IAttachmentParser | null {
    const parsers = this.getAllParsers();
    const extension = fileName.toLowerCase().match(/\.\w+$/)?.[0];

    if (!extension) {
      return null;
    }

    for (const parser of parsers) {
      if (parser.supportedExtensions.includes(extension)) {
        return parser;
      }
    }

    return null;
  }
}
