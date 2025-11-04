/**
 * OwaEmailService
 * Service pour récupérer les emails via l'API OWA (Outlook Web Access)
 */

import { Office365AuthService } from './Office365AuthService';
import { Office365Email } from '../types/office365.types';

const OWA_BASE_URL = 'https://outlook.office365.com/api';
const OWA_MESSAGES_ENDPOINT = '/v2.0/me/mailfolders/inbox/messages';

export class OwaEmailService {
  constructor(private authService: Office365AuthService) {}

  /**
   * Récupère les emails récents de la boîte de réception
   */
  async getRecentEmails(limit: number = 50): Promise<Office365Email[]> {
    try {
      const token = await this.authService.getToken();
      const url = `${OWA_BASE_URL}${OWA_MESSAGES_ENDPOINT}?$top=${Math.min(limit, 200)}&$orderby=receivedDateTime desc`;

      const response = await fetch(url, {
        headers: this.buildHeaders(token),
      });

      if (!response.ok) {
        throw new Error(`OWA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseEmailsResponse(data);
    } catch (error) {
      console.error('[OwaEmailService] Error fetching recent emails:', error);
      return [];
    }
  }

  /**
   * Recherche des emails (filtre côté client)
   */
  async searchEmails(query: string): Promise<Office365Email[]> {
    try {
      // Récupérer plus d'emails pour la recherche
      const allEmails = await this.getRecentEmails(100);

      // Filtrer côté client
      const queryLower = query.toLowerCase();
      return allEmails.filter(
        (email) =>
          email.subject.toLowerCase().includes(queryLower) ||
          email.from.name.toLowerCase().includes(queryLower) ||
          email.from.email.toLowerCase().includes(queryLower) ||
          email.bodyPreview.toLowerCase().includes(queryLower)
      );
    } catch (error) {
      console.error('[OwaEmailService] Error searching emails:', error);
      return [];
    }
  }

  /**
   * Récupère un email par son ID
   */
  async getEmailById(id: string): Promise<Office365Email | null> {
    try {
      const token = await this.authService.getToken();
      const url = `${OWA_BASE_URL}/v2.0/me/messages/${id}`;

      const response = await fetch(url, {
        headers: this.buildHeaders(token),
      });

      if (!response.ok) {
        throw new Error(`OWA API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseEmailResponse(data);
    } catch (error) {
      console.error('[OwaEmailService] Error fetching email by ID:', error);
      return null;
    }
  }

  /**
   * Construit les headers d'authentification
   */
  private buildHeaders(token: string): HeadersInit {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Parse la réponse d'une liste d'emails
   */
  private parseEmailsResponse(data: any): Office365Email[] {
    if (!data.value || !Array.isArray(data.value)) {
      return [];
    }

    return data.value.map((item: any) => this.parseEmailResponse(item)).filter(Boolean);
  }

  /**
   * Parse un email individuel
   */
  private parseEmailResponse(email: any): Office365Email | null {
    if (!email.id) {
      return null;
    }

    return {
      id: email.id,
      subject: email.subject || '(No Subject)',
      bodyPreview: email.bodyPreview || '',
      from: {
        name: email.from?.emailAddress?.name || 'Unknown',
        email: email.from?.emailAddress?.address || '',
      },
      receivedDateTime: email.receivedDateTime || new Date().toISOString(),
      hasAttachments: email.hasAttachments || false,
      importance: email.importance?.toLowerCase() as any,
      isRead: email.isRead,
      flag: email.flag,
    };
  }
}
