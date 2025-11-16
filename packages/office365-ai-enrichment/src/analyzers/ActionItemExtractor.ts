import type { ActionItem } from '../types';

/**
 * Extracteur d'action items (tâches) à partir de texte d'email
 * Détecte les verbes d'action et extrait les tâches à faire
 */
export class ActionItemExtractor {
  private actionVerbs: Set<string>;

  private todoPatterns: RegExp[];

  constructor() {
    // Verbes d'action (français + anglais)
    this.actionVerbs = new Set([
      // Français
      'envoyer',
      'préparer',
      'créer',
      'faire',
      'organiser',
      'planifier',
      'vérifier',
      'valider',
      'approuver',
      'réviser',
      'compléter',
      'terminer',
      'finaliser',
      'soumettre',
      'livrer',
      'contacter',
      'appeler',
      'répondre',
      'confirmer',
      'informer',
      'analyser',
      'examiner',
      'étudier',
      'rechercher',
      'investiguer',
      // Anglais
      'send',
      'prepare',
      'create',
      'make',
      'organize',
      'plan',
      'check',
      'validate',
      'approve',
      'review',
      'complete',
      'finish',
      'finalize',
      'submit',
      'deliver',
      'contact',
      'call',
      'reply',
      'respond',
      'confirm',
      'inform',
      'analyze',
      'examine',
      'study',
      'research',
      'investigate',
    ]);

    // Patterns pour détecter les TODO explicites
    this.todoPatterns = [
      // Français
      /(?:^|\n)\s*-\s*(.+?)(?:\n|$)/gm, // - Liste à puces
      /(?:^|\n)\s*\*\s*(.+?)(?:\n|$)/gm, // * Liste à puces
      /(?:^|\n)\s*\d+\.\s*(.+?)(?:\n|$)/gm, // 1. Liste numérotée
      /(?:^|\n)\s*\[\s*\]\s*(.+?)(?:\n|$)/gm, // [ ] Checkbox
      /(?:todo|à faire)\s*:?\s*(.+?)(?:\n|$)/gi, // TODO: ou À faire:
      /(?:action|task|tâche)\s*:?\s*(.+?)(?:\n|$)/gi, // Action: ou Task:
      // Anglais
      /please\s+(.+?)(?:\.|,|\n|$)/gi, // Please do X
      /could\s+you\s+(.+?)(?:\.|,|\n|$)/gi, // Could you X
      /can\s+you\s+(.+?)(?:\.|,|\n|$)/gi, // Can you X
      /need\s+(?:you\s+)?to\s+(.+?)(?:\.|,|\n|$)/gi, // Need (you) to X
    ];
  }

  /**
   * Extrait les action items d'un texte (sujet + corps d'email)
   */
  extract(subject: string, body: string): ActionItem[] {
    const actionItems: ActionItem[] = [];
    const text = `${subject}\n${body}`;

    // 1. Chercher des TODO explicites (listes, checkboxes, etc.)
    const explicitItems = this.extractExplicitTodos(text);
    actionItems.push(...explicitItems);

    // 2. Chercher des phrases impératives (commandes)
    const imperativeItems = this.extractImperatives(body);
    actionItems.push(...imperativeItems);

    // Dédupliquer et trier par confiance
    const uniqueItems = this.deduplicateItems(actionItems);
    return uniqueItems.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extrait les TODOs explicites (listes, checkboxes, etc.)
   */
  private extractExplicitTodos(text: string): ActionItem[] {
    const items: ActionItem[] = [];

    for (const pattern of this.todoPatterns) {
      let match = pattern.exec(text);
      while (match !== null) {
        const actionText = match[1]?.trim();
        if (actionText && actionText.length > 5) {
          items.push({
            text: actionText,
            confidence: 0.9, // Haute confiance (TODO explicite)
            context: this.extractContext(text, match.index, 50),
          });
        }
        match = pattern.exec(text);
      }
    }

    return items;
  }

  /**
   * Extrait les phrases impératives (commandes)
   */
  private extractImperatives(text: string): ActionItem[] {
    const items: ActionItem[] = [];
    const sentences = text.split(/[.!?]\s+/);

    for (const sentence of sentences) {
      const words = sentence.toLowerCase().split(/\s+/);
      const firstWord = words[0];

      // Vérifier si la phrase commence par un verbe d'action
      if (this.actionVerbs.has(firstWord)) {
        const actionText = sentence.trim();
        if (actionText.length > 10 && actionText.length < 200) {
          items.push({
            text: actionText,
            confidence: 0.6, // Confiance moyenne (impératif détecté)
            context: sentence,
          });
        }
      }
    }

    return items;
  }

  /**
   * Extrait le contexte autour d'une position dans le texte
   */
  private extractContext(text: string, position: number, contextLength: number): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    let context = text.substring(start, end);

    // Trim et nettoyer
    context = context.replace(/\n+/g, ' ').trim();

    // Ajouter ... si tronqué
    if (start > 0) context = `...${context}`;
    if (end < text.length) context += '...';

    return context;
  }

  /**
   * Déduplique les action items similaires
   */
  private deduplicateItems(items: ActionItem[]): ActionItem[] {
    const uniqueMap = new Map<string, ActionItem>();

    for (const item of items) {
      const normalizedText = item.text.toLowerCase().replace(/\s+/g, ' ');

      // Si l'item existe déjà, garder celui avec la plus haute confiance
      const existing = uniqueMap.get(normalizedText);
      if (!existing || item.confidence > existing.confidence) {
        uniqueMap.set(normalizedText, item);
      }
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * Ajoute un verbe d'action personnalisé
   */
  addActionVerb(verb: string): void {
    this.actionVerbs.add(verb.toLowerCase());
  }

  /**
   * Ajoute un pattern de TODO personnalisé
   */
  addTodoPattern(pattern: RegExp): void {
    this.todoPatterns.push(pattern);
  }
}
