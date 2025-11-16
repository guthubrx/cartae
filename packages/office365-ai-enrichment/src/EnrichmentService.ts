import { SentimentAnalyzer } from './analyzers/SentimentAnalyzer';
import { PriorityAnalyzer } from './analyzers/PriorityAnalyzer';
import { DeadlineExtractor } from './analyzers/DeadlineExtractor';
import { ActionItemExtractor } from './analyzers/ActionItemExtractor';
import type { EnrichmentData, EnrichmentConfig } from './types';

/**
 * Service principal d'enrichissement AI pour emails Office365
 * Orchestre tous les analyzers (sentiment, priority, deadline, action items)
 */
export class EnrichmentService {
  private sentimentAnalyzer: SentimentAnalyzer;

  private priorityAnalyzer: PriorityAnalyzer;

  private deadlineExtractor: DeadlineExtractor;

  private actionItemExtractor: ActionItemExtractor;

  private config: EnrichmentConfig;

  constructor(config: Partial<EnrichmentConfig> = {}) {
    this.config = {
      enableSentiment: true,
      enablePriority: true,
      enableDeadline: true,
      enableActionItems: true,
      ...config,
    };

    // Initialiser les analyzers
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.priorityAnalyzer = new PriorityAnalyzer(
      config.urgentKeywords || [],
      config.importantSenders || []
    );
    this.deadlineExtractor = new DeadlineExtractor();
    this.actionItemExtractor = new ActionItemExtractor();
  }

  /**
   * Enrichit un email avec toutes les analyses AI
   */
  async enrichEmail(subject: string, body: string, senderEmail: string): Promise<EnrichmentData> {
    const text = `${subject} ${body}`;

    // Exécuter toutes les analyses en parallèle
    const [sentiment, priority, deadline, actionItems] = await Promise.all([
      this.config.enableSentiment
        ? Promise.resolve(this.sentimentAnalyzer.analyze(text))
        : Promise.resolve({
            sentiment: 'neutral' as const,
            confidence: 0,
            keywords: [],
          }),

      this.config.enablePriority
        ? Promise.resolve(this.priorityAnalyzer.analyze(subject, body, senderEmail))
        : Promise.resolve({
            score: 50,
            factors: {
              urgentKeywords: 0,
              senderImportance: 0,
              contentComplexity: 0,
            },
            reasoning: 'Priority analysis disabled',
          }),

      this.config.enableDeadline
        ? Promise.resolve(this.deadlineExtractor.extract(subject, body))
        : Promise.resolve({
            deadline: null,
            confidence: 0,
            extractedText: '',
          }),

      this.config.enableActionItems
        ? Promise.resolve(this.actionItemExtractor.extract(subject, body))
        : Promise.resolve([]),
    ]);

    return {
      sentiment,
      priority,
      deadline,
      actionItems,
      enrichedAt: new Date(),
    };
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(config: Partial<EnrichmentConfig>): void {
    this.config = { ...this.config, ...config };

    // Mettre à jour les mots-clés urgents si fournis
    if (config.urgentKeywords) {
      config.urgentKeywords.forEach(kw => this.priorityAnalyzer.addUrgentKeyword(kw));
    }

    // Mettre à jour les émetteurs importants si fournis
    if (config.importantSenders) {
      config.importantSenders.forEach(email => this.priorityAnalyzer.addImportantSender(email));
    }
  }

  /**
   * Récupère la configuration actuelle
   */
  getConfig(): EnrichmentConfig {
    return { ...this.config };
  }

  /**
   * Ajoute un mot-clé positif au SentimentAnalyzer
   */
  addPositiveSentimentKeyword(keyword: string): void {
    this.sentimentAnalyzer.addPositiveKeywords([keyword]);
  }

  /**
   * Ajoute un mot-clé négatif au SentimentAnalyzer
   */
  addNegativeSentimentKeyword(keyword: string): void {
    this.sentimentAnalyzer.addNegativeKeywords([keyword]);
  }

  /**
   * Ajoute un verbe d'action au ActionItemExtractor
   */
  addActionVerb(verb: string): void {
    this.actionItemExtractor.addActionVerb(verb);
  }
}
