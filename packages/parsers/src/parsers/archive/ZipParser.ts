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

      return {
        type: 'zip',
        text: this.limitText(text, options.textLimit),
        data: {
          files,
          ...(Object.keys(fileContents).length > 0 && { fileContents }),
        },
        metadata: {
          size: buffer.byteLength,
          fileCount: files.filter(f => !f.isFolder).length,
          format: 'ZIP Archive',
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
}
