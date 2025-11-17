/**
 * MarkdownSerializer - Serialize CartaeItem to Markdown
 *
 * Converts CartaeItem back to Markdown format with frontmatter.
 * Preserves metadata, tags, and structure.
 *
 * Compatible with:
 * - Obsidian Markdown
 * - Standard Markdown (CommonMark)
 * - GitHub Flavored Markdown
 *
 * @module parsers/markdown/MarkdownSerializer
 */

import type { CartaeItem } from '@cartae/core';

/**
 * Serialization options
 */
export interface MarkdownSerializeOptions {
  /**
   * Include frontmatter YAML
   * @default true
   */
  includeFrontmatter?: boolean;

  /**
   * Include content
   * @default true
   */
  includeContent?: boolean;

  /**
   * Add title as # heading if not in content
   * @default true
   */
  addTitleHeading?: boolean;

  /**
   * Format for dates in frontmatter
   * @default 'iso' (ISO 8601)
   */
  dateFormat?: 'iso' | 'locale' | 'short';

  /**
   * Include empty/undefined fields in frontmatter
   * @default false
   */
  includeEmptyFields?: boolean;
}

/**
 * MarkdownSerializer - Main serializer class
 */
export class MarkdownSerializer {
  /**
   * Serialize CartaeItem to Markdown string
   *
   * @param item - CartaeItem to serialize
   * @param options - Serialization options
   * @returns Markdown string
   */
  static serialize(item: CartaeItem, options: MarkdownSerializeOptions = {}): string {
    const {
      includeFrontmatter = true,
      includeContent = true,
      addTitleHeading = true,
      dateFormat = 'iso',
      includeEmptyFields = false,
    } = options;

    const parts: string[] = [];

    // 1. Generate frontmatter
    if (includeFrontmatter) {
      const frontmatter = this.generateFrontmatter(item, {
        dateFormat,
        includeEmptyFields,
      });
      if (frontmatter) {
        parts.push(frontmatter);
      }
    }

    // 2. Add title heading if needed
    if (addTitleHeading && !item.content?.trim().startsWith('#')) {
      parts.push(`# ${item.title}`);
      parts.push(''); // Empty line after heading
    }

    // 3. Add content
    if (includeContent && item.content) {
      parts.push(item.content.trim());
    }

    return parts.join('\n\n');
  }

  /**
   * Generate YAML frontmatter from CartaeItem
   *
   * @param item - CartaeItem
   * @param options - Options for frontmatter generation
   * @returns YAML frontmatter string (with --- delimiters)
   */
  private static generateFrontmatter(
    item: CartaeItem,
    options: { dateFormat: string; includeEmptyFields: boolean }
  ): string {
    const fields: Record<string, unknown> = {};

    // Core fields
    fields.id = item.id;
    fields.type = item.type;
    fields.title = item.title;

    // Tags (if not empty)
    if (item.tags.length > 0) {
      fields.tags = item.tags;
    }

    // Categories (if present)
    if (item.categories && item.categories.length > 0) {
      fields.categories = item.categories;
    }

    // Metadata fields
    if (item.metadata.author) {
      fields.author = item.metadata.author;
    }

    if (item.metadata.priority) {
      fields.priority = item.metadata.priority;
    }

    if (item.metadata.status) {
      fields.status = item.metadata.status;
    }

    if (item.metadata.dueDate) {
      fields.dueDate = this.formatDate(item.metadata.dueDate, options.dateFormat);
    }

    if (item.metadata.startDate) {
      fields.startDate = this.formatDate(item.metadata.startDate, options.dateFormat);
    }

    if (item.metadata.endDate) {
      fields.endDate = this.formatDate(item.metadata.endDate, options.dateFormat);
    }

    if (item.metadata.location) {
      fields.location = item.metadata.location;
    }

    if (item.metadata.duration !== undefined) {
      fields.duration = item.metadata.duration;
    }

    if (item.metadata.progress !== undefined) {
      fields.progress = item.metadata.progress;
    }

    // Dates
    fields.created = this.formatDate(item.createdAt, options.dateFormat);
    fields.updated = this.formatDate(item.updatedAt, options.dateFormat);

    // Flags
    if (item.archived) {
      fields.archived = true;
    }

    if (item.favorite) {
      fields.favorite = true;
    }

    // Source info
    if (item.source.connector !== 'markdown') {
      fields.source = item.source.connector;
      if (item.source.url) {
        fields.sourceUrl = item.source.url;
      }
    }

    // Convert to YAML format
    const yamlLines: string[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (!options.includeEmptyFields && (value === undefined || value === null)) {
        continue;
      }

      const yamlValue = this.toYamlValue(value);
      yamlLines.push(`${key}: ${yamlValue}`);
    }

    if (yamlLines.length === 0) {
      return '';
    }

    return `---\n${yamlLines.join('\n')}\n---`;
  }

