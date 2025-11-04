/**
 * Priority Scorer Plugin
 *
 * Plugin AI qui utilise un LLM pour scorer intelligemment la priorité des CartaeItems.
 *
 * Analyse :
 * - Contenu et titre de l'item
 * - Tags existants (#urgent, #important, etc.)
 * - Auteur (VIP, client, interne)
 * - Date/deadline
 * - Contexte métier
 *
 * Génère :
 * - Score de priorité (0-10)
 * - Reasoning (explication du score)
 * - Actions suggérées
 */

import type { CartaeItem } from '@cartae/core';
import type { LLMService } from '@cartae/llm-service';
import type { AIPlugin, Insight } from '@cartae/ai-types';

/**
 * Configuration du Priority Scorer
 */
export interface PriorityScorerConfig {
  /**
   * Règles personnalisées de priorité
   * Format: { pattern: string, weight: number }
   * @example [{ pattern: 'CEO', weight: 10 }, { pattern: 'urgent', weight: 8 }]
   */
  customRules?: Array<{ pattern: string; weight: number }>;

  /**
   * Domaines VIP (emails @domain prioritaires)
   */
  vipDomains?: string[];

  /**
   * Keywords haute priorité
   */
  highPriorityKeywords?: string[];
}

/**
 * Résultat du scoring de priorité
 */
interface PriorityScore {
  /**
   * Score de priorité (0-10)
   */
  score: number;

  /**
   * Niveau de priorité
   */
  level: 'critical' | 'high' | 'medium' | 'low';

  /**
   * Explication du score
   */
  reasoning: string;

  /**
   * Actions suggérées
   */
  suggestedActions?: string[];

  /**
   * Facteurs de priorité détectés
   */
  factors: Array<{
    factor: string;
    impact: number; // 0-10
    description: string;
  }>;
}

/**
 * Priority Scorer Plugin
 */
export class PriorityScorerPlugin implements AIPlugin {
  // Manifest
  readonly manifest = {
    id: '@cartae/priority-scorer',
    name: 'Priority Scorer',
    version: '1.0.0',
    description: 'Score intelligemment la priorité des items avec LLM',
    author: 'Cartae Team',
    main: './dist/index.js',
    category: 'productivity' as const,
    tags: ['ai', 'priority', 'scoring', 'intelligence'],
    source: 'core' as const,
    pricing: 'free' as const,
  };

  id = '@cartae/priority-scorer';
  name = 'Priority Scorer';
  version = '1.0.0';
  type = 'classifier' as const;

  private config: PriorityScorerConfig;
  private llmService: LLMService;

  constructor(llmService: LLMService, config?: PriorityScorerConfig) {
    this.llmService = llmService;
    this.config = {
      customRules: [],
      vipDomains: [],
      highPriorityKeywords: ['urgent', 'asap', 'critical', 'deadline', 'emergency'],
      ...config,
    };
  }

  /**
   * Active le plugin
   */
  async activate(): Promise<void> {
    console.log(`[${this.name}] Plugin activé`);
  }

  /**
   * Désactive le plugin
   */
  async deactivate(): Promise<void> {
    console.log(`[${this.name}] Plugin désactivé`);
  }

  /**
   * Configure le plugin
   */
  configure(config: PriorityScorerConfig): void {
    this.config = {
      ...this.config,
      ...config,
    };
    console.log(`[${this.name}] Configuration mise à jour`);
  }

  /**
   * Analyse un item et enrichit avec score de priorité
   */
  async analyze(item: CartaeItem): Promise<CartaeItem> {
    // Scorer la priorité avec LLM
    const priorityScore = await this.scorePriority(item);

    // Enrichir metadata
    const enrichedItem: CartaeItem = {
      ...item,
      metadata: {
        ...item.metadata,
        aiInsights: {
          ...item.metadata.aiInsights,
          priorityScore: priorityScore.score,
          priorityLevel: priorityScore.level,
          priorityReasoning: priorityScore.reasoning,
          priorityFactors: priorityScore.factors,
          suggestedActions: priorityScore.suggestedActions,
        },
      },
    };

    return enrichedItem;
  }

