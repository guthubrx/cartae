/**
 * CartaeItemForm - Formulaire simplifié pour édition rapide
 *
 * Version allégée de CartaeItemEditor pour:
 * - Édition rapide inline
 * - Embedding dans d'autres composants
 * - Champs essentiels uniquement
 *
 * Différences avec CartaeItemEditor:
 * - Pas de modes modal/sidebar (inline uniquement)
 * - Pas de participants/location/dates avancées
 * - Type selector simplifié (dropdown)
 * - UI plus compacte
 */

import React, { useState } from 'react';
import type { CartaeItem, CartaeItemType } from '@cartae/core/types/CartaeItem';
import type { PriorityLevel, ItemStatus } from '@cartae/core/types/CartaeMetadata';
import {
  FileText,
  Mail,
  CheckSquare,
  MessageSquare,
  Calendar,
  StickyNote,
  User,
  File,
  Save,
  X,
  Tag as TagIcon,
} from 'lucide-react';

/**
 * Props pour CartaeItemForm
 */
export interface CartaeItemFormProps {
  /**
   * Item à éditer (undefined = création)
   */
  item?: CartaeItem;

  /**
   * Callback quand save
   */
  onSave: (item: Partial<CartaeItem>) => void;

  /**
   * Callback quand cancel
   */
  onCancel: () => void;

  /**
   * Suggestions de tags (autocomplete)
   */
  tagsSuggestions?: string[];

  /**
   * Afficher champs de priorité/status
   */
  showMetadata?: boolean;

  /**
   * Style personnalisé
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

// Types d'items disponibles
const ITEM_TYPES: { value: CartaeItemType; label: string; icon: React.FC<any> }[] = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'task', label: 'Tâche', icon: CheckSquare },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'message', label: 'Message', icon: MessageSquare },
  { value: 'event', label: 'Événement', icon: Calendar },
  { value: 'note', label: 'Note', icon: StickyNote },
  { value: 'contact', label: 'Contact', icon: User },
  { value: 'file', label: 'Fichier', icon: File },
];

// Priorités disponibles
const PRIORITY_OPTIONS: { value: PriorityLevel; label: string }[] = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

// Status disponibles
const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'pending', label: 'En attente' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'blocked', label: 'Bloqué' },
];

/**
 * CartaeItemForm - Formulaire simplifié
 */
export const CartaeItemForm: React.FC<CartaeItemFormProps> = ({
  item,
  onSave,
  onCancel,
  tagsSuggestions = [],
  showMetadata = false,
  style,
  className = '',
}) => {
  const [title, setTitle] = useState(item?.title || '');
  const [type, setType] = useState<CartaeItemType>(item?.type || 'note');
  const [content, setContent] = useState(item?.content || '');
  const [tags, setTags] = useState<string[]>(item?.tags || []);
  const [priority, setPriority] = useState<PriorityLevel | undefined>(item?.metadata?.priority);
  const [status, setStatus] = useState<ItemStatus | undefined>(item?.metadata?.status);

  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Le titre est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Ajouter tag
  const handleAddTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  // Supprimer tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Gérer Enter dans input tags
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Save
  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const updatedItem: Partial<CartaeItem> = {
      title: title.trim(),
      type,
      content: content.trim(),
      tags,
      metadata: {
        ...(item?.metadata || {}),
        priority,
        status,
      },
    };

    // Retirer metadata si vide
    if (!priority && !status) {
      delete updatedItem.metadata;
    }

    onSave(updatedItem);
  };

  // Trouver icon pour type sélectionné
  const selectedTypeIcon = ITEM_TYPES.find((t) => t.value === type)?.icon || FileText;
  const SelectedTypeIcon = selectedTypeIcon;

