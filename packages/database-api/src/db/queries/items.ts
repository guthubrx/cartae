/**
 * SQL Queries - CartaeItems
 *
 * Requêtes SQL préparées pour manipulation des CartaeItems
 * avec protection SQL injection via parameterized queries ($1, $2, ...)
 *
 * @module db/queries/items
 */

import type { CartaeItem } from '@cartae/core';
import { pool, executeQuery } from '../client';

/**
 * Interface pour le résultat DB (mapping PostgreSQL -> TypeScript)
 *
 * Les champs PostgreSQL utilisent snake_case, conversion nécessaire
 */
interface CartaeItemRow {
  id: string;
  type: string;
  title: string;
  content: string | null;
  context: any;
  json_type: any;
  metadata: any;
  relationships: any[];
  tags: string[];
  categories: string[];
  source: any;
  created_at: Date;
  updated_at: Date;
  archived: boolean;
  favorite: boolean;
  embedding: number[] | null;
  embedding_model: string | null;
  embedding_updated_at: Date | null;
}

/**
 * Convertit une row PostgreSQL en CartaeItem TypeScript
 *
 * Transforme snake_case -> camelCase et ajuste les types
 */
function rowToCartaeItem(row: CartaeItemRow): CartaeItem {
  return {
    id: row.id,
    type: row.type as any,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: row.archived || false,
    favorite: row.favorite || false,
  };
}

/**
 * INSERT - Crée un nouveau CartaeItem dans la DB
 *
 * @param item - CartaeItem à insérer
 * @param userId - UUID de l'utilisateur propriétaire (tenant isolation)
 * @returns CartaeItem créé avec timestamps DB
 */
export async function insertItem(
  item: Partial<CartaeItem>,
  userId?: string
): Promise<CartaeItem> {
  const query = `
    INSERT INTO cartae_items (
      id, type, title, content, context, json_type,
      metadata, relationships, tags, categories, source,
      archived, favorite, user_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING *
  `;

  const params = [
    item.id,
    item.type,
    item.title,
    item.content || null,
    item['@context'] ? JSON.stringify(item['@context']) : null,
    item['@type'] ? JSON.stringify(item['@type']) : null,
    JSON.stringify(item.metadata),
    JSON.stringify(item.relationships || []),
    item.tags || [],
    item.categories || [],
    JSON.stringify(item.source),
    item.archived || false,
    item.favorite || false,
    userId || null, // Tenant isolation (required en production)
  ];

  const rows = await executeQuery<CartaeItemRow>(query, params);
  return rowToCartaeItem(rows[0]);
}

/**
 * SELECT - Récupère un item par ID
 *
 * @param id - UUID de l'item
 * @returns CartaeItem ou null si introuvable
 */
export async function getItemById(id: string): Promise<CartaeItem | null> {
  const query = 'SELECT * FROM cartae_items WHERE id = $1';
  const rows = await executeQuery<CartaeItemRow>(query, [id]);

  return rows.length > 0 ? rowToCartaeItem(rows[0]) : null;
}

/**
 * SELECT - Liste les items avec filtres et pagination
 *
 * @param options - Filtres et pagination
 * @returns Array de CartaeItems
 */
export async function listItems(options: {
  type?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
}): Promise<CartaeItem[]> {
  const params: any[] = [];
  let query = 'SELECT * FROM cartae_items WHERE 1=1';

  // Filtre par type
  if (options.type) {
    params.push(options.type);
    query += ` AND type = $${params.length}`;
  }

  // Filtre archived
  if (options.archived !== undefined) {
    params.push(options.archived);
    query += ` AND archived = $${params.length}`;
  }

  // Tri par date décroissante
  query += ' ORDER BY created_at DESC';

  // Pagination
  if (options.limit) {
    params.push(options.limit);
    query += ` LIMIT $${params.length}`;
  }

  if (options.offset) {
    params.push(options.offset);
    query += ` OFFSET $${params.length}`;
  }

  const rows = await executeQuery<CartaeItemRow>(query, params);
  return rows.map(rowToCartaeItem);
}

/**
 * UPDATE - Met à jour l'embedding vectoriel d'un item
 *
 * @param id - UUID de l'item
 * @param embedding - Vecteur (ex: array de 1536 floats pour OpenAI)
 * @param model - Nom du modèle d'embedding utilisé
 */
export async function updateEmbedding(
  id: string,
  embedding: number[],
  model: string
): Promise<void> {
  const query = `
    UPDATE cartae_items
    SET embedding = $1, embedding_model = $2, embedding_updated_at = NOW()
    WHERE id = $3
  `;

  // Conversion array -> string pgvector format: '[0.1, 0.2, ...]'
  const vectorString = `[${embedding.join(',')}]`;

  await executeQuery(query, [vectorString, model, id]);
}

/**
 * DELETE - Supprime un item (hard delete)
 *
 * En production, préférer soft delete (UPDATE archived = true)
 *
 * @param id - UUID de l'item
 * @returns true si supprimé, false si introuvable
 */
export async function deleteItem(id: string): Promise<boolean> {
  const query = 'DELETE FROM cartae_items WHERE id = $1';
  const client = await pool.connect();

  try {
    const result = await client.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  } finally {
    client.release();
  }
}

/**
 * COUNT - Compte le nombre total d'items
 *
 * @returns Nombre d'items dans la DB
 */
export async function countItems(): Promise<number> {
  const query = 'SELECT COUNT(*) as count FROM cartae_items';
  const rows = await executeQuery<{ count: string }>(query);
  return parseInt(rows[0].count, 10);
}
