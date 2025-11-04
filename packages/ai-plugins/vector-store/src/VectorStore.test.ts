/**
 * Tests unitaires pour Vector Store avec MockProvider
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VectorStore } from './VectorStore';
import { Vector } from './types';

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore({
      provider: 'mock',
      dimension: 3,
    });
  });

  describe('addVector', () => {
    it('ajoute un vecteur avec succès', async () => {
      const vector: Vector = {
        id: 'vec1',
        values: [1, 0, 0],
        metadata: { name: 'Vector 1' },
      };

      await store.addVector(vector);
      const count = await store.count();
      expect(count).toBe(1);
    });

    it('lance une erreur si dimension incorrecte', async () => {
      const vector: Vector = {
        id: 'vec1',
        values: [1, 0], // Dimension 2 au lieu de 3
        metadata: {},
      };

      await expect(store.addVector(vector)).rejects.toThrow();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Ajouter des vecteurs de test
      await store.addVector({
        id: 'vec1',
        values: [1, 0, 0], // Pointant vers X
        metadata: { label: 'X-axis' },
      });

      await store.addVector({
        id: 'vec2',
        values: [0, 1, 0], // Pointant vers Y
        metadata: { label: 'Y-axis' },
      });

      await store.addVector({
        id: 'vec3',
        values: [0.7, 0.7, 0], // Entre X et Y
        metadata: { label: 'XY-diagonal' },
      });
    });

    it('trouve le vecteur identique en premier', async () => {
      const results = await store.search([1, 0, 0], 3);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('vec1');
      expect(results[0].score).toBeCloseTo(1, 4);
    });

    it('ordonne par similarité', async () => {
      // Requête entre X et Y
      const results = await store.search([0.7, 0.7, 0], 3);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('vec3'); // Identique = meilleur score
      // vec1 et vec2 devraient avoir des scores similaires et inférieurs
      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[1].score).toBeCloseTo(results[2].score, 1);
    });

    it('respecte la limite de résultats', async () => {
      const results = await store.search([1, 0, 0], 2);
      expect(results).toHaveLength(2);
    });

    it('retourne vecteurs triés par score décroissant', async () => {
      const results = await store.search([1, 0, 0], 3);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('exists', () => {
    it('retourne true si vecteur existe', async () => {
      await store.addVector({
        id: 'test-vec',
        values: [1, 0, 0],
      });

      const exists = await store.exists('test-vec');
      expect(exists).toBe(true);
    });

    it('retourne false si vecteur n\'existe pas', async () => {
      const exists = await store.exists('unknown-vec');
      expect(exists).toBe(false);
    });
  });

  describe('deleteVector', () => {
    beforeEach(async () => {
      await store.addVector({
        id: 'to-delete',
        values: [1, 0, 0],
      });
    });

    it('supprime un vecteur', async () => {
      await store.deleteVector('to-delete');
      const exists = await store.exists('to-delete');
      expect(exists).toBe(false);
    });

    it('réduit le compte', async () => {
      const countBefore = await store.count();
      await store.deleteVector('to-delete');
      const countAfter = await store.count();

      expect(countAfter).toBe(countBefore - 1);
    });
  });

  describe('addVectors (batch)', () => {
    it('ajoute plusieurs vecteurs', async () => {
      const vectors: Vector[] = [
        { id: 'v1', values: [1, 0, 0] },
        { id: 'v2', values: [0, 1, 0] },
        { id: 'v3', values: [0, 0, 1] },
      ];

      const result = await store.addVectors(vectors);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(await store.count()).toBe(3);
    });

    it('rapporte les erreurs partielles', async () => {
      const vectors: Vector[] = [
        { id: 'v1', values: [1, 0, 0] }, // OK
        { id: 'v2', values: [1, 0] }, // Dimension incorrecte
        { id: 'v3', values: [0, 0, 1] }, // OK
      ];

      const result = await store.addVectors(vectors);

      expect(result.success).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('vide le store complètement', async () => {
      await store.addVectors([
        { id: 'v1', values: [1, 0, 0] },
        { id: 'v2', values: [0, 1, 0] },
      ]);

      await store.clear();

      expect(await store.count()).toBe(0);
    });
  });

  describe('getDimension', () => {
    it('retourne la dimension configurée', () => {
      expect(store.getDimension()).toBe(3);
    });
  });
});
