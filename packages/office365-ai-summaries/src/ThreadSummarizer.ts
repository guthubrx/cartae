/**
 * ThreadSummarizer - Résumé de threads emails complets
 *
 * Analyse un ensemble d'emails d'une conversation (thread)
 * et génère un résumé global avec timeline et participants.
 */

import type { CartaeItem } from '@cartae/core';
import type { ThreadSummary, ThreadSummaryOptions, SummaryGenerationResult } from './types';
import { SummaryGenerator } from './SummaryGenerator';
import { v4 as uuidv4 } from 'uuid';

/**
 * ThreadSummarizer
 *
 * Génère des résumés pour des threads emails complets
 */
export class ThreadSummarizer {
  private summaryGenerator: SummaryGenerator;

  constructor() {
    this.summaryGenerator = new SummaryGenerator();
  }

  /**
   * Génère un résumé pour un thread complet
   *
   * @param threadItems - Items du thread (emails dans l'ordre chronologique)
   * @param threadId - ID du thread
   * @param options - Options de génération
   * @returns Résultat avec résumé de thread généré
   */
  async generateThreadSummary(
    threadItems: CartaeItem[],
    threadId: string,
    options: ThreadSummaryOptions = {}
  ): Promise<SummaryGenerationResult> {
    const startTime = Date.now();

    if (threadItems.length === 0) {
      throw new Error('Thread must contain at least one item');
    }

    const {
      type = 'thread',
      length = 'medium',
      method = 'extractive',
      includeParticipants = true,
      includeTimeline = false,
      maxKeyPoints = 5,
      extractActionItems = true,
      detectTopics = true,
    } = options;

    // Trier par date (chronologique)
    const sortedItems = [...threadItems].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Dates thread
    const threadStartDate = new Date(sortedItems[0].createdAt);
    const threadEndDate = new Date(sortedItems[sortedItems.length - 1].createdAt);

    // Extraire tous les participants
    let participants: string[] = [];
    if (includeParticipants) {
      participants = this.extractAllParticipants(sortedItems);
    }

    // Agréger tout le contenu
    const aggregatedText = this.aggregateThreadContent(sortedItems);
    const originalWordCount = this.countWords(aggregatedText);

    // Générer résumé global
    const summaryResult = await this.summaryGenerator.generateSummary(
      this.createAggregatedItem(sortedItems, aggregatedText),
      {
        type,
        length,
        method,
        maxKeyPoints,
        extractActionItems,
        detectTopics,
      }
    );

    // Enrichir avec métadonnées thread
    const threadSummary: ThreadSummary = {
      ...summaryResult.summary,
      id: uuidv4(),
      type: 'thread',
      threadId,
      threadItemCount: sortedItems.length,
      participants: includeParticipants ? participants : undefined,
      threadStartDate,
      threadEndDate,
    };

    // Ajouter timeline si demandé
    if (includeTimeline) {
      const timeline = this.generateTimeline(sortedItems);
      threadSummary.keyPoints = [...(threadSummary.keyPoints || []), `Timeline: ${timeline}`];
    }

    return {
      summary: threadSummary,
      executionTime: Date.now() - startTime,
      metadata: {
        originalWordCount,
        summaryWordCount: summaryResult.metadata?.summaryWordCount || 0,
        compressionRatio: summaryResult.metadata?.compressionRatio || 0,
      },
    };
  }

  /**
   * Extrait tous les participants uniques d'un thread
   */
  private extractAllParticipants(items: CartaeItem[]): string[] {
    const participantsSet = new Set<string>();

    items.forEach(item => {
      // From
      if (item.metadata?.from) {
        participantsSet.add(item.metadata.from as string);
      }

      // To
      if (Array.isArray(item.metadata?.to)) {
        (item.metadata.to as string[]).forEach(p => participantsSet.add(p));
      }

      // Cc
      if (Array.isArray(item.metadata?.cc)) {
        (item.metadata.cc as string[]).forEach(p => participantsSet.add(p));
      }
    });

    return Array.from(participantsSet);
  }

  /**
   * Agrège le contenu de tous les items du thread
   */
  private aggregateThreadContent(items: CartaeItem[]): string {
    return items
      .map((item, index) => {
        const date = new Date(item.createdAt).toLocaleString('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

        const from = item.metadata?.from || 'Unknown';

        return `[${date}] ${from}:\n${item.title}\n${item.content || ''}`;
      })
      .join('\n\n---\n\n');
  }

  /**
   * Crée un CartaeItem agrégé représentant tout le thread
   */
  private createAggregatedItem(items: CartaeItem[], aggregatedText: string): CartaeItem {
    const firstItem = items[0];

    return {
      ...firstItem,
      id: `thread-${uuidv4()}`,
      title: `Thread: ${firstItem.title}`,
      content: aggregatedText,
    };
  }

  /**
   * Génère une timeline résumée du thread
   */
  private generateTimeline(items: CartaeItem[]): string {
    const milestones: string[] = [];

    // Premier message
    const first = items[0];
    milestones.push(
      `Début: ${new Date(first.createdAt).toLocaleDateString()} - ${first.metadata?.from || 'Unknown'}`
    );

    // Messages intermédiaires significatifs (avec action items ou haute priorité)
    const significant = items.slice(1, -1).filter(item => {
      const ai = item.metadata?.ai as any;
      const hasActionItems = ai?.actionItems && (ai.actionItems as string[]).length > 0;
      const isHighPriority = ai?.priority?.level === 'high' || ai?.priority?.level === 'critical';
      return hasActionItems || isHighPriority;
    });

    significant.forEach(item => {
      milestones.push(
        `${new Date(item.createdAt).toLocaleDateString()} - ${item.metadata?.from || 'Unknown'} (important)`
      );
    });

    // Dernier message
    if (items.length > 1) {
      const last = items[items.length - 1];
      milestones.push(
        `Fin: ${new Date(last.createdAt).toLocaleDateString()} - ${last.metadata?.from || 'Unknown'}`
      );
    }

    return milestones.join(' → ');
  }

  /**
   * Compte les mots dans un texte
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }
}
