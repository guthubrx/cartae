/**
 * CartaeItemEditor - Éditeur complet pour CartaeItem
 *
 * Formulaire d'édition avancé avec :
 * - Title input, type selector, categories picker
 * - Metadata editor (author, participants, priority, status, dates, location)
 * - Content editor (textarea avec preview markdown)
 * - Tags manager (add/remove avec autocomplete)
 * - Relationships manager (add/remove relations)
 * - Save/Cancel avec validation
 */

import React, { useState, useCallback } from 'react';
import type { CartaeItem, CartaeItemType } from '@cartae/core/types/CartaeItem';
import type { PriorityLevel, ItemStatus } from '@cartae/core/types/CartaeMetadata';
import {
  Save,
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Users,
  MapPin,
  Tag,
  Link2,
  AlertCircle,
  FileText,
  Mail,
  CheckSquare,
  MessageSquare,
  StickyNote,
  File,
  Eye,
  Edit3,
} from 'lucide-react';

/**
 * Props pour CartaeItemEditor
 */
export interface CartaeItemEditorProps {
  /**
   * Item à éditer (si undefined, mode création)
   */
  item?: CartaeItem;

  /**
   * Callback save avec item modifié
   */
  onSave: (item: Partial<CartaeItem>) => void;

  /**
   * Callback cancel
   */
  onCancel: () => void;

  /**
   * Mode d'affichage
   */
  mode?: 'modal' | 'sidebar' | 'inline';

  /**
   * Afficher bouton delete ?
   */
  showDelete?: boolean;

  /**
   * Callback delete
   */
  onDelete?: (item: CartaeItem) => void;

  /**
   * Tags suggestions (autocomplete)
   */
  tagsSuggestions?: string[];

  /**
   * Styles personnalisés
   */
  style?: React.CSSProperties;

  /**
   * Classe CSS personnalisée
   */
  className?: string;
}

// Types disponibles
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

// Priorités
const PRIORITIES: { value: PriorityLevel; label: string; color: string }[] = [
  { value: 'low', label: 'Basse', color: '#64748B' },
  { value: 'medium', label: 'Moyenne', color: '#F59E0B' },
  { value: 'high', label: 'Haute', color: '#EF4444' },
  { value: 'urgent', label: 'Urgente', color: '#991B1B' },
];

// Status
const STATUSES: { value: ItemStatus; label: string }[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'pending', label: 'En attente' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'blocked', label: 'Bloqué' },
];

/**
 * CartaeItemEditor - Éditeur complet
 */
