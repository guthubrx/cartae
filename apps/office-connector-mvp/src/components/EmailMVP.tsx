/**
 * EmailMVP - Composant React style Outlook Web
 *
 * Interface Outlook-like pour afficher emails avec virtual scrolling
 */

import React, { useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { TokenInterceptorService } from '../services/auth/TokenInterceptorService';
import {
  OwaRestEmailService,
  type OwaEmail,
  type OwaAttachment,
} from '../services/OwaRestEmailService';
import type { ParsedAttachment } from '@cartae/parsers';
import { useDebounce } from '../hooks';

interface EmailMVPState {
  isLoading: boolean;
  error: string | null;
  emails: OwaEmail[];
  selectedEmail: OwaEmail | null;
  searchQuery: string;
  filter: 'all' | 'unread' | 'flagged';
  // Attachments
  attachments: OwaAttachment[];
  attachmentsEmailId: string | null; // EmailId des attachments chargés
  loadingAttachments: boolean;
  selectedAttachment: {
    attachment: OwaAttachment;
    parsed: ParsedAttachment;
  } | null;
  selectedNestedFile: ParsedAttachment | null;
}

export const EmailMVP: React.FC = () => {
  const [emailService, setEmailService] = useState<OwaRestEmailService | null>(null);
  const [state, setState] = useState<EmailMVPState>({
    isLoading: false,
    error: null,
    emails: [],
    selectedEmail: null,
    searchQuery: '',
    filter: 'all',
    attachments: [],
    attachmentsEmailId: null,
    loadingAttachments: false,
    selectedAttachment: null,
    selectedNestedFile: null,
  });

  // Debounce search (300ms)
  const debouncedSearchQuery = useDebounce(state.searchQuery, 300);

  // Initialiser service
  useEffect(() => {
    const initService = async () => {
      const tokenService = new TokenInterceptorService();
      await tokenService.startMonitoring();

      const service = new OwaRestEmailService(tokenService);
      setEmailService(service);
    };

    initService();
  }, []);

  // Charger emails au montage
  useEffect(() => {
    if (emailService) {
      loadEmails();
    }
  }, [emailService]);

  // Charger attachments quand email sélectionné
  useEffect(() => {
    if (emailService && state.selectedEmail?.hasAttachments) {
      loadAttachments(state.selectedEmail.id);
    } else {
      setState((prev) => ({ ...prev, attachments: [], selectedAttachment: null }));
    }
  }, [state.selectedEmail, emailService]);

  // Charger emails
  const loadEmails = async () => {
    if (!emailService) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const emails = await emailService.listInboxEmails(100);
      setState(prev => ({ ...prev, emails, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur chargement emails'
      }));
    }
  };

  // Charger attachments d'un email
  const loadAttachments = async (emailId: string) => {
    if (!emailService) return;

    setState((prev) => ({ ...prev, loadingAttachments: true }));

    try {
      const attachments = await emailService.listAttachments(emailId);
      setState((prev) => ({
        ...prev,
        attachments,
        attachmentsEmailId: emailId,
        loadingAttachments: false,
      }));
    } catch (error) {
      console.error('Erreur chargement attachments:', error);
      setState((prev) => ({
        ...prev,
        attachments: [],
        attachmentsEmailId: null,
        loadingAttachments: false,
      }));
    }
  };

  // Parser et afficher preview d'un attachment
  const parseAttachment = async (emailId: string, attachment: OwaAttachment) => {
    if (!emailService) return;

    try {
      console.log(`Parsing attachment ${attachment.name}...`);

      const parsed = await emailService.getAttachmentWithParsing(
        emailId,
        attachment.id,
        { extractText: true, generatePreview: true }
      );

      setState((prev) => ({
        ...prev,
        selectedAttachment: { attachment, parsed },
      }));
    } catch (error) {
      console.error('Erreur parsing attachment:', error);
      alert(`Erreur lors du parsing de ${attachment.name}`);
    }
  };

  // Gérer clic sur fichier imbriqué
  const handleNestedFileClick = (file: ParsedAttachment) => {
    console.log('Fichier imbriqué sélectionné:', file.path);
    setState((prev) => ({
      ...prev,
      selectedNestedFile: file,
    }));
  };

  // Filtrer emails selon search + filter
  const filteredEmails = state.emails.filter(email => {
    // Filtre par type
    if (state.filter === 'unread' && email.isRead) return false;
    if (state.filter === 'flagged' && !email.hasAttachments) return false; // "flagged" simulé avec hasAttachments

    // Filtre search
    if (!debouncedSearchQuery.trim()) return true;

    const searchLower = debouncedSearchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(searchLower) ||
      email.from.name.toLowerCase().includes(searchLower) ||
      email.from.email.toLowerCase().includes(searchLower) ||
      email.body.toLowerCase().includes(searchLower)
    );
  });

  // Formater date relative
  const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Composant EmailRow pour virtual scrolling
  const EmailRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const email = filteredEmails[index];
    if (!email) return null;

    const isSelected = state.selectedEmail?.id === email.id;

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          cursor: 'pointer',
          backgroundColor: isSelected ? '#e8eaed' : email.isRead ? '#fff' : '#f0f4f9',
          borderBottom: '1px solid #e0e0e0',
          fontWeight: email.isRead ? 'normal' : '600',
        }}
        onClick={() => setState(prev => ({ ...prev, selectedEmail: email }))}
      >
        {/* Avatar */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#6264a7',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '600',
            flexShrink: 0,
            marginRight: '12px',
          }}
        >
          {email.from.name.charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {/* From + Time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '14px',
                color: '#202124',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email.from.name}
            </span>
            <span style={{ fontSize: '12px', color: '#5f6368', marginLeft: '8px', flexShrink: 0 }}>
              {formatRelativeDate(email.receivedDateTime)}
            </span>
          </div>

          {/* Subject */}
          <div
            style={{
              fontSize: '13px',
              color: '#202124',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '2px',
            }}
          >
            {email.subject}
          </div>

          {/* Preview */}
          <div
            style={{
              fontSize: '12px',
              color: '#5f6368',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email.body}
          </div>
        </div>

        {/* Attachment icon */}
        {email.hasAttachments && (
          <div style={{ marginLeft: '8px', color: '#5f6368', fontSize: '18px' }}>📎</div>
        )}
      </div>
    );
  };

  // Styles
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
    sidebar: {
      width: '200px',
      backgroundColor: '#fff',
      borderRight: '1px solid #e0e0e0',
      padding: '16px',
    },
    emailList: {
      flex: '0 0 400px',
      backgroundColor: '#fff',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
    },
    emailDetail: {
      flex: 1,
      backgroundColor: '#fff',
      padding: '24px',
      overflow: 'auto',
    },
    header: {
      padding: '16px',
      borderBottom: '1px solid #e0e0e0',
    },
    searchInput: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      fontSize: '14px',
    },
    filterButton: {
      padding: '8px 12px',
      marginRight: '8px',
      marginTop: '8px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      backgroundColor: '#fff',
      cursor: 'pointer',
      fontSize: '13px',
    },
    filterButtonActive: {
      padding: '8px 12px',
      marginRight: '8px',
      marginTop: '8px',
      border: '1px solid #6264a7',
      borderRadius: '4px',
      backgroundColor: '#e8eaed',
      cursor: 'pointer',
      fontSize: '13px',
      color: '#6264a7',
      fontWeight: '600',
    },
    loading: {
      textAlign: 'center',
      padding: '32px',
      color: '#5f6368',
    },
    error: {
      textAlign: 'center',
      padding: '32px',
      color: '#d93025',
    },
  };

  return (
    <div style={styles.container}>
      {/* Sidebar (navigation) */}
      <div style={styles.sidebar}>
        <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Outlook</h2>
        <div>
          <div style={{ padding: '8px', cursor: 'pointer', backgroundColor: '#e8eaed', borderRadius: '4px', marginBottom: '4px' }}>
            📥 Boîte de réception
          </div>
          <div style={{ padding: '8px', cursor: 'pointer', marginBottom: '4px' }}>📤 Éléments envoyés</div>
          <div style={{ padding: '8px', cursor: 'pointer', marginBottom: '4px' }}>📝 Brouillons</div>
          <div style={{ padding: '8px', cursor: 'pointer', marginBottom: '4px' }}>🗑️ Éléments supprimés</div>
        </div>
      </div>

      {/* Email List */}
      <div style={styles.emailList}>
        {/* Header avec search + filters */}
        <div style={styles.header}>
          <input
            type="text"
            placeholder="Rechercher dans les emails..."
            value={state.searchQuery}
            onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
            style={styles.searchInput}
          />
          <div style={{ marginTop: '8px' }}>
            <button
              style={state.filter === 'all' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setState(prev => ({ ...prev, filter: 'all' }))}
            >
              Tous
            </button>
            <button
              style={state.filter === 'unread' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setState(prev => ({ ...prev, filter: 'unread' }))}
            >
              Non lus
            </button>
            <button
              style={state.filter === 'flagged' ? styles.filterButtonActive : styles.filterButton}
              onClick={() => setState(prev => ({ ...prev, filter: 'flagged' }))}
            >
              Avec pièces jointes
            </button>
          </div>
        </div>

        {/* Liste emails - Virtual Scrolling */}
        {state.isLoading ? (
          <div style={styles.loading}>Chargement des emails...</div>
        ) : state.error ? (
          <div style={styles.error}>❌ {state.error}</div>
        ) : filteredEmails.length > 0 ? (
          <List
            height={window.innerHeight - 120}
            itemCount={filteredEmails.length}
            itemSize={80}
            width="100%"
          >
            {EmailRow}
          </List>
        ) : (
          <div style={styles.loading}>Aucun email</div>
        )}
      </div>

      {/* Email Detail */}
      <div style={styles.emailDetail}>
        {state.selectedEmail ? (
          <>
            <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>{state.selectedEmail.subject}</h1>

            <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e0e0e0' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#6264a7',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '600',
                    marginRight: '12px',
                  }}
                >
                  {state.selectedEmail.from.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{state.selectedEmail.from.name}</div>
                  <div style={{ fontSize: '12px', color: '#5f6368' }}>{state.selectedEmail.from.email}</div>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '8px' }}>
                {state.selectedEmail.receivedDateTime.toLocaleString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {state.selectedEmail.to.length > 0 && (
                <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px' }}>
                  À: {state.selectedEmail.to.map(r => r.name || r.email).join(', ')}
                </div>
              )}
            </div>

            {/* Attachments */}
            {state.attachments.length > 0 && (
              <div
                style={{
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#5f6368' }}>
                  📎 Pièces jointes ({state.attachments.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {state.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor: '#f8f9fa',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s',
                      }}
                      onClick={() => parseAttachment(state.attachmentsEmailId!, attachment)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e8eaed')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                    >
                      <span>
                        {attachment.contentType.startsWith('image/')
                          ? '🖼️'
                          : attachment.contentType.includes('pdf')
                          ? '📄'
                          : attachment.contentType.includes('word') ||
                            attachment.contentType.includes('document')
                          ? '📝'
                          : attachment.contentType.includes('sheet') ||
                            attachment.contentType.includes('excel')
                          ? '📊'
                          : attachment.contentType.includes('presentation')
                          ? '📊'
                          : '📎'}
                      </span>
                      <div>
                        <div style={{ fontWeight: '500' }}>{attachment.name}</div>
                        <div style={{ fontSize: '11px', color: '#5f6368' }}>
                          {(attachment.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.loadingAttachments && (
              <div style={{ textAlign: 'center', padding: '16px', color: '#5f6368' }}>
                Chargement des pièces jointes...
              </div>
            )}

            {/* Body */}
            <div
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#202124',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
              }}
              dangerouslySetInnerHTML={
                state.selectedEmail.bodyType === 'html'
                  ? { __html: state.selectedEmail.body }
                  : undefined
              }
            >
              {state.selectedEmail.bodyType === 'text' ? state.selectedEmail.body : undefined}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', paddingTop: '100px', color: '#5f6368' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <div>Sélectionnez un email pour le lire</div>
          </div>
        )}
      </div>

      {/* Modal Preview Attachment */}
      {state.selectedAttachment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setState((prev) => ({ ...prev, selectedAttachment: null }))}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>
                  {state.selectedAttachment.attachment.name}
                </h2>
                <div style={{ fontSize: '12px', color: '#5f6368' }}>
                  {state.selectedAttachment.attachment.contentType} •{' '}
                  {(state.selectedAttachment.attachment.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Bouton Télécharger */}
                {state.selectedAttachment.parsed.previewUrl && (
                  <a
                    href={state.selectedAttachment.parsed.previewUrl}
                    download={state.selectedAttachment.attachment.name}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #1a73e8',
                      borderRadius: '4px',
                      backgroundColor: '#1a73e8',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    ⬇ Télécharger
                  </a>
                )}
                {/* Bouton Fermer */}
                <button
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                  onClick={() => setState((prev) => ({ ...prev, selectedAttachment: null }))}
                >
                  ✕ Fermer
                </button>
              </div>
            </div>

            {/* Contenu parsé */}
            <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
              {state.selectedAttachment.parsed.error ? (
                <div style={{ color: '#d93025', padding: '16px', textAlign: 'center' }}>
                  ❌ Erreur: {state.selectedAttachment.parsed.error}
                </div>
              ) : (
                <>
                  {/* HTML (prioritaire pour DOCX/PPTX) */}
                  {state.selectedAttachment.parsed.html && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#5f6368' }}>
                        📄 Contenu HTML
                      </div>
                      <div
                        style={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          padding: '16px',
                          maxHeight: '60vh',
                          overflow: 'auto',
                        }}
                        dangerouslySetInnerHTML={{ __html: state.selectedAttachment.parsed.html }}
                      />
                    </div>
                  )}

                  {/* Preview (image uniquement, pas PDF car texte suffit pour analyse) */}
                  {state.selectedAttachment.parsed.previewUrl &&
                    state.selectedAttachment.parsed.type !== 'pdf' && (
                      <div style={{ marginBottom: '16px' }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            color: '#5f6368',
                          }}
                        >
                          🖼️ Aperçu
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <img
                            src={state.selectedAttachment.parsed.previewUrl}
                            alt={state.selectedAttachment.attachment.name}
                            style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '4px' }}
                          />
                        </div>
                      </div>
                    )}

                  {/* Text (CSV, TXT, XLSX en CSV) */}
                  {state.selectedAttachment.parsed.text && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#5f6368' }}>
                        📝 Contenu texte
                      </div>
                      <div
                        style={{
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          backgroundColor: '#f8f9fa',
                          padding: '16px',
                          borderRadius: '4px',
                          maxHeight: '60vh',
                          overflow: 'auto',
                        }}
                      >
                        {state.selectedAttachment.parsed.text}
                      </div>
                    </div>
                  )}

                  {/* Data (JSON/XLSX sheets ou contenu ZIP) */}
                  {state.selectedAttachment.parsed.data && (
                    <div style={{ marginBottom: '16px' }}>
                      {/* ZIP avec contenu fichiers */}
                      {state.selectedAttachment.parsed.type === 'zip' &&
                      typeof state.selectedAttachment.parsed.data === 'object' &&
                      'fileContents' in state.selectedAttachment.parsed.data ? (
                        <>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#5f6368' }}>
                            📂 Contenu des fichiers
                          </div>
                          {Object.entries(
                            (state.selectedAttachment.parsed.data as any).fileContents as Record<string, string>
                          ).map(([fileName, content]) => (
                            <div
                              key={fileName}
                              style={{
                                marginBottom: '12px',
                                border: '1px solid #e0e0e0',
                                borderRadius: '4px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  backgroundColor: '#f1f3f4',
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  borderBottom: '1px solid #e0e0e0',
                                }}
                              >
                                📄 {fileName}
                              </div>
                              <div
                                style={{
                                  whiteSpace: 'pre-wrap',
                                  fontFamily: 'monospace',
                                  fontSize: '11px',
                                  backgroundColor: '#fff',
                                  padding: '12px',
                                  maxHeight: '300px',
                                  overflow: 'auto',
                                }}
                              >
                                {content}
                              </div>
                            </div>
                          ))}
                          {/* Liste complète fichiers en JSON */}
                          <details style={{ marginTop: '8px' }}>
                            <summary
                              style={{
                                fontSize: '12px',
                                color: '#5f6368',
                                cursor: 'pointer',
                                padding: '4px 0',
                              }}
                            >
                              📋 Voir liste complète (JSON)
                            </summary>
                            <div
                              style={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'monospace',
                                fontSize: '11px',
                                backgroundColor: '#f8f9fa',
                                padding: '12px',
                                borderRadius: '4px',
                                marginTop: '8px',
                                maxHeight: '300px',
                                overflow: 'auto',
                              }}
                            >
                              {JSON.stringify(
                                (state.selectedAttachment.parsed.data as any).files,
                                null,
                                2
                              )}
                            </div>
                          </details>
                        </>
                      ) : (
                        /* Affichage JSON standard pour autres types */
                        <>
                          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#5f6368' }}>
                            📊 Données structurées
                          </div>
                          <div
                            style={{
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              backgroundColor: '#f8f9fa',
                              padding: '16px',
                              borderRadius: '4px',
                              maxHeight: '60vh',
                              overflow: 'auto',
                            }}
                          >
                            {typeof state.selectedAttachment.parsed.data === 'string'
                              ? state.selectedAttachment.parsed.data
                              : JSON.stringify(state.selectedAttachment.parsed.data, null, 2)}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  {state.selectedAttachment.parsed.metadata && (
                    <div
                      style={{
                        marginTop: '16px',
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '8px' }}>📋 Métadonnées</div>
                      <pre style={{ margin: 0, fontFamily: 'monospace' }}>
                        {JSON.stringify(state.selectedAttachment.parsed.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Fichiers imbriqués (Parsing récursif) */}
                  {state.selectedAttachment.parsed.children && state.selectedAttachment.parsed.children.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          marginBottom: '12px',
                          color: '#202124',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        🌳 Fichiers imbriqués ({state.selectedAttachment.parsed.children.length})
                      </div>
                      {renderNestedFiles(state.selectedAttachment.parsed.children, 0, handleNestedFileClick)}
                    </div>
                  )}

                  {/* Bouton "Explorer plus" si depth max atteint */}
                  {state.selectedAttachment.parsed.canExploreFurther && (
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                      <button
                        style={{
                          padding: '10px 20px',
                          border: '1px solid #1a73e8',
                          borderRadius: '4px',
                          backgroundColor: '#fff',
                          color: '#1a73e8',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                        }}
                        onClick={() => {
                          alert(
                            'Fonctionnalité "Explorer plus profond" pas encore implémentée.\nNiveau max atteint: depth 3'
                          );
                        }}
                      >
                        🔍 Explorer plus profond
                      </button>
                      <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '8px' }}>
                        Niveau maximum de parsing atteint (3 niveaux)
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal pour fichier imbriqué sélectionné */}
      {state.selectedNestedFile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setState((prev) => ({ ...prev, selectedNestedFile: null }))}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              maxWidth: '900px',
              maxHeight: '90vh',
              width: '100%',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                backgroundColor: '#fff',
                zIndex: 1,
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#202124' }}>
                  {getIconForType(state.selectedNestedFile.type)} {state.selectedNestedFile.path?.split('/').pop() || 'Fichier imbriqué'}
                </div>
                <div style={{ fontSize: '12px', color: '#5f6368', marginTop: '4px' }}>
                  {state.selectedNestedFile.path} • Type: {state.selectedNestedFile.type} • Depth: {state.selectedNestedFile.depth}
                </div>
              </div>
              <button
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#f1f3f4',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
                onClick={() => setState((prev) => ({ ...prev, selectedNestedFile: null }))}
              >
                ✕ Fermer
              </button>
            </div>

            {/* Contenu modal */}
            <div style={{ padding: '20px' }}>
              {/* Métadonnées */}
              {state.selectedNestedFile.metadata && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#202124' }}>
                    📊 Métadonnées
                  </div>
                  <div style={{ fontSize: '13px', color: '#5f6368', lineHeight: '1.6' }}>
                    {state.selectedNestedFile.metadata.size && (
                      <div>Taille: {(state.selectedNestedFile.metadata.size / 1024).toFixed(2)} KB</div>
                    )}
                    {state.selectedNestedFile.metadata.format && (
                      <div>Format: {state.selectedNestedFile.metadata.format}</div>
                    )}
                    {state.selectedNestedFile.metadata.pageCount && (
                      <div>Pages: {state.selectedNestedFile.metadata.pageCount}</div>
                    )}
                    {state.selectedNestedFile.metadata.fileCount !== undefined && (
                      <div>Fichiers: {state.selectedNestedFile.metadata.fileCount}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Erreur */}
              {state.selectedNestedFile.error && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#fef7e0',
                    border: '1px solid #f9ab00',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#d93025',
                    marginBottom: '20px',
                  }}
                >
                  ❌ {state.selectedNestedFile.error}
                </div>
              )}

              {/* Texte */}
              {state.selectedNestedFile.text && !state.selectedNestedFile.error && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#202124' }}>
                    📄 Contenu texte
                  </div>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      backgroundColor: '#f8f9fa',
                      padding: '12px',
                      borderRadius: '4px',
                      maxHeight: '400px',
                      overflow: 'auto',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    {state.selectedNestedFile.text}
                  </div>
                </div>
              )}

              {/* HTML */}
              {state.selectedNestedFile.html && !state.selectedNestedFile.error && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#202124' }}>
                    🌐 Contenu HTML
                  </div>
                  <div
                    style={{
                      backgroundColor: '#fff',
                      padding: '12px',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0',
                      maxHeight: '400px',
                      overflow: 'auto',
                    }}
                    dangerouslySetInnerHTML={{ __html: state.selectedNestedFile.html }}
                  />
                </div>
              )}

              {/* Data structurées */}
              {state.selectedNestedFile.data && !state.selectedNestedFile.error && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#202124' }}>
                    🗂️ Données structurées
                  </div>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      fontSize: '11px',
                      backgroundColor: '#f8f9fa',
                      padding: '12px',
                      borderRadius: '4px',
                      maxHeight: '400px',
                      overflow: 'auto',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    {JSON.stringify(state.selectedNestedFile.data, null, 2)}
                  </div>
                </div>
              )}

              {/* Preview URL */}
              {state.selectedNestedFile.previewUrl && (
                <div style={{ marginTop: '20px' }}>
                  <a
                    href={state.selectedNestedFile.previewUrl}
                    download={state.selectedNestedFile.path?.split('/').pop()}
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      backgroundColor: '#1a73e8',
                      color: '#fff',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    ⬇️ Télécharger le fichier
                  </a>
                </div>
              )}

              {/* Fichiers imbriqués récursifs */}
              {state.selectedNestedFile.children && state.selectedNestedFile.children.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#202124' }}>
                    🌳 Fichiers imbriqués ({state.selectedNestedFile.children.length})
                  </div>
                  {renderNestedFiles(state.selectedNestedFile.children, 0, handleNestedFileClick)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Helper: Affiche récursivement les fichiers imbriqués
 */
function renderNestedFiles(
  children: any[],
  indentLevel: number,
  onFileClick: (file: ParsedAttachment) => void
): JSX.Element {
  const indentPx = indentLevel * 20;

  return (
    <>
      {children.map((child, index) => (
        <div
          key={`${child.path || index}`}
          style={{
            marginLeft: `${indentPx}px`,
            marginBottom: '8px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            backgroundColor: child.error ? '#fef7e0' : '#f8f9fa',
          }}
        >
          {/* Header fichier */}
          <div
            style={{
              padding: '8px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: child.children ? '1px solid #e0e0e0' : 'none',
              cursor: child.error ? 'default' : 'pointer',
              transition: 'background-color 0.15s',
            }}
            onClick={() => !child.error && onFileClick(child)}
            onMouseEnter={(e) => {
              if (!child.error) {
                e.currentTarget.style.backgroundColor = '#e8f0fe';
              }
            }}
            onMouseLeave={(e) => {
              if (!child.error) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span>{getIconForType(child.type)}</span>
              <span style={{ fontWeight: '500' }}>{child.path?.split('/').pop() || 'unknown'}</span>
              <span style={{ fontSize: '11px', color: '#5f6368' }}>
                ({child.type}) • Depth {child.depth}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>
              {child.metadata?.size ? `${(child.metadata.size / 1024).toFixed(1)} KB` : ''}
            </div>
          </div>

          {/* Contenu */}
          {child.error && (
            <div style={{ padding: '8px 12px', fontSize: '12px', color: '#d93025' }}>
              ❌ {child.error}
            </div>
          )}

          {child.text && !child.error && (
            <details style={{ padding: '8px 12px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#1a73e8', marginBottom: '4px' }}>
                📄 Voir contenu texte
              </summary>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  backgroundColor: '#fff',
                  padding: '8px',
                  borderRadius: '4px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  marginTop: '4px',
                }}
              >
                {child.text.slice(0, 1000)}
                {child.text.length > 1000 && '... (tronqué)'}
              </div>
            </details>
          )}

          {/* Children récursif */}
          {child.children && child.children.length > 0 && (
            <div style={{ padding: '8px 12px' }}>
              {renderNestedFiles(child.children, indentLevel + 1, onFileClick)}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/**
 * Helper: Retourne icône selon type de fichier
 */
function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    zip: '📦',
    archive: '📦',
    document: '📄',
    spreadsheet: '📊',
    presentation: '📊',
    pdf: '📕',
    image: '🖼️',
    email: '📧',
    error: '❌',
    unsupported: '❓',
  };
  return icons[type] || '📄';
}
