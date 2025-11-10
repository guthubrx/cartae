/**
 * Vérificateur de capacités selon le mode d'authentification
 *
 * Permet de savoir quelles fonctionnalités sont disponibles
 * selon le mode (OAuth Standard vs Device Code Flow)
 */

import { AuthMode } from '../types/auth.types';

/**
 * Niveau de disponibilité d'une fonctionnalité
 */
export enum CapabilityLevel {
  /** Fonctionnalité pleinement disponible */
  AVAILABLE = 'available',
  /** Fonctionnalité limitée ou peut échouer */
  LIMITED = 'limited',
  /** Fonctionnalité non disponible */
  UNAVAILABLE = 'unavailable',
}

/**
 * Capacité d'une fonctionnalité
 */
export interface Capability {
  level: CapabilityLevel;
  reason?: string;
  alternativeMode?: AuthMode;
}

/**
 * Liste des fonctionnalités
 */
export enum Feature {
  // OneDrive
  ONEDRIVE_READ = 'onedrive_read',
  ONEDRIVE_WRITE = 'onedrive_write',
  ONEDRIVE_DELETE = 'onedrive_delete',

  // SharePoint
  SHAREPOINT_READ = 'sharepoint_read',
  SHAREPOINT_WRITE = 'sharepoint_write',
  SHAREPOINT_CREATE_SITE = 'sharepoint_create_site',

  // Emails
  EMAIL_READ = 'email_read',
  EMAIL_SEND = 'email_send',

  // Teams
  TEAMS_READ = 'teams_read',
  TEAMS_WRITE = 'teams_write',
  TEAMS_CREATE = 'teams_create',

  // Calendrier
  CALENDAR_READ = 'calendar_read',
  CALENDAR_WRITE = 'calendar_write',

  // Utilisateurs
  USER_READ = 'user_read',
  USER_MANAGE = 'user_manage',
}

/**
 * Matrice de capacités par mode
 */
const CAPABILITY_MATRIX: Record<Feature, Record<AuthMode, Capability>> = {
  // OneDrive
  [Feature.ONEDRIVE_READ]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.AVAILABLE,
      reason: 'Lecture OneDrive disponible avec Device Code Flow',
    },
  },
  [Feature.ONEDRIVE_WRITE]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.AVAILABLE,
      reason: 'Écriture OneDrive disponible avec Device Code Flow',
    },
  },
  [Feature.ONEDRIVE_DELETE]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.AVAILABLE,
      reason: 'Suppression OneDrive disponible avec Device Code Flow',
    },
  },

  // SharePoint
  [Feature.SHAREPOINT_READ]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.AVAILABLE,
      reason: 'Lecture SharePoint disponible avec Device Code Flow',
    },
  },
  [Feature.SHAREPOINT_WRITE]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.LIMITED,
      reason: 'Écriture SharePoint peut être limitée selon les permissions du site',
      alternativeMode: AuthMode.STANDARD,
    },
  },
  [Feature.SHAREPOINT_CREATE_SITE]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.UNAVAILABLE,
      reason: 'Création de sites SharePoint nécessite permission admin',
      alternativeMode: AuthMode.STANDARD,
    },
  },

  // Emails
  [Feature.EMAIL_READ]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.AVAILABLE,
      reason: 'Lecture emails disponible avec Device Code Flow',
    },
  },
  [Feature.EMAIL_SEND]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.UNAVAILABLE,
      reason: 'Envoi d\'emails nécessite permission admin (Mail.Send)',
      alternativeMode: AuthMode.STANDARD,
    },
  },

  // Teams
  [Feature.TEAMS_READ]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.LIMITED,
      reason: 'Lecture Teams peut être limitée (permission admin souvent requise)',
      alternativeMode: AuthMode.STANDARD,
    },
  },
  [Feature.TEAMS_WRITE]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.UNAVAILABLE,
      reason: 'Écriture dans Teams nécessite permission admin (ChannelMessage.Send)',
      alternativeMode: AuthMode.STANDARD,
    },
  },
  [Feature.TEAMS_CREATE]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.UNAVAILABLE,
      reason: 'Création d\'équipes nécessite permission admin (Team.Create)',
      alternativeMode: AuthMode.STANDARD,
    },
  },

  // Calendrier
  [Feature.CALENDAR_READ]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.AVAILABLE,
      reason: 'Lecture calendrier disponible avec Device Code Flow',
    },
  },
  [Feature.CALENDAR_WRITE]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.LIMITED,
      reason: 'Écriture calendrier peut être limitée',
      alternativeMode: AuthMode.STANDARD,
    },
  },

  // Utilisateurs
  [Feature.USER_READ]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.AVAILABLE,
      reason: 'Lecture profil utilisateur disponible',
    },
  },
  [Feature.USER_MANAGE]: {
    [AuthMode.STANDARD]: {
      level: CapabilityLevel.AVAILABLE,
    },
    [AuthMode.DEVICE_CODE]: {
      level: CapabilityLevel.UNAVAILABLE,
      reason: 'Gestion utilisateurs nécessite permission admin',
      alternativeMode: AuthMode.STANDARD,
    },
  },
};

