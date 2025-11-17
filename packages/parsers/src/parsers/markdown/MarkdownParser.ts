/**
 * MarkdownParser - Parse Markdown files to CartaeItem
 *
 * Supports:
 * - Frontmatter YAML metadata
 * - Markdown content parsing
 * - Tags extraction (#tag, #multi-word-tag)
 * - WikiLinks extraction ([[link]], [[link|alias]])
 * - Standard Markdown links ([text](url))
 *
 * Compatible with:
 * - Obsidian Markdown
 * - Standard Markdown (CommonMark)
 * - GitHub Flavored Markdown
 *
 * @module parsers/markdown/MarkdownParser
 */

import type { CartaeItem, CartaeItemType } from '@cartae/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Frontmatter metadata from YAML
 */
export interface MarkdownFrontmatter {
  title?: string;
  type?: CartaeItemType;
  tags?: string[];
  categories?: string[];
  author?: string;
  created?: string | Date;
  updated?: string | Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'new' | 'in_progress' | 'pending' | 'completed' | 'cancelled' | 'blocked';
  dueDate?: string | Date;
  archived?: boolean;
  favorite?: boolean;
  [key: string]: unknown;
}

/**
 * Parse options for MarkdownParser
 */
export interface MarkdownParseOptions {
  /**
   * Default type if not specified in frontmatter
   * @default 'note'
   */
  defaultType?: CartaeItemType;

  /**
   * Extract tags from content (#tag syntax)
   * @default true
   */
  extractTags?: boolean;

  /**
   * Extract WikiLinks from content ([[link]] syntax)
   * @default true
   */
  extractWikiLinks?: boolean;

  /**
   * Preserve raw markdown content
   * @default true
   */
  preserveRawContent?: boolean;

  /**
   * Tenant ID for multi-tenant support
   */
  tenantId?: string;

  /**
   * Owner ID for the item
   */
  ownerId?: string;
}

/**
 * MarkdownParser - Main parser class
 */
export class MarkdownParser {
  /**
   * Parse markdown string to CartaeItem
   *
   * @param markdown - Markdown content (with optional frontmatter)
   * @param options - Parse options
   * @returns CartaeItem
   */
  static parse(markdown: string, options: MarkdownParseOptions = {}): CartaeItem {
    const {
      defaultType = 'note',
      extractTags = true,
      extractWikiLinks = true,
      preserveRawContent = true,
    } = options;

    // 1. Parse frontmatter
    const { frontmatter, content } = this.parseFrontmatter(markdown);

    // 2. Extract title (from frontmatter or first heading)
    const title = frontmatter.title || this.extractTitle(content) || 'Untitled';

    // 3. Extract tags
    const frontmatterTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    const contentTags = extractTags ? this.extractTags(content) : [];
    const allTags = [...new Set([...frontmatterTags, ...contentTags])];

    // 4. Extract WikiLinks
    const wikiLinks = extractWikiLinks ? this.extractWikiLinks(content) : [];

    // 5. Build CartaeItem
    const now = new Date();
    const createdAt = frontmatter.created
      ? new Date(frontmatter.created)
      : now;
    const updatedAt = frontmatter.updated
      ? new Date(frontmatter.updated)
      : now;

    const item: CartaeItem = {
      id: uuidv4(),
      type: (frontmatter.type as CartaeItemType) || defaultType,
      title,
      content: preserveRawContent ? content : undefined,

      metadata: {
        author: frontmatter.author,
        priority: frontmatter.priority,
        status: frontmatter.status,
        dueDate: frontmatter.dueDate ? new Date(frontmatter.dueDate) : undefined,
        // Store extracted wikiLinks in metadata for reference
        wikiLinks: wikiLinks.length > 0 ? wikiLinks : undefined,
      },

      tags: allTags,
      categories: frontmatter.categories,

      source: {
        connector: 'markdown',
        originalId: `markdown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        lastSync: now,
        metadata: {
          filename: frontmatter.filename,
          rawMarkdown: markdown,
        },
      },

      createdAt,
      updatedAt,
      archived: frontmatter.archived || false,
      favorite: frontmatter.favorite || false,
    };

    // Add tenant/owner if provided
    if (options.tenantId) {
      item.source.metadata = {
        ...item.source.metadata,
        tenantId: options.tenantId,
      };
    }

    if (options.ownerId) {
      item.metadata.author = item.metadata.author || options.ownerId;
    }

    return item;
  }

  /**
   * Parse frontmatter YAML from markdown
   *
   * @param markdown - Markdown content
   * @returns Frontmatter object and content without frontmatter
   */
  private static parseFrontmatter(markdown: string): {
    frontmatter: MarkdownFrontmatter;
    content: string;
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*(?:\n([\s\S]*))?$/;
    const match = markdown.match(frontmatterRegex);

    if (!match) {
      return {
        frontmatter: {},
        content: markdown,
      };
    }

    const [, yamlContent, content = ''] = match;

    // Simple YAML parser (for basic key: value pairs)
    // For production, use a library like js-yaml
    const frontmatter: MarkdownFrontmatter = {};

    const lines = yamlContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;

      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();

      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }

      // Parse arrays (simple format: [item1, item2])
      if (value.startsWith('[') && value.endsWith(']')) {
        const items = value
          .substring(1, value.length - 1)
          .split(',')
          .map(item => item.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        frontmatter[key] = items;
      } else {
        frontmatter[key] = value;
      }
    }

    return {
      frontmatter,
      content: content.trim(),
    };
  }

  /**
   * Extract title from markdown content (first # heading)
   *
   * @param content - Markdown content
   * @returns Title or undefined
   */
  private static extractTitle(content: string): string | undefined {
    const headingRegex = /^#\s+(.+)$/m;
    const match = content.match(headingRegex);
    return match ? match[1].trim() : undefined;
  }

  /**
   * Extract tags from markdown content (#tag syntax)
   *
   * Supports:
   * - #simple-tag
   * - #multi-word-tag
   * - #CamelCaseTag
   *
   * @param content - Markdown content
   * @returns Array of tags (without # prefix)
   */
  private static extractTags(content: string): string[] {
    // Match #tag (alphanumeric, hyphens, underscores)
    const tagRegex = /#([\w-]+)/g;
    const tags: string[] = [];
    let match;

    while ((match = tagRegex.exec(content)) !== null) { // eslint-disable-line no-cond-assign
      tags.push(match[1]);
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Extract WikiLinks from markdown content
   *
   * Supports:
   * - [[Simple Link]]
   * - [[Link|Alias]]
   * - [[Folder/Nested/Link]]
   *
   * @param content - Markdown content
   * @returns Array of WikiLink objects
   */
  private static extractWikiLinks(content: string): Array<{ link: string; alias?: string }> {
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    const links: Array<{ link: string; alias?: string }> = [];
    let match;

    while ((match = wikiLinkRegex.exec(content)) !== null) { // eslint-disable-line no-cond-assign
      const linkContent = match[1];

      // Check for alias syntax [[link|alias]]
      if (linkContent.includes('|')) {
        const [link, alias] = linkContent.split('|').map(s => s.trim());
        links.push({ link, alias });
      } else {
        links.push({ link: linkContent.trim() });
      }
    }

    return links;
  }
}