  /**
   * Score la priorité d'un item avec LLM
   */
  private async scorePriority(item: CartaeItem): Promise<PriorityScore> {
    // Construire contexte pour le LLM
    const context = this.buildContext(item);

    // Prompt système
    const systemPrompt = `Tu es un assistant AI expert en gestion de priorités et productivité.
Ton rôle est d'analyser des items (emails, tasks, documents, etc.) et d'assigner un score de priorité intelligent.

Facteurs à considérer :
- Urgence (deadline, mots-clés urgents)
- Importance (auteur VIP, client, projet stratégique)
- Impact (nombre de personnes concernées, conséquences)
- Effort requis vs valeur
- Contexte métier

Score de priorité (0-10) :
- 0-2 : Low (peut attendre, non-urgent)
- 3-5 : Medium (important mais pas urgent)
- 6-8 : High (urgent ET important)
- 9-10 : Critical (urgent, important, bloquant)

Retourne SEULEMENT un JSON valide avec cette structure :
{
  "score": number (0-10),
  "level": "critical" | "high" | "medium" | "low",
  "reasoning": "Explication concise du score en français",
  "suggestedActions": ["Action 1", "Action 2"],
  "factors": [
    { "factor": "Nom facteur", "impact": number (0-10), "description": "Explication" }
  ]
}`;

    // Prompt utilisateur avec contexte item
    const userPrompt = `Analyse cet item et assigne un score de priorité intelligent :

${context}

Retourne le JSON avec score, level, reasoning, suggestedActions, et factors.`;

    try {
      // Appeler LLM
      const priorityScore = await this.llmService.completeJSON<PriorityScore>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.3, // Peu de créativité, plus déterministe
          maxTokens: 500,
        },
      );

