/**
 * MarkdownAttachmentParser - Parse Markdown as attachment
 *
 * Integration with existing ParserFactory system.
 * For full CartaeItem parsing, use MarkdownParser directly.
 *
 * @module parsers/markdown/MarkdownAttachmentParser
 */

import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';
import { MarkdownParser } from './MarkdownParser';

/**
 * MarkdownAttachmentParser - Attachment parser for markdown files
 */
export class MarkdownAttachmentParser extends BaseAttachmentParser {
  readonly name = 'MarkdownAttachmentParser';

  readonly supportedMimeTypes = [
    'text/markdown',
    'text/x-markdown',
    'text/plain', // .md files are often text/plain
  ];

  readonly supportedExtensions = ['.md', '.markdown', '.mdown', '.mkd'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);

      // Decode UTF-8
      const markdown = new TextDecoder('utf-8').decode(buffer);

      // Parse with MarkdownParser to extract metadata
      const cartaeItem = MarkdownParser.parse(markdown, {
        defaultType: 'document',
        extractTags: true,
        extractWikiLinks: true,
      });

      // Extract text for search
      const text = this.extractPlainText(markdown);

      return {
        type: 'markdown',
        text: this.limitText(text, options.textLimit),
        metadata: {
          size: buffer.byteLength,
          format: 'Markdown',
          title: cartaeItem.title,
          wordCount: text.split(/\s+/).length,
          lineCount: markdown.split('\n').length,
          hasCodeBlocks: markdown.includes('```'),
          hasLinks: markdown.includes('['),
          hasImages: markdown.includes('!['),
          hasTables: markdown.includes('|'),
          // Tags stored in cartaeItem, not in attachment metadata
          extractedTags: cartaeItem.tags,
        },
      };
    } catch (error) {
      return {
        type: 'markdown',
        metadata: { size: 0 },
        error: `Erreur parsing Markdown: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Extract plain text from markdown (remove formatting)
   *
   * @param markdown - Markdown content
   * @returns Plain text
   */
  private extractPlainText(markdown: string): string { // eslint-disable-line class-methods-use-this
    let text = markdown;

    // Remove frontmatter
    text = text.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');

    // Remove inline code
    text = text.replace(/`[^`]+`/g, '');

    // Remove images
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

    // Remove links (keep text)
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove WikiLinks (keep text)
    text = text.replace(/\[\[([^\]|]+)(\|[^\]]+)?\]\]/g, '$1');

    // Remove headings markers
    text = text.replace(/^#+\s+/gm, '');

    // Remove bold/italic markers
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');

    // Remove horizontal rules
    text = text.replace(/^[-*_]{3,}$/gm, '');

    // Remove blockquotes markers
    text = text.replace(/^>\s+/gm, '');

    // Remove list markers
    text = text.replace(/^[*\-+]\s+/gm, '');
    text = text.replace(/^\d+\.\s+/gm, '');

    // Normalize whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    return text;
  }
}
