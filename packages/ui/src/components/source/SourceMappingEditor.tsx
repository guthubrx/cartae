/**
 * SourceMappingEditor - Éditeur de field mappings
 *
 * Éditeur visuel pour mapper les champs de la source externe vers CartaeItem :
 * - Source fields (left) → CartaeItem fields (right)
 * - Drag-and-drop ou sélection
 * - Transformations optionnelles (date format, string manip, JSON path)
 * - Validation (champs requis)
 * - Preview du mapping
 * - Templates pré-configurés par connector type
 *
 * Example mapping:
 * {
 *   "subject": "title",
 *   "bodyPreview": "content",
 *   "from.emailAddress.address": "metadata.author",
 *   "receivedDateTime": "metadata.startDate|transform:date",
 *   "categories": "tags|transform:array"
 * }
 */

import React, { useState, useMemo } from 'react';
import type { ConnectorType } from './SourceList';
import {
  ArrowRight,
  Plus,
  Trash,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Code,
  Wand2,
} from 'lucide-react';

/**
 * Field mapping entry
 */
export interface FieldMapping {
  /**
   * ID unique du mapping
   */
  id: string;

  /**
   * Champ source (peut inclure JSON path: "from.emailAddress.address")
   */
  sourceField: string;

  /**
   * Champ CartaeItem cible
   */
  targetField: string;

  /**
   * Transformation optionnelle
   */
  transform?: 'date' | 'array' | 'string' | 'number' | 'boolean' | 'json' | 'custom';

  /**
   * Expression de transformation custom (si transform = custom)
   */
  transformExpression?: string;

  /**
   * Valeur par défaut (si source field vide)
   */
  defaultValue?: any;
}

/**
 * Props pour SourceMappingEditor
 */
export interface SourceMappingEditorProps {
  /**
   * Type de connector (pour templates)
   */
  connectorType: ConnectorType;

  /**
   * Mappings actuels
   */
  mappings: FieldMapping[];

  /**
   * Callback quand mappings changent
   */
  onMappingsChange: (mappings: FieldMapping[]) => void;

  /**
   * Champs source disponibles (détectés ou définis)
   */
  sourceFields?: string[];

