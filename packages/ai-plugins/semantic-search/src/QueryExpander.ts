/**
 * Query Expander - Élargit les requêtes pour améliorer la recherche
 */

import type { CartaeItem } from '@cartae/ai-types';

/**
 * Query Expander
 *
 * Élargit une requête simple en incluant des variantes et synonymes.
 * Exemple: "budget" → ["budget", "finances", "money", "spending", "allocation"]
 */
export class QueryExpander {
  private synonyms: Map<string, string[]>;

  constructor() {
    // Initialiser avec quelques synonymes courants
    this.synonyms = new Map([
      // Domaine financier
      ['budget', ['finances', 'money', 'spending', 'allocation', 'funds']],
      ['cost', ['expense', 'price', 'amount', 'spending']],
      ['sale', ['selling', 'revenue', 'income', 'transaction']],

      // Domaine projet
      ['project', ['task', 'work', 'assignment', 'initiative']],
      ['deadline', ['duedate', 'deadline', 'expiry', 'enddate']],
      ['blocker', ['blocked', 'obstacle', 'issue', 'problem', 'bloquant']],

      // Domaine communication
      ['meeting', ['call', 'discussion', 'conference', 'sync']],
      ['urgent', ['critical', 'asap', 'priority', 'important']],
      ['client', ['customer', 'account', 'contact', 'partner']],

      // Domaine général
      ['error', ['bug', 'issue', 'problem', 'failure']],
      ['request', ['ask', 'demand', 'requirement', 'need']],
    ]);
  }

  /**
   * Élargit une requête
   * @param query Requête originale
   * @param context Items de contexte optionnels
   * @returns Requêtes élargies
   */
  expand(query: string, context?: CartaeItem[]): string[] {
    const expanded = new Set<string>();

    // Ajouter la requête originale
    expanded.add(query.toLowerCase());

    // Ajouter les synonymes
    const terms = query.toLowerCase().split(/\s+/);
    for (const term of terms) {
      // Synonymes directs
      if (this.synonyms.has(term)) {
        const syns = this.synonyms.get(term) || [];
        syns.forEach((s: string) => expanded.add(s));
      }

      // Variantes morphologiques simples
      expanded.add(term); // singulier
      if (term.endsWith('s')) {
        expanded.add(term.slice(0, -1)); // pluriel → singulier
      } else {
        expanded.add(term + 's'); // singulier → pluriel
      }
    }

    // Extraire des tags depuis le contexte
    if (context) {
      for (const item of context) {
        if (item.tags) {
          for (const tag of item.tags) {
            const cleanTag = tag.replace(/^#/, '').toLowerCase();
            expanded.add(cleanTag);
          }
        }
      }
    }

    // Retourner comme array
    return Array.from(expanded).slice(0, 10); // Limiter à 10 termes
  }

  /**
   * Ajoute un synonyme personnalisé
   */
  addSynonym(term: string, synonyms: string[]): void {
    this.synonyms.set(term.toLowerCase(), synonyms.map(s => s.toLowerCase()));
  }

  /**
   * Ajoute plusieurs synonymes
   */
  addSynonyms(synonymMap: Record<string, string[]>): void {
    for (const [term, syns] of Object.entries(synonymMap)) {
      this.addSynonym(term, syns);
    }
  }
}
