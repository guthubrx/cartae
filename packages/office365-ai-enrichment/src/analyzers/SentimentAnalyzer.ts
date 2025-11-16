import type { SentimentResult, SentimentType } from '../types';

/**
 * Analyseur de sentiment pour les emails
 * Utilise un dictionnaire de mots-clés positifs/négatifs pour déterminer le sentiment
 */
export class SentimentAnalyzer {
  private positiveKeywords: Set<string>;

  private negativeKeywords: Set<string>;

  private intensifiers: Set<string>;

  constructor() {
    // Mots-clés positifs (français + anglais)
    this.positiveKeywords = new Set([
      // Français
      'excellent',
      'parfait',
      'super',
      'génial',
      'bravo',
      'merci',
      'content',
      'heureux',
      'ravi',
      'enchanté',
      'félicitations',
      'succès',
      'réussi',
      'approuvé',
      'validé',
      'bon',
      'bien',
      'positif',
      'opportunité',
      'progrès',
      'amélioration',
      // Anglais
      'excellent',
      'perfect',
      'great',
      'awesome',
      'congratulations',
      'happy',
      'pleased',
      'delighted',
      'success',
      'approved',
      'good',
      'positive',
      'opportunity',
      'progress',
      'improvement',
    ]);

    // Mots-clés négatifs (français + anglais)
    this.negativeKeywords = new Set([
      // Français
      'problème',
      'erreur',
      'échec',
      'urgent',
      'critique',
      'bloqué',
      'retard',
      'désolé',
      'malheureusement',
      'inquiet',
      'préoccupé',
      'difficile',
      'impossible',
      'refusé',
      'rejeté',
      'mauvais',
      'catastrophe',
      'alerte',
      'danger',
      'risque',
      'perte',
      // Anglais
      'problem',
      'error',
      'failure',
      'urgent',
      'critical',
      'blocked',
      'delay',
      'sorry',
      'unfortunately',
      'worried',
      'concerned',
      'difficult',
      'impossible',
      'refused',
      'rejected',
      'bad',
      'disaster',
      'alert',
      'danger',
      'risk',
      'loss',
    ]);

    // Intensificateurs (amplifient le sentiment)
    this.intensifiers = new Set([
      'très',
      'vraiment',
      'extrêmement',
      'particulièrement',
      'very',
      'really',
      'extremely',
      'particularly',
      'highly',
      'absolument',
      'totalement',
      'completely',
      'totally',
      'absolutely',
    ]);
  }

  /**
   * Analyse le sentiment d'un texte
   */
  analyze(text: string): SentimentResult {
    if (!text || text.trim().length === 0) {
      return {
        sentiment: 'neutral',
        confidence: 0,
        keywords: [],
      };
    }

    const normalized = this.normalizeText(text);
    const words = normalized.split(/\s+/);

    let positiveScore = 0;
    let negativeScore = 0;
    const foundKeywords: string[] = [];

    // Parcourir les mots et calculer le score
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const previousWord = i > 0 ? words[i - 1] : null;
      const isIntensified = previousWord && this.intensifiers.has(previousWord);
      const multiplier = isIntensified ? 2 : 1;

      if (this.positiveKeywords.has(word)) {
        positiveScore += 1 * multiplier;
        foundKeywords.push(word);
      } else if (this.negativeKeywords.has(word)) {
        negativeScore += 1 * multiplier;
        foundKeywords.push(word);
      }
    }

    // Calculer le sentiment final
    const totalScore = positiveScore + negativeScore;
    const sentiment: SentimentType = this.determineSentiment(positiveScore, negativeScore);

    // Calculer la confiance (basée sur le nombre de mots-clés trouvés)
    const confidence = Math.min(totalScore / 10, 1); // Max 10 mots-clés = confiance 100%

    return {
      sentiment,
      confidence: Number(confidence.toFixed(2)),
      keywords: foundKeywords,
    };
  }

  /**
   * Normalise le texte (lowercase, trim)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:]/g, ' '); // Remplacer ponctuation par espaces
  }

  /**
   * Détermine le sentiment basé sur les scores
   */
  private determineSentiment(positiveScore: number, negativeScore: number): SentimentType {
    const diff = positiveScore - negativeScore;

    // Si différence > 2, sentiment clair
    if (diff >= 2) return 'positive';
    if (diff <= -2) return 'negative';

    // Si différence < 2, neutre
    return 'neutral';
  }

  /**
   * Ajoute des mots-clés positifs personnalisés
   */
  addPositiveKeywords(keywords: string[]): void {
    keywords.forEach(kw => this.positiveKeywords.add(kw.toLowerCase()));
  }

  /**
   * Ajoute des mots-clés négatifs personnalisés
   */
  addNegativeKeywords(keywords: string[]): void {
    keywords.forEach(kw => this.negativeKeywords.add(kw.toLowerCase()));
  }
}