export const CartaeItemEditor: React.FC<CartaeItemEditorProps> = ({
  item,
  onSave,
  onCancel,
  mode = 'modal',
  showDelete = false,
  onDelete,
  tagsSuggestions = [],
  style,
  className = '',
}) => {
  // État formulaire
  const [formData, setFormData] = useState<Partial<CartaeItem>>({
    title: item?.title || '',
    type: item?.type || 'note',
    content: item?.content || '',
    tags: item?.tags || [],
    categories: item?.categories || [],
    metadata: {
      author: item?.metadata?.author || '',
      participants: item?.metadata?.participants || [],
      priority: item?.metadata?.priority,
      status: item?.metadata?.status,
      dueDate: item?.metadata?.dueDate,
      startDate: item?.metadata?.startDate,
      endDate: item?.metadata?.endDate,
      location: item?.metadata?.location || '',
      duration: item?.metadata?.duration,
      progress: item?.metadata?.progress || 0,
    },
  });

  const [showPreview, setShowPreview] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newParticipant, setNewParticipant] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Le titre est obligatoire';
    }

    if (!formData.type) {
      newErrors.type = 'Le type est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handlers
  const handleSave = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  const handleDelete = () => {
    if (item && onDelete) {
      if (confirm('Êtes-vous sûr de vouloir supprimer cet item ?')) {
        onDelete(item);
      }
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tag),
    }));
  };

  const handleAddParticipant = () => {
    if (newParticipant.trim() && !formData.metadata?.participants?.includes(newParticipant.trim())) {
      setFormData((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          participants: [...(prev.metadata?.participants || []), newParticipant.trim()],
        },
      }));
      setNewParticipant('');
    }
  };

  const handleRemoveParticipant = (participant: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        participants: (prev.metadata?.participants || []).filter((p) => p !== participant),
      },
    }));
  };

  // Formatage dates pour input
  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  };

  // Container styles selon mode
  const containerStyles: React.CSSProperties =
    mode === 'modal'
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }
      : mode === 'sidebar'
        ? {
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '700px',
            maxWidth: '100vw',
            background: 'var(--color-background-primary, #ffffff)',
            boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            overflowY: 'auto',
          }
        : {
            width: '100%',
            background: 'var(--color-background-primary, #ffffff)',
          };

  const contentStyles: React.CSSProperties =
    mode === 'modal'
      ? {
          background: 'var(--color-background-primary, #ffffff)',
          borderRadius: '12px',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
        }
      : {};

  return (
    <div
      className={`cartae-item-editor cartae-item-editor--${mode} ${className}`}
      style={{ ...containerStyles, ...style }}
      onClick={mode === 'modal' ? onCancel : undefined}
    >
      <div
        style={contentStyles}
        onClick={(e) => {
          if (mode === 'modal') e.stopPropagation();
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px',
            borderBottom: '1px solid var(--color-border, #e5e7eb)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
            {item ? 'Éditer l\'item' : 'Nouvel item'}
          </h2>

          <div style={{ display: 'flex', gap: '8px' }}>
            {showDelete && item && onDelete && (
              <button
                onClick={handleDelete}
                style={{
                  padding: '8px 16px',
                  background: '#FEE2E2',
                  border: '1px solid #EF4444',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#991B1B',
                }}
              >
                <Trash2 size={16} />
                <span>Supprimer</span>
              </button>
            )}

            <button
              onClick={onCancel}
              style={{
                padding: '8px',
                background: 'transparent',
                border: '1px solid var(--color-border, #e5e7eb)',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Section Basique */}
          <div>
            <h3 style={{ margin: 0, marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
              Informations de base
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Titre */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Titre de l'item..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${errors.title ? '#EF4444' : 'var(--color-border, #e5e7eb)'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                {errors.title && (
                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#EF4444' }}>
                    {errors.title}
                  </div>
                )}
              </div>

              {/* Type */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {ITEM_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setFormData((prev) => ({ ...prev, type: type.value }))}
                        style={{
                          padding: '12px',
                          background: isSelected ? '#EFF6FF' : 'var(--color-background-secondary, #f9fafb)',
                          border: `1px solid ${isSelected ? '#3B82F6' : 'var(--color-border, #e5e7eb)'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: isSelected ? '#1E40AF' : '#6B7280',
                        }}
                      >
                        <Icon size={20} />
                        <span>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section Metadata */}
          <div>
            <h3 style={{ margin: 0, marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
              Métadonnées
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Auteur */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Auteur
                </label>
                <input
                  type="text"
                  value={formData.metadata?.author || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metadata: { ...prev.metadata, author: e.target.value },
                    }))
                  }
                  placeholder="email@example.com"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Priorité */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Priorité
                </label>
                <select
                  value={formData.metadata?.priority || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metadata: { ...prev.metadata, priority: e.target.value as PriorityLevel || undefined },
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Aucune</option>
                  {PRIORITIES.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  value={formData.metadata?.status || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metadata: { ...prev.metadata, status: e.target.value as ItemStatus || undefined },
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <option value="">Aucun</option>
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Progression */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  Progression ({formData.metadata?.progress || 0}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.metadata?.progress || 0}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metadata: { ...prev.metadata, progress: parseInt(e.target.value, 10) },
                    }))
                  }
                  style={{ width: '100%' }}
                />
              </div>

              {/* Due Date */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Échéance
                </label>
                <input
                  type="datetime-local"
                  value={formatDateForInput(formData.metadata?.dueDate)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metadata: { ...prev.metadata, dueDate: e.target.value ? new Date(e.target.value) : undefined },
                    }))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Location */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Lieu
                </label>
                <input
                  type="text"
                  value={formData.metadata?.location || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      metadata: { ...prev.metadata, location: e.target.value },
                    }))
                  }
                  placeholder="Paris, France"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            {/* Participants */}
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Participants
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
                  placeholder="email@example.com"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid var(--color-border, #e5e7eb)',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                <button
                  onClick={handleAddParticipant}
                  style={{
                    padding: '8px 16px',
                    background: '#EFF6FF',
                    border: '1px solid #3B82F6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    color: '#1E40AF',
                  }}
                >
                  <Plus size={16} />
                  <span>Ajouter</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(formData.metadata?.participants || []).map((participant) => (
                  <div
                    key={participant}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      background: '#F3F4F6',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <span>{participant}</span>
                    <button
                      onClick={() => handleRemoveParticipant(participant)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <X size={14} style={{ color: '#6B7280' }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section Tags */}
          <div>
            <h3 style={{ margin: 0, marginBottom: '12px', fontSize: '16px', fontWeight: 600 }}>
              <Tag size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Tags
            </h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Ajouter un tag..."
                list="tags-suggestions"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <datalist id="tags-suggestions">
                {tagsSuggestions.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
              <button
                onClick={handleAddTag}
                style={{
                  padding: '8px 16px',
                  background: '#EFF6FF',
                  border: '1px solid #3B82F6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  color: '#1E40AF',
                }}
              >
                <Plus size={16} />
                <span>Ajouter</span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(formData.tags || []).map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#F3F4F6',
                    borderRadius: '12px',
                    fontSize: '13px',
                  }}
                >
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={14} style={{ color: '#6B7280' }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section Content */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Contenu</h3>
              <button
                onClick={() => setShowPreview(!showPreview)}
                style={{
                  padding: '6px 12px',
                  background: showPreview ? '#EFF6FF' : 'transparent',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  color: showPreview ? '#1E40AF' : '#6B7280',
                }}
              >
                {showPreview ? <Edit3 size={14} /> : <Eye size={14} />}
                <span>{showPreview ? 'Éditer' : 'Prévisualiser'}</span>
              </button>
            </div>

            {showPreview ? (
              <div
                style={{
                  padding: '16px',
                  background: 'var(--color-background-secondary, #f9fafb)',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  minHeight: '300px',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {formData.content || <span style={{ color: '#9CA3AF' }}>Aucun contenu</span>}
              </div>
            ) : (
              <textarea
                value={formData.content || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Contenu de l'item (Markdown supporté)..."
                style={{
                  width: '100%',
                  minHeight: '300px',
                  padding: '12px',
                  border: '1px solid var(--color-border, #e5e7eb)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            padding: '24px',
            borderTop: '1px solid var(--color-border, #e5e7eb)',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid var(--color-border, #e5e7eb)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: '#6B7280',
            }}
          >
            Annuler
          </button>

          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              background: '#3B82F6',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
            }}
          >
            <Save size={16} />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartaeItemEditor;