  /**
   * Afficher transformations avancées
   */
  showTransforms?: boolean;

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
 * CartaeItem target fields disponibles
 */
const CARTAE_ITEM_FIELDS = [
  { value: 'title', label: 'Titre', required: true, type: 'string' },
  { value: 'type', label: 'Type', required: true, type: 'string' },
  { value: 'content', label: 'Contenu', required: false, type: 'string' },
  { value: 'tags', label: 'Tags', required: false, type: 'array' },
  { value: 'categories', label: 'Catégories', required: false, type: 'array' },
  { value: 'metadata.author', label: 'Auteur', required: false, type: 'string' },
  { value: 'metadata.participants', label: 'Participants', required: false, type: 'array' },
  { value: 'metadata.priority', label: 'Priorité', required: false, type: 'string' },
  { value: 'metadata.status', label: 'Statut', required: false, type: 'string' },
  { value: 'metadata.startDate', label: 'Date début', required: false, type: 'date' },
  { value: 'metadata.endDate', label: 'Date fin', required: false, type: 'date' },
  { value: 'metadata.dueDate', label: 'Date échéance', required: false, type: 'date' },
  { value: 'metadata.location', label: 'Lieu', required: false, type: 'string' },
  { value: 'metadata.duration', label: 'Durée', required: false, type: 'number' },
  { value: 'metadata.progress', label: 'Progrès', required: false, type: 'number' },
];

/**
 * Templates de mappings par connector type
 */
const MAPPING_TEMPLATES: Record<ConnectorType, FieldMapping[]> = {
  'office365-mail': [
    { id: '1', sourceField: 'subject', targetField: 'title' },
    { id: '2', sourceField: 'bodyPreview', targetField: 'content' },
    { id: '3', sourceField: 'from.emailAddress.address', targetField: 'metadata.author' },
    { id: '4', sourceField: 'receivedDateTime', targetField: 'metadata.startDate', transform: 'date' },
    { id: '5', sourceField: 'categories', targetField: 'tags', transform: 'array' },
    { id: '6', sourceField: 'importance', targetField: 'metadata.priority' },
  ],
  'office365-calendar': [
    { id: '1', sourceField: 'subject', targetField: 'title' },
    { id: '2', sourceField: 'bodyPreview', targetField: 'content' },
    { id: '3', sourceField: 'start.dateTime', targetField: 'metadata.startDate', transform: 'date' },
    { id: '4', sourceField: 'end.dateTime', targetField: 'metadata.endDate', transform: 'date' },
    { id: '5', sourceField: 'location.displayName', targetField: 'metadata.location' },
    { id: '6', sourceField: 'categories', targetField: 'tags', transform: 'array' },
  ],
  'office365-contacts': [
    { id: '1', sourceField: 'displayName', targetField: 'title' },
    { id: '2', sourceField: 'emailAddresses[0].address', targetField: 'metadata.author' },
    { id: '3', sourceField: 'categories', targetField: 'tags', transform: 'array' },
  ],
  gmail: [
    { id: '1', sourceField: 'payload.headers[subject]', targetField: 'title' },
    { id: '2', sourceField: 'snippet', targetField: 'content' },
    { id: '3', sourceField: 'payload.headers[from]', targetField: 'metadata.author' },
    { id: '4', sourceField: 'internalDate', targetField: 'metadata.startDate', transform: 'date' },
    { id: '5', sourceField: 'labelIds', targetField: 'tags', transform: 'array' },
  ],
  'google-calendar': [
    { id: '1', sourceField: 'summary', targetField: 'title' },
    { id: '2', sourceField: 'description', targetField: 'content' },
    { id: '3', sourceField: 'start.dateTime', targetField: 'metadata.startDate', transform: 'date' },
    { id: '4', sourceField: 'end.dateTime', targetField: 'metadata.endDate', transform: 'date' },
    { id: '5', sourceField: 'location', targetField: 'metadata.location' },
  ],
  obsidian: [
    { id: '1', sourceField: 'frontmatter.title', targetField: 'title', defaultValue: 'filename' },
    { id: '2', sourceField: 'content', targetField: 'content' },
    { id: '3', sourceField: 'frontmatter.tags', targetField: 'tags', transform: 'array' },
    { id: '4', sourceField: 'frontmatter.created', targetField: 'metadata.startDate', transform: 'date' },
  ],
  markdown: [
    { id: '1', sourceField: 'frontmatter.title', targetField: 'title', defaultValue: 'filename' },
    { id: '2', sourceField: 'content', targetField: 'content' },
    { id: '3', sourceField: 'frontmatter.tags', targetField: 'tags', transform: 'array' },
    { id: '4', sourceField: 'frontmatter.date', targetField: 'metadata.startDate', transform: 'date' },
  ],
  custom: [],
};

/**
 * Transformation labels
 */
const TRANSFORM_LABELS: Record<string, string> = {
  date: 'Date',
  array: 'Array',
  string: 'String',
  number: 'Number',
  boolean: 'Boolean',
  json: 'JSON',
  custom: 'Custom',
};

/**
 * SourceMappingEditor - Composant principal
 */
export const SourceMappingEditor: React.FC<SourceMappingEditorProps> = ({
  connectorType,
  mappings,
  onMappingsChange,
  sourceFields = [],
  showTransforms = true,
  style,
  className = '',
}) => {
  const [editingMapping, setEditingMapping] = useState<string | null>(null);

  // Check validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const mappedTargets = new Set(mappings.map((m) => m.targetField));

    // Check required fields are mapped
    CARTAE_ITEM_FIELDS.filter((f) => f.required).forEach((field) => {
      if (!mappedTargets.has(field.value)) {
        errors.push(`Champ requis non mappé: ${field.label}`);
      }
    });

    // Check duplicate targets
    const duplicates = mappings
      .map((m) => m.targetField)
      .filter((field, index, arr) => arr.indexOf(field) !== index);
    if (duplicates.length > 0) {
      errors.push(`Champs cibles dupliqués: ${duplicates.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }, [mappings]);

  // Add new mapping
  const handleAddMapping = () => {
    const newMapping: FieldMapping = {
      id: `mapping-${Date.now()}`,
      sourceField: '',
      targetField: '',
    };
    onMappingsChange([...mappings, newMapping]);
    setEditingMapping(newMapping.id);
  };

  // Delete mapping
  const handleDeleteMapping = (id: string) => {
    onMappingsChange(mappings.filter((m) => m.id !== id));
  };

  // Update mapping
  const handleUpdateMapping = (id: string, updates: Partial<FieldMapping>) => {
    onMappingsChange(
      mappings.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  // Apply template
  const handleApplyTemplate = () => {
    const template = MAPPING_TEMPLATES[connectorType];
    if (template.length > 0) {
      onMappingsChange(template);
    }
  };

  // Duplicate mapping
  const handleDuplicateMapping = (mapping: FieldMapping) => {
    const duplicate: FieldMapping = {
      ...mapping,
      id: `mapping-${Date.now()}`,
    };
    onMappingsChange([...mappings, duplicate]);
  };

  // Get target field info
  const getTargetFieldInfo = (targetField: string) => {
    return CARTAE_ITEM_FIELDS.find((f) => f.value === targetField);
  };

  return (
    <div
      className={`source-mapping-editor ${className}`}
      style={{
        padding: '20px',
        background: 'var(--color-background-primary, #ffffff)',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #1f2937)',
            }}
          >
            Field Mappings
          </h3>
          <div
            style={{
              marginTop: '4px',
              fontSize: '13px',
              color: 'var(--color-text-secondary, #6b7280)',
            }}
          >
            {mappings.length} mapping{mappings.length > 1 ? 's' : ''} configuré{mappings.length > 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {MAPPING_TEMPLATES[connectorType].length > 0 && (
            <button
              onClick={handleApplyTemplate}
              style={{
                display: 'flex',
                alignItems: 'center',
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
              <Wand2 size={14} />
              Appliquer template
            </button>
          )}

          <button
            onClick={handleAddMapping}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              border: 'none',
              borderRadius: '6px',
              background: 'var(--color-primary, #3b82f6)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={14} />
            Ajouter mapping
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {!validation.isValid && (
        <div
          style={{
            padding: '12px 14px',
            marginBottom: '16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#991b1b',
            }}
          >
            <AlertCircle size={16} />
            Erreurs de validation
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: '24px',
              fontSize: '12px',
              color: '#991b1b',
            }}
          >
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mappings List */}
      {mappings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mappings.map((mapping) => {
            const isEditing = editingMapping === mapping.id;
            const targetInfo = getTargetFieldInfo(mapping.targetField);

            return (
              <div
                key={mapping.id}
                style={{
                  padding: '14px',
                  background: 'var(--color-background-secondary, #f9fafb)',
                  border: `1px solid ${targetInfo?.required && !mapping.sourceField ? '#fecaca' : 'var(--color-border, #e5e7eb)'}`,
                  borderRadius: '8px',
                }}
              >
                {/* Mapping Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr auto',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  {/* Source Field */}
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary, #9ca3af)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Source
                    </div>
                    {isEditing || !mapping.sourceField ? (
                      sourceFields.length > 0 ? (
                        <select
                          value={mapping.sourceField}
                          onChange={(e) =>
                            handleUpdateMapping(mapping.id, { sourceField: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            border: '1px solid var(--color-border, #d1d5db)',
                            borderRadius: '6px',
                            background: 'var(--color-input-bg, #ffffff)',
                            color: 'var(--color-text-primary, #1f2937)',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="">Sélectionner...</option>
                          {sourceFields.map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={mapping.sourceField}
                          onChange={(e) =>
                            handleUpdateMapping(mapping.id, { sourceField: e.target.value })
                          }
                          placeholder="ex: subject, from.email"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            border: '1px solid var(--color-border, #d1d5db)',
                            borderRadius: '6px',
                            background: 'var(--color-input-bg, #ffffff)',
                            color: 'var(--color-text-primary, #1f2937)',
                          }}
                        />
                      )
                    ) : (
                      <code
                        onClick={() => setEditingMapping(mapping.id)}
                        style={{
                          display: 'block',
                          padding: '8px 10px',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          background: '#f3f4f6',
                          borderRadius: '6px',
                          color: '#6366f1',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {mapping.sourceField}
                      </code>
                    )}
                  </div>

                  {/* Arrow */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--color-text-tertiary, #9ca3af)',
                    }}
                  >
                    <ArrowRight size={20} />
                    {mapping.transform && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#dbeafe',
                          color: '#1e40af',
                          fontWeight: 600,
                        }}
                      >
                        {TRANSFORM_LABELS[mapping.transform]}
                      </span>
                    )}
                  </div>

                  {/* Target Field */}
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-text-tertiary, #9ca3af)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      CartaeItem
                      {targetInfo?.required && (
                        <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
                      )}
                    </div>
                    {isEditing || !mapping.targetField ? (
                      <select
                        value={mapping.targetField}
                        onChange={(e) =>
                          handleUpdateMapping(mapping.id, { targetField: e.target.value })
                        }
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          border: '1px solid var(--color-border, #d1d5db)',
                          borderRadius: '6px',
                          background: 'var(--color-input-bg, #ffffff)',
                          color: 'var(--color-text-primary, #1f2937)',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Sélectionner...</option>
                        {CARTAE_ITEM_FIELDS.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label} {field.required && '*'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <code
                        onClick={() => setEditingMapping(mapping.id)}
                        style={{
                          display: 'block',
                          padding: '8px 10px',
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          background: '#f0f9ff',
                          borderRadius: '6px',
                          color: '#0284c7',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {mapping.targetField}
                      </code>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {isEditing ? (
                      <button
                        onClick={() => setEditingMapping(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          border: 'none',
                          borderRadius: '6px',
                          background: '#d1fae5',
                          color: '#10b981',
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDuplicateMapping(mapping)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          border: '1px solid var(--color-border, #d1d5db)',
                          borderRadius: '6px',
                          background: 'var(--color-background-primary, #ffffff)',
                          color: 'var(--color-text-secondary, #6b7280)',
                          cursor: 'pointer',
                        }}
                      >
                        <Copy size={14} />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        background: '#fef2f2',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>

                {/* Transform & Default Value (if editing and showTransforms) */}
                {isEditing && showTransforms && (
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--color-border, #e5e7eb)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                    }}
                  >
                    {/* Transform */}
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--color-text-tertiary, #9ca3af)',
                          marginBottom: '6px',
                        }}
                      >
                        Transformation
                      </label>
                      <select
                        value={mapping.transform || ''}
                        onChange={(e) =>
                          handleUpdateMapping(mapping.id, {
                            transform: (e.target.value as any) || undefined,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '12px',
                          border: '1px solid var(--color-border, #d1d5db)',
                          borderRadius: '6px',
                          background: 'var(--color-input-bg, #ffffff)',
                          color: 'var(--color-text-primary, #1f2937)',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">Aucune</option>
                        <option value="date">Date</option>
                        <option value="array">Array</option>
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="json">JSON</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {/* Default Value */}
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--color-text-tertiary, #9ca3af)',
                          marginBottom: '6px',
                        }}
                      >
                        Valeur par défaut
                      </label>
                      <input
                        type="text"
                        value={mapping.defaultValue || ''}
                        onChange={(e) =>
                          handleUpdateMapping(mapping.id, { defaultValue: e.target.value })
                        }
                        placeholder="Optional"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          fontSize: '12px',
                          border: '1px solid var(--color-border, #d1d5db)',
                          borderRadius: '6px',
                          background: 'var(--color-input-bg, #ffffff)',
                          color: 'var(--color-text-primary, #1f2937)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            color: 'var(--color-text-secondary, #9ca3af)',
            fontSize: '14px',
          }}
        >
          Aucun mapping configuré. Cliquez sur "Ajouter mapping" ou "Appliquer template" pour commencer.
        </div>
      )}

      {/* Help Section */}
      <div
        style={{
          marginTop: '20px',
          padding: '12px 14px',
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0c4a6e',
          }}
        >
          <HelpCircle size={16} />
          Aide
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: '24px',
            fontSize: '12px',
            color: '#0c4a6e',
            lineHeight: 1.6,
          }}
        >
          <li>Les champs marqués <strong>*</strong> sont requis</li>
          <li>Utilisez la notation JSON path pour les champs imbriqués : <code>from.emailAddress.address</code></li>
          <li>Les transformations convertissent automatiquement les types de données</li>
          <li>La valeur par défaut est utilisée si le champ source est vide</li>
        </ul>
      </div>
    </div>
  );
};

export default SourceMappingEditor;
