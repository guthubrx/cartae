/**
 * MarkdownParser tests
 *
 * Tests for Markdown → CartaeItem → Markdown round-trip
 */

import { describe, it, expect } from 'vitest';
import { MarkdownParser } from './MarkdownParser';
import { MarkdownSerializer } from './MarkdownSerializer';

describe('MarkdownParser', () => {
  describe('parse()', () => {
    it('should parse simple markdown without frontmatter', () => {
      const markdown = '# Hello World\n\nThis is a test.';
      const item = MarkdownParser.parse(markdown);

      expect(item.title).toBe('Hello World');
      expect(item.content).toContain('This is a test');
      expect(item.type).toBe('note');
      expect(item.source.connector).toBe('markdown');
    });

    it('should parse markdown with frontmatter', () => {
      const markdown = `---
title: My Document
type: document
tags: [test, demo]
priority: high
status: in_progress
---

# Content

This is the content.`;

      const item = MarkdownParser.parse(markdown);

      expect(item.title).toBe('My Document');
      expect(item.type).toBe('document');
      expect(item.tags).toContain('test');
      expect(item.tags).toContain('demo');
      expect(item.metadata.priority).toBe('high');
      expect(item.metadata.status).toBe('in_progress');
    });

    it('should extract tags from content', () => {
      const markdown = 'This is #important and #urgent content.';
      const item = MarkdownParser.parse(markdown);

      expect(item.tags).toContain('important');
      expect(item.tags).toContain('urgent');
    });

    it('should extract WikiLinks', () => {
      const markdown = 'See [[Related Document]] and [[Another|Alias]].';
      const item = MarkdownParser.parse(markdown);

      const wikiLinks = item.metadata.wikiLinks as Array<{ link: string; alias?: string }>;
      expect(wikiLinks).toBeDefined();
      expect(wikiLinks).toHaveLength(2);
      expect(wikiLinks[0].link).toBe('Related Document');
      expect(wikiLinks[1].link).toBe('Another');
      expect(wikiLinks[1].alias).toBe('Alias');
    });

    it('should parse dates from frontmatter', () => {
      const markdown = `---
title: Task
created: 2025-01-01T10:00:00.000Z
updated: 2025-01-02T10:00:00.000Z
dueDate: 2025-01-15T10:00:00.000Z
---

Task content`;

      const item = MarkdownParser.parse(markdown);

      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
      expect(item.metadata.dueDate).toBeInstanceOf(Date);
    });

    it('should handle markdown without title', () => {
      const markdown = 'Just some content without a heading.';
      const item = MarkdownParser.parse(markdown);

      expect(item.title).toBe('Untitled');
    });

    it('should deduplicate tags', () => {
      const markdown = `---
tags: [test, demo]
---

This is #test and #test again.`;

      const item = MarkdownParser.parse(markdown);

      const testTags = item.tags.filter((t: string) => t === 'test');
      expect(testTags).toHaveLength(1);
    });
  });
});

describe('MarkdownSerializer', () => {
  describe('serialize()', () => {
    it('should serialize CartaeItem to markdown', () => {
      const markdown = `---
title: Test Document
type: document
tags: [test, demo]
---

# Test Document

Content here.`;

      const item = MarkdownParser.parse(markdown);
      const serialized = MarkdownSerializer.serialize(item);

      expect(serialized).toContain('title: Test Document');
      expect(serialized).toContain('type: document');
      expect(serialized).toContain('tags: [test, demo]');
      expect(serialized).toContain('Content here');
    });

    it('should handle items without content', () => {
      const markdown = `---
title: Empty Note
---`;

      const item = MarkdownParser.parse(markdown);
      item.content = undefined;

      const serialized = MarkdownSerializer.serialize(item);

      expect(serialized).toContain('title: Empty Note');
      expect(serialized).toContain('# Empty Note');
    });

    it('should serialize for Obsidian', () => {
      const markdown = `---
title: Obsidian Note
tags: [obsidian, test]
---

Content`;

      const item = MarkdownParser.parse(markdown);
      const serialized = MarkdownSerializer.serializeForObsidian(item);

      expect(serialized).toContain('# Obsidian Note');
      expect(serialized).toContain('#obsidian #test');
    });

    it('should serialize for GitHub', () => {
      const markdown = `---
title: GitHub Doc
type: document
---

Content`;

      const item = MarkdownParser.parse(markdown);
      const serialized = MarkdownSerializer.serializeForGitHub(item);

      expect(serialized).toContain('# GitHub Doc');
      expect(serialized).toContain('| Type | document |');
    });
  });
});

describe('Round-trip tests', () => {
  it('should preserve data through parse → serialize cycle', () => {
    const original = `---
title: Round-trip Test
type: document
tags: [test, round-trip]
priority: high
---

# Round-trip Test

This is a **test** of the round-trip functionality.

## Features

- Parse markdown
- Serialize back
- Preserve data`;

    const item = MarkdownParser.parse(original);
    const serialized = MarkdownSerializer.serialize(item);

    // Parse again to compare
    const item2 = MarkdownParser.parse(serialized);

    expect(item2.title).toBe(item.title);
    expect(item2.type).toBe(item.type);
    expect(item2.tags).toEqual(item.tags);
    expect(item2.metadata.priority).toBe(item.metadata.priority);
  });

  it('should handle empty frontmatter', () => {
    const markdown = 'Just content without frontmatter.';

    const item = MarkdownParser.parse(markdown);
    const serialized = MarkdownSerializer.serialize(item);

    expect(serialized).toContain('---');
    expect(serialized).toContain('type: note');
  });

  it('should preserve tags through round-trip', () => {
    const markdown = `---
tags: [project-x, urgent, client-a]
---

Content with #inline-tag.`;

    const item = MarkdownParser.parse(markdown);
    const serialized = MarkdownSerializer.serialize(item);
    const item2 = MarkdownParser.parse(serialized);

    expect(item2.tags).toContain('project-x');
    expect(item2.tags).toContain('urgent');
    expect(item2.tags).toContain('client-a');
    expect(item2.tags).toContain('inline-tag');
  });
});
