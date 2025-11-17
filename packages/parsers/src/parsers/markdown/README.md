# Markdown Parser & Serializer

Parse Markdown files to `CartaeItem` format and serialize back to Markdown.

## Features

- **Frontmatter YAML** parsing (metadata extraction)
- **Markdown content** parsing
- **Tags extraction** (`#tag` syntax)
- **WikiLinks extraction** (`[[link]]` and `[[link|alias]]` syntax)
- **Bidirectional** conversion (Markdown ↔ CartaeItem)
- **Compatible** with Obsidian, CommonMark, GitHub Flavored Markdown

## Installation

```bash
pnpm install @cartae/parsers
```

## Usage

### Parse Markdown → CartaeItem

```typescript
import { MarkdownParser } from '@cartae/parsers/markdown';

const markdown = `---
title: My Note
type: note
tags: [important, project-x]
priority: high
---

# My Note

This is a **test** note with #inline-tag.

See [[Related Document]] for more info.`;

const item = MarkdownParser.parse(markdown);

console.log(item.title); // "My Note"
console.log(item.type); // "note"
console.log(item.tags); // ["important", "project-x", "inline-tag"]
console.log(item.metadata.priority); // "high"
console.log(item.metadata.wikiLinks); // [{ link: "Related Document" }]
```

### Serialize CartaeItem → Markdown

```typescript
import { MarkdownSerializer } from '@cartae/parsers/markdown';

const markdown = MarkdownSerializer.serialize(item);
console.log(markdown);
```

**Output:**

```markdown
---
id: uuid-123-456
type: note
title: My Note
tags: [important, project-x, inline-tag]
priority: high
created: 2025-11-17T10:00:00.000Z
updated: 2025-11-17T10:00:00.000Z
---

# My Note

This is a **test** note with #inline-tag.

See [[Related Document]] for more info.
```

### Parse Options

```typescript
const item = MarkdownParser.parse(markdown, {
  defaultType: 'document', // Default type if not in frontmatter
  extractTags: true, // Extract #tags from content
  extractWikiLinks: true, // Extract [[WikiLinks]]
  preserveRawContent: true, // Keep raw markdown in item.content
  tenantId: 'tenant-123', // Multi-tenant support
  ownerId: 'user-456', // Owner ID
});
```

### Serialize Options

```typescript
const markdown = MarkdownSerializer.serialize(item, {
  includeFrontmatter: true, // Include YAML frontmatter
  includeContent: true, // Include content body
  addTitleHeading: true, // Add # Title if missing
  dateFormat: 'iso', // 'iso' | 'locale' | 'short'
  includeEmptyFields: false, // Include undefined fields
});
```

## Specialized Serializers

### Obsidian-compatible Markdown

```typescript
const obsidianMarkdown = MarkdownSerializer.serializeForObsidian(item);
```

Features:
- WikiLinks for relationships
- Inline tags (`#tag1 #tag2`)
- Obsidian-specific frontmatter

### GitHub-flavored Markdown

```typescript
const githubMarkdown = MarkdownSerializer.serializeForGitHub(item);
```

Features:
- No WikiLinks (standard links only)
- Metadata as table
- Task lists for tasks

## Frontmatter Fields

Supported frontmatter fields:

```yaml
---
# Core fields
id: uuid-123
type: note # email | task | document | message | event | note | contact | file
title: Document Title

# Tags & Categories
tags: [tag1, tag2]
categories: [work/projects, personal]

# Metadata
author: john.doe@example.com
priority: high # low | medium | high | urgent
status: in_progress # new | in_progress | pending | completed | cancelled | blocked

# Dates
created: 2025-01-01T10:00:00.000Z
updated: 2025-01-02T10:00:00.000Z
dueDate: 2025-01-15T10:00:00.000Z
startDate: 2025-01-10T10:00:00.000Z
endDate: 2025-01-15T18:00:00.000Z

# Other
location: Meeting Room A
duration: 60 # minutes
progress: 50 # 0-100%
archived: false
favorite: true
---
```

## Tag Extraction

Tags are extracted from:

1. **Frontmatter** (explicit): `tags: [tag1, tag2]`
2. **Content** (inline): `#tag3 #tag4`

Both are merged and deduplicated in the final `CartaeItem`.

```typescript
const markdown = `---
tags: [project-x]
---

Working on #project-x and #urgent task.`;

