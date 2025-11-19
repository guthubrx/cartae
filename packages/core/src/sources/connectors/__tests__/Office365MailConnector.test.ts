/**
 * Tests pour Office365MailConnector
 *
 * Tests unitaires couvrant :
 * - validateConfig : Validation de configuration
 * - testConnection : Test de connexion avec mocks
 * - sync : Synchronisation avec mocks
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { Office365MailConnector } from '../Office365MailConnector';
import type { FieldMapping } from '../../types';

/**
 * Mock du TokenInterceptorService
 */
const mockTokenInterceptor = {
  startMonitoring: vi.fn().mockResolvedValue(undefined),
  stopMonitoring: vi.fn(),
  getToken: vi.fn().mockResolvedValue('mock-token-owa'),
  hasTokens: vi.fn().mockReturnValue(true),
  isAuthenticated: vi.fn().mockReturnValue(true),
};

/**
 * Mock du OwaRestEmailService
 */
const mockOwaService = {
  listInboxEmails: vi.fn().mockResolvedValue([
    {
      id: 'email-1',
      subject: 'Test Email 1',
      from: { name: 'Alice', email: 'alice@example.com' },
      to: [{ name: 'Bob', email: 'bob@example.com' }],
      body: 'Test body 1',
      bodyType: 'text',
      receivedDateTime: new Date('2025-01-01T10:00:00Z'),
      hasAttachments: false,
      isRead: false,
    },
    {
      id: 'email-2',
      subject: 'Test Email 2',
      from: { name: 'Charlie', email: 'charlie@example.com' },
      to: [{ name: 'Bob', email: 'bob@example.com' }],
      body: 'Test body 2',
      bodyType: 'html',
      receivedDateTime: new Date('2025-01-02T10:00:00Z'),
      hasAttachments: true,
      isRead: true,
    },
  ]),
};

/**
 * Mock de transformEmailToCartaeItem
 */
const mockTransformEmailToCartaeItem = vi.fn((email, options) => ({
  id: `cartae-${email.id}`,
  type: 'email' as const,
  title: email.subject,
  content: email.body,
  metadata: {
    author: email.from.email,
    participants: email.to.map((t: any) => t.email),
    priority: options?.extractPriority ? 'medium' : undefined,
    status: email.isRead ? 'completed' : 'new',
    office365: {
      emailId: email.id,
      hasAttachments: email.hasAttachments,
      isRead: email.isRead,
      bodyType: email.bodyType,
      fromName: email.from.name,
      toRecipients: email.to,
    },
  },
  tags: options?.addDefaultTags ? ['email', 'office365'] : [],
  source: {
    connector: 'office365',
    originalId: email.id,
    url: `https://outlook.office.com/mail/inbox/id/${email.id}`,
    lastSync: new Date(),
  },
  createdAt: email.receivedDateTime,
  updatedAt: new Date(),
  archived: false,
  favorite: false,
}));

/**
 * Mock des imports dynamiques
 */
vi.mock('@cartae-private/office365-connector/src/services/auth/TokenInterceptorService', () => ({
  TokenInterceptorService: vi.fn(() => mockTokenInterceptor),
}));

vi.mock('@cartae-private/office365-connector/src/services/OwaRestEmailService', () => ({
  OwaRestEmailService: vi.fn(() => mockOwaService),
}));

vi.mock('@cartae-private/office365-connector/src/transformers/EmailTransformer', () => ({
  transformEmailToCartaeItem: mockTransformEmailToCartaeItem,
}));