  /**
   * Convert value to YAML-compatible string
   *
   * @param value - Value to convert
   * @returns YAML-formatted string
   */
  private static toYamlValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      // Quote strings with special characters
      if (value.includes(':') || value.includes('#') || value.includes('\n')) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      // Simple array format: [item1, item2]
      const items = value.map(item =>
        typeof item === 'string' && (item.includes(',') || item.includes(' '))
          ? `"${item}"`
          : item
      );
      return `[${items.join(', ')}]`;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Format date according to specified format
   *
   * @param date - Date to format
   * @param format - Format type
   * @returns Formatted date string
   */
  private static formatDate(date: Date, format: string): string {
    if (format === 'iso') {
      return date.toISOString();
    }

    if (format === 'short') {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    if (format === 'locale') {
      return date.toLocaleString();
    }

    return date.toISOString();
  }

  /**
   * Serialize CartaeItem to Obsidian-compatible Markdown
   *
   * Includes Obsidian-specific features:
   * - WikiLinks for relationships
   * - Tags inline in content
   * - Frontmatter with Obsidian fields
   *
   * @param item - CartaeItem to serialize
   * @returns Obsidian-compatible Markdown
   */
  static serializeForObsidian(item: CartaeItem): string {
    const parts: string[] = [];

    // 1. Frontmatter (Obsidian-style)
    const frontmatter = this.generateFrontmatter(item, {
      dateFormat: 'iso',
      includeEmptyFields: false,
    });
    if (frontmatter) {
      parts.push(frontmatter);
    }

    // 2. Title
    parts.push(`# ${item.title}`);
    parts.push(''); // Empty line

    // 3. Tags inline (Obsidian style: #tag1 #tag2)
    if (item.tags.length > 0) {
      parts.push(item.tags.map((tag: string) => `#${tag}`).join(' '));
      parts.push(''); // Empty line
    }

    // 4. Relationships as WikiLinks
    if (item.relationships && item.relationships.length > 0) {
      parts.push('## Related');
      for (const rel of item.relationships) {
        parts.push(`- [[${rel.targetId}]] (${rel.type})`);
      }
      parts.push(''); // Empty line
    }

    // 5. Content
    if (item.content) {
      parts.push(item.content.trim());
    }

    return parts.join('\n');
  }

  /**
   * Serialize CartaeItem to GitHub-flavored Markdown
   *
   * Features:
   * - No WikiLinks (convert to standard links if possible)
   * - Tables for metadata
   * - Task lists for tasks
   *
   * @param item - CartaeItem to serialize
   * @returns GitHub-flavored Markdown
   */
  static serializeForGitHub(item: CartaeItem): string {
    const parts: string[] = [];

    // 1. Title
    parts.push(`# ${item.title}`);
    parts.push(''); // Empty line

    // 2. Metadata table
    const metadataRows: string[] = [];
    metadataRows.push('| Field | Value |');
    metadataRows.push('|-------|-------|');
    metadataRows.push(`| Type | ${item.type} |`);
    if (item.metadata.status) {
      metadataRows.push(`| Status | ${item.metadata.status} |`);
    }
    if (item.metadata.priority) {
      metadataRows.push(`| Priority | ${item.metadata.priority} |`);
    }
    if (item.tags.length > 0) {
      metadataRows.push(`| Tags | ${item.tags.join(', ')} |`);
    }

    parts.push(metadataRows.join('\n'));
    parts.push(''); // Empty line

    // 3. Content
    if (item.content) {
      parts.push('## Content');
      parts.push(item.content.trim());
    }

    return parts.join('\n');
  }
}