const item = MarkdownParser.parse(markdown);
console.log(item.tags); // ["project-x", "urgent"]
```

## WikiLinks Extraction

WikiLinks are extracted from content:

```markdown
See [[Document 1]] for context.
Also check [[Document 2|Custom Alias]].
```

```typescript
const item = MarkdownParser.parse(markdown);
console.log(item.metadata.wikiLinks);
// [
//   { link: "Document 1" },
//   { link: "Document 2", alias: "Custom Alias" }
// ]
```

## Round-trip Conversion

Markdown → CartaeItem → Markdown preserves data:

```typescript
const original = `---
title: Test
tags: [test]
---

Content`;

const item = MarkdownParser.parse(original);
const serialized = MarkdownSerializer.serialize(item);
const item2 = MarkdownParser.parse(serialized);

// item2 === item (same data)
```

## Integration with ParserFactory

The `MarkdownAttachmentParser` integrates with the existing attachment parser system:

```typescript
import { ParserFactory } from '@cartae/parsers';

const parser = ParserFactory.getParserByExtension('document.md');
const result = await parser.parse(base64Content, 'text/markdown');

console.log(result.type); // 'markdown'
console.log(result.metadata.title); // Extracted title
console.log(result.metadata.tags); // Extracted tags
```

## Examples

### Example 1: Parse Obsidian Note

```typescript
const obsidianNote = `---
tags: [meeting, client-a]
---

# Client Meeting Notes

## Attendees
- [[John Doe]]
- [[Jane Smith]]

## Action Items
- [ ] Follow up on #budget discussion
- [ ] Send proposal to #client-a
`;

const item = MarkdownParser.parse(obsidianNote);

console.log(item.title); // "Client Meeting Notes"
console.log(item.tags); // ["meeting", "client-a", "budget"]
console.log(item.metadata.wikiLinks); // [{ link: "John Doe" }, { link: "Jane Smith" }]
```

### Example 2: Create Markdown from CartaeItem

```typescript
import { v4 as uuidv4 } from 'uuid';

const item: CartaeItem = {
  id: uuidv4(),
  type: 'task',
  title: 'Complete Documentation',
  content: 'Write README for MarkdownParser.',
  tags: ['documentation', 'urgent'],
  metadata: {
    status: 'in_progress',
    priority: 'high',
    progress: 75,
  },
  source: {
    connector: 'markdown',
    originalId: 'markdown-123',
    lastSync: new Date(),
  },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-05'),
};

const markdown = MarkdownSerializer.serialize(item);
// → Full markdown with frontmatter
```

### Example 3: Multi-tenant Support

```typescript
const item = MarkdownParser.parse(markdown, {
  tenantId: 'tenant-acme-corp',
  ownerId: 'user-john-doe',
});

console.log(item.source.metadata.tenantId); // "tenant-acme-corp"
console.log(item.metadata.author); // "user-john-doe"
```

## API Reference

### MarkdownParser

#### `parse(markdown: string, options?: MarkdownParseOptions): CartaeItem`

Parse markdown string to CartaeItem.

**Options:**
- `defaultType?: CartaeItemType` - Default type if not in frontmatter (default: 'note')
- `extractTags?: boolean` - Extract #tags from content (default: true)
- `extractWikiLinks?: boolean` - Extract [[WikiLinks]] (default: true)
- `preserveRawContent?: boolean` - Keep raw markdown (default: true)
- `tenantId?: string` - Tenant ID for multi-tenant
- `ownerId?: string` - Owner ID for the item

### MarkdownSerializer

#### `serialize(item: CartaeItem, options?: MarkdownSerializeOptions): string`

Serialize CartaeItem to markdown string.

**Options:**
- `includeFrontmatter?: boolean` - Include YAML frontmatter (default: true)
- `includeContent?: boolean` - Include content body (default: true)
- `addTitleHeading?: boolean` - Add # Title if missing (default: true)
- `dateFormat?: 'iso' | 'locale' | 'short'` - Date format (default: 'iso')
- `includeEmptyFields?: boolean` - Include undefined fields (default: false)

#### `serializeForObsidian(item: CartaeItem): string`

Serialize to Obsidian-compatible markdown.

#### `serializeForGitHub(item: CartaeItem): string`

Serialize to GitHub-flavored markdown.

## Tests

Run tests:

```bash
pnpm test packages/parsers/src/parsers/markdown/MarkdownParser.test.ts
```

## License

MIT
