/**
 * Semantic Connections AI Plugin
 *
 * Plugin d'intelligence artificielle pour détecter les connexions sémantiques
 * entre CartaeItems en utilisant plusieurs algorithmes de similarité.
 *
 * @module @cartae/semantic-connections-plugin
 */

// Export du plugin principal
export { SemanticConnectionsPlugin, semanticConnectionsPlugin } from './plugin/SemanticConnectionsPlugin.js';

// Export des algorithmes
export {
  cosineSimilarityAlgorithm,
  keywordMatchingAlgorithm,
  contextAnalysisAlgorithm,
  combinedAlgorithm,
  CosineSimilarityAlgorithm,
  KeywordMatchingAlgorithm,
  ContextAnalysisAlgorithm,
  CombinedAlgorithm,
} from './algorithms/index.js';

// Export des types
export type {
  AIPlugin,
  SimilarityAlgorithm,
  SemanticConnectionsConfig,
  SemanticConnection,
  SemanticGraph,
  ConnectionAnalysis,
  SimilarityAlgorithmImplementation,
  Insight,
} from './types/index.js';

// Export des utilitaires (pour usage avancé)
export {
  normalizeText,
  tokenize,
  extractHashtags,
  extractMentions,
  calculateTermFrequency,
  calculateIDF,
  calculateTFIDF,
  cosineSimilarity,
  jaccardSimilarity,
} from './utils/textProcessing.js';

// Export par défaut de l'instance singleton
export { semanticConnectionsPlugin as default } from './plugin/SemanticConnectionsPlugin.js';
