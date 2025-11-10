/**
 * Sentiment Analyzer Plugin
 *
 * Plugin AI qui utilise un LLM pour analyser le sentiment et le ton émotionnel
 * des CartaeItems.
 *
 * Analyse :
 * - Sentiment général (positive, neutral, negative, urgent)
 * - Ton émotionnel (frustration, joie, colère, anxiété, etc.)
 * - Toxicité (0-1)
 * - Urgence perçue (0-1)
 * - Confiance du modèle (0-1)
 *
 * Use cases :
 * - Détecter emails urgents/frustrés → Prioriser
 * - Surveiller moral équipe (Slack, Teams)
 * - Identifier conflits potentiels
 * - Insights sur satisfaction client
 */

import type { CartaeItem } from '@cartae/core';
import type { LLMService } from '@cartae/llm-service';
import type { AIPlugin, Insight } from '@cartae/ai-types';

/**
 * Sentiment détecté
 */
export type Sentiment = 'positive' | 'neutral' | 'negative' | 'urgent';

/**
 * Résultat d'analyse de sentiment
 */
interface SentimentAnalysis {
  /**
   * Sentiment général
   */
  sentiment: Sentiment;

  /**
   * Score de sentiment (-1 à +1)
   * -1 = très négatif, 0 = neutre, +1 = très positif
   */
  sentimentScore: number;

  /**
   * Tons émotionnels détectés
   */
  emotionalTones: string[];

  /**
   * Score de toxicité (0-1)
   * 0 = aucune toxicité, 1 = très toxique
   */
  toxicity: number;

  /**
   * Score d'urgence perçue (0-1)
   * 0 = pas urgent, 1 = très urgent
   */
  urgency: number;

  /**
   * Niveau de confiance (0-1)
   */
  confidence: number;

  /**
   * Explication du sentiment
   */
  reasoning: string;
}

/**
 * Sentiment Analyzer Plugin
 */
export class SentimentAnalyzerPlugin implements AIPlugin {
  // Manifest
  readonly manifest = {
    id: '@cartae/sentiment-analyzer',
    name: 'Sentiment Analyzer',
    version: '1.0.0',
    description: 'Analyse sentiment et ton émotionnel avec LLM',
    author: 'Cartae Team',
    main: './dist/index.js',
    category: 'productivity' as const,
    tags: ['ai', 'sentiment', 'analysis', 'intelligence'],
    source: 'core' as const,
    pricing: 'free' as const,
  };

  id = '@cartae/sentiment-analyzer';
  name = 'Sentiment Analyzer';
  version = '1.0.0';
  type = 'analyzer' as const;

  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
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
   * Analyse un item et enrichit avec sentiment
   */
  async analyze(item: CartaeItem): Promise<CartaeItem> {
    // Analyser sentiment avec LLM
    const sentiment = await this.analyzeSentiment(item);

    // Enrichir metadata
    // Note: AIInsights utilise sentiment (number -1 à +1), pas sentiment (string enum)
    const enrichedItem: CartaeItem = {
      ...item,
      metadata: {
        ...item.metadata,
        aiInsights: {
          ...item.metadata.aiInsights,
          sentiment: sentiment.sentimentScore, // Utiliser score numérique
          // toxicity et urgency retirés de AIInsights (pas de propriétés dédiées)
          // sentimentConfidence → confidence
          confidence: sentiment.confidence,
          // sentimentReasoning → summary
          summary: sentiment.reasoning,
        },
      },
    };

    return enrichedItem;
  }

