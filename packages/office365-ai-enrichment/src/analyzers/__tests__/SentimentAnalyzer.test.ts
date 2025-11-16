import { describe, it, expect, beforeEach } from 'vitest';
import { SentimentAnalyzer } from '../SentimentAnalyzer';

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer;

  beforeEach(() => {
    analyzer = new SentimentAnalyzer();
  });

  describe('analyze', () => {
    it('détecte le sentiment positif', () => {
      const text = 'Excellent travail! Bravo pour ce succès, très content!';
      const result = analyzer.analyze(text);

      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('détecte le sentiment négatif', () => {
      const text = 'Problème critique! Échec du déploiement, très préoccupé par les erreurs.';
      const result = analyzer.analyze(text);

      expect(result.sentiment).toBe('negative');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(0);
    });

    it('détecte le sentiment neutre', () => {
      const text = 'Voici le rapport demandé. Les données sont dans le fichier joint.';
      const result = analyzer.analyze(text);

      expect(result.sentiment).toBe('neutral');
    });

    it('gère les intensificateurs correctement', () => {
      const textNormal = 'Content du résultat';
      const textIntensified = 'Très content du résultat';

      const resultNormal = analyzer.analyze(textNormal);
      const resultIntensified = analyzer.analyze(textIntensified);

      expect(resultIntensified.confidence).toBeGreaterThanOrEqual(resultNormal.confidence);
    });

    it('gère le texte vide', () => {
      const result = analyzer.analyze('');

      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBe(0);
      expect(result.keywords).toEqual([]);
    });

    it("supporte le français et l'anglais", () => {
      const textFr = 'Excellent travail, parfait!';
      const textEn = 'Excellent work, perfect!';

      const resultFr = analyzer.analyze(textFr);
      const resultEn = analyzer.analyze(textEn);

      expect(resultFr.sentiment).toBe('positive');
      expect(resultEn.sentiment).toBe('positive');
    });
  });

  describe('mots-clés personnalisés', () => {
    it('ajoute des mots-clés positifs personnalisés', () => {
      analyzer.addPositiveKeywords(['génial', 'top']);

      const result = analyzer.analyze("C'est génial et top!");

      expect(result.sentiment).toBe('positive');
      expect(result.keywords).toContain('génial');
      expect(result.keywords).toContain('top');
    });

    it('ajoute des mots-clés négatifs personnalisés', () => {
      analyzer.addNegativeKeywords(['catastrophique', 'horrible']);

      const result = analyzer.analyze("C'est catastrophique et horrible!");

      expect(result.sentiment).toBe('negative');
      expect(result.keywords).toContain('catastrophique');
      expect(result.keywords).toContain('horrible');
    });
  });
});
