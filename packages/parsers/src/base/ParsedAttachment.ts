/**
 * Types et interfaces pour résultats de parsing d'attachments
 */

/**
 * Résultat générique de parsing
 */
export interface ParsedAttachment {
  /** Type de fichier parsé */
  type: string;

  /** Texte brut extrait (si applicable) */
  text?: string;

  /** HTML formaté (si applicable) */
  html?: string;

  /** Données structurées (si applicable) */
  data?: any;

  /** Métadonnées du fichier */
  metadata: AttachmentMetadata;

  /** URL de prévisualisation (Blob URL) */
  previewUrl?: string;

  /** Erreur si parsing échoué */
  error?: string;
}

/**
 * Métadonnées communes à tous les fichiers
 */
export interface AttachmentMetadata {
  /** Taille en octets */
  size: number;

  /** Nombre de pages (PDF, DOCX, PPTX) */
  pageCount?: number;

  /** Nombre de feuilles (XLSX, ODS) */
  sheetCount?: number;

  /** Nombre de slides (PPTX, ODP) */
  slideCount?: number;

  /** Dimensions (images) */
  dimensions?: {
    width: number;
    height: number;
  };

  /** Auteur / Créateur */
  author?: string;

  /** Titre du document */
  title?: string;

  /** Date de création */
  creationDate?: Date;

  /** Date de modification */
  modifiedDate?: string;

  /** Nombre de lignes (CSV, spreadsheet) */
  rowCount?: number;

  /** Nombre de colonnes (CSV, spreadsheet) */
  columnCount?: number;

  /** Nombre de fichiers (ZIP) */
  fileCount?: number;

  /** Codec / Format détaillé */
  format?: string;

  /** EXIF data (images) */
  exif?: Record<string, any>;
}

/**
 * Options de parsing
 */
export interface ParseOptions {
  /** Extraire le texte brut */
  extractText?: boolean;

  /** Extraire HTML formaté */
  extractHtml?: boolean;

  /** Extraire données structurées */
  extractData?: boolean;

  /** Générer preview URL */
  generatePreview?: boolean;

  /** Limiter extraction texte (caractères) */
  textLimit?: number;

  /** Limiter extraction data (lignes) */
  dataLimit?: number;
}

/**
 * Erreur de parsing
 */
export class ParsingError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ParsingError';
  }
}
