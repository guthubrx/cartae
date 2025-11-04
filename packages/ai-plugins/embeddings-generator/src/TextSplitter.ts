/**
 * Text Splitter - Découpe les textes longs en chunks pour embedding
 */

/**
 * Configuration pour TextSplitter
 */
export interface TextSplitterConfig {
  /** Taille maximale d'un chunk en caractères */
  chunkSize?: number;
  /** Chevauchement entre chunks en caractères */
  chunkOverlap?: number;
  /** Séparateurs à utiliser pour split (défaut: paragraphes, phrases, mots) */
  separators?: string[];
}

/**
 * TextSplitter - Découpe les textes longs en chunks
 *
 * Utilise une stratégie récursive de split pour préserver la structure:
 * 1. Paragraphes
 * 2. Phrases
 * 3. Mots
 * 4. Caractères
 */
export class TextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(config: TextSplitterConfig = {}) {
    this.chunkSize = config.chunkSize ?? 1000;
    this.chunkOverlap = config.chunkOverlap ?? 200;
    this.separators = config.separators ?? ['\n\n', '\n', '. ', ' ', ''];
  }

  /**
   * Découpe un texte en chunks
   * @param text Texte à découper
   * @returns Array de chunks
   */
  split(text: string): string[] {
    if (!text) {
      return [];
    }

    // Si le texte est assez court, retourner tel quel
    if (text.length <= this.chunkSize) {
      return [text];
    }

    return this.splitRecursive(text, this.separators);
  }

  /**
   * Split récursif avec fallback sur séparateurs
   */
  private splitRecursive(text: string, separators: string[]): string[] {
    const goodSplits: string[] = [];
    let separator = separators[separators.length - 1];

    // Trouver le meilleur séparateur
    for (const sep of separators) {
      if (sep === '') {
        separator = sep;
        break;
      }

      if (text.includes(sep)) {
        separator = sep;
        break;
      }
    }

    // Découper par le séparateur trouvé
    let splits: string[] = [];
    if (separator === '') {
      splits = text.split(''); // Caractère par caractère
    } else {
      splits = text.split(separator);
    }

    // Fusionner les petits chunks et les morceler si nécessaire
    const mergedTexts = this.mergeSplits(splits, separator);
    return mergedTexts;
  }

  /**
   * Fusionne les splits et les morcelle si > chunkSize
   */
  private mergeSplits(splits: string[], separator: string): string[] {
    const separatorLen = separator.length;
    const result: string[] = [];
    let currentChunk = '';

    for (const split of splits) {
      if (!split) {
        continue;
      }

      const potentialChunk = currentChunk + (currentChunk ? separator : '') + split;

      // Si le chunk potentiel dépasse la limite
      if (potentialChunk.length > this.chunkSize) {
        // Garder le chunk actuel s'il n'est pas vide
        if (currentChunk) {
          result.push(currentChunk);
          // Réappliquer le chevauchement
          currentChunk = this.getOverlapText(split, currentChunk, separator);
        } else {
          // Si le split seul est trop long, le morceler récursivement
          if (split.length > this.chunkSize) {
            const subChunks = this.splitRecursive(split, this.separators.slice(this.separators.indexOf(separator) + 1));
            result.push(...subChunks);
          } else {
            result.push(split);
          }
        }
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Ajouter le chunk final
    if (currentChunk) {
      result.push(currentChunk);
    }

    return result;
  }

  /**
   * Extrait le texte de chevauchement entre deux chunks
   */
  private getOverlapText(newText: string, previousChunk: string, separator: string): string {
    const overlap = previousChunk.slice(-this.chunkOverlap);

    // Assurez-vous que le chevauchement contient du texte réel
    if (overlap.length > 0 && overlap.trim()) {
      return overlap + separator + newText;
    }

    return newText;
  }
}
