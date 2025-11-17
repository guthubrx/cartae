/**
 * SourceConfigForm - Formulaire de configuration d'une source
 *
 * Formulaire dynamique adapté au type de connector :
 * - Office365: tenant ID, client ID, client secret, scopes
 * - Gmail: OAuth credentials, scopes
 * - Google Calendar: OAuth credentials, calendar IDs
 * - Obsidian: vault path, file patterns
 * - Markdown: directory path, file patterns, recursive
 * - Custom: configuration JSON libre
 *
 * Features:
 * - Validation en temps réel
 * - Test de connexion intégré
 * - Masquage des secrets (passwords, tokens)
 * - Import/export de config (JSON)
 * - Templates pré-configurés par connector type
 */

import React, { useState, useEffect } from 'react';
import type { ConnectorType, DataSource } from './SourceList';
import {
  Save,
  X,
  Eye,
  EyeOff,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Key,
  Folder,
  Globe,
  FileText,
} from 'lucide-react';

/**
 * Configuration field definition
 */
interface ConfigField {
  /**
   * Nom du champ (key dans config object)
   */
  name: string;

  /**
   * Label affiché
   */
  label: string;

  /**
   * Type d'input
   */
  type: 'text' | 'password' | 'email' | 'url' | 'number' | 'textarea' | 'select' | 'multiselect' | 'file' | 'checkbox';

  /**
   * Placeholder
   */
  placeholder?: string;

  /**
   * Valeur par défaut
   */
  defaultValue?: any;

  /**
   * Requis
   */
  required?: boolean;

  /**
   * Options (si type = select ou multiselect)
   */
  options?: { value: string; label: string }[];

  /**
   * Pattern de validation (regex)
   */
  pattern?: string;

  /**
   * Message d'aide
   */
  helpText?: string;

  /**
   * Icône
   */
  icon?: React.FC<any>;

  /**
   * Sensitive (password, token) - sera masqué
   */
  sensitive?: boolean;
}

/**
 * Props pour SourceConfigForm
 */
export interface SourceConfigFormProps {
  /**
   * Source à éditer (undefined = création)
   */
  source?: DataSource;

  /**
   * Type de connector (requis si création)
   */
  connectorType: ConnectorType;

  /**
   * Callback quand save
   */
  onSave: (config: { name: string; config: Record<string, any> }) => void;

  /**
   * Callback quand cancel
   */
  onCancel: () => void;

  /**
   * Callback pour test connection
   */
  onTestConnection?: (config: Record<string, any>) => Promise<{ success: boolean; message: string }>;

