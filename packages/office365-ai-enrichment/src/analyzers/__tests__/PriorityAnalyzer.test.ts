import { describe, it, expect, beforeEach } from 'vitest';
import { PriorityAnalyzer } from '../PriorityAnalyzer';

describe('PriorityAnalyzer', () => {
  let analyzer: PriorityAnalyzer;

  beforeEach(() => {
    analyzer = new PriorityAnalyzer();
  });

  describe('analyze', () => {
    it('donne un score élevé aux emails urgents', () => {
      const subject = 'URGENT: Problème critique';
      const body = "Besoin d'une réponse immédiate, deadline aujourd'hui!";
      const sender = 'user@example.com';

      const result = analyzer.analyze(subject, body, sender);

      expect(result.score).toBeGreaterThan(50);
      expect(result.factors.urgentKeywords).toBeGreaterThan(0);
    });

    it('augmente le score pour les émetteurs importants', () => {
      const analyzerWithImportant = new PriorityAnalyzer([], ['ceo@company.com']);

      const subject = 'Réunion hebdomadaire';
      const body = 'Planning de la semaine';
      const sender = 'ceo@company.com';

      const result = analyzerWithImportant.analyze(subject, body, sender);

      expect(result.factors.senderImportance).toBe(30);
    });

    it('détecte les postes de direction automatiquement', () => {
      const subject = 'Réunion';
      const body = 'Discussion sur le projet';
      const sender = 'ceo@company.com';

      const result = analyzer.analyze(subject, body, sender);

      expect(result.factors.senderImportance).toBeGreaterThan(0);
    });

    it('augmente le score pour le contenu long et complexe', () => {
      const subject = 'Projet important';
      const longBody =
        'Lorem ipsum dolor sit amet, '.repeat(100) +
        '\nQuestion 1: Pourquoi?\nQuestion 2: Comment?\nPlease review this.';
      const sender = 'user@example.com';

      const result = analyzer.analyze(subject, longBody, sender);

      expect(result.factors.contentComplexity).toBeGreaterThan(10);
    });

    it('génère un reasoning clair', () => {
      const subject = 'URGENT: Review needed';
      const body = 'Please review ASAP';
      const sender = 'manager@company.com';

      const result = analyzer.analyze(subject, body, sender);

      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('score entre 0 et 100', () => {
      const subject = 'Test';
      const body = 'Simple email';
      const sender = 'user@example.com';

      const result = analyzer.analyze(subject, body, sender);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('personnalisation', () => {
    it('ajoute un émetteur important', () => {
      analyzer.addImportantSender('vip@company.com');

      const result = analyzer.analyze('Test', 'Body', 'vip@company.com');

      expect(result.factors.senderImportance).toBe(30);
    });

    it('ajoute un mot-clé urgent personnalisé', () => {
      analyzer.addUrgentKeyword('hot');

      const result = analyzer.analyze('Hot item', 'This is hot', 'user@example.com');

      expect(result.factors.urgentKeywords).toBeGreaterThan(0);
    });
  });
});
