import React from 'react';

/**
 * Interface pour un message Teams
 */
interface TeamsMessage {
  id: string;
  content: string;
  contentType: 'text' | 'html';
  fromUser?: { displayName: string; id: string };
  createdDateTime: string;
  reactions?: Array<{ reactionType: string; user: any }>;
  mentions?: Array<{ mentionText: string }>;
  attachments?: Array<{ name: string; contentUrl?: string; contentType: string }>;
  replyToId?: string;
}

/**
 * Props du composant TeamsMessagesThread
 */
interface TeamsMessagesThreadProps {
  messages: TeamsMessage[];
}

/**
 * Composant d'affichage d'un fil de messages Teams
 *
 * Affiche les messages Teams de manière chronologique avec:
 * - Auteur et timestamp
 * - Contenu (texte ou HTML nettoyé)
 * - Mentions @ mises en évidence
 * - Réactions avec emojis
 * - Pièces jointes avec liens
 *
 * @param messages - Array de messages Teams à afficher
 */
export const TeamsMessagesThread: React.FC<TeamsMessagesThreadProps> = ({ messages }) => {
  /**
   * Formate une date de manière relative (Aujourd'hui, Hier, ou date complète)
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
    if (diffDays === 1) {
      return `Hier à ${date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Nettoie le HTML et extrait le texte brut
   */
  const stripHtml = (html: string): string => {
    if (typeof document === 'undefined') {
      // Server-side: basic HTML tag removal
      return html.replace(/<[^>]*>/g, '');
    }
    // Client-side: proper HTML parsing
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  /**
   * Mapping des types de réactions vers emojis
   */
  const reactionEmojis: Record<string, string> = {
    like: '👍',
    heart: '❤️',
    laugh: '😂',
    surprised: '😮',
    sad: '😢',
    angry: '😠',
  };

  /**
   * Obtient l'emoji correspondant à un type de réaction
   */
  const getReactionEmoji = (reactionType: string): string =>
    reactionEmojis[reactionType.toLowerCase()] || '👍';

  if (!messages || messages.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: '#9CA3AF',
          fontSize: '14px',
        }}
      >
        Aucun message dans cette conversation
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: '#F9FAFB',
        borderRadius: '8px',
        maxHeight: '600px',
        overflowY: 'auto',
        border: '1px solid #E5E7EB',
      }}
    >
      {messages.map(msg => (
        <div
          key={msg.id}
          style={{
            padding: '12px',
            background: 'white',
            borderRadius: '8px',
            borderLeft: '3px solid #6366F1',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Auteur + Date */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#6366F1',
              }}
            >
              {msg.fromUser?.displayName || 'Utilisateur'}
            </span>
            <time
              style={{
                fontSize: '12px',
                color: '#9CA3AF',
              }}
            >
              {formatDate(msg.createdDateTime)}
            </time>
          </div>

          {/* Contenu du message */}
          <div
            style={{
              fontSize: '14px',
              color: '#374151',
              lineHeight: '1.5',
              marginBottom: msg.reactions || msg.attachments || msg.mentions ? '8px' : '0',
              wordBreak: 'break-word',
            }}
          >
            {msg.contentType === 'html' ? stripHtml(msg.content) : msg.content}
          </div>

          {/* Mentions @ */}
          {msg.mentions && msg.mentions.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              {msg.mentions.map((mention, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '13px',
                    color: '#6366F1',
                    marginRight: '8px',
                    fontWeight: 500,
                  }}
                >
                  @{mention.mentionText}
                </span>
              ))}
            </div>
          )}

          {/* Réactions */}
          {msg.reactions && msg.reactions.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: msg.attachments ? '8px' : '0',
                flexWrap: 'wrap',
              }}
            >
              {msg.reactions.map((reaction, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: '16px',
                    padding: '4px 8px',
                    background: '#F3F4F6',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  {getReactionEmoji(reaction.reactionType)}
                </span>
              ))}
            </div>
          )}

          {/* Pièces jointes */}
          {msg.attachments && msg.attachments.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginTop: '8px',
              }}
            >
              {msg.attachments.map((att, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '13px',
                    color: '#6366F1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: '#EEF2FF',
                    borderRadius: '4px',
                  }}
                >
                  <span>📎</span>
                  <span style={{ fontWeight: 500 }}>{att.name}</span>
                  {att.contentUrl && (
                    <a
                      href={att.contentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '12px',
                        color: '#9CA3AF',
                        marginLeft: '4px',
                        textDecoration: 'none',
                      }}
                    >
                      (ouvrir)
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TeamsMessagesThread;
