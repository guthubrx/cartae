import type { PriorityResult } from '../types';

/**
 * Analyseur de priorité pour les emails
 * Calcule un score de priorité (0-100) basé sur plusieurs facteurs
 */
export class PriorityAnalyzer {
  private urgentKeywords: Set<string>;

  private importantSenders: Set<string>;

  constructor(customUrgentKeywords: string[] = [], importantSenders: string[] = []) {
    // Mots-clés urgents par défaut (français + anglais)
    this.urgentKeywords = new Set([
      // Français
      'urgent',
      'critique',
      'immédiat',
      'asap',
      'rapidement',
      'prioritaire',
      'important',
      'vital',
      'essentiel',
      'deadline',
      'échéance',
      "aujourd'hui",
      'demain',
      'bloqué',
      'bloquant',
      'alerte',
      'attention',
      // Anglais
      'urgent',
      'critical',
      'immediate',
      'asap',
      'quickly',
      'priority',
      'important',
      'vital',
      'essential',
      'deadline',
      'today',
      'tomorrow',
      'blocked',
      'blocking',
      'alert',
      'attention',
      'emergency',
      'urgently',
    ]);

    // Ajouter mots-clés personnalisés
    customUrgentKeywords.forEach(kw => this.urgentKeywords.add(kw.toLowerCase()));

    // Emails d'émetteurs importants (normalisés en lowercase)
    this.importantSenders = new Set(importantSenders.map(email => email.toLowerCase()));
  }

  /**
   * Analyse la priorité d'un email
   */
  analyze(subject: string, body: string, senderEmail: string): PriorityResult {
    const urgentScore = this.analyzeUrgentKeywords(subject, body);
    const senderScore = this.analyzeSenderImportance(senderEmail);
    const complexityScore = this.analyzeContentComplexity(body);

    const totalScore = Math.min(urgentScore + senderScore + complexityScore, 100);

    return {
      score: Math.round(totalScore),
      factors: {
        urgentKeywords: Math.round(urgentScore),
        senderImportance: Math.round(senderScore),
        contentComplexity: Math.round(complexityScore),
      },
      reasoning: this.generateReasoning(urgentScore, senderScore, complexityScore),
    };
  }

  /**
   * Analyse les mots-clés urgents (max 40 points)
   */
  private analyzeUrgentKeywords(subject: string, body: string): number {
    const text = `${subject} ${body}`.toLowerCase();
    const words = text.split(/\s+/);

    let matchCount = 0;
    for (const word of words) {
      if (this.urgentKeywords.has(word)) {
        matchCount++;
      }
    }

    // Plus il y a de mots urgents, plus le score est élevé
    // Max 5 mots urgents = 40 points
    return Math.min((matchCount / 5) * 40, 40);
  }

  /**
   * Analyse l'importance de l'émetteur (max 30 points)
   */
  private analyzeSenderImportance(senderEmail: string): number {
    const normalized = senderEmail.toLowerCase();

    if (this.importantSenders.has(normalized)) {
      return 30; // Émetteur important = 30 points
    }

    // Heuristiques basées sur le domaine de l'email
    if (
      normalized.includes('ceo@') ||
      normalized.includes('cto@') ||
      normalized.includes('director@')
    ) {
      return 25; // Poste de direction = 25 points
    }

    if (normalized.includes('manager@') || normalized.includes('lead@')) {
      return 15; // Manager = 15 points
    }

    return 0; // Émetteur normal = 0 points
  }

  /**
   * Analyse la complexité du contenu (max 30 points)
   */
  private analyzeContentComplexity(body: string): number {
    const wordCount = body.split(/\s+/).length;
    const lineCount = body.split(/\n/).length;
    const hasQuestions = body.includes('?');
    const hasActionItems = /\b(todo|to do|action|task|please)\b/i.test(body);

    let complexityScore = 0;

    // Longueur du contenu (max 10 points)
    if (wordCount > 500) {
      complexityScore += 10;
    } else if (wordCount > 200) {
      complexityScore += 7;
    } else if (wordCount > 50) {
      complexityScore += 4;
    }

    // Structure (max 10 points)
    if (lineCount > 20) {
      complexityScore += 5;
    } else if (lineCount > 10) {
      complexityScore += 3;
    }

    // Contenu interactif (max 10 points)
    if (hasQuestions) complexityScore += 5;
    if (hasActionItems) complexityScore += 5;

    return Math.min(complexityScore, 30);
  }

  /**
   * Génère une explication textuelle du score
   */
  private generateReasoning(
    urgentScore: number,
    senderScore: number,
    complexityScore: number
  ): string {
    const reasons: string[] = [];

    if (urgentScore > 20) {
      reasons.push('Contient des mots-clés urgents');
    }

    if (senderScore >= 30) {
      reasons.push('Émetteur identifié comme important');
    } else if (senderScore >= 15) {
      reasons.push('Émetteur avec poste de responsabilité');
    }

    if (complexityScore >= 20) {
      reasons.push('Contenu long et complexe nécessitant attention');
    } else if (complexityScore >= 10) {
      reasons.push('Contenu de longueur moyenne');
    }

    if (reasons.length === 0) {
      return 'Email standard sans indicateur de priorité élevée';
    }

    return `${reasons.join('. ')}.`;
  }

  /**
   * Ajoute un émetteur important
   */
  addImportantSender(email: string): void {
    this.importantSenders.add(email.toLowerCase());
  }

  /**
   * Ajoute un mot-clé urgent personnalisé
   */
  addUrgentKeyword(keyword: string): void {
    this.urgentKeywords.add(keyword.toLowerCase());
  }
}
