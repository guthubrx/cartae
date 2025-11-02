/**
 * Parser pour archives ZIP
 * Liste fichiers contenus sans décompresser
 */

import JSZip from 'jszip';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class ZipParser extends BaseAttachmentParser {
  readonly name = 'ZipParser';

  readonly supportedMimeTypes = ['application/zip', 'application/x-zip-compressed'];

  readonly supportedExtensions = ['.zip'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const zip = await JSZip.loadAsync(buffer);

      // Liste fichiers avec métadonnées
      const files = Object.keys(zip.files).map(name => {
        const file = zip.files[name];
        // eslint-disable-next-line no-underscore-dangle
        const uncompressedSize = (file as any)._data?.uncompressedSize || 0;
        // eslint-disable-next-line no-underscore-dangle
        const compressedSize = (file as any)._data?.compressedSize || 0;

        return {
          name,
          size: uncompressedSize,
          isFolder: file.dir,
          compressedSize,
        };
      });

      // Texte: liste fichiers avec preview contenu si < 10 fichiers texte
      const textFiles = files.filter(
        f =>
          !f.isFolder &&
          (f.name.endsWith('.txt') ||
            f.name.endsWith('.csv') ||
            f.name.endsWith('.md') ||
            f.name.endsWith('.json') ||
            // Fichiers sans extension (souvent texte)
            (!f.name.includes('.') && f.size < 1024 * 1024)) // < 1 MB
      );

      // Détecter fichiers parsables imbriqués (ZIP, archives, emails, Office)
      const nestedParsableFiles = files.filter(
        f =>
          !f.isFolder &&
          (f.name.endsWith('.zip') ||
            f.name.endsWith('.7z') ||
            f.name.endsWith('.rar') ||
            f.name.endsWith('.tar') ||
            f.name.endsWith('.tar.gz') ||
            f.name.endsWith('.eml') ||
            f.name.endsWith('.msg') ||
            f.name.endsWith('.docx') ||
            f.name.endsWith('.xlsx') ||
            f.name.endsWith('.pptx') ||
            f.name.endsWith('.pdf'))
      );

      const text = files
        .filter(f => !f.isFolder)
        .map(f => `${f.name} (${(f.size / 1024).toFixed(1)} KB)`)
        .join('\n');

      // Ajouter preview contenu pour fichiers texte (max 10 fichiers, 500 premiers caractères chacun)
      const fileContents: Record<string, string> = {};
      if (textFiles.length > 0 && textFiles.length <= 10) {
        for (const fileInfo of textFiles.slice(0, 10)) {
          try {
            const fileContent = await zip.files[fileInfo.name].async('string');
            // Vérifier si c'est du texte lisible (pas binaire)
            // eslint-disable-next-line no-control-regex
            const isBinary = /[\x00-\x08\x0E-\x1F]/.test(fileContent.slice(0, 100));
            if (!isBinary) {
              const preview =
                fileContent.length > 500
                  ? `${fileContent.slice(0, 500)}\n...(tronqué)`
                  : fileContent;
              fileContents[fileInfo.name] = preview;
            }
          } catch {
            // Ignore fichiers non-texte
          }
        }
      }

      // Preview URL pour téléchargement
      let previewUrl: string | undefined;
      if (options.generatePreview !== false) {
        previewUrl = this.createBlobUrl(buffer, 'application/zip');
      }

      return {
        type: 'zip',
        text: this.limitText(text, options.textLimit),
        data: {
          files,
          ...(Object.keys(fileContents).length > 0 && { fileContents }),
        },
        previewUrl,
        metadata: {
          size: buffer.byteLength,
          fileCount: files.filter(f => !f.isFolder).length,
          format: 'ZIP Archive',
          // Indiquer fichiers parsables imbriqués (pour exploration récursive future)
          ...(nestedParsableFiles.length > 0 && {
            nestedParsableFiles: nestedParsableFiles.map(f => ({
              name: f.name,
              size: f.size,
              type: this.detectFileType(f.name),
            })),
          }),
        },
      };
    } catch (error) {
      return {
        type: 'zip',
        metadata: { size: 0 },
        error: `Erreur parsing ZIP: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Détecte le type de fichier basé sur son nom/extension
   */
  private detectFileType(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();

    const typeMap: Record<string, string> = {
      zip: 'archive',
      '7z': 'archive',
      rar: 'archive',
      tar: 'archive',
      gz: 'archive',
      eml: 'email',
      msg: 'email',
      docx: 'document',
      xlsx: 'spreadsheet',
      pptx: 'presentation',
      pdf: 'pdf',
      odt: 'document',
      ods: 'spreadsheet',
      odp: 'presentation',
    };

    return typeMap[ext || ''] || 'unknown';
  }
}
