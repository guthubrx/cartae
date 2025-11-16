import * as chrono from 'chrono-node';
import type { DeadlineResult } from '../types';

/**
 * Extracteur de dates limites (deadlines) à partir de texte
 * Utilise chrono-node pour parser les dates en langage naturel
 */
export class DeadlineExtractor {
  private chronoParser: typeof chrono;

  constructor() {
    // Initialiser le parseur chrono avec support français et anglais
    this.chronoParser = chrono;
  }

  /**
   * Extrait la deadline d'un texte (sujet + corps d'email)
   */
  extract(subject: string, body: string): DeadlineResult {
    const text = `${subject} ${body}`;

    // Chercher des patterns de deadline explicites
    const explicitDeadline = this.findExplicitDeadline(text);
    if (explicitDeadline) {
      return explicitDeadline;
    }

    // Utiliser chrono-node pour parser les dates naturelles
    const chronoResult = this.parseWithChrono(text);
    if (chronoResult) {
      return chronoResult;
    }

    // Aucune deadline trouvée
    return {
      deadline: null,
      confidence: 0,
      extractedText: '',
    };
  }

  /**
   * Cherche des patterns de deadline explicites
   */
  private findExplicitDeadline(text: string): DeadlineResult | null {
    // Patterns français
    const frenchPatterns = [
      /deadline\s*:?\s*([^\n]+)/i,
      /échéance\s*:?\s*([^\n]+)/i,
      /date\s*limite\s*:?\s*([^\n]+)/i,
      /à\s*rendre\s*(?:pour|avant|le)?\s*:?\s*([^\n]+)/i,
      /pour\s*le\s*([0-9]{1,2}[/-][0-9]{1,2}(?:[/-][0-9]{2,4})?)/i,
    ];

    // Patterns anglais
    const englishPatterns = [
      /deadline\s*:?\s*([^\n]+)/i,
      /due\s*(?:date|by)?\s*:?\s*([^\n]+)/i,
      /submit\s*by\s*([^\n]+)/i,
      /by\s*([0-9]{1,2}[/-][0-9]{1,2}(?:[/-][0-9]{2,4})?)/i,
    ];

    const allPatterns = [...frenchPatterns, ...englishPatterns];

    for (const pattern of allPatterns) {
      const match = text.match(pattern);
      if (match) {
        const extractedText = match[1] || match[0];
        const parsedDate = this.chronoParser.parseDate(extractedText);

        if (parsedDate) {
          return {
            deadline: parsedDate,
            confidence: 0.9, // Haute confiance (pattern explicite)
            extractedText: extractedText.trim(),
          };
        }
      }
    }

    return null;
  }

  /**
   * Parse le texte avec chrono-node (dates en langage naturel)
   */
  private parseWithChrono(text: string): DeadlineResult | null {
    // Chercher toutes les dates dans le texte
    const results = this.chronoParser.parse(text);

    if (results.length === 0) {
      return null;
    }

    // Filtrer pour trouver des dates futures uniquement
    const now = new Date();
    const futureDates = results.filter(result => {
      const date = result.start.date();
      return date > now;
    });

    if (futureDates.length === 0) {
      return null;
    }

    // Prendre la date future la plus proche
    futureDates.sort((a, b) => {
      const dateA = a.start.date().getTime();
      const dateB = b.start.date().getTime();
      return dateA - dateB;
    });

    const closestDate = futureDates[0];

    // Calculer la confiance basée sur les composants de date parsés
    const confidence = this.calculateConfidence(closestDate);

    return {
      deadline: closestDate.start.date(),
      confidence,
      extractedText: closestDate.text,
    };
  }

  /**
   * Calcule la confiance basée sur les composants de date parsés
   */
  private calculateConfidence(result: chrono.ParsedResult): number {
    const components: any = result.start;
    let confidence = 0.3; // Confiance de base

    // Augmenter la confiance selon les composants trouvés
    if (components.get('year') !== null) confidence += 0.2;
    if (components.get('month') !== null) confidence += 0.2;
    if (components.get('day') !== null) confidence += 0.2;
    if (components.get('hour') !== null) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Extrait toutes les dates futures d'un texte (pour debug/analyse)
   */
  extractAll(text: string): DeadlineResult[] {
    const results = this.chronoParser.parse(text);
    const now = new Date();

    return results
      .filter(result => result.start.date() > now)
      .map(result => ({
        deadline: result.start.date(),
        confidence: this.calculateConfidence(result),
        extractedText: result.text,
      }));
  }
}