  /**
   * Analyse le sentiment d'un item avec LLM
   */
  private async analyzeSentiment(item: CartaeItem): Promise<SentimentAnalysis> {
    // Prompt système
    const systemPrompt = `Tu es un assistant AI expert en analyse de sentiment et psychologie.
Ton rôle est d'analyser le ton émotionnel et le sentiment de messages (emails, chats, documents).

Tu dois détecter :
- **Sentiment général** : positive, neutral, negative, urgent
- **Tons émotionnels** : frustration, joie, colère, anxiété, satisfaction, impatience, etc.
- **Toxicité** : langage agressif, condescendant, insultant (0-1)
- **Urgence perçue** : niveau d'urgence ressenti dans le message (0-1)
- **Confiance** : ta confiance dans cette analyse (0-1)

Sois nuancé :
- Un message urgent n'est pas forcément négatif
- Un message neutre peut contenir de l'urgence
- Un ton direct n'est pas forcément toxique

Retourne SEULEMENT un JSON valide avec cette structure :
{
  "sentiment": "positive" | "neutral" | "negative" | "urgent",
  "sentimentScore": number (-1 à +1),
  "emotionalTones": ["tone1", "tone2"],
  "toxicity": number (0-1),
  "urgency": number (0-1),
  "confidence": number (0-1),
  "reasoning": "Explication concise en français"
}`;

    // Construire contexte
    const content = `${item.title}\n\n${item.content || ''}`;
    const userPrompt = `Analyse le sentiment de ce message :

---
${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}
---

Retourne le JSON avec sentiment, sentimentScore, emotionalTones, toxicity, urgency, confidence, et reasoning.`;

    try {
      // Appeler LLM
      const sentimentAnalysis = await this.llmService.completeJSON<SentimentAnalysis>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.2, // Peu de créativité, plus déterministe
          maxTokens: 300,
        },
      );

