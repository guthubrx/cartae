/**
 * Office365 API Response Types
 * Types pour les réponses des APIs Office 365
 */

export interface Office365Email {
  id: string;
  subject: string;
  bodyPreview: string;
  from: {
    name: string;
    email: string;
  };
  receivedDateTime: string;
  hasAttachments: boolean;
  importance?: 'low' | 'normal' | 'high';
  isRead?: boolean;
  flag?: {
    flagStatus: 'flagged' | 'complete' | 'notFlagged';
  };
}

export interface Office365Chat {
  id: string;
  topic?: string;
  messages: Office365Message[];
}

export interface Office365Message {
  id: string;
  body: string;
  from: {
    user: {
      displayName: string;
      email?: string;
    };
  };
  createdDateTime: string;
}

export interface SharePointDocument {
  id: string;
  name: string;
  webUrl: string;
  lastModifiedDateTime: string;
  createdDateTime: string;
  size: number;
  file?: {
    mimeType: string;
  };
  createdBy?: {
    user: {
      displayName: string;
      email: string;
    };
  };
}

export interface PlannerTask {
  id: string;
  title: string;
  body?: string;
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  dueDateTime?: string;
  createdDateTime: string;
  priority?: number;
  planId: string;
  bucketId: string;
  assignedTo?: Record<string, boolean>;
}

export interface Office365AuthToken {
  token: string;
  expiresIn: number;
  receivedAt: number;
}

export type ConnectionState = 'disconnected' | 'checking' | 'connected' | 'failed';

export interface SyncResult {
  added: number;
  updated: number;
  deleted: number;
  syncedAt: Date;
  duration: number; // en millisecondes
}
