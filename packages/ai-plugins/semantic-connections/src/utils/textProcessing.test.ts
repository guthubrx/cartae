/**
 * Tests pour les utilitaires de traitement de texte
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  tokenize,
  extractHashtags,
  extractMentions,
  calculateTermFrequency,
  calculateIDF,
  cosineSimilarity,
  jaccardSimilarity,
} from './textProcessing.js';

describe('textProcessing utils', () => {
  describe('normalizeText', () => {
    it('devrait convertir en minuscules', () => {
      expect(normalizeText('Hello WORLD')).toBe('hello world');
    });

    it('devrait supprimer la ponctuation', () => {
      expect(normalizeText('Hello, world!')).toBe('hello world');
    });

    it('devrait garder les hashtags et mentions', () => {
      expect(normalizeText('#urgent @cedric')).toBe('#urgent @cedric');
    });

    it('devrait normaliser les espaces', () => {
      expect(normalizeText('hello   world')).toBe('hello world');
    });
  });

  describe('tokenize', () => {
    it('devrait tokenizer un texte simple', () => {
      const tokens = tokenize('ceci est un test', false);
      expect(tokens).toEqual(['ceci', 'est', 'test']);
    });

    it('devrait filtrer les stop words', () => {
      const tokens = tokenize('ceci est un test');
      expect(tokens).toEqual(['ceci', 'test']);
      expect(tokens).not.toContain('est');
      expect(tokens).not.toContain('un');
    });

    it('devrait filtrer les mots trop courts', () => {
      const tokens = tokenize('je ai vu cela', false);
      expect(tokens).not.toContain('je');
      expect(tokens).not.toContain('ai');
      expect(tokens).toContain('cela');
    });
  });

  describe('extractHashtags', () => {
    it('devrait extraire les hashtags', () => {
      const tags = extractHashtags('Ceci est #urgent et #important');
      expect(tags).toEqual(['urgent', 'important']);
    });

    it('devrait convertir en minuscules', () => {
      const tags = extractHashtags('#URGENT #Important');
      expect(tags).toEqual(['urgent', 'important']);
    });

    it('devrait retourner tableau vide si pas de tags', () => {
      const tags = extractHashtags('Pas de tags ici');
      expect(tags).toEqual([]);
    });
  });

  describe('extractMentions', () => {
    it('devrait extraire les mentions', () => {
      const mentions = extractMentions('cc @cedric @marie');
      expect(mentions).toEqual(['cedric', 'marie']);
    });

    it('devrait convertir en minuscules', () => {
      const mentions = extractMentions('@CEDRIC @Marie');
      expect(mentions).toEqual(['cedric', 'marie']);
    });
  });

  describe('calculateTermFrequency', () => {
    it('devrait calculer la fréquence normalisée', () => {
      const tokens = ['test', 'test', 'autre', 'mot'];
      const tf = calculateTermFrequency(tokens);

      expect(tf.get('test')).toBe(0.5); // 2/4
      expect(tf.get('autre')).toBe(0.25); // 1/4
      expect(tf.get('mot')).toBe(0.25); // 1/4
    });
  });

  describe('calculateIDF', () => {
    it('devrait calculer IDF correct', () => {
      const corpus = [
        ['test', 'mot'],
        ['test', 'autre'],
        ['mot', 'autre'],
      ];

      const idf = calculateIDF(corpus);

      // 'test' apparaît dans 2/3 docs: log(3/2) ≈ 0.405
      expect(idf.get('test')).toBeCloseTo(Math.log(3 / 2), 2);

      // 'mot' apparaît dans 2/3 docs: log(3/2) ≈ 0.405
      expect(idf.get('mot')).toBeCloseTo(Math.log(3 / 2), 2);

      // 'autre' apparaît dans 2/3 docs: log(3/2) ≈ 0.405
      expect(idf.get('autre')).toBeCloseTo(Math.log(3 / 2), 2);
    });
  });

  describe('cosineSimilarity', () => {
    it('devrait retourner 1 pour vecteurs identiques', () => {
      const vector = new Map([
        ['a', 0.5],
        ['b', 0.5],
      ]);

      const sim = cosineSimilarity(vector, vector);
      expect(sim).toBeCloseTo(1.0, 5);
    });

    it('devrait retourner 0 pour vecteurs orthogonaux', () => {
      const vector1 = new Map([['a', 1]]);
      const vector2 = new Map([['b', 1]]);

      const sim = cosineSimilarity(vector1, vector2);
      expect(sim).toBe(0);
    });

    it('devrait calculer similarité partielle', () => {
      const vector1 = new Map([
        ['a', 1],
        ['b', 1],
      ]);
      const vector2 = new Map([
        ['a', 1],
        ['c', 1],
      ]);

      const sim = cosineSimilarity(vector1, vector2);
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });
  });

  describe('jaccardSimilarity', () => {
    it('devrait retourner 1 pour ensembles identiques', () => {
      const set1 = new Set(['a', 'b', 'c']);
      const set2 = new Set(['a', 'b', 'c']);

      const sim = jaccardSimilarity(set1, set2);
      expect(sim).toBe(1.0);
    });

    it('devrait retourner 0 pour ensembles disjoints', () => {
      const set1 = new Set(['a', 'b']);
      const set2 = new Set(['c', 'd']);

      const sim = jaccardSimilarity(set1, set2);
      expect(sim).toBe(0);
    });

    it('devrait calculer Jaccard correct', () => {
      const set1 = new Set(['a', 'b', 'c']);
      const set2 = new Set(['b', 'c', 'd']);

      // Intersection: {b, c} = 2 éléments
      // Union: {a, b, c, d} = 4 éléments
      // Jaccard = 2/4 = 0.5

      const sim = jaccardSimilarity(set1, set2);
      expect(sim).toBe(0.5);
    });
  });
});
