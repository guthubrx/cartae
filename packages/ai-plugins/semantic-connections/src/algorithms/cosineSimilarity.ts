/**
 * Algorithme de similarité cosinus sur TF-IDF
 *
 * Cet algorithme calcule la similarité entre deux items en :
 * 1. Convertissant leur contenu en vecteurs TF-IDF
 * 2. Calculant la similarité cosinus entre ces vecteurs
 *
 * Avantages :
 * - Robuste aux différences de longueur de texte
 * - Pénalise les mots communs (TF-IDF)
 * - Performant pour comparer du contenu textuel
 */

import type { CartaeItem } from '@cartae/core';
import type { SimilarityAlgorithmImplementation } from '../types/index.js';
import {
  tokenize,
  calculateTFIDF,
  calculateIDF,
  cosineSimilarity as computeCosineSimilarity,
} from '../utils/textProcessing.js';

/**
 * Extrait le texte complet d'un CartaeItem pour analyse
 */
function extractText(item: CartaeItem, fields: string[] = ['title', 'content', 'tags']): string {
  const parts: string[] = [];

  if (fields.includes('title') && item.title) {
    parts.push(item.title);
  }

  if (fields.includes('content') && item.content) {
    parts.push(item.content);
  }

  if (fields.includes('tags') && item.tags && item.tags.length > 0) {
    // Ajouter les tags plusieurs fois pour augmenter leur poids
    const tagsText = item.tags.join(' ');
    parts.push(tagsText, tagsText, tagsText);
  }

  return parts.join(' ');
}

/**
 * Implémentation de l'algorithme Cosine Similarity
 */
export class CosineSimilarityAlgorithm implements SimilarityAlgorithmImplementation {
  name = 'cosine' as const;

  /**
   * Cache pour les vecteurs TF-IDF calculés
   * Évite de recalculer les vecteurs pour le même item
   */
  private vectorCache = new Map<string, Map<string, number>>();

  /**
   * Cache pour l'IDF du corpus
   */
  private idfCache: Map<string, number> | null = null;

  /**
   * Corpus tokenizé pour calcul IDF
   */
  private corpus: string[][] = [];

  /**
   * Construit le corpus et calcule l'IDF
   * À appeler avant les calculs de similarité si on a tous les items
   */
  buildCorpus(items: CartaeItem[], fields?: string[]): void {
    this.corpus = items.map((item) => {
      const text = extractText(item, fields);
      return tokenize(text);
    });

    this.idfCache = calculateIDF(this.corpus);
    this.vectorCache.clear(); // Invalider le cache des vecteurs
  }

  /**
   * Obtient le vecteur TF-IDF pour un item (avec cache)
   */
  private getVector(item: CartaeItem, fields?: string[]): Map<string, number> {
    const cacheKey = item.id;

    if (this.vectorCache.has(cacheKey)) {
      return this.vectorCache.get(cacheKey)!;
    }

    const text = extractText(item, fields);
    const tokens = tokenize(text);

    // Si pas d'IDF pré-calculé, calculer avec mini-corpus
    const idf = this.idfCache || calculateIDF([tokens]);

    const vector = calculateTFIDF(tokens, idf);
    this.vectorCache.set(cacheKey, vector);

    return vector;
  }

  /**
   * Calcule la similarité cosinus entre deux items
   * @returns Score entre 0 (aucune similarité) et 1 (identique)
   */
  compute(item1: CartaeItem, item2: CartaeItem, fields?: string[]): number {
    const vector1 = this.getVector(item1, fields);
    const vector2 = this.getVector(item2, fields);

    return computeCosineSimilarity(vector1, vector2);
  }

  /**
   * Explique pourquoi deux items sont similaires
   */
  explain(item1: CartaeItem, item2: CartaeItem, score: number, fields?: string[]): string[] {
    const reasons: string[] = [];

    // Analyser les termes communs avec poids élevé
    const vector1 = this.getVector(item1, fields);
    const vector2 = this.getVector(item2, fields);

    // Trouver les termes communs avec poids TF-IDF significatif
    const commonTerms: Array<{ term: string; weight1: number; weight2: number }> = [];

    for (const [term, weight1] of vector1.entries()) {
      const weight2 = vector2.get(term);
      if (weight2 !== undefined && weight2 > 0) {
        commonTerms.push({ term, weight1, weight2 });
      }
    }

    // Trier par produit des poids (contribution à la similarité)
    commonTerms.sort((a, b) => (b.weight1 * b.weight2) - (a.weight1 * a.weight2));

    // Top 5 termes les plus contributifs
    const topTerms = commonTerms.slice(0, 5);

    if (topTerms.length > 0) {
      const termsList = topTerms.map((t) => `"${t.term}"`).join(', ');
      reasons.push(`Termes significatifs communs: ${termsList}`);
    }

    // Analyser les tags communs
    const tags1 = new Set(item1.tags || []);
    const tags2 = new Set(item2.tags || []);
    const commonTags = [...tags1].filter((tag) => tags2.has(tag));

    if (commonTags.length > 0) {
      reasons.push(`${commonTags.length} tag(s) commun(s): ${commonTags.slice(0, 3).join(', ')}`);
    }

    // Score global
    const scorePercent = Math.round(score * 100);
    reasons.push(`Score de similarité TF-IDF: ${scorePercent}%`);

    return reasons;
  }

  /**
   * Réinitialise les caches
   */
  clearCache(): void {
    this.vectorCache.clear();
    this.idfCache = null;
    this.corpus = [];
  }
}

/**
 * Instance singleton de l'algorithme
 */
export const cosineSimilarityAlgorithm = new CosineSimilarityAlgorithm();
