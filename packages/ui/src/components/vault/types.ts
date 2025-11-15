/**
 * Types TypeScript pour le système Vault
 * Session 78 - Phase 2
 */

/**
 * Niveau de sécurité Vault
 *
 * DÉVELOPPEMENT:
 * - Auto-unlock au démarrage
 * - Clés stockées en clair dans config
 * - Pas de master password
 * - Unseal keys visibles
 *
 * PERSONNEL (recommandé):
 * - Master password requis au démarrage
 * - Clés chiffrées avec master password
 * - Recovery possible avec password + recovery key
 * - Unseal keys cachées après setup
 *
 * ENTREPRISE:
 * - Clés affichées UNE SEULE FOIS au setup
 * - Pas de recovery possible
 * - Multi-admin (quorum de 3/5 clés requis)
 * - Audit trail obligatoire
 */
export enum SecurityLevel {
  DEVELOPMENT = 'development',
  PERSONAL = 'personal',
  ENTERPRISE = 'enterprise',
}

/**
 * Configuration Vault après initialisation
 */
export interface VaultConfig {
  /** Niveau de sécurité choisi */
  securityLevel: SecurityLevel;

  /** Adresse du serveur Vault (http://localhost:8200) */
  vaultAddr: string;

  /** Token d'accès application (policy: cartae-app) */
  appToken: string;

  /** Clés d'unseal (Shamir Secret Sharing) */
  unsealKeys: string[];

  /** Root token (admin uniquement) */
  rootToken?: string;

  /** Master password hash (PERSONAL uniquement) */
  masterPasswordHash?: string;

  /** Recovery key chiffrée (PERSONAL uniquement) */
  encryptedRecoveryKey?: string;

  /** Unseal keys chiffrées avec master password (PERSONAL uniquement) */
  encryptedUnsealKeys?: string;

  /** Timestamp de création */
  createdAt: string;

  /** Timestamp du dernier unseal */
  lastUnsealedAt?: string;

  /** Vault est-il initialisé ? */
  initialized: boolean;

  /** Vault est-il sealed (verrouillé) ? */
  sealed: boolean;
}

/**
 * Étape du wizard de setup
 */
export enum SetupStep {
  /** Étape 1: Choix du niveau de sécurité */
  SECURITY_LEVEL = 'security_level',

  /** Étape 2: Création du master password (PERSONAL uniquement) */
  MASTER_PASSWORD = 'master_password',

  /** Étape 3: Initialisation Vault (génération clés) */
  VAULT_INIT = 'vault_init',

  /** Étape 4: Affichage des clés (WARNING critique) */
  KEYS_DISPLAY = 'keys_display',

  /** Étape 5: Confirmation sauvegarde clés */
  KEYS_CONFIRMATION = 'keys_confirmation',

  /** Étape 6: Finalisation (création token app) */
  FINALIZATION = 'finalization',

  /** Étape 7: Succès */
  SUCCESS = 'success',
}

/**
 * État du wizard de setup
 */
export interface SetupWizardState {
  /** Étape actuelle */
  currentStep: SetupStep;

  /** Niveau de sécurité sélectionné */
  securityLevel: SecurityLevel | null;

  /** Master password (temporaire, jamais persisté) */
  masterPassword?: string;

  /** Vault config généré */
  vaultConfig?: VaultConfig;

  /** L'utilisateur a-t-il confirmé avoir sauvegardé les clés ? */
  keysConfirmed: boolean;

  /** Erreur rencontrée */
  error?: string;
}

/**
 * Props pour SecurityLevelSelector
 */
export interface SecurityLevelSelectorProps {
  /** Niveau sélectionné */
  value: SecurityLevel | null;

  /** Callback lors du changement */
  onChange: (level: SecurityLevel) => void;

  /** Désactivé ? */
  disabled?: boolean;
}

/**
 * Props pour SetupWizard
 */
export interface SetupWizardProps {
  /** Callback lors de la complétion du setup */
  onComplete: (config: VaultConfig) => void;

  /** Callback lors de l'annulation */
  onCancel?: () => void;
}

/**
 * Props pour PasswordGenerator
 */
export interface PasswordGeneratorProps {
  /** Mot de passe généré */
  value: string;

  /** Callback lors du changement */
  onChange: (password: string) => void;

  /** Longueur minimale */
  minLength?: number;

  /** Afficher les critères de force ? */
  showStrength?: boolean;
}