  return (
    <div
      className={`cartae-item-form ${className}`}
      style={{
        padding: '16px',
        background: 'var(--color-background-primary, #ffffff)',
        border: '1px solid var(--color-border, #e5e7eb)',
        borderRadius: '8px',
        fontFamily: 'system-ui, sans-serif',
        ...style,
      }}
    >
      {/* Titre */}
      <div style={{ marginBottom: '14px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #374151)',
            marginBottom: '6px',
          }}
        >
          Titre *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de l'item..."
          style={{
            width: '100%',
            padding: '9px 12px',
            fontSize: '14px',
            border: errors.title ? '2px solid #ef4444' : '1px solid var(--color-border, #d1d5db)',
            borderRadius: '6px',
            background: 'var(--color-input-bg, #ffffff)',
            color: 'var(--color-text-primary, #1f2937)',
            boxSizing: 'border-box',
          }}
        />
        {errors.title && (
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#ef4444' }}>
            {errors.title}
          </div>
        )}
      </div>

      {/* Type + Metadata Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showMetadata ? 'repeat(3, 1fr)' : '1fr',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        {/* Type Selector */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #374151)',
              marginBottom: '6px',
            }}
          >
            Type
          </label>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <SelectedTypeIcon size={16} style={{ color: '#6b7280' }} />
            </div>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CartaeItemType)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                fontSize: '14px',
                border: '1px solid var(--color-border, #d1d5db)',
                borderRadius: '6px',
                background: 'var(--color-input-bg, #ffffff)',
                color: 'var(--color-text-primary, #1f2937)',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority (si showMetadata) */}
        {showMetadata && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #374151)',
                marginBottom: '6px',
              }}
            >
              Priorité
            </label>
            <select
              value={priority || ''}
              onChange={(e) => setPriority((e.target.value as PriorityLevel) || undefined)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '14px',
                border: '1px solid var(--color-border, #d1d5db)',
                borderRadius: '6px',
                background: 'var(--color-input-bg, #ffffff)',
                color: 'var(--color-text-primary, #1f2937)',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Aucune</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status (si showMetadata) */}
        {showMetadata && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #374151)',
                marginBottom: '6px',
              }}
            >
              Statut
            </label>
            <select
              value={status || ''}
              onChange={(e) => setStatus((e.target.value as ItemStatus) || undefined)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '14px',
                border: '1px solid var(--color-border, #d1d5db)',
                borderRadius: '6px',
                background: 'var(--color-input-bg, #ffffff)',
                color: 'var(--color-text-primary, #1f2937)',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Aucun</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tags */}
      <div style={{ marginBottom: '14px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #374151)',
            marginBottom: '6px',
          }}
        >
          Tags
        </label>

        {/* Input ajout tag */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Ajouter un tag..."
            list="tags-suggestions"
            style={{
              flex: 1,
              padding: '9px 12px',
              fontSize: '13px',
              border: '1px solid var(--color-border, #d1d5db)',
              borderRadius: '6px',
              background: 'var(--color-input-bg, #ffffff)',
              color: 'var(--color-text-primary, #1f2937)',
            }}
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!newTag.trim()}
            style={{
              padding: '9px 14px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid var(--color-border, #d1d5db)',
              borderRadius: '6px',
              background: newTag.trim() ? 'var(--color-primary, #3b82f6)' : '#e5e7eb',
              color: newTag.trim() ? '#ffffff' : '#9ca3af',
              cursor: newTag.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            Ajouter
          </button>
        </div>

        {/* Autocomplete suggestions */}
        <datalist id="tags-suggestions">
          {tagsSuggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>

        {/* Liste tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {tags.map((tag) => (
              <div
                key={tag}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#4b5563',
                }}
              >
                <TagIcon size={12} />
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: '#6b7280',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-text-primary, #374151)',
            marginBottom: '6px',
          }}
        >
          Contenu
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Contenu de l'item..."
          rows={8}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '13px',
            fontFamily: 'ui-monospace, monospace',
            border: '1px solid var(--color-border, #d1d5db)',
            borderRadius: '6px',
            background: 'var(--color-input-bg, #ffffff)',
            color: 'var(--color-text-primary, #1f2937)',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid var(--color-border, #d1d5db)',
            borderRadius: '6px',
            background: 'var(--color-background-secondary, #f9fafb)',
            color: 'var(--color-text-secondary, #6b7280)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              'var(--color-background-secondary, #f9fafb)';
          }}
        >
          <X size={16} />
          Annuler
        </button>

        <button
          type="button"
          onClick={handleSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '6px',
            background: 'var(--color-primary, #3b82f6)',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#2563eb';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--color-primary, #3b82f6)';
          }}
        >
          <Save size={16} />
          Enregistrer
        </button>
      </div>
    </div>
  );
};

export default CartaeItemForm;
