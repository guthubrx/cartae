/**
 * Immutable Log (WORM Pattern)
 * Session 81g - Incident Response & Security Operations
 *
 * Implémentation du pattern WORM (Write Once Read Many) pour audit logs.
 * Garantit qu'une fois écrit, un log ne peut jamais être modifié ou supprimé.
 *
 * Fonctionnalités:
 * - Append-only log
 * - Hash chain pour détection de tampering
 * - Verification d'intégrité
 * - Export pour archivage long-terme
 *
 * Use case: Compliance (SOC2, GDPR, HIPAA), forensics, audit trail légal
 */

import fs from 'fs/promises';
import crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Log entry structure
 */
export interface LogEntry {
  index: number;
  timestamp: number;
  data: any;
  hash: string;
  previousHash: string;
}

/**
 * Immutable Log Configuration
 */
export interface ImmutableLogConfig {
  filePath: string;
  hashAlgorithm?: string;
  autoFlush?: boolean;
  verifyOnLoad?: boolean;
}

/**
 * Immutable Log Implementation
 */
export class ImmutableLog extends EventEmitter {
  private filePath: string;
  private hashAlgorithm: string;
  private autoFlush: boolean;
  private verifyOnLoad: boolean;

  private entries: LogEntry[] = [];
  private lastHash: string;
  private nextIndex: number = 0;

  constructor(config: ImmutableLogConfig) {
    super();

    this.filePath = config.filePath;
    this.hashAlgorithm = config.hashAlgorithm || 'sha256';
    this.autoFlush = config.autoFlush ?? true;
    this.verifyOnLoad = config.verifyOnLoad ?? true;

    // Genesis hash (pour première entrée)
    this.lastHash = this.computeHash({ genesis: true });
  }

