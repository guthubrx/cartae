/**
 * SQL Queries - Recherche (full-text + vectorielle + hybride)
 *
 * Implémente les 3 types de recherche:
 * 1. Full-text: Recherche textuelle PostgreSQL (title + content)
 * 2. Semantic: Recherche vectorielle pgvector (embeddings similarité cosinus)
 * 3. Hybrid: Combinaison des deux avec pondération ajustable
 *
 * @module db/queries/search
 */

import { executeQuery } from '../client';
import type { CartaeItem } from '@cartae/core';

/**
 * Interface résultat de recherche avec scores
 */
export interface SearchResult {
  item: CartaeItem;
  score: number; // 0-1 (plus élevé = plus pertinent)
  textScore?: number; // Score full-text seul
  vectorScore?: number; // Score vectoriel seul
}

/**
 * FULL-TEXT SEARCH - Recherche textuelle PostgreSQL
 *
 * Utilise les index GIN sur title_tsv et content_tsv (créés par trigger auto)
 * Algorithme: ts_rank (Term Frequency/Inverse Document Frequency)
 *
 * @param queryText - Texte de recherche (ex: "réunion client budget")
 * @param limit - Nombre max de résultats
 * @returns Array de SearchResult triés par pertinence décroissante
 *
 * @example
 * const results = await fullTextSearch("urgent task deadline", 10);
 */
export async function fullTextSearch(
  queryText: string,
  limit: number = 20
): Promise<SearchResult[]> {
  const query = `
    SELECT
      *,
      (
        ts_rank(title_tsv, plainto_tsquery('english', $1)) +
        ts_rank(content_tsv, plainto_tsquery('english', $1))
      ) AS rank
    FROM cartae_items
    WHERE
      title_tsv @@ plainto_tsquery('english', $1) OR
      content_tsv @@ plainto_tsquery('english', $1)
    ORDER BY rank DESC
    LIMIT $2
  `;

  const rows = await executeQuery<any>(query, [queryText, limit]);

  return rows.map(row => ({
    item: mapRowToCartaeItem(row),
    score: parseFloat(row.rank),
    textScore: parseFloat(row.rank),
  }));
}

/**
 * SEMANTIC SEARCH - Recherche vectorielle pgvector
 *
 * Utilise l'index HNSW sur embedding (dimension 1536 pour OpenAI)
 * Algorithme: Cosine similarity (distance cosinus entre vecteurs)
 *
 * @param queryEmbedding - Vecteur de la requête (ex: embedding de "réunion budget")
 * @param limit - Nombre max de résultats
 * @param minSimilarity - Seuil de similarité minimum (0-1, défaut 0.7)
 * @returns Array de SearchResult triés par similarité décroissante
 *
 * @example
 * const embedding = await openai.embeddings.create({ input: "urgent task" });
 * const results = await semanticSearch(embedding.data[0].embedding, 10);
 */
export async function semanticSearch(
  queryEmbedding: number[],
  limit: number = 20,
  minSimilarity: number = 0.7
): Promise<SearchResult[]> {
  // Conversion array -> string pgvector format
  const vectorString = `[${queryEmbedding.join(',')}]`;

  const query = `
    SELECT
      *,
      1 - (embedding <=> $1::vector) AS similarity
    FROM cartae_items
    WHERE
      embedding IS NOT NULL
      AND (1 - (embedding <=> $1::vector)) >= $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `;

  const rows = await executeQuery<any>(query, [vectorString, minSimilarity, limit]);

  return rows.map(row => ({
    item: mapRowToCartaeItem(row),
    score: parseFloat(row.similarity),
    vectorScore: parseFloat(row.similarity),
  }));
}

/**
 * HYBRID SEARCH - Recherche combinée (full-text + vectorielle)
 *
 * Combine les résultats de recherche textuelle et sémantique
 * avec pondération ajustable. Utilise la fonction SQL hybrid_search()
 * créée dans 02-schema.sql
 *
 * @param queryText - Texte de recherche
 * @param queryEmbedding - Vecteur de la requête
 * @param textWeight - Poids recherche textuelle (0-1, défaut 0.5)
 * @param vectorWeight - Poids recherche vectorielle (0-1, défaut 0.5)
 * @param limit - Nombre max de résultats
 * @returns Array de SearchResult triés par score combiné
 *
 * @example
 * // 70% vectoriel, 30% textuel (privilégie sens sémantique)
 * const results = await hybridSearch(
 *   "urgent task",
 *   embedding,
 *   0.3, // text weight
 *   0.7, // vector weight
 *   20
 * );
 */
export async function hybridSearch(
  queryText: string,
  queryEmbedding: number[],
  textWeight: number = 0.5,
  vectorWeight: number = 0.5,
  limit: number = 20
): Promise<SearchResult[]> {
  const vectorString = `[${queryEmbedding.join(',')}]`;

  const query = `
    SELECT * FROM hybrid_search(
      $1::text,
      $2::vector,
      $3::float,
      $4::float,
      $5::int
    )
  `;

  const rows = await executeQuery<any>(query, [
    queryText,
    vectorString,
    textWeight,
    vectorWeight,
    limit,
  ]);

  // Récupère les items complets depuis les IDs
  if (rows.length === 0) {
    return [];
  }

  const itemIds = rows.map(r => r.item_id);
  const itemsQuery = `
    SELECT * FROM cartae_items
    WHERE id = ANY($1::uuid[])
  `;

  const items = await executeQuery<any>(itemsQuery, [itemIds]);

  // Merge items avec scores
  return rows.map(row => {
    const item = items.find(i => i.id === row.item_id);
    return {
      item: mapRowToCartaeItem(item),
      score: parseFloat(row.combined_score),
      textScore: parseFloat(row.text_score),
      vectorScore: parseFloat(row.vector_score),
    };
  });
}

/**
 * SEARCH BY TAGS - Recherche par tags (AND ou OR)
 *
 * Utilise l'index GIN sur tags pour performance optimale
 *
 * @param tags - Array de tags à chercher
 * @param matchAll - Si true, tous les tags requis (AND), sinon au moins un (OR)
 * @param limit - Nombre max de résultats
 * @returns Array de SearchResult
 */
export async function searchByTags(
  tags: string[],
  matchAll: boolean = false,
  limit: number = 100
): Promise<SearchResult[]> {
  const operator = matchAll ? '@>' : '&&'; // @> = contains all, && = overlaps

  const query = `
    SELECT * FROM cartae_items
    WHERE tags ${operator} $1::text[]
    ORDER BY created_at DESC
    LIMIT $2
  `;

  const rows = await executeQuery<any>(query, [tags, limit]);

  return rows.map(row => ({
    item: mapRowToCartaeItem(row),
    score: 1.0, // Pas de score pertinence pour recherche exacte par tags
  }));
}

/**
 * Helper - Convertit row DB en CartaeItem
 *
 * @param row - Row PostgreSQL
 * @returns CartaeItem TypeScript
 */
function mapRowToCartaeItem(row: any): CartaeItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content || undefined,
    '@context': row.context,
    '@type': row.json_type,
    metadata: row.metadata,
    relationships: row.relationships || [],
    tags: row.tags,
    categories: row.categories || [],
    source: {
      ...row.source,
      lastSync: new Date(row.source.lastSync),
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    archived: row.archived || false,
    favorite: row.favorite || false,
  };
}