      return sentimentAnalysis;
    } catch (error) {
      console.error(`[${this.name}] LLM call failed:`, error);

      // Fallback : analyse basique par keywords
      return this.fallbackAnalysis(content);
    }
  }

  /**
   * Analyse de fallback (sans LLM) basée sur keywords simples
   */
  private fallbackAnalysis(content: string): SentimentAnalysis {
    const lowerContent = content.toLowerCase();

    // Keywords positifs
    const positiveKeywords = [
      'merci',
      'excellent',
      'super',
      'parfait',
      'bravo',
      'félicitations',
      'génial',
      'top',
    ];
    // Keywords négatifs
    const negativeKeywords = [
      'problème',
      'erreur',
      'bug',
      'cassé',
      'bloqué',
      'frustré',
      'déçu',
      'mauvais',
    ];
    // Keywords urgents
    const urgentKeywords = [
      'urgent',
      'asap',
      'immédiatement',
      'critique',
      'emergency',
      'maintenant',
    ];
    // Keywords toxiques
    const toxicKeywords = ['incompétent', 'nul', 'stupide', 'idiot', 'incapable'];

    // Compter matches
    const positiveCount = positiveKeywords.filter((kw) => lowerContent.includes(kw)).length;
    const negativeCount = negativeKeywords.filter((kw) => lowerContent.includes(kw)).length;
    const urgentCount = urgentKeywords.filter((kw) => lowerContent.includes(kw)).length;
    const toxicCount = toxicKeywords.filter((kw) => lowerContent.includes(kw)).length;

    // Déterminer sentiment
    let sentiment: Sentiment;
    let sentimentScore: number;

    if (urgentCount > 0) {
      sentiment = 'urgent';
      sentimentScore = 0;
    } else if (positiveCount > negativeCount) {
      sentiment = 'positive';
      sentimentScore = Math.min(1, positiveCount / 3);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      sentimentScore = -Math.min(1, negativeCount / 3);
    } else {
      sentiment = 'neutral';
      sentimentScore = 0;
    }

    // Tons émotionnels
    const emotionalTones: string[] = [];
    if (urgentCount > 0) emotionalTones.push('urgence');
    if (positiveCount > 0) emotionalTones.push('satisfaction');
    if (negativeCount > 0) emotionalTones.push('frustration');
    if (toxicCount > 0) emotionalTones.push('agressivité');

    // Toxicité
    const toxicity = Math.min(1, toxicCount / 2);

    // Urgence
    const urgency = Math.min(1, urgentCount / 2);

    return {
      sentiment,
      sentimentScore,
      emotionalTones: emotionalTones.length > 0 ? emotionalTones : ['neutre'],
      toxicity,
      urgency,
      confidence: 0.6, // Confiance faible (fallback sans LLM)
      reasoning: `Analyse fallback basée sur keywords. Détecté: ${positiveCount} pos, ${negativeCount} neg, ${urgentCount} urgent, ${toxicCount} toxic.`,
    };
  }

  /**
   * Trouve les connexions (non implémenté pour ce plugin)
   */
  async findConnections(_item: CartaeItem, _allItems: CartaeItem[]): Promise<string[]> {
    return [];
  }

  /**
   * Convertit sentiment score (number -1 à +1) en catégorie
   */
  private scoreToSentimentCategory(score: number | undefined): 'positive' | 'neutral' | 'negative' | 'urgent' | 'unknown' {
    if (score === undefined) return 'unknown';
    // score < -0.5 = negative, -0.5 à 0.5 = neutral, > 0.5 = positive
    // urgent détecté si score très négatif < -0.8
    if (score < -0.8) return 'urgent';
    if (score < -0.3) return 'negative';
    if (score > 0.3) return 'positive';
    return 'neutral';
  }

  /**
   * Génère des insights sur le sentiment global
   */
  async generateInsights(items: CartaeItem[]): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Compter items par sentiment
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
      urgent: 0,
      unknown: 0,
    };

    for (const item of items) {
      const score = item.metadata.aiInsights?.sentiment;
      const category = this.scoreToSentimentCategory(score);
      sentimentCounts[category]++;
    }

    // Insight 1: Moral négatif (beaucoup de messages négatifs)
    const totalAnalyzed = items.length - sentimentCounts.unknown;
    const negativeRatio = totalAnalyzed > 0 ? sentimentCounts.negative / totalAnalyzed : 0;

    if (negativeRatio > 0.4) {
      // >40% négatifs
      const negativeItems = items.filter(
        (i) => this.scoreToSentimentCategory(i.metadata.aiInsights?.sentiment) === 'negative',
      );

      insights.push({
        type: 'trend',
        title: 'Moral en baisse détecté',
        description: `${Math.round(negativeRatio * 100)}% des messages analysés ont un sentiment négatif (${sentimentCounts.negative}/${totalAnalyzed})`,
        relatedItems: negativeItems.map((i) => i.id).slice(0, 10),
        priority: 8,
        confidence: 0.8,
        data: sentimentCounts,
      });
    }

    // Insight 2: Toxicité détectée
    // Note: toxicity retiré de AIInsights, on utilise sentiment très négatif comme proxy
    const veryNegativeItems = items.filter((i) => {
      const score = i.metadata.aiInsights?.sentiment;
      return score !== undefined && score < -0.7; // Très négatif
    });

    if (veryNegativeItems.length > 0) {
      insights.push({
        type: 'anomaly',
        title: `${veryNegativeItems.length} message(s) très négatifs détecté(s)`,
        description: `Langage potentiellement problématique détecté (sentiment < -0.7)`,
        relatedItems: veryNegativeItems.map((i) => i.id),
        priority: 9,
        confidence: 0.85,
        data: { veryNegativeCount: veryNegativeItems.length },
      });
    }

    // Insight 3: Beaucoup d'urgence
    if (sentimentCounts.urgent > totalAnalyzed * 0.3) {
      // >30% urgents
      const urgentItems = items.filter((i) => this.scoreToSentimentCategory(i.metadata.aiInsights?.sentiment) === 'urgent');

      insights.push({
        type: 'suggestion',
        title: `${sentimentCounts.urgent} message(s) urgent(s)`,
        description: 'Forte charge de messages urgents détectée',
        relatedItems: urgentItems.map((i) => i.id),
        priority: 7,
        confidence: 0.9,
        data: { urgentCount: sentimentCounts.urgent },
      });
    }

    return insights;
  }
}

/**
 * Factory function
 */
export function createSentimentAnalyzerPlugin(llmService: LLMService): SentimentAnalyzerPlugin {
  return new SentimentAnalyzerPlugin(llmService);
}
