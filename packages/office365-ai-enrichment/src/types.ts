/**
 * Types pour l'enrichissement AI des emails Office365
 */

export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
  sentiment: SentimentType;
  confidence: number; // 0-1
  keywords: string[]; // Mots-clés qui ont influencé le sentiment
}

export interface PriorityResult {
  score: number; // 0-100
  factors: {
    urgentKeywords: number; // Poids des mots-clés urgents (0-40)
    senderImportance: number; // Poids de l'importance de l'émetteur (0-30)
    contentComplexity: number; // Poids de la complexité du contenu (0-30)
  };
  reasoning: string; // Explication du score
}

export interface DeadlineResult {
  deadline: Date | null;
  confidence: number; // 0-1
  extractedText: string; // Texte original extrait (ex: "demain à 15h")
}

export interface ActionItem {
  text: string; // Texte de l'action (ex: "Envoyer le rapport")
  confidence: number; // 0-1
  context: string; // Contexte autour de l'action item
}

export interface EnrichmentData {
  sentiment: SentimentResult;
  priority: PriorityResult;
  deadline: DeadlineResult;
  actionItems: ActionItem[];
  enrichedAt: Date;
}

export interface EnrichmentConfig {
  enableSentiment: boolean;
  enablePriority: boolean;
  enableDeadline: boolean;
  enableActionItems: boolean;
  urgentKeywords?: string[]; // Mots-clés custom pour urgence
  importantSenders?: string[]; // Emails d'émetteurs importants
}
