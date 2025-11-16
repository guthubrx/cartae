/**
 * SummaryGenerator - Génération de résumés extractifs et LLM
 *
 * Supporte deux méthodes :
 * 1. Extractive : Extrait les phrases les plus importantes du texte original
 * 2. LLM : Utilise un modèle de langage pour générer un résumé abstrait (si configuré)
 */

import type { CartaeItem } from '@cartae/core';
import type {
  ItemSummary,
  SummaryGenerationOptions,
  SummaryGenerationResult,
  SummaryLength,
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * SummaryGenerator
 *
 * Génère des résumés automatiques pour des items individuels
 */
export class SummaryGenerator {
  /**
   * Génère un résumé pour un item
   *
   * @param item - Item à résumer
   * @param options - Options de génération
   * @returns Résultat avec résumé généré
   */
  async generateSummary(
    item: CartaeItem,
    options: SummaryGenerationOptions = {}
  ): Promise<SummaryGenerationResult> {
    const startTime = Date.now();

    const {
      type = 'extractive',
      length = 'medium',
      method = 'extractive',
      maxKeyPoints = 5,
      extractActionItems = true,
      detectTopics = true,
    } = options;

    // Extraire texte à résumer
    const text = this.extractText(item);
    const originalWordCount = this.countWords(text);

    // Générer résumé selon méthode
    let summaryText: string;
    let keyPoints: string[] = [];
    let topics: string[] = [];
    let actionItems: string[] = [];
    let confidence = 0.8;

    if (method === 'extractive' || method === 'hybrid') {
      // Méthode extractive (toujours disponible)
      const extractiveResult = this.generateExtractiveSummary(text, length);
      summaryText = extractiveResult.text;
      keyPoints = extractiveResult.keyPoints.slice(0, maxKeyPoints);
      confidence = extractiveResult.confidence;

      if (detectTopics) {
        topics = this.extractTopics(text);
      }

      if (extractActionItems) {
        actionItems = this.extractActionItemsFromText(text);
      }
    } else if (method === 'llm') {
      // Méthode LLM (nécessite configuration externe)
      // Pour l'instant, fallback sur extractive
      // TODO: Intégrer avec LLM provider (OpenAI, Anthropic, etc.)
      const extractiveResult = this.generateExtractiveSummary(text, length);
      summaryText = extractiveResult.text;
      keyPoints = extractiveResult.keyPoints;
      confidence = 0.6; // Confiance réduite car fallback
    } else {
      throw new Error(`Unsupported generation method: ${method}`);
    }

    const summaryWordCount = this.countWords(summaryText);
    const compressionRatio = originalWordCount > 0 ? summaryWordCount / originalWordCount : 0;

    const summary: ItemSummary = {
      id: uuidv4(),
      itemId: item.id,
      type,
      text: summaryText,
      length,
      keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
      topics: topics.length > 0 ? topics : undefined,
      actionItems: actionItems.length > 0 ? actionItems : undefined,
      modelUsed: method === 'extractive' ? 'extractive-v1' : options.llmModel,
      confidence,
      generationMethod: method,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      summary,
      executionTime: Date.now() - startTime,
      metadata: {
        originalWordCount,
        summaryWordCount,
        compressionRatio,
      },
    };
  }

  /**
   * Génère un résumé extractif (extrait phrases importantes)
   */
  private generateExtractiveSummary(
    text: string,
    length: SummaryLength
  ): { text: string; keyPoints: string[]; confidence: number } {
    // Découper en phrases
    const sentences = this.splitIntoSentences(text);

    if (sentences.length === 0) {
      return { text: '', keyPoints: [], confidence: 0 };
    }

    // Scorer chaque phrase
    const scoredSentences = sentences.map(sentence => ({
      sentence,
      score: this.scoreSentence(sentence, text),
    }));

    // Trier par score
    scoredSentences.sort((a, b) => b.score - a.score);

    // Déterminer nombre de phrases selon longueur
    const sentenceCount = this.getSentenceCount(sentences.length, length);

    // Sélectionner top phrases
    const topSentences = scoredSentences.slice(0, sentenceCount).map(s => s.sentence);

    // Reconstituer dans l'ordre original
    const summaryText = sentences
      .filter(s => topSentences.includes(s))
      .join(' ')
      .trim();

    // Points clés = top 5 phrases les plus courtes et percutantes
    const keyPoints = scoredSentences
      .slice(0, 5)
      .map(s => s.sentence.trim())
      .filter(s => s.length > 10 && s.length < 150); // Pas trop courtes, pas trop longues

    // Confiance basée sur variance des scores
    const avgScore = scoredSentences.reduce((sum, s) => sum + s.score, 0) / scoredSentences.length;
    const confidence = Math.min(0.95, Math.max(0.5, avgScore));

    return {
      text: summaryText,
      keyPoints,
      confidence,
    };
  }

  /**
   * Score une phrase (importance pour le résumé)
   */
  private scoreSentence(sentence: string, fullText: string): number {
    let score = 0;

    // Longueur optimale (ni trop courte, ni trop longue)
    const wordCount = this.countWords(sentence);
    if (wordCount >= 5 && wordCount <= 30) {
      score += 0.2;
    }

    // Position (phrases du début sont souvent importantes)
    const position = fullText.indexOf(sentence) / fullText.length;
    if (position < 0.3) {
      score += 0.15;
    }

    // Mots-clés importants
    const importantKeywords = [
      'important',
      'urgent',
      'deadline',
      'action',
      'require',
      'must',
      'should',
      'decision',
      'approve',
      'review',
      'critical',
    ];

    const lowerSentence = sentence.toLowerCase();
    importantKeywords.forEach(keyword => {
      if (lowerSentence.includes(keyword)) {
        score += 0.1;
      }
    });

    // Présence de chiffres/dates (souvent factuels et importants)
    if (/\d/.test(sentence)) {
      score += 0.05;
    }

    return score;
  }

  /**
   * Extrait les topics d'un texte
   */
  private extractTopics(text: string): string[] {
    // Approche simple : mots les plus fréquents (hors stop words)
    const stopWords = new Set([
      'le',
      'la',
      'les',
      'un',
      'une',
      'des',
      'de',
      'du',
      'et',
      'ou',
      'à',
      'dans',
      'sur',
      'pour',
      'par',
      'avec',
      'sans',
      'the',
      'a',
      'an',
      'and',
      'or',
      'to',
      'in',
      'on',
      'for',
      'with',
      'without',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    // Compter fréquences
    const frequencies = new Map<string, number>();
    words.forEach(word => {
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    });

    // Top 5 mots les plus fréquents
    return Array.from(frequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Extrait les action items d'un texte
   */
  private extractActionItemsFromText(text: string): string[] {
    const actionItems: string[] = [];

    // Patterns pour détecter actions
    const actionPatterns = [
      /(?:TODO|To do|Action|Task):\s*(.+?)(?:\n|$)/gi,
      /(?:Please|Merci de|Pouvez-vous)\s+(.+?)(?:\.|$)/gi,
      /(?:I need|We need|Il faut)\s+(.+?)(?:\.|$)/gi,
    ];

    actionPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          actionItems.push(match[1].trim());
        }
      }
    });

    return actionItems.slice(0, 10); // Max 10 actions
  }

  /**
   * Découpe texte en phrases
   */
  private splitIntoSentences(text: string): string[] {
    // Split sur . ! ? suivi d'espace ou fin de ligne
    return text
      .split(/[.!?]+(?:\s+|$)/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Compte les mots dans un texte
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  /**
   * Détermine le nombre de phrases selon longueur souhaitée
   */
  private getSentenceCount(totalSentences: number, length: SummaryLength): number {
    if (length === 'short') {
      return Math.max(1, Math.ceil(totalSentences * 0.2)); // 20%
    }
    if (length === 'medium') {
      return Math.max(2, Math.ceil(totalSentences * 0.35)); // 35%
    }
    // long
    return Math.max(3, Math.ceil(totalSentences * 0.5)); // 50%
  }

  /**
   * Extrait le texte à résumer depuis un CartaeItem
   */
  private extractText(item: CartaeItem): string {
    const parts: string[] = [];

    // Titre
    if (item.title) {
      parts.push(item.title);
    }

    // Contenu principal
    if (item.content) {
      parts.push(item.content);
    }

    return parts.join('\n\n');
  }
}
