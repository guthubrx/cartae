/**
 * Template Renderer - Rendu des templates Handlebars
 * Charge les templates depuis packages/email-service/src/templates/
 */

import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers les templates (relatif à ce fichier)
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Cache des templates compilés (évite de relire le fichier à chaque fois)
 */
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

/**
 * Charge et compile un template Handlebars
 */
async function loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
  // Vérifier le cache
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  // Charger depuis le fichier
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.hbs`);

  try {
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const compiled = Handlebars.compile(templateSource);

    // Mettre en cache
    templateCache.set(templateName, compiled);

    return compiled;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `Template "${templateName}" introuvable.\n` +
        `Chemin attendu: ${templatePath}\n` +
        `Templates disponibles: ${await listTemplates()}`
      );
    }
    throw error;
  }
}

/**
 * Liste les templates disponibles
 */
async function listTemplates(): Promise<string> {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);
    const templates = files
      .filter((f) => f.endsWith('.hbs'))
      .map((f) => f.replace('.hbs', ''));
    return templates.join(', ');
  } catch {
    return 'Aucun template trouvé';
  }
}

/**
 * Rendu d'un template avec données
 * @param templateName Nom du template (sans .hbs)
 * @param data Données pour le template
 * @returns { subject, html, text } - Email rendu
 */
export async function renderTemplate(
  templateName: string,
  data: Record<string, any>
): Promise<{ subject: string; html: string; text?: string }> {
  const template = await loadTemplate(templateName);

  // Rendu HTML
  const html = template(data);

  // Extraction du subject depuis le template (convention: première ligne = subject)
  // Format attendu: <!-- SUBJECT: Votre sujet ici -->
  const subjectMatch = html.match(/<!--\s*SUBJECT:\s*(.+?)\s*-->/);
  const subject = subjectMatch ? subjectMatch[1] : `[${templateName}]`;

  // Génération version texte simple (strip HTML)
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * Supprime les balises HTML pour version texte
 */
function stripHtml(html: string): string {
  return html
    .replace(/<!--.*?-->/gs, '') // Supprimer commentaires HTML
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Supprimer styles
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Supprimer scripts
    .replace(/<[^>]+>/g, '') // Supprimer balises
    .replace(/\s+/g, ' ') // Normaliser espaces
    .trim();
}

/**
 * Clear template cache (utile en dev)
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}

/**
 * Register custom Handlebars helpers
 */
Handlebars.registerHelper('formatDate', (date: Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
});

Handlebars.registerHelper('uppercase', (str: string) => {
  return str.toUpperCase();
});

Handlebars.registerHelper('formatCurrency', (amount: number, currency = 'EUR') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
});