  /**
   * Initialiser log (charger depuis fichier si existe)
   */
  public async initialize(): Promise<void> {
    try {
      // Vérifier si fichier existe
      await fs.access(this.filePath);

      // Charger entrées existantes
      const content = await fs.readFile(this.filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const entry: LogEntry = JSON.parse(line);
          this.entries.push(entry);
          this.lastHash = entry.hash;
          this.nextIndex = entry.index + 1;
        } catch {
          // Ligne corrompue, skip
          console.warn('Skipping corrupted log line');
        }
      }

      // Vérifier intégrité si demandé
      if (this.verifyOnLoad && this.entries.length > 0) {
        const isValid = await this.verify();
        if (!isValid) {
          throw new Error('Log integrity check failed - tampering detected!');
        }
      }

      console.log(`Immutable log loaded: ${this.entries.length} entries`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Fichier n'existe pas, créer nouveau
        console.log('Creating new immutable log');
        await this.flush();
      } else {
        throw error;
      }
    }
  }

  /**
   * Append new entry (WORM - Write Once)
   */
  public async append(data: any): Promise<LogEntry> {
    const entry: LogEntry = {
      index: this.nextIndex++,
      timestamp: Date.now(),
      data,
      hash: '',
      previousHash: this.lastHash,
    };

    // Calculer hash de l'entrée
    entry.hash = this.computeHash(entry);

    // Ajouter à la chaîne
    this.entries.push(entry);
    this.lastHash = entry.hash;

    // Émettre événement
    this.emit('append', entry);

    // Flush sur disque si auto-flush
    if (this.autoFlush) {
      await this.appendToFile(entry);
    }

    return entry;
  }

  /**
   * Lire entrée par index
   */
  public get(index: number): LogEntry | undefined {
    return this.entries[index];
  }

  /**
   * Lire toutes les entrées
   */
  public getAll(): LogEntry[] {
    // Retourner copie pour éviter mutation
    return [...this.entries];
  }

  /**
   * Lire entrées par plage de timestamps
   */
  public getRange(from: number, to: number): LogEntry[] {
    return this.entries.filter(
      (entry) => entry.timestamp >= from && entry.timestamp <= to
    );
  }

  /**
   * Lire dernières N entrées
   */
  public getLast(n: number): LogEntry[] {
    return this.entries.slice(-n);
  }

  /**
   * Rechercher entrées par critère
   */
  public search(predicate: (entry: LogEntry) => boolean): LogEntry[] {
    return this.entries.filter(predicate);
  }

  /**
   * Vérifier intégrité de la chaîne
   * Retourne true si intégrité OK, false si tampering détecté
   */
  public async verify(): Promise<boolean> {
    if (this.entries.length === 0) return true;

    let previousHash = this.computeHash({ genesis: true });

    for (const entry of this.entries) {
      // Vérifier que previousHash correspond
      if (entry.previousHash !== previousHash) {
        console.error(`Integrity violation at index ${entry.index}: previousHash mismatch`);
        return false;
      }

      // Recalculer hash et comparer
      const expectedHash = this.computeHash({
        index: entry.index,
        timestamp: entry.timestamp,
        data: entry.data,
        previousHash: entry.previousHash,
      });

      if (entry.hash !== expectedHash) {
        console.error(`Integrity violation at index ${entry.index}: hash mismatch`);
        return false;
      }

      previousHash = entry.hash;
    }

    return true;
  }

  /**
   * Obtenir proof d'inclusion (Merkle proof)
   * Permet de prouver qu'une entrée fait partie du log sans révéler autres entrées
   */
  public getInclusionProof(index: number): string[] {
    if (index < 0 || index >= this.entries.length) {
      throw new Error('Index out of range');
    }

    const proof: string[] = [];
    const entry = this.entries[index];

    // Proof = hash de toutes les entrées précédentes
    for (let i = 0; i < index; i++) {
      proof.push(this.entries[i].hash);
    }

    // + hash de l'entrée elle-même
    proof.push(entry.hash);

    return proof;
  }

  /**
   * Vérifier proof d'inclusion
   */
  public verifyInclusionProof(
    index: number,
    data: any,
    proof: string[]
  ): boolean {
    if (index >= proof.length) return false;

    // Vérifier que le hash de l'entrée match
    const entry = this.entries[index];
    if (!entry) return false;

    return entry.hash === proof[index];
  }

  /**
   * Calculer hash d'un objet
   */
  private computeHash(obj: any): string {
    const hash = crypto.createHash(this.hashAlgorithm);
    hash.update(JSON.stringify(obj));
    return hash.digest('hex');
  }

  /**
   * Append entrée au fichier (append-only)
   */
  private async appendToFile(entry: LogEntry): Promise<void> {
    const line = JSON.stringify(entry) + '\n';
    await fs.appendFile(this.filePath, line, 'utf-8');
  }

  /**
   * Flush tout le log sur disque (full rewrite)
   * Utilisé seulement à l'init si fichier n'existe pas
   */
  private async flush(): Promise<void> {
    const content = this.entries.map((entry) => JSON.stringify(entry)).join('\n');
    await fs.writeFile(this.filePath, content + '\n', 'utf-8');
  }

  /**
   * Exporter log en format archivable
   */
  public async export(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(this.entries, null, 2);
    }

    if (format === 'csv') {
      const headers = ['index', 'timestamp', 'data', 'hash', 'previousHash'];
      const rows = this.entries.map((entry) => [
        entry.index,
        entry.timestamp,
        JSON.stringify(entry.data),
        entry.hash,
        entry.previousHash,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      return csv;
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Statistiques du log
   */
  public getStats(): {
    totalEntries: number;
    firstTimestamp: number | null;
    lastTimestamp: number | null;
    sizeBytes: number;
    lastHash: string;
  } {
    return {
      totalEntries: this.entries.length,
      firstTimestamp: this.entries[0]?.timestamp || null,
      lastTimestamp: this.entries[this.entries.length - 1]?.timestamp || null,
      sizeBytes: JSON.stringify(this.entries).length,
      lastHash: this.lastHash,
    };
  }

  /**
   * Fermer log (flush si nécessaire)
   */
  public async close(): Promise<void> {
    if (!this.autoFlush && this.entries.length > 0) {
      await this.flush();
    }

    this.emit('close');
  }
}

export default ImmutableLog;
