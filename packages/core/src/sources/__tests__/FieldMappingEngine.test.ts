/**
 * Tests unitaires pour FieldMappingEngine
 *
 * Coverage cible: ≥ 90%
 *
 * @packageDocumentation
 * @module sources/__tests__
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FieldMappingEngine, FieldMappingError } from '../FieldMappingEngine';
import type { FieldMapping } from '../types/UnifiedSource';

describe('FieldMappingEngine', () => {
  let engine: FieldMappingEngine;

  beforeEach(() => {
    engine = new FieldMappingEngine();
  });

  // ========== VALIDATION ==========

  describe('validateMapping', () => {
    it('should accept valid mapping', () => {
      const mapping: FieldMapping = {
        id: 'test-1',
        sourceField: 'email',
        targetField: 'author',
        transform: 'lowercase',
        required: true,
      };

      expect(() => engine.validateMapping(mapping)).not.toThrow();
    });

    it('should reject empty id', () => {
      const mapping: FieldMapping = {
        id: '',
        sourceField: 'email',
        targetField: 'author',
        transform: 'none',
        required: false,
      };

      expect(() => engine.validateMapping(mapping)).toThrow('Mapping ID cannot be empty');
    });

    it('should reject empty sourceField', () => {
      const mapping: FieldMapping = {
        id: 'test-1',
        sourceField: '',
        targetField: 'author',
        transform: 'none',
        required: false,
      };

      expect(() => engine.validateMapping(mapping)).toThrow('sourceField cannot be empty');
    });

    it('should reject invalid transform type', () => {
      const mapping: FieldMapping = {
        id: 'test-1',
        sourceField: 'email',
        targetField: 'author',
        transform: 'invalid-transform' as any,
        required: false,
      };

      expect(() => engine.validateMapping(mapping)).toThrow('Invalid transform type');
    });

    it('should reject split without separator param', () => {
      const mapping: FieldMapping = {
        id: 'test-1',
        sourceField: 'tags',
        targetField: 'categories',
        transform: 'split',
        required: false,
      };

      expect(() => engine.validateMapping(mapping)).toThrow('requires transformParams.separator');
    });
  });

  // ========== TRANSFORMATIONS - CONVERSIONS TYPES ==========

  describe('Transformations - Conversions types', () => {
    it('transform: none - should return value as-is', () => {
      const result = engine.applyMapping(
        { value: 'Hello World' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'none',
          required: true,
        }
      );

      expect(result.result).toBe('Hello World');
    });

    it('transform: string - should convert to string', () => {
      const result = engine.applyMapping(
        { value: 123 },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'string',
          required: true,
        }
      );

      expect(result.result).toBe('123');
    });

    it('transform: number - should convert to number', () => {
      const result = engine.applyMapping(
        { value: '123' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'number',
          required: true,
        }
      );

      expect(result.result).toBe(123);
    });

    it('transform: number - should throw on invalid number', () => {
      expect(() => {
        engine.applyMapping(
          { value: 'abc' },
          {
            id: '1',
            sourceField: 'value',
            targetField: 'result',
            transform: 'number',
            required: true,
          }
        );
      }).toThrow('Cannot convert');
    });

    it('transform: boolean - should convert string to boolean', () => {
      const resultTrue = engine.applyMapping(
        { value: 'true' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'boolean',
          required: true,
        }
      );

      const resultFalse = engine.applyMapping(
        { value: 'false' },
        {
          id: '2',
          sourceField: 'value',
          targetField: 'result',
          transform: 'boolean',
          required: true,
        }
      );

      expect(resultTrue.result).toBe(true);
      expect(resultFalse.result).toBe(false);
    });

    it('transform: date - should parse ISO string to Date', () => {
      const result = engine.applyMapping(
        { value: '2025-01-20T10:30:00Z' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'date',
          required: true,
        }
      );

      expect(result.result).toBeInstanceOf(Date);
      expect(result.result.getTime()).toBe(new Date('2025-01-20T10:30:00Z').getTime());
    });

    it('transform: date - should throw on invalid date', () => {
      expect(() => {
        engine.applyMapping(
          { value: 'invalid-date' },
          {
            id: '1',
            sourceField: 'value',
            targetField: 'result',
            transform: 'date',
            required: true,
          }
        );
      }).toThrow('Cannot parse');
    });

    it('transform: array - should convert to array', () => {
      const result = engine.applyMapping(
        { value: 'hello' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'array',
          required: true,
        }
      );

      expect(result.result).toEqual(['hello']);
    });

    it('transform: json - should parse JSON string', () => {
      const result = engine.applyMapping(
        { value: '{"a": 1, "b": 2}' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'json',
          required: true,
        }
      );

      expect(result.result).toEqual({ a: 1, b: 2 });
    });
  });

  // ========== TRANSFORMATIONS - STRING ==========

  describe('Transformations - String', () => {
    it('transform: uppercase - should convert to uppercase', () => {
      const result = engine.applyMapping(
        { email: 'ceo@company.com' },
        {
          id: '1',
          sourceField: 'email',
          targetField: 'author',
          transform: 'uppercase',
          required: true,
        }
      );

      expect(result.author).toBe('CEO@COMPANY.COM');
    });

    it('transform: lowercase - should convert to lowercase', () => {
      const result = engine.applyMapping(
        { email: 'CEO@COMPANY.COM' },
        {
          id: '1',
          sourceField: 'email',
          targetField: 'author',
          transform: 'lowercase',
          required: true,
        }
      );

      expect(result.author).toBe('ceo@company.com');
    });

    it('transform: trim - should remove leading/trailing spaces', () => {
      const result = engine.applyMapping(
        { value: '  hello  ' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'trim',
          required: true,
        }
      );

      expect(result.result).toBe('hello');
    });

    it('transform: capitalize - should capitalize first letter', () => {
      const result = engine.applyMapping(
        { value: 'hello world' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'capitalize',
          required: true,
        }
      );

      expect(result.result).toBe('Hello world');
    });

    it('transform: slug - should convert to URL-safe slug', () => {
      const result = engine.applyMapping(
        { value: 'Hello World!' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'slug',
          required: true,
        }
      );

      expect(result.result).toBe('hello-world');
    });
  });

  // ========== TRANSFORMATIONS - ARRAY ==========

  describe('Transformations - Array', () => {
    it('transform: split - should split string by separator', () => {
      const result = engine.applyMapping(
        { value: 'a,b,c' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'split',
          transformParams: { separator: ',' },
          required: true,
        }
      );

      expect(result.result).toEqual(['a', 'b', 'c']);
    });

    it('transform: join - should join array with separator', () => {
      const result = engine.applyMapping(
        { value: ['a', 'b', 'c'] },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'join',
          transformParams: { separator: ', ' },
          required: true,
        }
      );

      expect(result.result).toBe('a, b, c');
    });

    it('transform: first - should return first element', () => {
      const result = engine.applyMapping(
        { value: ['a', 'b', 'c'] },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'first',
          required: true,
        }
      );

      expect(result.result).toBe('a');
    });

    it('transform: last - should return last element', () => {
      const result = engine.applyMapping(
        { value: ['a', 'b', 'c'] },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'last',
          required: true,
        }
      );

      expect(result.result).toBe('c');
    });
  });

  // ========== TRANSFORMATIONS - DATE ==========

  describe('Transformations - Date', () => {
    it('transform: date-iso - should convert Date to ISO string', () => {
      const result = engine.applyMapping(
        { value: new Date('2025-01-20T10:30:00Z') },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'date-iso',
          required: true,
        }
      );

      expect(result.result).toBe('2025-01-20T10:30:00.000Z');
    });

    it('transform: date-unix - should convert Date to Unix timestamp', () => {
      const result = engine.applyMapping(
        { value: new Date('2025-01-20T10:30:00Z') },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'date-unix',
          required: true,
        }
      );

      expect(result.result).toBe(new Date('2025-01-20T10:30:00Z').getTime());
    });

    it('transform: date-format - should format Date with pattern', () => {
      const result = engine.applyMapping(
        { value: new Date('2025-01-20T10:30:15Z') },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'date-format',
          transformParams: { format: 'YYYY-MM-DD' },
          required: true,
        }
      );

      expect(result.result).toBe('2025-01-20');
    });
  });

  // ========== TRANSFORMATIONS - AVANCÉES ==========

  describe('Transformations - Avancées', () => {
    it('transform: extract-email - should extract email from text', () => {
      const result = engine.applyMapping(
        { value: 'Contact: john@company.com for info' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'extract-email',
          required: false,
        }
      );

      expect(result.result).toBe('john@company.com');
    });

    it('transform: extract-urls - should extract URLs from text', () => {
      const result = engine.applyMapping(
        { value: 'Visit https://example.com and http://test.com' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'extract-urls',
          required: true,
        }
      );

      expect(result.result).toEqual(['https://example.com', 'http://test.com']);
    });

    it('transform: markdown-to-text - should strip markdown syntax', () => {
      const result = engine.applyMapping(
        { value: '# Title\n\n**bold** text' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'markdown-to-text',
          required: true,
        }
      );

      expect(result.result).toContain('Title');
      expect(result.result).toContain('bold text');
      expect(result.result).not.toContain('**');
    });

    it('transform: html-to-text - should strip HTML tags', () => {
      const result = engine.applyMapping(
        { value: '<p>Hello <strong>World</strong></p>' },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'html-to-text',
          required: true,
        }
      );

      expect(result.result).toBe('Hello World');
    });
  });

  // ========== VALIDATION ==========

  describe('Field Validation', () => {
    it('should validate regex pattern', () => {
      const result = engine.applyMapping(
        { email: 'john@example.com' },
        {
          id: '1',
          sourceField: 'email',
          targetField: 'author',
          transform: 'none',
          required: true,
          validation: {
            pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
          },
        }
      );

      expect(result.author).toBe('john@example.com');
    });

    it('should reject invalid regex pattern', () => {
      expect(() => {
        engine.applyMapping(
          { email: 'invalid-email' },
          {
            id: '1',
            sourceField: 'email',
            targetField: 'author',
            transform: 'none',
            required: true,
            validation: {
              pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
            },
          }
        );
      }).toThrow();
    });

    it('should validate min/max for numbers', () => {
      const result = engine.applyMapping(
        { value: 50 },
        {
          id: '1',
          sourceField: 'value',
          targetField: 'result',
          transform: 'none',
          required: true,
          validation: {
            min: 0,
            max: 100,
          },
        }
      );

      expect(result.result).toBe(50);
    });

    it('should reject number below min', () => {
      expect(() => {
        engine.applyMapping(
          { value: -10 },
          {
            id: '1',
            sourceField: 'value',
            targetField: 'result',
            transform: 'none',
            required: true,
            validation: {
              min: 0,
            },
          }
        );
      }).toThrow('less than minimum');
    });

    it('should validate enum values', () => {
      const result = engine.applyMapping(
        { status: 'active' },
        {
          id: '1',
          sourceField: 'status',
          targetField: 'result',
          transform: 'none',
          required: true,
          validation: {
            enum: ['active', 'paused', 'error'],
          },
        }
      );

      expect(result.result).toBe('active');
    });

    it('should reject value not in enum', () => {
      expect(() => {
        engine.applyMapping(
          { status: 'invalid' },
          {
            id: '1',
            sourceField: 'status',
            targetField: 'result',
            transform: 'none',
            required: true,
            validation: {
              enum: ['active', 'paused', 'error'],
            },
          }
        );
      }).toThrow('not in allowed values');
    });
  });

  // ========== REQUIRED / DEFAULT VALUE ==========

  describe('Required & Default Value', () => {
    it('should use defaultValue if field missing', () => {
      const result = engine.applyMapping(
        { otherField: 'value' },
        {
          id: '1',
          sourceField: 'missingField',
          targetField: 'result',
          transform: 'none',
          required: false,
          defaultValue: 'default-value',
        }
      );

      expect(result.result).toBe('default-value');
    });

    it('should throw if required field missing and no default', () => {
      expect(() => {
        engine.applyMapping(
          { otherField: 'value' },
          {
            id: '1',
            sourceField: 'missingField',
            targetField: 'result',
            transform: 'none',
            required: true,
          }
        );
      }).toThrow('Required field "missingField" is missing');
    });

    it('should return empty object if optional field missing', () => {
      const result = engine.applyMapping(
        { otherField: 'value' },
        {
          id: '1',
          sourceField: 'missingField',
          targetField: 'result',
          transform: 'none',
          required: false,
        }
      );

      expect(result).toEqual({});
    });
  });

  // ========== NESTED VALUES ==========

  describe('Nested Values', () => {
    it('should extract nested value with dot notation', () => {
      const result = engine.applyMapping(
        { from: { emailAddress: { address: 'ceo@company.com' } } },
        {
          id: '1',
          sourceField: 'from.emailAddress.address',
          targetField: 'author',
          transform: 'lowercase',
          required: true,
        }
      );

      expect(result.author).toBe('ceo@company.com');
    });

    it('should set nested value with dot notation', () => {
      const result = engine.applyMapping(
        { email: 'john@example.com' },
        {
          id: '1',
          sourceField: 'email',
          targetField: 'metadata.author',
          transform: 'none',
          required: true,
        }
      );

      expect(result.metadata.author).toBe('john@example.com');
    });
  });

  // ========== MULTIPLE MAPPINGS ==========

  describe('applyMappings - Multiple mappings', () => {
    it('should apply multiple mappings and merge results', () => {
      const data = {
        from: { emailAddress: { address: 'CEO@COMPANY.COM' } },
        subject: 'Q1 Budget',
        receivedDateTime: '2025-01-20T10:30:00Z',
      };

      const mappings: FieldMapping[] = [
        {
          id: '1',
          sourceField: 'from.emailAddress.address',
          targetField: 'metadata.author',
          transform: 'lowercase',
          required: true,
        },
        {
          id: '2',
          sourceField: 'subject',
          targetField: 'title',
          transform: 'none',
          required: true,
        },
        {
          id: '3',
          sourceField: 'receivedDateTime',
          targetField: 'timestamp',
          transform: 'date',
          required: true,
        },
      ];

      const result = engine.applyMappings(data, mappings);

      expect(result.metadata.author).toBe('ceo@company.com');
      expect(result.title).toBe('Q1 Budget');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw if any mapping fails', () => {
      const data = { field1: 'value1' };

      const mappings: FieldMapping[] = [
        {
          id: '1',
          sourceField: 'field1',
          targetField: 'result1',
          transform: 'none',
          required: true,
        },
        {
          id: '2',
          sourceField: 'missingField',
          targetField: 'result2',
          transform: 'none',
          required: true, // ← This will fail
        },
      ];

      expect(() => {
        engine.applyMappings(data, mappings);
      }).toThrow();
    });
  });

  // ========== ERROR HANDLING ==========

  describe('Error Handling', () => {
    it('should throw FieldMappingError with details', () => {
      try {
        engine.applyMapping(
          { value: 'abc' },
          {
            id: 'test-mapping',
            sourceField: 'value',
            targetField: 'result',
            transform: 'number',
            required: true,
          }
        );
        expect.fail('Should have thrown FieldMappingError');
      } catch (error) {
        expect(error).toBeInstanceOf(FieldMappingError);
        if (error instanceof FieldMappingError) {
          expect(error.mappingId).toBe('test-mapping');
          expect(error.sourceField).toBe('value');
          expect(error.targetField).toBe('result');
        }
      }
    });
  });
});
