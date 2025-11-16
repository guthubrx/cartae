import { describe, it, expect, beforeEach } from 'vitest';
import { EnrichmentService } from '../EnrichmentService';

describe('EnrichmentService', () => {
  let service: EnrichmentService;

  beforeEach(() => {
    service = new EnrichmentService();
  });

  describe('enrichEmail', () => {
    it('enrichit un email avec toutes les analyses', async () => {
      const subject = 'URGENT: Projet à livrer';
      const body = `
Bonjour,

Voici les tâches urgentes pour aujourd'hui :
- Finaliser le rapport
- Envoyer la présentation au client
- Valider les données

Deadline: demain 17h

Merci!
      `;
      const senderEmail = 'manager@company.com';

      const result = await service.enrichEmail(subject, body, senderEmail);

      // Vérifier sentiment
      expect(result.sentiment).toBeDefined();
      expect(result.sentiment.sentiment).toMatch(/positive|negative|neutral/);
      expect(result.sentiment.confidence).toBeGreaterThanOrEqual(0);
      expect(result.sentiment.confidence).toBeLessThanOrEqual(1);

      // Vérifier priority
      expect(result.priority).toBeDefined();
      expect(result.priority.score).toBeGreaterThanOrEqual(0);
      expect(result.priority.score).toBeLessThanOrEqual(100);
      expect(result.priority.reasoning).toBeTruthy();

      // Vérifier deadline
      expect(result.deadline).toBeDefined();
      // Devrait trouver "demain 17h"
      if (result.deadline.deadline) {
        expect(result.deadline.deadline).toBeInstanceOf(Date);
      }

      // Vérifier action items
      expect(result.actionItems).toBeDefined();
      expect(result.actionItems.length).toBeGreaterThan(0);

      // Vérifier enrichedAt
      expect(result.enrichedAt).toBeInstanceOf(Date);
    });

    it('respecte la config (désactiver certaines analyses)', async () => {
      const serviceCustom = new EnrichmentService({
        enableSentiment: false,
        enablePriority: false,
        enableDeadline: true,
        enableActionItems: true,
      });

      const result = await serviceCustom.enrichEmail('Test', 'Body', 'user@example.com');

      // Sentiment et Priority désactivés = valeurs par défaut
      expect(result.sentiment.sentiment).toBe('neutral');
      expect(result.sentiment.confidence).toBe(0);
      expect(result.priority.reasoning).toContain('disabled');

      // Deadline et ActionItems activés
      expect(result.deadline).toBeDefined();
      expect(result.actionItems).toBeDefined();
    });

    it('gère les mots-clés urgents personnalisés', async () => {
      const serviceCustom = new EnrichmentService({
        urgentKeywords: ['hot', 'fire'],
      });

      const result = await serviceCustom.enrichEmail(
        'Hot item',
        'This is fire!',
        'user@example.com'
      );

      expect(result.priority.factors.urgentKeywords).toBeGreaterThan(0);
    });

    it('gère les émetteurs importants personnalisés', async () => {
      const serviceCustom = new EnrichmentService({
        importantSenders: ['vip@company.com'],
      });

      const result = await serviceCustom.enrichEmail('Meeting', "Let's discuss", 'vip@company.com');

      expect(result.priority.factors.senderImportance).toBe(30);
    });
  });

  describe('configuration', () => {
    it('met à jour la config', () => {
      service.updateConfig({
        enableSentiment: false,
        urgentKeywords: ['test'],
      });

      const config = service.getConfig();

      expect(config.enableSentiment).toBe(false);
      expect(config.urgentKeywords).toContain('test');
    });

    it('récupère la config actuelle', () => {
      const config = service.getConfig();

      expect(config.enableSentiment).toBe(true);
      expect(config.enablePriority).toBe(true);
      expect(config.enableDeadline).toBe(true);
      expect(config.enableActionItems).toBe(true);
    });
  });

  describe('helpers personnalisation', () => {
    it('ajoute un mot-clé de sentiment positif', async () => {
      service.addPositiveSentimentKeyword('awesome');

      const result = await service.enrichEmail('Awesome work', 'Great!', 'user@example.com');

      expect(result.sentiment.keywords).toContain('awesome');
    });

    it('ajoute un mot-clé de sentiment négatif', async () => {
      service.addNegativeSentimentKeyword('disaster');

      const result = await service.enrichEmail('Disaster', 'Problems!', 'user@example.com');

      expect(result.sentiment.keywords).toContain('disaster');
    });

    it("ajoute un verbe d'action", async () => {
      service.addActionVerb('review');

      const result = await service.enrichEmail('Task', 'Review the code.', 'user@example.com');

      expect(result.actionItems.length).toBeGreaterThan(0);
    });
  });
});
