/**
 * @cartae/semantic-search-plugin - Plugin AI pour recherche sémantique
 *
 * Utilise des embeddings vectoriels pour trouver CartaeItems similaires.
 * Implémente la full interface AIPlugin avec query expansion et result ranking.
 */

export { SemanticSearchPlugin } from './SemanticSearchPlugin';
export { QueryExpander } from './QueryExpander';
export { ResultRanker } from './ResultRanker';
export type {
  SemanticSearchConfig,
  SemanticSearchResult,
  SearchOptions,
  IndexResult,
} from './types';

export const VERSION = '1.0.0';