/**
 * Vérificateur de capacités
 */
export class CapabilityChecker {
  constructor(private currentMode: AuthMode) {}

  /**
   * Vérifie si une fonctionnalité est disponible
   */
  isAvailable(feature: Feature): boolean {
    const capability = this.getCapability(feature);
    return capability.level === CapabilityLevel.AVAILABLE;
  }

  /**
   * Vérifie si une fonctionnalité est limitée
   */
  isLimited(feature: Feature): boolean {
    const capability = this.getCapability(feature);
    return capability.level === CapabilityLevel.LIMITED;
  }

  /**
   * Vérifie si une fonctionnalité est indisponible
   */
  isUnavailable(feature: Feature): boolean {
    const capability = this.getCapability(feature);
    return capability.level === CapabilityLevel.UNAVAILABLE;
  }

  /**
   * Récupère la capacité d'une fonctionnalité
   */
  getCapability(feature: Feature): Capability {
    return CAPABILITY_MATRIX[feature][this.currentMode];
  }

  /**
   * Récupère toutes les capacités pour le mode actuel
   */
  getAllCapabilities(): Record<Feature, Capability> {
    const result = {} as Record<Feature, Capability>;

    for (const feature of Object.values(Feature)) {
      result[feature] = this.getCapability(feature);
    }

    return result;
  }

  /**
   * Vérifie une fonctionnalité et lance une erreur si indisponible
   */
  requireFeature(feature: Feature): void {
    const capability = this.getCapability(feature);

    if (capability.level === CapabilityLevel.UNAVAILABLE) {
      throw new Error(
        `❌ Fonctionnalité non disponible en mode ${this.currentMode}.\n` +
        (capability.reason || 'Permission insuffisante') +
        (capability.alternativeMode
          ? `\n\nVeuillez utiliser le mode ${capability.alternativeMode}.`
          : '')
      );
    }

    if (capability.level === CapabilityLevel.LIMITED) {
      console.warn(
        `⚠️ Fonctionnalité limitée en mode ${this.currentMode}:`,
        capability.reason
      );
    }
  }

  /**
   * Génère un rapport de capacités
   */
  generateReport(): {
    mode: AuthMode;
    available: Feature[];
    limited: Feature[];
    unavailable: Feature[];
  } {
    const available: Feature[] = [];
    const limited: Feature[] = [];
    const unavailable: Feature[] = [];

    for (const feature of Object.values(Feature)) {
      const capability = this.getCapability(feature);

      switch (capability.level) {
        case CapabilityLevel.AVAILABLE:
          available.push(feature);
          break;
        case CapabilityLevel.LIMITED:
          limited.push(feature);
          break;
        case CapabilityLevel.UNAVAILABLE:
          unavailable.push(feature);
          break;
      }
    }

    return {
      mode: this.currentMode,
      available,
      limited,
      unavailable,
    };
  }

  /**
   * Change le mode et met à jour les capacités
   */
  setMode(mode: AuthMode): void {
    this.currentMode = mode;
  }
}

export default CapabilityChecker;
