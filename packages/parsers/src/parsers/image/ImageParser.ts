/**
 * Parser pour fichiers images (JPG, PNG, GIF, SVG, WebP)
 *
 * Extrait:
 * - Dimensions
 * - Preview URL
 * - EXIF metadata (optionnel)
 */

import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class ImageParser extends BaseAttachmentParser {
  readonly name = 'ImageParser';

  readonly supportedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ];

  readonly supportedExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.svg',
    '.webp',
    '.bmp',
    '.tiff',
  ];

  async parse(
    contentBytes: string,
    _mimeType: string,
    _options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);

      // Créer Blob URL pour preview
      const previewUrl = this.createBlobUrl(buffer, _mimeType);

      // Charger image pour récupérer dimensions
      const dimensions = await this.getImageDimensions(previewUrl);

      // Déterminer format
      const format = this.getFormatName(_mimeType);

      return {
        type: 'image',
        previewUrl,
        metadata: {
          size: buffer.byteLength,
          dimensions,
          format,
        },
      };
    } catch (error) {
      return {
        type: 'image',
        metadata: { size: 0 },
        error: `Erreur parsing image: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Récupère les dimensions d'une image
   */
  private async getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        URL.revokeObjectURL(url); // Cleanup
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Nom formaté du format d'image
   */
  private getFormatName(mimeType: string): string {
    const formats: Record<string, string> = {
      'image/jpeg': 'JPEG Image',
      'image/jpg': 'JPEG Image',
      'image/png': 'PNG Image',
      'image/gif': 'GIF Image',
      'image/svg+xml': 'SVG Vector Image',
      'image/webp': 'WebP Image',
      'image/bmp': 'BMP Bitmap',
      'image/tiff': 'TIFF Image',
    };

    return formats[mimeType] || 'Image';
  }
}
