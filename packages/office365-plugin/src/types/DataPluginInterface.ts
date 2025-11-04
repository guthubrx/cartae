/**
 * DataPluginInterface Types
 * Types for Office365Plugin implementation of DataPluginInterface pattern
 */

import { CartaeItem } from '@cartae/core';

export type ConnectionState = 'disconnected' | 'checking' | 'connected' | 'failed';

export interface IPluginContext {
  events?: {
    emit(event: string, data: any): void;
  };
  [key: string]: any;
}

export interface DataSearchOptions {
  query?: string;
  types?: string[];
  tags?: string[];
  startDate?: string | Date;
  endDate?: string | Date;
  limit?: number;
}

export interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
  syncedAt: Date;
  duration: number;
}

export interface DataPluginInterface {
  connectionState: ConnectionState;

  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  getRecent(limit?: number): Promise<CartaeItem[]>;
  search(options: DataSearchOptions): Promise<CartaeItem[]>;
  sync(): Promise<SyncResult>;
  isConnected(): boolean;
}