/**
 * Force d'un mot de passe
 */
export interface PasswordStrength {
  /** Score de 0 (faible) à 4 (très fort) */
  score: number;

  /** Label (Faible, Moyen, Fort, Très Fort) */
  label: string;

  /** Couleur du score (red, orange, yellow, green) */
  color: string;

  /** Suggestions pour améliorer */
  suggestions: string[];

  /** Critères validés */
  criteria: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Résultat de l'initialisation Vault
 */
export interface VaultInitResult {
  /** Clés d'unseal (Shamir) */
  unsealKeys: string[];

  /** Root token */
  rootToken: string;

  /** Vault a été initialisé avec succès */
  success: boolean;
}

/**
 * Status Vault (sealed/unsealed)
 */
export interface VaultStatus {
  /** Vault est-il sealed (verrouillé) ? */
  sealed: boolean;

  /** Nombre total de clés (Shamir shares) */
  t: number;

  /** Seuil de clés requis pour unseal */
  n: number;

  /** Nombre de clés déjà saisies */
  progress: number;

  /** Version Vault */
  version: string;

  /** Cluster ID */
  cluster_id?: string;

  /** Initialisé ? */
  initialized: boolean;
}

/**
 * Props pour UnlockScreen
 */
export interface UnlockScreenProps {
  /** Configuration Vault (pour récupérer security level) */
  vaultConfig: VaultConfig;

  /** Callback lors du unlock réussi */
  onUnlockSuccess: () => void;

  /** Callback lors de l'annulation */
  onCancel?: () => void;
}

/**
 * État du processus d'unlock
 */
export interface UnlockState {
  /** Vault est-il sealed ? */
  sealed: boolean;

  /** Progression unseal (0/3, 1/3, 2/3, 3/3) */
  progress: number;

  /** Seuil requis (3 clés sur 5) */
  threshold: number;

  /** Clés déjà saisies (masquées) */
  keysEntered: string[];

  /** Master password (mode PERSONAL uniquement) */
  masterPassword?: string;

  /** Erreur rencontrée */
  error?: string;

  /** Unseal en cours ? */
  loading: boolean;
}

/**
 * Props pour UnsealKeyInput
 */
export interface UnsealKeyInputProps {
  /** Label du champ */
  label: string;

  /** Valeur actuelle */
  value: string;

  /** Callback lors du changement */
  onChange: (value: string) => void;

  /** Masquer la clé ? */
  masked?: boolean;

  /** Désactivé ? */
  disabled?: boolean;

  /** Placeholder */
  placeholder?: string;

  /** Auto-focus ? */
  autoFocus?: boolean;
}

/**
 * Props pour UnsealProgress
 */
export interface UnsealProgressProps {
  /** Progression actuelle (0, 1, 2, 3) */
  current: number;

  /** Total requis (3) */
  total: number;

  /** Afficher labels ? */
  showLabels?: boolean;
}

/**
 * Props pour MasterPasswordInput
 */
export interface MasterPasswordInputProps {
  /** Valeur actuelle */
  value: string;

  /** Callback lors du changement */
  onChange: (value: string) => void;

  /** Désactivé ? */
  disabled?: boolean;

  /** Auto-focus ? */
  autoFocus?: boolean;

  /** Callback lors de la soumission (Enter) */
  onSubmit?: () => void;
}

/**
 * Props pour RecoveryKeyDisplay
 */
export interface RecoveryKeyDisplayProps {
  /** Recovery key à afficher (format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX) */
  recoveryKey: string;

  /** Callback quand l'utilisateur confirme avoir sauvegardé */
  onConfirm: () => void;

  /** Callback optionnel si l'utilisateur annule */
  onCancel?: () => void;
}

/**
 * Props pour RecoveryScreen
 */
export interface RecoveryScreenProps {
  /** Configuration Vault actuelle */
  vaultConfig: VaultConfig;

  /** Callback quand recovery réussie */
  onRecoverySuccess: (unsealKeys: string[]) => void;

  /** Callback pour annuler et retourner à unlock screen */
  onCancel: () => void;
}

/**
 * État du processus de recovery
 */
export interface RecoveryState {
  /** Recovery key saisie */
  recoveryKey: string;

  /** Master password pour déchiffrer recovery key */
  masterPassword: string;

  /** Recovery en cours ? */
  loading: boolean;

  /** Erreur rencontrée */
  error?: string;

  /** Recovery réussie ? */
  success: boolean;
}