      return priorityScore;
    } catch (error) {
      console.error(`[${this.name}] LLM call failed:`, error);

      // Fallback : scoring basique basé sur règles
      return this.fallbackScoring(item);
    }
  }

  /**
   * Construit le contexte pour le LLM
   */
  private buildContext(item: CartaeItem): string {
    const lines: string[] = [];

    lines.push(`**Type:** ${item.type}`);
    lines.push(`**Titre:** ${item.title}`);

    if (item.content) {
      const excerpt = item.content.substring(0, 500);
      lines.push(`**Contenu (extrait):** ${excerpt}${item.content.length > 500 ? '...' : ''}`);
    }

    if (item.tags && item.tags.length > 0) {
      lines.push(`**Tags:** ${item.tags.join(', ')}`);
    }

    if (item.author) {
      lines.push(`**Auteur:** ${item.author.name || 'Inconnu'}`);
      if (item.author.email) {
        lines.push(`**Email auteur:** ${item.author.email}`);
      }
    }

    if (item.createdAt) {
      lines.push(`**Créé le:** ${item.createdAt.toLocaleString()}`);
    }

    // Règles custom
    if (this.config.customRules && this.config.customRules.length > 0) {
      lines.push(`\n**Règles de priorité custom :**`);
      this.config.customRules.forEach((rule) => {
        lines.push(`- Si contient "${rule.pattern}" → +${rule.weight} priorité`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Scoring de fallback (sans LLM) basé sur règles simples
   */
  private fallbackScoring(item: CartaeItem): PriorityScore {
    let score = 5; // Score par défaut medium
    const factors: Array<{ factor: string; impact: number; description: string }> = [];

    const content = `${item.title} ${item.content || ''}`.toLowerCase();

    // Règle 1: Keywords haute priorité
    for (const keyword of this.config.highPriorityKeywords ?? []) {
      if (content.includes(keyword)) {
        score += 2;
        factors.push({
          factor: 'Keyword urgent',
          impact: 2,
          description: `Contient "${keyword}"`,
        });
      }
    }

    // Règle 2: Tags prioritaires
    if (item.tags?.includes('#urgent')) {
      score += 3;
      factors.push({ factor: 'Tag #urgent', impact: 3, description: 'Tag prioritaire détecté' });
    }

    if (item.tags?.includes('#critical')) {
      score += 4;
      factors.push({ factor: 'Tag #critical', impact: 4, description: 'Tag critique détecté' });
    }

    // Règle 3: Domaines VIP
    if (item.author?.email && this.config.vipDomains) {
      const domain = item.author.email.split('@')[1];
      if (this.config.vipDomains.includes(domain)) {
        score += 2;
        factors.push({
          factor: 'Auteur VIP',
          impact: 2,
          description: `Email VIP (@${domain})`,
        });
      }
    }

    // Règles custom
    for (const rule of this.config.customRules ?? []) {
      if (content.includes(rule.pattern.toLowerCase())) {
        score += rule.weight;
        factors.push({
          factor: `Règle custom: ${rule.pattern}`,
          impact: rule.weight,
          description: `Pattern "${rule.pattern}" détecté`,
        });
      }
    }

    // Limiter à 0-10
    score = Math.max(0, Math.min(10, score));

    // Déterminer level
    let level: 'critical' | 'high' | 'medium' | 'low';
    if (score >= 9) level = 'critical';
    else if (score >= 6) level = 'high';
    else if (score >= 3) level = 'medium';
    else level = 'low';

    return {
      score,
      level,
      reasoning: `Score calculé avec règles fallback (LLM indisponible). Facteurs: ${factors.map((f) => f.factor).join(', ')}`,
      factors,
      suggestedActions: score >= 7 ? ['Traiter rapidement', 'Vérifier deadline'] : undefined,
    };
  }

  /**
   * Trouve les connexions (non implémenté pour ce plugin)
   */
  async findConnections(_item: CartaeItem, _allItems: CartaeItem[]): Promise<string[]> {
    return [];
  }

  /**
   * Génère des insights sur les priorités
   */
  async generateInsights(items: CartaeItem[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Compter items par niveau de priorité
    const priorityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    };

    for (const item of items) {
      const level = item.metadata.aiInsights?.priorityLevel as 'critical' | 'high' | 'medium' | 'low' | undefined;
      if (level && level in priorityCounts) {
        priorityCounts[level]++;
      } else {
        priorityCounts.unknown++;
      }
    }

    // Insight 1: Items critiques
    if (priorityCounts.critical > 0) {
      const criticalItems = items.filter(
        (i) => i.metadata.aiInsights?.priorityLevel === 'critical',
      );

      insights.push({
        type: 'suggestion',
        title: `${priorityCounts.critical} item(s) priorité CRITIQUE`,
        description: 'Actions urgentes requises',
        relatedItems: criticalItems.map((i) => i.id),
        priority: 10,
        confidence: 0.9,
        data: { count: priorityCounts.critical },
      });
    }

    // Insight 2: Surcharge de tâches haute priorité
    if (priorityCounts.high + priorityCounts.critical > items.length * 0.5) {
      insights.push({
        type: 'anomaly',
        title: 'Surcharge de tâches prioritaires',
        description: `${priorityCounts.high + priorityCounts.critical} items haute priorité sur ${items.length} total (>${Math.round((priorityCounts.high + priorityCounts.critical) / items.length * 100)}%)`,
        relatedItems: [],
        priority: 8,
        confidence: 0.85,
        data: priorityCounts,
      });
    }

    return insights;
  }
}

/**
 * Factory function
 */
export function createPriorityScorerPlugin(
  llmService: LLMService,
  config?: PriorityScorerConfig,
): PriorityScorerPlugin {
  return new PriorityScorerPlugin(llmService, config);
}
