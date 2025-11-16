/**
 * @cartae/office365-ai-enrichment
 *
 * Package d'enrichissement AI pour emails Office365
 * Fournit : analyse de sentiment, scoring de priorité, extraction de deadlines, extraction d'action items
 */

export { EnrichmentService } from './EnrichmentService';
export { Office365AIEnrichmentPlugin } from './Office365AIEnrichmentPlugin';

export { SentimentAnalyzer } from './analyzers/SentimentAnalyzer';
export { PriorityAnalyzer } from './analyzers/PriorityAnalyzer';
export { DeadlineExtractor } from './analyzers/DeadlineExtractor';
export { ActionItemExtractor } from './analyzers/ActionItemExtractor';

export type {
  SentimentType,
  SentimentResult,
  PriorityResult,
  DeadlineResult,
  ActionItem,
  EnrichmentData,
  EnrichmentConfig,
} from './types';
