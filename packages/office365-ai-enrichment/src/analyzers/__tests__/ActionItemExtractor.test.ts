import { describe, it, expect, beforeEach } from 'vitest';
import { ActionItemExtractor } from '../ActionItemExtractor';

describe('ActionItemExtractor', () => {
  let extractor: ActionItemExtractor;

  beforeEach(() => {
    extractor = new ActionItemExtractor();
  });

  describe('extract', () => {
    it('extrait des action items depuis une liste à puces', () => {
      const subject = 'Tasks';
      const body = `
Voici les tâches :
- Envoyer le rapport au client
- Préparer la présentation
- Contacter le fournisseur
      `;

      const result = extractor.extract(subject, body);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(item => item.text.includes('rapport'))).toBeTruthy();
      expect(result.some(item => item.text.includes('présentation'))).toBeTruthy();
    });

    it('extrait des TODOs explicites', () => {
      const subject = 'Action items';
      const body = "TODO: Finaliser le document\nÀ faire: Valider avec l'équipe";

      const result = extractor.extract(subject, body);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(item => item.text.includes('Finaliser'))).toBeTruthy();
    });

    it('extrait des checkboxes', () => {
      const subject = 'Checklist';
      const body = `
[ ] Créer le prototype
[ ] Tester l'application
[ ] Déployer en production
      `;

      const result = extractor.extract(subject, body);

      expect(result.length).toBe(3);
    });

    it('extrait des phrases impératives', () => {
      const subject = 'Urgent';
      const body = 'Envoyer les fichiers avant 17h. Vérifier les données.';

      const result = extractor.extract(subject, body);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(item => item.text.includes('Envoyer'))).toBeTruthy();
    });

    it('extrait des actions en anglais (please, can you, etc.)', () => {
      const subject = 'Request';
      const body = 'Please review the document. Can you send me the report?';

      const result = extractor.extract(subject, body);

      expect(result.length).toBeGreaterThan(0);
    });

    it('déduplique les action items similaires', () => {
      const subject = 'Tasks';
      const body = `
- Envoyer le rapport
TODO: Envoyer le rapport
      `;

      const result = extractor.extract(subject, body);

      // Ne devrait pas dupliquer "Envoyer le rapport"
      const sendReportItems = result.filter(item => item.text.toLowerCase().includes('rapport'));
      expect(sendReportItems.length).toBe(1);
    });

    it('trie par confiance décroissante', () => {
      const subject = 'Mixed';
      const body = `
TODO: Task explicite
Envoyer quelque chose.
- Liste à puces
      `;

      const result = extractor.extract(subject, body);

      // Les TODOs explicites et listes devraient avoir plus de confiance
      expect(result[0].confidence).toBeGreaterThanOrEqual(result[result.length - 1].confidence);
    });

    it('ignore les textes trop courts', () => {
      const subject = 'Test';
      const body = '- OK\n- Go\n- Do';

      const result = extractor.extract(subject, body);

      // Textes trop courts ignorés (< 5 chars)
      expect(result.length).toBe(0);
    });

    it('retourne un tableau vide si aucune action', () => {
      const subject = 'Info';
      const body = 'Ceci est juste informatif, aucune action requise.';

      const result = extractor.extract(subject, body);

      expect(result).toEqual([]);
    });
  });

  describe('personnalisation', () => {
    it("ajoute un verbe d'action personnalisé", () => {
      extractor.addActionVerb('implementer');

      const result = extractor.extract('Task', 'Implementer la nouvelle fonctionnalité.');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].text).toContain('Implementer');
    });
  });
});