describe('Office365MailConnector', () => {
  let connector: Office365MailConnector;

  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks();

    // Réinitialiser les valeurs de retour des mocks
    mockOwaService.listInboxEmails.mockResolvedValue([
      {
        id: 'email-1',
        subject: 'Test Email 1',
        from: { name: 'Alice', email: 'alice@example.com' },
        to: [{ name: 'Bob', email: 'bob@example.com' }],
        body: 'Test body 1',
        bodyType: 'text',
        receivedDateTime: new Date('2025-01-01T10:00:00Z'),
        hasAttachments: false,
        isRead: false,
      },
      {
        id: 'email-2',
        subject: 'Test Email 2',
        from: { name: 'Charlie', email: 'charlie@example.com' },
        to: [{ name: 'Bob', email: 'bob@example.com' }],
        body: 'Test body 2',
        bodyType: 'html',
        receivedDateTime: new Date('2025-01-02T10:00:00Z'),
        hasAttachments: true,
        isRead: true,
      },
    ]);

    mockTransformEmailToCartaeItem.mockImplementation((email, options) => ({
      id: `cartae-${email.id}`,
      type: 'email' as const,
      title: email.subject,
      content: email.body,
      metadata: {
        author: email.from.email,
        participants: email.to.map((t: any) => t.email),
        priority: options?.extractPriority ? 'medium' : undefined,
        status: email.isRead ? 'completed' : 'new',
        office365: {
          emailId: email.id,
          hasAttachments: email.hasAttachments,
          isRead: email.isRead,
          bodyType: email.bodyType,
          fromName: email.from.name,
          toRecipients: email.to,
        },
      },
      tags: options?.addDefaultTags ? ['email', 'office365'] : [],
      source: {
        connector: 'office365',
        originalId: email.id,
        url: `https://outlook.office.com/mail/inbox/id/${email.id}`,
        lastSync: new Date(),
      },
      createdAt: email.receivedDateTime,
      updatedAt: new Date(),
      archived: false,
      favorite: false,
    }));

    mockTokenInterceptor.isAuthenticated.mockReturnValue(true);
    mockTokenInterceptor.hasTokens.mockReturnValue(true);

    // Créer une nouvelle instance
    connector = new Office365MailConnector();
  });

  describe('validateConfig', () => {
    it('devrait valider une configuration correcte', () => {
      const config = {
        serviceType: 'owa',
        maxResults: 50,
        unreadOnly: false,
        addDefaultTags: true,
        extractPriority: true,
      };

      const result = connector.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('devrait rejeter serviceType manquant', () => {
      const config = {
        maxResults: 50,
      };

      const result = connector.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('serviceType est requis');
    });

    it('devrait rejeter serviceType != "owa"', () => {
      const config = {
        serviceType: 'graph', // Incorrect pour Mail
      };

      const result = connector.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors).toContain('serviceType doit être "owa" pour le connecteur Mail');
    });

    it('devrait rejeter maxResults invalide (< 1)', () => {
      const config = {
        serviceType: 'owa',
        maxResults: 0,
      };

      const result = connector.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('maxResults'))).toBe(true);
    });

    it('devrait rejeter maxResults invalide (> 1000)', () => {
      const config = {
        serviceType: 'owa',
        maxResults: 1500,
      };

      const result = connector.validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('maxResults'))).toBe(true);
    });

    it('devrait accepter configuration minimale', () => {
      const config = {
        serviceType: 'owa',
      };

      const result = connector.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('testConnection', () => {
    it('devrait réussir le test de connexion avec tokens disponibles', async () => {
      const config = {
        serviceType: 'owa',
        maxResults: 50,
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Connexion réussie');
      expect(result.details).toBeDefined();
      expect(result.details?.endpoint).toBe('https://outlook.office.com/api/v2.0');
      expect(result.details?.auth).toBe('ok');
      expect(result.details?.sampleData).toBeDefined();
      expect(mockOwaService.listInboxEmails).toHaveBeenCalledWith(3);
    });

    it('devrait échouer si configuration invalide', async () => {
      const config = {
        serviceType: 'graph', // Incorrect
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Configuration invalide');
      expect(result.errors).toBeDefined();
    });

    it('devrait échouer si tokens non disponibles', async () => {
      // Mock token interceptor sans tokens
      mockTokenInterceptor.isAuthenticated.mockReturnValue(false);
      mockTokenInterceptor.hasTokens.mockReturnValue(false);

      const config = {
        serviceType: 'owa',
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentification non disponible');
      expect(result.errors).toBeDefined();
    });

    it('devrait échouer si OwaService lève une erreur', async () => {
      mockOwaService.listInboxEmails.mockRejectedValueOnce(new Error('Network error'));

      const config = {
        serviceType: 'owa',
      };

      const result = await connector.testConnection(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Erreur de connexion à OWA');
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0]).toContain('Network error');
    });
  });

  describe('sync', () => {
    const validConfig = {
      serviceType: 'owa',
      maxResults: 50,
      addDefaultTags: true,
      extractPriority: true,
    };

    const fieldMappings: FieldMapping[] = [];

    it('devrait synchroniser emails avec succès', async () => {
      const result = await connector.sync(validConfig, fieldMappings);

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(2);
      expect(result.errors).toBeUndefined();

      // Vérifier que OwaService a été appelé
      expect(mockOwaService.listInboxEmails).toHaveBeenCalledWith(50);

      // Vérifier que transformer a été appelé pour chaque email
      expect(mockTransformEmailToCartaeItem).toHaveBeenCalledTimes(2);

      // Vérifier structure des items
      expect(result.items[0].type).toBe('email');
      expect(result.items[0].title).toBe('Test Email 1');
      expect(result.items[0].source.connector).toBe('office365');
    });

    it('devrait respecter la limite de sync', async () => {
      const options = { limit: 1 };

      await connector.sync(validConfig, fieldMappings, options);

      // Devrait limiter à 1 email
      expect(mockOwaService.listInboxEmails).toHaveBeenCalledWith(1);
    });

    it('devrait filtrer emails non lus si unreadOnly=true', async () => {
      const configUnreadOnly = {
        ...validConfig,
        unreadOnly: true,
      };

      const result = await connector.sync(configUnreadOnly, fieldMappings);

      // Devrait retourner seulement email-1 (non lu)
      expect(result.items.length).toBe(1);
      expect(result.items[0].title).toBe('Test Email 1');
    });

    it('devrait appeler onProgress si fourni', async () => {
      const onProgress = vi.fn();
      const options = { onProgress };

      await connector.sync(validConfig, fieldMappings, options);

      // Devrait avoir appelé onProgress plusieurs fois (début + chaque email + fin)
      expect(onProgress).toHaveBeenCalled();
      expect(onProgress.mock.calls.length).toBeGreaterThan(0);

      // Vérifier structure de progression
      const firstCall = onProgress.mock.calls[0][0];
      expect(firstCall).toHaveProperty('processed');
      expect(firstCall).toHaveProperty('total');
      expect(firstCall).toHaveProperty('percentage');
    });

    it('devrait gérer les erreurs de transformation', async () => {
      // Mock transformer qui lève une erreur sur le 2e email
      mockTransformEmailToCartaeItem
        .mockImplementationOnce(email => ({
          id: `cartae-${email.id}`,
          type: 'email',
          title: email.subject,
          content: email.body,
          metadata: {},
          tags: [],
          source: { connector: 'office365', originalId: email.id, lastSync: new Date() },
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
        .mockImplementationOnce(() => {
          throw new Error('Transformation error');
        });

      const result = await connector.sync(validConfig, fieldMappings);

      // Devrait avoir 1 item réussi et 1 erreur
      expect(result.items.length).toBe(1);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBe(1);
      expect(result.errors?.[0].itemId).toBe('email-2');
      expect(result.errors?.[0].error).toContain('Transformation error');
    });

    it('devrait échouer si authentification non disponible', async () => {
      // Mock token interceptor sans auth
      mockTokenInterceptor.isAuthenticated.mockReturnValue(false);

      await expect(connector.sync(validConfig, fieldMappings)).rejects.toThrow(
        'Authentification non disponible'
      );
    });

    it('devrait utiliser maxResults de config si pas de limit dans options', async () => {
      const configWithMax = {
        ...validConfig,
        maxResults: 25,
      };

      await connector.sync(configWithMax, fieldMappings);

      expect(mockOwaService.listInboxEmails).toHaveBeenCalledWith(25);
    });

    it('devrait respecter hard limit de 1000 emails', async () => {
      const configHighLimit = {
        ...validConfig,
        maxResults: 5000, // Demande > 1000
      };

      await connector.sync(configHighLimit, fieldMappings);

      // Devrait être limité à 1000
      expect(mockOwaService.listInboxEmails).toHaveBeenCalledWith(1000);
    });
  });

  describe('destroy', () => {
    it('devrait nettoyer les ressources', async () => {
      // Initialiser le token interceptor d'abord en appelant une méthode
      const config = {
        serviceType: 'owa',
      };
      await connector.testConnection(config);

      // Maintenant détruire
      connector.destroy();

      // Vérifier que stopMonitoring a été appelé
      expect(mockTokenInterceptor.stopMonitoring).toHaveBeenCalled();
    });
  });
});
