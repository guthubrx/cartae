/**
 * Office365 AI Enrichment Plugin
 *
 * Plugin qui enrichit automatiquement les emails Office365 avec :
 * - Analyse de sentiment
 * - Scoring de priorité
 * - Extraction de deadlines
 * - Extraction d'action items
 */

import type { CartaeItem } from '@cartae/core';
import type { IPluginContext } from '@cartae/office365-plugin/src/types/DataPluginInterface';
import { EnrichmentService } from './EnrichmentService';
import type { EnrichmentConfig, EnrichmentData } from './types';

export class Office365AIEnrichmentPlugin {
  public readonly manifest = {
    id: 'office365-ai-enrichment',
    name: 'Office 365 AI Enrichment',
    version: '1.0.0',
    description:
      'AI-powered enrichment for Office365 emails: sentiment, priority, deadlines, action items',
    author: 'Cartae Team',
    permissions: ['storage.local'],
    apiVersion: '1.0.0',
    engines: {
      cartae: '^1.0.0',
    },
  };

  private enrichmentService: EnrichmentService;

  private context: IPluginContext | null = null;

  private eventUnsubscribers: Array<() => void> = [];

  constructor(config?: Partial<EnrichmentConfig>) {
    this.enrichmentService = new EnrichmentService(config);
  }

  /**
   * Activation du plugin
   */
  async activate(context: IPluginContext): Promise<void> {
    this.context = context;
    console.log('[Office365AIEnrichmentPlugin] Activation...');

    // S'abonner aux événements item:created et item:updated
    this.subscribeToEvents();

    console.log('[Office365AIEnrichmentPlugin] Plugin activé et événements écoutés');
  }

  /**
   * Désactivation du plugin
   */
  async deactivate(): Promise<void> {
    console.log('[Office365AIEnrichmentPlugin] Désactivation...');

    // Se désabonner des événements
    this.eventUnsubscribers.forEach(unsub => unsub());
    this.eventUnsubscribers = [];

    this.context = null;
  }

  /**
   * S'abonne aux événements EventBus
   */
  private subscribeToEvents(): void {
    if (!this.context?.eventBus) {
      console.warn('[Office365AIEnrichmentPlugin] EventBus non disponible dans le contexte');
      return;
    }

    const { eventBus } = this.context;

    // Écouter item:created (nouveaux items)
    const unsubCreated = eventBus.on('item:created', async (item: CartaeItem) => {
      await this.enrichItem(item);
    });

    // Écouter item:updated (items modifiés)
    const unsubUpdated = eventBus.on('item:updated', async (item: CartaeItem) => {
      await this.enrichItem(item);
    });

    this.eventUnsubscribers.push(unsubCreated, unsubUpdated);

    console.log('[Office365AIEnrichmentPlugin] Événements item:created et item:updated écoutés');
  }

  /**
   * Enrichit un item avec les données AI
   */
  private async enrichItem(item: CartaeItem): Promise<void> {
    try {
      // Vérifier que c'est un email Office365
      if (!this.isOffice365Email(item)) {
        return; // Ignorer les items non-Office365
      }

      console.log(`[Office365AIEnrichmentPlugin] Enrichissement de l'item ${item.id}...`);

      // Extraire les données nécessaires
      const subject = item.title || '';
      const body = item.content || '';
      const senderEmail = this.extractSenderEmail(item);

      // Enrichir l'email
      const enrichment = await this.enrichmentService.enrichEmail(subject, body, senderEmail);

      // Stocker les données d'enrichissement dans les métadonnées de l'item
      await this.saveEnrichment(item, enrichment);

      console.log(`[Office365AIEnrichmentPlugin] Item ${item.id} enrichi avec succès`, enrichment);
    } catch (error) {
      console.error(
        `[Office365AIEnrichmentPlugin] Erreur lors de l'enrichissement de l'item ${item.id}:`,
        error
      );
    }
  }

  /**
   * Vérifie si un item est un email Office365
   */
  private isOffice365Email(item: CartaeItem): boolean {
    return (
      String(item.source) === 'office365-outlook' ||
      (item.metadata as any)?.sourcePlugin === 'office365-outlook'
    );
  }

  /**
   * Extrait l'email de l'émetteur depuis les métadonnées
   */
  private extractSenderEmail(item: CartaeItem): string {
    const metadata = item.metadata as any;
    return metadata?.sender?.email || metadata?.from?.emailAddress?.address || '';
  }

  /**
   * Sauvegarde les données d'enrichissement dans l'item
   */
  private async saveEnrichment(item: CartaeItem, enrichment: EnrichmentData): Promise<void> {
    if (!this.context?.storage) {
      console.warn(
        '[Office365AIEnrichmentPlugin] Storage non disponible, enrichissement non sauvegardé'
      );
      return;
    }

    // Mettre à jour les métadonnées de l'item avec les données d'enrichissement
    const updatedItem: CartaeItem = {
      ...item,
      metadata: {
        ...item.metadata,
        aiEnrichment: {
          sentiment: enrichment.sentiment.sentiment,
          sentimentConfidence: enrichment.sentiment.confidence,
          sentimentKeywords: enrichment.sentiment.keywords,
          priorityScore: enrichment.priority.score,
          priorityFactors: enrichment.priority.factors,
          priorityReasoning: enrichment.priority.reasoning,
          deadline: enrichment.deadline.deadline,
          deadlineConfidence: enrichment.deadline.confidence,
          deadlineText: enrichment.deadline.extractedText,
          actionItems: enrichment.actionItems.map(ai => ({
            text: ai.text,
            confidence: ai.confidence,
          })),
          enrichedAt: enrichment.enrichedAt.toISOString(),
        },
      },
    };

    // Sauvegarder l'item mis à jour
    await this.context.storage.updateItem(updatedItem);
  }

  /**
   * Met à jour la configuration du service d'enrichissement
   */
  updateConfig(config: Partial<EnrichmentConfig>): void {
    this.enrichmentService.updateConfig(config);
  }

  /**
   * Récupère la configuration actuelle
   */
  getConfig(): EnrichmentConfig {
    return this.enrichmentService.getConfig();
  }
}
