/**
 * VectorStore Interface - Contrat abstrait pour stockage vectoriel
 *
 * Implémentations possibles :
 * - Qdrant (open-source, self-hosted)
 * - Pinecone (cloud, managed)
 * - Milvus (open-source, scalable)
 * - ChromaDB (embedded, simple)
 * - Weaviate (open-source, GraphQL)
 *
 * Ce package définit uniquement les interfaces abstraites.
 * Les implémentations concrètes sont dans des packages séparés
 * (ex: @cartae/qdrant-store, @cartae/pinecone-store)
 */

/**
 * Metadata attachée à chaque item Cartae dans le vector store
 * Permet de filtrer et enrichir les résultats de recherche
 */
export interface CartaeItemMetadata {
  /** ID unique de l'item dans Cartae */
  id: string;

  /** Titre de l'item (email subject, note title, etc.) */
  title: string;

  /** Type d'item (email, note, task, event, message, etc.) */
  type: 'email' | 'note' | 'task' | 'event' | 'message' | string;

  /** Tags associés à l'item */
  tags?: string[];

  /** ID de la source originale (ex: Gmail message ID, Notion page ID) */
  sourceId?: string;

  /** Timestamp de dernière mise à jour */
  updatedAt: number;

  /** Champs additionnels (flexibilité) */
  [key: string]: any;
}

/**
 * Condition de filtrage pour les recherches vectorielles
 * Permet de combiner similarity search + filtres classiques
 *
 * Exemple :
 * - Trouver items similaires ET de type "email" ET avec tag "urgent"
 */
export interface FilterCondition {
  /** Champ à filtrer (ex: "type", "tags", "updatedAt") */
  field: string;

  /** Opérateur de comparaison */
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';

  /** Valeur de comparaison */
  value: any;
}

/**
 * Résultat d'une recherche vectorielle
 * Contient l'item + son score de similarité
 */
export interface SearchResult {
  /** ID de l'item trouvé */
  id: string;

  /** Score de similarité (0-1, cosine similarity) */
  similarity: number;

  /** Metadata complète de l'item */
  metadata: CartaeItemMetadata;
}

/**
 * Statistiques du vector store
 * Utile pour monitoring et debugging
 */
export interface VectorStoreStats {
  /** Nombre total de points indexés */
  totalPoints: number;

  /** Nom de la collection */
  collectionName: string;

  /** Dimension des vecteurs */
  vectorDimension: number;

  /** Timestamp de dernière indexation */
  indexedAt: number;
}

/**
 * Options pour la recherche vectorielle
 */
export interface SearchOptions {
  /** Nombre de résultats à retourner */
  topK: number;

  /** Filtres à appliquer (AND logique) */
  filter?: FilterCondition[];

  /** Score minimum de similarité (0-1) */
  minSimilarity?: number;
}

/**
 * Interface abstraite VectorStore
 * Toutes les implémentations doivent respecter ce contrat
 *
 * Pattern : Repository pattern + Adapter pattern
 * - Repository : abstraction du stockage
 * - Adapter : permet de changer d'implémentation sans toucher le code métier
 */
export interface VectorStore {
  /**
   * Ajoute un item avec son embedding + metadata
   * Si l'ID existe déjà, écrase l'item (upsert)
   *
   * @param id - ID unique de l'item
   * @param vector - Vecteur d'embedding (ex: 1536 dimensions)
   * @param metadata - Metadata de l'item
   */
  add(id: string, vector: number[], metadata: CartaeItemMetadata): Promise<void>;

  /**
   * Ajoute plusieurs items en batch (plus efficace)
   *
   * @param items - Liste d'items à ajouter
   */
  addBatch(
    items: Array<{
      id: string;
      vector: number[];
      metadata: CartaeItemMetadata;
    }>
  ): Promise<void>;

  /**
   * Recherche les items les plus similaires à une query
   *
   * @param query - Soit un texte (sera embedé automatiquement) soit un vecteur
   * @param options - Options de recherche (topK, filtres, etc.)
   * @returns Liste de résultats triés par similarité décroissante
   *
   * @example
   * ```ts
   * // Recherche par texte
   * const results = await store.search("projets urgents", { topK: 10 });
   *
   * // Recherche par vecteur + filtres
   * const results = await store.search(embedding, {
   *   topK: 5,
   *   filter: [
   *     { field: "type", operator: "eq", value: "email" },
   *     { field: "tags", operator: "contains", value: "urgent" }
   *   ]
   * });
   * ```
   */
  search(query: string | number[], options: SearchOptions): Promise<SearchResult[]>;

  /**
   * Récupère un item par son ID
   *
   * @param id - ID de l'item
   * @returns Item avec metadata, ou null si non trouvé
   */
  get(id: string): Promise<SearchResult | null>;

  /**
   * Supprime un item du vector store
   *
   * @param id - ID de l'item à supprimer
   */
  delete(id: string): Promise<void>;

  /**
   * Supprime plusieurs items en batch
   *
   * @param ids - Liste d'IDs à supprimer
   */
  deleteBatch(ids: string[]): Promise<void>;

  /**
   * Met à jour la metadata d'un item (vecteur reste inchangé)
   * Utile pour changer tags, titre, etc. sans re-embedder
   *
   * @param id - ID de l'item
   * @param metadata - Metadata à mettre à jour (partiel)
   */
  updateMetadata(id: string, metadata: Partial<CartaeItemMetadata>): Promise<void>;

  /**
   * Obtient les statistiques du vector store
   * @returns Statistiques (nombre de points, dimension, etc.)
   */
  getStats(): Promise<VectorStoreStats>;

  /**
   * Vide complètement le vector store
   * ATTENTION : opération destructive
   */
  clear(): Promise<void>;

  /**
   * Vérifie la santé du vector store
   * @returns true si le store est accessible et opérationnel
   */
  health(): Promise<boolean>;

  /**
   * Crée un snapshot du vector store (backup)
   * Optionnel, toutes les implémentations ne supportent pas
   */
  snapshot?(): Promise<string>;

  /**
   * Restaure depuis un snapshot
   * Optionnel, toutes les implémentations ne supportent pas
   */
  restore?(snapshotId: string): Promise<void>;
}
