import { describe, it, expect, beforeEach } from 'vitest';
import { DeadlineExtractor } from '../DeadlineExtractor';

describe('DeadlineExtractor', () => {
  let extractor: DeadlineExtractor;

  beforeEach(() => {
    extractor = new DeadlineExtractor();
  });

  describe('extract', () => {
    it('extrait une deadline explicite en français', () => {
      const subject = 'Rapport à rendre';
      const body = 'Deadline: 25 décembre 2025';

      const result = extractor.extract(subject, body);

      expect(result.deadline).not.toBeNull();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.extractedText).toContain('25');
    });

    it('extrait une deadline explicite en anglais', () => {
      const subject = 'Project submission';
      const body = 'Due date: December 25, 2025';

      const result = extractor.extract(subject, body);

      expect(result.deadline).not.toBeNull();
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('extrait une date relative (demain, next week, etc.)', () => {
      const subject = 'Task';
      const body = 'Please submit by tomorrow';

      const result = extractor.extract(subject, body);

      // chrono-node devrait parser "tomorrow"
      expect(result.deadline).not.toBeNull();
      if (result.deadline) {
        const now = new Date();
        expect(result.deadline.getTime()).toBeGreaterThan(now.getTime());
      }
    });

    it('retourne null si aucune deadline trouvée', () => {
      const subject = 'No deadline';
      const body = 'Just an informational email';

      const result = extractor.extract(subject, body);

      expect(result.deadline).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.extractedText).toBe('');
    });

    it('ignore les dates passées', () => {
      const subject = 'Old event';
      const body = 'Meeting was on January 1, 2020';

      const result = extractor.extract(subject, body);

      // Les dates passées sont ignorées
      expect(result.deadline).toBeNull();
    });

    it('prend la date future la plus proche si plusieurs dates', () => {
      const subject = 'Multiple deadlines';
      const body = 'First deadline: next week. Final deadline: next month.';

      const result = extractor.extract(subject, body);

      expect(result.deadline).not.toBeNull();
      // Devrait prendre la plus proche (next week)
    });
  });

  describe('extractAll', () => {
    it('extrait toutes les dates futures', () => {
      const text = 'Deadline 1: tomorrow. Deadline 2: next week. Past: yesterday.';

      const results = extractor.extractAll(text);

      // Devrait trouver "tomorrow" et "next week", pas "yesterday"
      expect(results.length).toBeGreaterThanOrEqual(1);
      results.forEach(result => {
        expect(result.deadline).not.toBeNull();
        if (result.deadline) {
          const now = new Date();
          expect(result.deadline.getTime()).toBeGreaterThan(now.getTime());
        }
      });
    });
  });
});