  /**
   * Style personnalisé
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

/**
 * Définition des champs par type de connector
 */
const CONNECTOR_FIELDS: Record<ConnectorType, ConfigField[]> = {
  'office365-mail': [
    {
      name: 'tenantId',
      label: 'Tenant ID',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: true,
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      helpText: 'Azure AD Tenant ID (GUID)',
      icon: Key,
    },
    {
      name: 'clientId',
      label: 'Client ID',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: true,
      helpText: 'Application (client) ID from Azure App Registration',
      icon: Key,
    },
    {
      name: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      placeholder: '••••••••••••••••',
      required: true,
      sensitive: true,
      helpText: 'Client secret value (not ID)',
      icon: Key,
    },
    {
      name: 'scopes',
      label: 'Scopes',
      type: 'multiselect',
      defaultValue: ['Mail.Read', 'Mail.ReadWrite', 'User.Read'],
      options: [
        { value: 'Mail.Read', label: 'Mail.Read' },
        { value: 'Mail.ReadWrite', label: 'Mail.ReadWrite' },
        { value: 'Mail.Send', label: 'Mail.Send' },
        { value: 'User.Read', label: 'User.Read' },
        { value: 'offline_access', label: 'offline_access' },
      ],
      helpText: 'API permissions scopes',
      icon: Globe,
    },
    {
      name: 'syncInterval',
      label: 'Intervalle de sync (minutes)',
      type: 'number',
      defaultValue: 15,
      required: true,
      helpText: 'Fréquence de synchronisation automatique',
    },
  ],
  'office365-calendar': [
    {
      name: 'tenantId',
      label: 'Tenant ID',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: true,
      icon: Key,
    },
    {
      name: 'clientId',
      label: 'Client ID',
      type: 'text',
      required: true,
      icon: Key,
    },
    {
      name: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      sensitive: true,
      icon: Key,
    },
    {
      name: 'scopes',
      label: 'Scopes',
      type: 'multiselect',
      defaultValue: ['Calendars.Read', 'User.Read'],
      options: [
        { value: 'Calendars.Read', label: 'Calendars.Read' },
        { value: 'Calendars.ReadWrite', label: 'Calendars.ReadWrite' },
        { value: 'User.Read', label: 'User.Read' },
      ],
      icon: Globe,
    },
    {
      name: 'syncInterval',
      label: 'Intervalle de sync (minutes)',
      type: 'number',
      defaultValue: 30,
      required: true,
    },
  ],
  'office365-contacts': [
    {
      name: 'tenantId',
      label: 'Tenant ID',
      type: 'text',
      required: true,
      icon: Key,
    },
    {
      name: 'clientId',
      label: 'Client ID',
      type: 'text',
      required: true,
      icon: Key,
    },
    {
      name: 'clientSecret',
      label: 'Client Secret',
      type: 'password',
      required: true,
      sensitive: true,
      icon: Key,
    },
    {
      name: 'scopes',
      label: 'Scopes',
      type: 'multiselect',
      defaultValue: ['Contacts.Read', 'User.Read'],
      options: [
        { value: 'Contacts.Read', label: 'Contacts.Read' },
        { value: 'Contacts.ReadWrite', label: 'Contacts.ReadWrite' },
        { value: 'User.Read', label: 'User.Read' },
      ],
      icon: Globe,
    },
  ],
  gmail: [
    {
      name: 'clientId',
      label: 'OAuth Client ID',
      type: 'text',
      placeholder: 'xxxxx.apps.googleusercontent.com',
      required: true,
      icon: Key,
    },
    {
      name: 'clientSecret',
      label: 'OAuth Client Secret',
      type: 'password',
      required: true,
      sensitive: true,
      icon: Key,
    },
    {
      name: 'scopes',
      label: 'Scopes',
      type: 'multiselect',
      defaultValue: ['https://www.googleapis.com/auth/gmail.readonly'],
      options: [
        { value: 'https://www.googleapis.com/auth/gmail.readonly', label: 'Gmail Read-only' },
        { value: 'https://www.googleapis.com/auth/gmail.modify', label: 'Gmail Modify' },
        { value: 'https://www.googleapis.com/auth/gmail.labels', label: 'Gmail Labels' },
      ],
      icon: Globe,
    },
    {
      name: 'syncInterval',
      label: 'Intervalle de sync (minutes)',
      type: 'number',
      defaultValue: 10,
      required: true,
    },
  ],
  'google-calendar': [
    {
      name: 'clientId',
      label: 'OAuth Client ID',
      type: 'text',
      required: true,
      icon: Key,
    },
    {
      name: 'clientSecret',
      label: 'OAuth Client Secret',
      type: 'password',
      required: true,
      sensitive: true,
      icon: Key,
    },
    {
      name: 'calendarIds',
      label: 'Calendar IDs',
      type: 'textarea',
      placeholder: 'primary\ncalendar-id-2@group.calendar.google.com',
      helpText: 'One calendar ID per line. Use "primary" for main calendar.',
      icon: Folder,
    },
  ],
  obsidian: [
    {
      name: 'vaultPath',
      label: 'Vault Path',
      type: 'text',
      placeholder: '/Users/username/Documents/ObsidianVault',
      required: true,
      helpText: 'Absolute path to Obsidian vault directory',
      icon: Folder,
    },
    {
      name: 'filePatterns',
      label: 'File Patterns',
      type: 'textarea',
      placeholder: '**/*.md\n!templates/**',
      defaultValue: '**/*.md',
      helpText: 'Glob patterns (one per line). Use ! to exclude.',
      icon: FileText,
    },
    {
      name: 'parseWikiLinks',
      label: 'Parse WikiLinks',
      type: 'checkbox',
      defaultValue: true,
      helpText: 'Extract [[wikilinks]] as relationships',
    },
    {
      name: 'parseTags',
      label: 'Parse Tags',
      type: 'checkbox',
      defaultValue: true,
      helpText: 'Extract #tags from content',
    },
    {
      name: 'watchForChanges',
      label: 'Watch for Changes',
      type: 'checkbox',
      defaultValue: true,
      helpText: 'Real-time sync when files change',
    },
  ],
  markdown: [
    {
      name: 'directoryPath',
      label: 'Directory Path',
      type: 'text',
      placeholder: '/path/to/markdown/files',
      required: true,
      helpText: 'Root directory containing markdown files',
      icon: Folder,
    },
    {
      name: 'filePatterns',
      label: 'File Patterns',
      type: 'textarea',
      placeholder: '*.md\n*.markdown',
      defaultValue: '*.md',
      helpText: 'File patterns to include',
      icon: FileText,
    },
    {
      name: 'recursive',
      label: 'Recursive',
      type: 'checkbox',
      defaultValue: true,
      helpText: 'Search in subdirectories',
    },
    {
      name: 'parseFrontmatter',
      label: 'Parse Frontmatter',
      type: 'checkbox',
      defaultValue: true,
      helpText: 'Extract YAML frontmatter as metadata',
    },
  ],
  custom: [
    {
      name: 'configJson',
      label: 'Configuration (JSON)',
      type: 'textarea',
      placeholder: '{\n  "key": "value"\n}',
      required: true,
      helpText: 'Custom connector configuration in JSON format',
      icon: FileText,
    },
  ],
};

/**
 * SourceConfigForm - Composant principal
 */
export const SourceConfigForm: React.FC<SourceConfigFormProps> = ({
  source,
  connectorType,
  onSave,
  onCancel,
  onTestConnection,
  style,
  className = '',
}) => {
  const [name, setName] = useState(source?.name || '');
  const [config, setConfig] = useState<Record<string, any>>(source?.config || {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  const fields = CONNECTOR_FIELDS[connectorType];

  // Initialize config with defaults
  useEffect(() => {
    if (!source) {
      const defaultConfig: Record<string, any> = {};
      fields.forEach((field) => {
        if (field.defaultValue !== undefined) {
          defaultConfig[field.name] = field.defaultValue;
        }
      });
      setConfig(defaultConfig);
    }
  }, [source, fields]);

  // Validate field
  const validateField = (field: ConfigField, value: any): string | null => {
    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} est requis`;
    }

    if (field.pattern && value && typeof value === 'string') {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value)) {
        return `Format invalide pour ${field.label}`;
      }
    }

    return null;
  };

  // Validate all
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    fields.forEach((field) => {
      const error = validateField(field, config[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setConfig((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  // Toggle sensitive field visibility
  const toggleSensitive = (fieldName: string) => {
    setShowSensitive((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!onTestConnection) return;

    setTestStatus({ status: 'testing', message: 'Test en cours...' });

    try {
      const result = await onTestConnection(config);
      setTestStatus({
        status: result.success ? 'success' : 'error',
        message: result.message,
      });
    } catch (error) {
      setTestStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Erreur de connexion',
      });
    }
  };

  // Export config
  const handleExportConfig = () => {
    const exportData = { name, connectorType, config };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartae-source-${connectorType}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import config
  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.name) setName(imported.name);
        if (imported.config) setConfig(imported.config);
      } catch (error) {
        alert('Erreur lors de l\'import du fichier');
      }
    };
    reader.readAsText(file);
  };

  // Save
  const handleSave = () => {
    if (!validateAll()) {
      return;
    }

    onSave({ name: name.trim(), config });
  };

  return (
    <div
      className={`source-config-form ${className}`}
      style={{
        padding: '20px',
        background: 'var(--color-background-primary, #ffffff)',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '700px',
        margin: '0 auto',
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #1f2937)',
          }}
        >
          {source ? 'Modifier la source' : 'Nouvelle source'}
        </h2>
        <div
          style={{
            marginTop: '4px',
            fontSize: '13px',
            color: 'var(--color-text-secondary, #6b7280)',
            textTransform: 'capitalize',
          }}
        >
          {connectorType.replace('-', ' ')}
        </div>
      </div>

      {/* Source Name */}
      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #374151)',
            marginBottom: '6px',
          }}
        >
          Nom de la source *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Mon compte Office 365"
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: errors.name ? '2px solid #ef4444' : '1px solid var(--color-border, #d1d5db)',
            borderRadius: '6px',
            background: 'var(--color-input-bg, #ffffff)',
            color: 'var(--color-text-primary, #1f2937)',
            boxSizing: 'border-box',
          }}
        />
        {errors.name && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>
            {errors.name}
          </div>
        )}
      </div>

      {/* Config Fields */}
      {fields.map((field) => {
        const FieldIcon = field.icon;
        const fieldError = errors[field.name];
        const fieldValue = config[field.name];

        return (
          <div key={field.name} style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #374151)',
                marginBottom: '6px',
              }}
            >
              {FieldIcon && <FieldIcon size={14} />}
              {field.label}
              {field.required && <span style={{ color: '#ef4444' }}>*</span>}
              {field.helpText && (
                <span
                  title={field.helpText}
                  style={{ color: 'var(--color-text-tertiary, #9ca3af)', cursor: 'help' }}
                >
                  <HelpCircle size={14} />
                </span>
              )}
            </label>

            {/* Text/Email/URL/Number Input */}
            {['text', 'email', 'url', 'number', 'password'].includes(field.type) && (
              <div style={{ position: 'relative' }}>
                <input
                  type={
                    field.type === 'password' && !showSensitive[field.name]
                      ? 'password'
                      : field.type === 'password'
                      ? 'text'
                      : field.type
                  }
                  value={fieldValue || ''}
                  onChange={(e) =>
                    handleFieldChange(
                      field.name,
                      field.type === 'number' ? parseFloat(e.target.value) : e.target.value
                    )
                  }
                  placeholder={field.placeholder}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    paddingRight: field.sensitive ? '44px' : '12px',
                    fontSize: '14px',
                    fontFamily: field.sensitive ? 'monospace' : 'inherit',
                    border: fieldError
                      ? '2px solid #ef4444'
                      : '1px solid var(--color-border, #d1d5db)',
                    borderRadius: '6px',
                    background: 'var(--color-input-bg, #ffffff)',
                    color: 'var(--color-text-primary, #1f2937)',
                    boxSizing: 'border-box',
                  }}
                />

                {field.sensitive && (
                  <button
                    type="button"
                    onClick={() => toggleSensitive(field.name)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-text-tertiary, #9ca3af)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showSensitive[field.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            )}

            {/* Textarea */}
            {field.type === 'textarea' && (
              <textarea
                value={fieldValue || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  border: fieldError
                    ? '2px solid #ef4444'
                    : '1px solid var(--color-border, #d1d5db)',
                  borderRadius: '6px',
                  background: 'var(--color-input-bg, #ffffff)',
                  color: 'var(--color-text-primary, #1f2937)',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            )}

            {/* Checkbox */}
            {field.type === 'checkbox' && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={fieldValue || false}
                  onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary, #6b7280)' }}>
                  {field.helpText}
                </span>
              </label>
            )}

            {/* Select */}
            {field.type === 'select' && field.options && (
              <select
                value={fieldValue || ''}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: fieldError
                    ? '2px solid #ef4444'
                    : '1px solid var(--color-border, #d1d5db)',
                  borderRadius: '6px',
                  background: 'var(--color-input-bg, #ffffff)',
                  color: 'var(--color-text-primary, #1f2937)',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">Sélectionner...</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {/* Multiselect (checkboxes) */}
            {field.type === 'multiselect' && field.options && (
              <div
                style={{
                  padding: '12px',
                  border: '1px solid var(--color-border, #d1d5db)',
                  borderRadius: '6px',
                  background: 'var(--color-input-bg, #ffffff)',
                }}
              >
                {field.options.map((opt) => {
                  const selected = Array.isArray(fieldValue) && fieldValue.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const current = Array.isArray(fieldValue) ? fieldValue : [];
                          const updated = e.target.checked
                            ? [...current, opt.value]
                            : current.filter((v) => v !== opt.value);
                          handleFieldChange(field.name, updated);
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px' }}>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Help Text */}
            {field.helpText && field.type !== 'checkbox' && (
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: 'var(--color-text-tertiary, #9ca3af)',
                }}
              >
                {field.helpText}
              </div>
            )}

            {/* Error */}
            {fieldError && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>
                {fieldError}
              </div>
            )}
          </div>
        );
      })}

      {/* Test Connection */}
      {onTestConnection && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleTestConnection}
            disabled={testStatus.status === 'testing'}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid var(--color-border, #d1d5db)',
              borderRadius: '6px',
              background: 'var(--color-background-secondary, #f9fafb)',
              color: 'var(--color-text-primary, #1f2937)',
              cursor: testStatus.status === 'testing' ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {testStatus.status === 'testing' && <RefreshCw size={16} className="spin" />}
            {testStatus.status === 'success' && <CheckCircle size={16} style={{ color: '#10b981' }} />}
            {testStatus.status === 'error' && <AlertCircle size={16} style={{ color: '#ef4444' }} />}
            Tester la connexion
          </button>

          {testStatus.message && (
            <div
              style={{
                marginTop: '8px',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                background:
                  testStatus.status === 'success'
                    ? '#d1fae5'
                    : testStatus.status === 'error'
                    ? '#fee2e2'
                    : '#f3f4f6',
                color:
                  testStatus.status === 'success'
                    ? '#065f46'
                    : testStatus.status === 'error'
                    ? '#991b1b'
                    : '#374151',
              }}
            >
              {testStatus.message}
            </div>
          )}
        </div>
      )}

      {/* Import/Export */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border, #e5e7eb)',
        }}
      >
        <button
          type="button"
          onClick={handleExportConfig}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid var(--color-border, #d1d5db)',
            borderRadius: '6px',
            background: 'var(--color-background-secondary, #f9fafb)',
            color: 'var(--color-text-secondary, #6b7280)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Download size={14} />
          Exporter config
        </button>

        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid var(--color-border, #d1d5db)',
            borderRadius: '6px',
            background: 'var(--color-background-secondary, #f9fafb)',
            color: 'var(--color-text-secondary, #6b7280)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Upload size={14} />
          Importer config
          <input
            type="file"
            accept=".json"
            onChange={handleImportConfig}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid var(--color-border, #d1d5db)',
            borderRadius: '6px',
            background: 'var(--color-background-secondary, #f9fafb)',
            color: 'var(--color-text-secondary, #6b7280)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <X size={16} />
          Annuler
        </button>

        <button
          onClick={handleSave}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '6px',
            background: 'var(--color-primary, #3b82f6)',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Save size={16} />
          Enregistrer
        </button>
      </div>
    </div>
  );
};

export default SourceConfigForm;
