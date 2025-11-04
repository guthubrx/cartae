/**
 * TeamsMVP - Composant React style Microsoft Teams
 *
 * Interface Teams-like avec colonne redimensionnable et settings
 */

import React, { useState, useEffect, useRef } from 'react';
import { FixedSizeList as List, VariableSizeList } from 'react-window';
import { TokenInterceptorService } from '../services/auth/TokenInterceptorService';
import { TeamsService, type TeamsChat, type TeamsMessage, type Team, type Channel } from '../services/TeamsService';
import { useDebounce } from '../hooks';

interface TeamsMVPState {
  mode: 'chats' | 'teams';
  isLoading: boolean;
  error: string | null;
  chats: TeamsChat[];
  teams: Team[];
  channels: Channel[];
  selectedChatId: string | null;
  selectedTeamId: string | null;
  selectedChannelId: string | null;
  messages: TeamsMessage[];
  isLoadingMessages: boolean;
  newMessage: string;
  isSending: boolean;
  currentUserEmail: string;
  currentUserName: string;
  searchFilter: string;
}

interface TeamsSettings {
  messageDensity: 'comfy' | 'compact';
  showPreviews: boolean;
  showTimestamps: boolean;
  showFilters: boolean;
  openChatTo: 'last-read' | 'newest';
}

export const TeamsMVP: React.FC = () => {
  const [teamsService, setTeamsService] = useState<TeamsService | null>(null);
  const [state, setState] = useState<TeamsMVPState>({
    mode: 'chats',
    isLoading: false,
    error: null,
    chats: [],
    teams: [],
    channels: [],
    selectedChatId: null,
    selectedTeamId: null,
    selectedChannelId: null,
    messages: [],
    isLoadingMessages: false,
    newMessage: '',
    isSending: false,
    currentUserEmail: '',
    currentUserName: '',
    searchFilter: '',
  });

  const [settings, setSettings] = useState<TeamsSettings>({
    messageDensity: 'comfy',
    showPreviews: true,
    showTimestamps: true,
    showFilters: false,
    openChatTo: 'newest',
  });

  const [showSettings, setShowSettings] = useState(false);
  const [chatListWidth, setChatListWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Debounce search pour réduire les re-renders (300ms après dernière frappe)
  const debouncedSearchFilter = useDebounce(state.searchFilter, 300);

  // Cache des photos des utilisateurs (displayName -> photoUrl)
  const [userPhotos, setUserPhotos] = useState<Map<string, string | null>>(new Map());

  // Set de photos en cours de chargement pour éviter le clignotement
  const [photosLoading, setPhotosLoading] = useState<Set<string>>(new Set());

  // Resize handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(250, Math.min(500, e.clientX));
      setChatListWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Initialisation
  useEffect(() => {
    const initService = async () => {
      if (typeof (window as any).cartaeBrowserStorage === 'undefined') {
        setState(prev => ({ ...prev, error: 'Extension Firefox requise' }));
        return;
      }

      const tokenService = new TokenInterceptorService();
      await tokenService.startMonitoring();

      const service = new TeamsService(tokenService);
      setTeamsService(service);

      // Récupérer l'utilisateur courant
      try {
        const currentUser = await service.getCurrentUser();
        setState(prev => ({
          ...prev,
          currentUserEmail: currentUser.email,
          currentUserName: currentUser.displayName,
        }));
      } catch (error) {
        console.error('[TeamsMVP] Erreur récupération utilisateur:', error);
      }

      loadChats(service);
    };

    initService();
  }, []);

  const loadChats = async (service?: TeamsService) => {
    const svc = service || teamsService;
    if (!svc) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const chats = await svc.listChats(50); // Augmenté à 50 conversations

      // Pré-charger les photos de tous les membres pour éviter le clignotement
      const uniqueMembers = new Map<string, { displayName: string; userId?: string }>();
      for (const chat of chats) {
        for (const member of chat.members) {
          if (!uniqueMembers.has(member.displayName) && !userPhotos.has(member.displayName)) {
            uniqueMembers.set(member.displayName, member);
          }
        }
      }

      // Charger toutes les photos en parallèle
      await Promise.all(
        Array.from(uniqueMembers.values()).map(member =>
          loadUserPhoto(member.displayName, member.userId)
        )
      );

      setState(prev => ({ ...prev, chats, isLoading: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  const selectChat = async (chatId: string) => {
    if (!teamsService) return;

    setState(prev => ({ ...prev, selectedChatId: chatId, isLoadingMessages: true, error: null }));

    try {
      const messages = await teamsService.getChatMessages(chatId, 50);
      const sortedMessages = settings.openChatTo === 'newest'
        ? messages.reverse()
        : messages;
      setState(prev => ({ ...prev, messages: sortedMessages, isLoadingMessages: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoadingMessages: false }));
    }
  };

  const sendMessage = async () => {
    if (!teamsService || !state.selectedChatId || !state.newMessage.trim()) return;

    setState(prev => ({ ...prev, isSending: true, error: null }));

    try {
      await teamsService.sendMessage(state.selectedChatId, state.newMessage);
      setState(prev => ({ ...prev, newMessage: '', isSending: false }));
      selectChat(state.selectedChatId);
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isSending: false }));
    }
  };

  const loadTeams = async () => {
    if (!teamsService) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, mode: 'teams' }));

    try {
      const teams = await teamsService.listJoinedTeams();
      setState(prev => ({ ...prev, teams, isLoading: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  const selectTeam = async (teamId: string) => {
    if (!teamsService) return;

    setState(prev => ({ ...prev, selectedTeamId: teamId, isLoading: true, error: null }));

    try {
      const channels = await teamsService.listChannels(teamId);
      setState(prev => ({ ...prev, channels, isLoading: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  };

  const selectChannel = async (teamId: string, channelId: string) => {
    if (!teamsService) return;

    setState(prev => ({ ...prev, selectedChannelId: channelId, isLoadingMessages: true, error: null }));

    try {
      const messages = await teamsService.getChannelMessages(teamId, channelId, 50);
      setState(prev => ({ ...prev, messages: messages.reverse(), isLoadingMessages: false }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message, isLoadingMessages: false }));
    }
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const loadUserPhoto = async (displayName: string, userId?: string) => {
    if (!teamsService) return;

    // Vérifier si on a déjà la photo ou si elle est en cours de chargement
    if (userPhotos.has(displayName) || photosLoading.has(displayName)) return;

    // Marquer comme "en cours" pour éviter les doublons
    setPhotosLoading(prev => new Set(prev).add(displayName));

    try {
      const photoUrl = await teamsService.getUserPhoto(userId);
      // Toujours mettre à jour le cache, même si null (pas de photo)
      setUserPhotos(prev => new Map(prev).set(displayName, photoUrl));
    } catch (error) {
      console.log(`[TeamsMVP] Erreur chargement photo ${displayName}:`, error);
      // Mettre null pour éviter les re-tentatives
      setUserPhotos(prev => new Map(prev).set(displayName, null));
    } finally {
      // Retirer du set de chargement
      setPhotosLoading(prev => {
        const next = new Set(prev);
        next.delete(displayName);
        return next;
      });
    }
  };

  // Composant Avatar avec photo ou initiales
  const Avatar: React.FC<{ displayName: string; userId?: string; style?: React.CSSProperties }> = ({ displayName, userId, style }) => {
    const photoUrl = userPhotos.get(displayName);

    // Charger la photo si pas encore fait (fallback si pas pré-chargée)
    useEffect(() => {
      if (!userPhotos.has(displayName)) {
        loadUserPhoto(displayName, userId);
      }
    }, [displayName, userId]);

    return (
      <div style={{ ...styles.messageAvatar, ...style }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              opacity: 1,
              transition: 'opacity 0.2s ease-in',
            }}
          />
        ) : (
          <span style={{ transition: 'opacity 0.2s ease-out' }}>
            {getInitials(displayName)}
          </span>
        )}
      </div>
    );
  };

  // Composant Avatars empilés pour chats groupe
  const StackedAvatars: React.FC<{
    members: Array<{ displayName: string; userId?: string }>;
    style?: React.CSSProperties;
  }> = ({ members, style }) => {
    const maxDisplay = 3; // Afficher max 3 avatars
    const displayMembers = members.slice(0, maxDisplay);
    const avatarSize = 40;
    const horizontalOffset = avatarSize * 0.8; // Décalage horizontal de 80%

    return (
      <div style={{
        position: 'relative',
        width: `${avatarSize + (displayMembers.length - 1) * horizontalOffset}px`,
        height: `${avatarSize}px`,
        ...style,
      }}>
        {displayMembers.map((member, index) => {
          const photoUrl = userPhotos.get(member.displayName);

          // Charger la photo si pas encore fait (fallback si pas pré-chargée)
          useEffect(() => {
            if (!userPhotos.has(member.displayName)) {
              loadUserPhoto(member.displayName, member.userId);
            }
          }, [member.displayName, member.userId]);

          return (
            <div
              key={member.displayName + index}
              style={{
                position: 'absolute',
                top: 0,
                left: `${index * horizontalOffset}px`,
                width: `${avatarSize}px`,
                height: `${avatarSize}px`,
                borderRadius: '50%',
                backgroundColor: '#6264a7',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600,
                border: '2px solid #242424',
                zIndex: displayMembers.length - index,
                transition: 'all 0.2s ease',
              }}
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={member.displayName}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    opacity: 1,
                    transition: 'opacity 0.2s ease-in',
                  }}
                />
              ) : (
                <span style={{ transition: 'opacity 0.2s ease-out' }}>
                  {getInitials(member.displayName)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const selectedChat = state.chats.find(c => c.id === state.selectedChatId);

  // Styles dynamiques selon settings
  const messagePadding = settings.messageDensity === 'comfy' ? '16px' : '8px';
  const chatItemPadding = settings.messageDensity === 'comfy' ? '12px 16px' : '8px 12px';

  // Filtrer chats pour virtual scrolling
  const filteredChats = state.chats.filter(chat => {
    if (!debouncedSearchFilter.trim()) return true;
    const searchLower = debouncedSearchFilter.toLowerCase();
    const topicMatch = chat.topic?.toLowerCase().includes(searchLower);
    const membersMatch = chat.members.some(m =>
      m.displayName.toLowerCase().includes(searchLower)
    );
    return topicMatch || membersMatch;
  });

  // ChatRow component pour virtual scrolling
  const ChatRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const chat = filteredChats[index];
    if (!chat) return null;

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          borderBottom: '1px solid #3e3e3e',
          transition: 'background 0.2s',
          padding: chatItemPadding,
          backgroundColor: state.selectedChatId === chat.id ? '#3e3e3e' : 'transparent',
        }}
        onClick={() => selectChat(chat.id)}
      >
        {chat.chatType === 'group' || chat.members.length > 1 ? (
          <StackedAvatars
            members={chat.members}
            style={{ marginRight: '12px' }}
          />
        ) : (
          <Avatar
            displayName={chat.members[0]?.displayName || 'Unknown'}
            userId={chat.members[0]?.userId}
            style={styles.avatar}
          />
        )}
        <div style={styles.chatInfo}>
          <div style={styles.chatTopic}>
            {chat.topic || chat.members.map(m => m.displayName).join(', ')}
          </div>
          {settings.showPreviews && (
            <div style={styles.chatPreview}>
              {chat.lastMessagePreview}
            </div>
          )}
        </div>
        {settings.showTimestamps && (
          <div style={styles.chatTime}>
            {formatTime(chat.lastMessageDateTime)}
          </div>
        )}
      </div>
    );
  };

  // Calculate message height for virtual scrolling
  const getMessageHeight = (index: number): number => {
    if (state.messages.length === 0) return 60;

    const msg = state.messages[index];
    const prevMsg = index > 0 ? state.messages[index - 1] : null;
    const nextMsg = index < state.messages.length - 1 ? state.messages[index + 1] : null;

    const isGroupEnd = !nextMsg || nextMsg.from.displayName !== msg.from.displayName;

    if (settings.messageDensity === 'comfy') {
      // Mode comfy: hauteur variable selon groupement
      const baseHeight = 60; // Bulle + padding
      const groupEndMargin = isGroupEnd ? 16 : 4;
      return baseHeight + groupEndMargin;
    } else {
      // Mode compact: hauteur plus fixe
      const padding = parseInt(messagePadding);
      return 50 + padding;
    }
  };

  // MessageRow component for virtual scrolling
  const MessageRow = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const msg = state.messages[index];
    if (!msg) return null;

    const prevMsg = index > 0 ? state.messages[index - 1] : null;
    const nextMsg = index < state.messages.length - 1 ? state.messages[index + 1] : null;

    const isGroupStart = !prevMsg || prevMsg.from.displayName !== msg.from.displayName;
    const isGroupEnd = !nextMsg || nextMsg.from.displayName !== msg.from.displayName;

    const isMyMessage = msg.from.displayName === state.currentUserName ||
                        msg.from.email === state.currentUserEmail;

    // Mode comfy - bulles messenger
    if (settings.messageDensity === 'comfy') {
      return (
        <div
          style={{
            ...style,
            display: 'flex',
            justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
            alignItems: 'flex-start',
          }}
        >
          {/* Avatar gauche pour autres */}
          {!isMyMessage && isGroupStart && (
            <Avatar
              displayName={msg.from.displayName}
              userId={msg.from.userId}
              style={{ marginTop: '4px', marginRight: '12px' }}
            />
          )}
          {!isMyMessage && !isGroupStart && (
            <div style={{ width: '40px', marginRight: '12px' }} />
          )}

          <div style={{
            maxWidth: '60%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMyMessage ? 'flex-end' : 'flex-start',
          }}>
            {/* Nom expéditeur au début du groupe */}
            {!isMyMessage && isGroupStart && (
              <div style={{
                fontSize: '12px',
                color: '#a0a0a0',
                marginBottom: '4px',
                marginLeft: '12px',
              }}>
                {msg.from.displayName}
              </div>
            )}

            {/* Bulle message */}
            <div
              style={{
                ...styles.messageBubble,
                backgroundColor: isMyMessage ? '#6264a7' : '#3e3e3e',
                borderRadius: isMyMessage ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              }}
            >
              <div
                style={styles.messageBubbleText}
                dangerouslySetInnerHTML={msg.bodyType === 'html' ? { __html: msg.body } : undefined}
              >
                {msg.bodyType === 'text' ? msg.body : undefined}
              </div>
            </div>

            {/* Timestamp fin de groupe */}
            {isGroupEnd && settings.showTimestamps && (
              <div style={{
                fontSize: '10px',
                color: '#6e6e6e',
                marginTop: '2px',
                marginLeft: isMyMessage ? '0' : '12px',
                marginRight: isMyMessage ? '12px' : '0',
              }}>
                {formatTime(msg.createdDateTime)}
              </div>
            )}
          </div>

          {/* Avatar droite pour mes messages */}
          {isMyMessage && isGroupStart && (
            <Avatar
              displayName={msg.from.displayName}
              userId={msg.from.userId}
              style={{ marginTop: '4px', marginLeft: '12px' }}
            />
          )}
          {isMyMessage && !isGroupStart && (
            <div style={{ width: '40px', marginLeft: '12px' }} />
          )}
        </div>
      );
    }

    // Mode compact - simple
    return (
      <div style={{ ...style, paddingBottom: messagePadding }}>
        <div style={styles.messageHeader}>
          <span style={styles.messageSender}>{msg.from.displayName}</span>
          {settings.showTimestamps && (
            <span style={styles.messageTime}>{formatTime(msg.createdDateTime)}</span>
          )}
        </div>
        <div
          style={styles.messageBody}
          dangerouslySetInnerHTML={msg.bodyType === 'html' ? { __html: msg.body } : undefined}
        >
          {msg.bodyType === 'text' ? msg.body : undefined}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>💬 Teams</h1>
        <div style={styles.modeToggle}>
          <button
            onClick={() => {
              setState(prev => ({ ...prev, mode: 'chats' }));
              loadChats();
            }}
            style={{
              ...styles.modeButton,
              ...(state.mode === 'chats' ? styles.modeButtonActive : {}),
            }}
          >
            Conversations
          </button>
          <button
            onClick={loadTeams}
            style={{
              ...styles.modeButton,
              ...(state.mode === 'teams' ? styles.modeButtonActive : {}),
            }}
          >
            Équipes
          </button>
        </div>
        <div style={styles.actions}>
          <button
            onClick={() => state.mode === 'chats' ? loadChats() : loadTeams()}
            style={styles.refreshButton}
          >
            🔄
          </button>
          <button onClick={() => setShowSettings(!showSettings)} style={styles.settingsButton}>
            ⚙️
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={styles.settingsPanel}>
          <h3 style={styles.settingsTitle}>Paramètres Teams</h3>

          {/* Message Density */}
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>Densité des messages</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  checked={settings.messageDensity === 'comfy'}
                  onChange={() => setSettings(prev => ({ ...prev, messageDensity: 'comfy' }))}
                />
                <span>Confortable</span>
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  checked={settings.messageDensity === 'compact'}
                  onChange={() => setSettings(prev => ({ ...prev, messageDensity: 'compact' }))}
                />
                <span>Compact</span>
              </label>
            </div>
          </div>

          {/* Show Previews */}
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>
              <input
                type="checkbox"
                checked={settings.showPreviews}
                onChange={(e) => setSettings(prev => ({ ...prev, showPreviews: e.target.checked }))}
              />
              <span style={{ marginLeft: '8px' }}>Afficher les aperçus de messages</span>
            </label>
          </div>

          {/* Show Timestamps */}
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>
              <input
                type="checkbox"
                checked={settings.showTimestamps}
                onChange={(e) => setSettings(prev => ({ ...prev, showTimestamps: e.target.checked }))}
              />
              <span style={{ marginLeft: '8px' }}>Afficher les horodatages</span>
            </label>
          </div>

          {/* Show Filters */}
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>
              <input
                type="checkbox"
                checked={settings.showFilters}
                onChange={(e) => setSettings(prev => ({ ...prev, showFilters: e.target.checked }))}
              />
              <span style={{ marginLeft: '8px' }}>Afficher les filtres</span>
            </label>
          </div>

          {/* Open Chat To */}
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>Ouvrir une conversation sur</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  checked={settings.openChatTo === 'last-read'}
                  onChange={() => setSettings(prev => ({ ...prev, openChatTo: 'last-read' }))}
                />
                <span>Dernier message lu</span>
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  checked={settings.openChatTo === 'newest'}
                  onChange={() => setSettings(prev => ({ ...prev, openChatTo: 'newest' }))}
                />
                <span>Message le plus récent</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Layout 2 colonnes */}
      <div style={styles.layout}>
        {/* Colonne gauche - Liste conversations ou équipes (resizable) */}
        <div style={{ ...styles.chatList, width: `${chatListWidth}px` }}>
          <div style={styles.chatListHeader}>
            {state.mode === 'chats' ? (
              <input
                type="text"
                placeholder="🔍 Rechercher par nom ou titre..."
                value={state.searchFilter}
                onChange={(e) => setState(prev => ({ ...prev, searchFilter: e.target.value }))}
                style={styles.searchInput}
              />
            ) : (
              <h2 style={styles.chatListTitle}>Équipes & Canaux</h2>
            )}
          </div>

          {state.isLoading && (
            <div style={styles.loading}>Chargement...</div>
          )}

          {state.error && (
            <div style={styles.error}>{state.error}</div>
          )}

          <div style={styles.chatsContainer}>
            {/* Mode Chats - Virtual Scrolling */}
            {state.mode === 'chats' && (
              <List
                height={window.innerHeight - 200} // Hauteur disponible (ajusté selon header)
                itemCount={filteredChats.length}
                itemSize={settings.messageDensity === 'comfy' ? 72 : 60}
                width="100%"
              >
                {ChatRow}
              </List>
            )}

            {/* Mode Teams */}
            {state.mode === 'teams' && (
              <>
                {state.teams.map(team => (
                  <div key={team.id}>
                    {/* Team Header */}
                    <div
                      style={{
                        ...styles.teamItem,
                        ...(state.selectedTeamId === team.id ? styles.teamItemSelected : {}),
                      }}
                      onClick={() => selectTeam(team.id)}
                    >
                      <div style={styles.teamIcon}>🏢</div>
                      <div style={styles.teamInfo}>
                        <div style={styles.teamName}>{team.displayName}</div>
                        {team.description && (
                          <div style={styles.teamDescription}>{team.description}</div>
                        )}
                      </div>
                    </div>

                    {/* Channels de l'équipe sélectionnée */}
                    {state.selectedTeamId === team.id && state.channels.length > 0 && (
                      <div style={styles.channelsList}>
                        {state.channels.map(channel => (
                          <div
                            key={channel.id}
                            style={{
                              ...styles.channelItem,
                              ...(state.selectedChannelId === channel.id ? styles.channelItemSelected : {}),
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectChannel(team.id, channel.id);
                            }}
                          >
                            <span style={styles.channelIcon}>
                              {channel.membershipType === 'private' ? '🔒' : '#'}
                            </span>
                            <span style={styles.channelName}>{channel.displayName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Resize Handle */}
        <div
          ref={resizeRef}
          style={styles.resizeHandle}
          onMouseDown={() => setIsResizing(true)}
        />

        {/* Colonne droite - Messages */}
        <div style={styles.messagesPanel}>
          {!selectedChat ? (
            <div style={styles.emptyState}>
              Sélectionnez une conversation
            </div>
          ) : (
            <>
              {/* Header conversation */}
              <div style={styles.messagesHeader}>
                {selectedChat.chatType === 'group' || selectedChat.members.length > 1 ? (
                  <StackedAvatars
                    members={selectedChat.members}
                    style={{ marginRight: '12px' }}
                  />
                ) : (
                  <Avatar
                    displayName={selectedChat.members[0]?.displayName || 'Unknown'}
                    userId={selectedChat.members[0]?.userId}
                    style={styles.avatar}
                  />
                )}
                <div style={styles.messagesHeaderInfo}>
                  <div style={styles.messagesHeaderTitle}>
                    {selectedChat.topic || selectedChat.members.map(m => m.displayName).join(', ')}
                  </div>
                  <div style={styles.messagesHeaderSubtitle}>
                    {selectedChat.chatType === 'oneOnOne' ? '1:1' : 'Groupe'}
                  </div>
                </div>
              </div>

              {/* Liste messages - Virtual Scrolling */}
              <div style={styles.messagesContainer}>
                {state.isLoadingMessages ? (
                  <div style={styles.loading}>Chargement messages...</div>
                ) : state.messages.length > 0 ? (
                  <VariableSizeList
                    height={window.innerHeight - 350}
                    itemCount={state.messages.length}
                    itemSize={getMessageHeight}
                    width="100%"
                  >
                    {MessageRow}
                  </VariableSizeList>
                ) : null}
              </div>


              {/* Input message */}
              <div style={styles.inputContainer}>
                <input
                  type="text"
                  placeholder="Tapez un message..."
                  value={state.newMessage}
                  onChange={(e) => setState(prev => ({ ...prev, newMessage: e.target.value }))}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !state.isSending) {
                      sendMessage();
                    }
                  }}
                  style={styles.input}
                  disabled={state.isSending}
                />
                <button
                  onClick={sendMessage}
                  disabled={state.isSending || !state.newMessage.trim()}
                  style={styles.sendButton}
                >
                  {state.isSending ? '...' : '📤'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles Teams-like (dark theme)
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#292929',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid #3e3e3e',
    backgroundColor: '#2d2d2d',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  refreshButton: {
    padding: '8px 12px',
    backgroundColor: '#6264a7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  settingsButton: {
    padding: '8px 12px',
    backgroundColor: '#3e3e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  settingsPanel: {
    padding: '16px 24px',
    backgroundColor: '#242424',
    borderBottom: '1px solid #3e3e3e',
  },
  settingsTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    fontWeight: 600,
  },
  settingGroup: {
    marginBottom: '16px',
  },
  settingLabel: {
    display: 'block',
    fontSize: '14px',
    marginBottom: '8px',
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
    marginLeft: '8px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    cursor: 'pointer',
  },
  layout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  chatList: {
    borderRight: '1px solid #3e3e3e',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#242424',
    flexShrink: 0,
  },
  resizeHandle: {
    width: '4px',
    cursor: 'col-resize',
    backgroundColor: '#3e3e3e',
    transition: 'background-color 0.2s',
  },
  chatListHeader: {
    padding: '16px',
    borderBottom: '1px solid #3e3e3e',
  },
  chatListTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 600,
  },
  filterInput: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#292929',
    border: '1px solid #3e3e3e',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: '#292929',
    border: '1px solid #3e3e3e',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  chatsContainer: {
    flex: 1,
    overflowY: 'auto',
  },
  chatItem: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    borderBottom: '1px solid #3e3e3e',
    transition: 'background 0.2s',
  },
  chatItemSelected: {
    backgroundColor: '#3e3e3e',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#6264a7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    marginRight: '12px',
    flexShrink: 0,
  },
  chatInfo: {
    flex: 1,
    minWidth: 0,
  },
  chatTopic: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chatPreview: {
    fontSize: '12px',
    color: '#a0a0a0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chatTime: {
    fontSize: '11px',
    color: '#a0a0a0',
    marginLeft: '8px',
    flexShrink: 0,
  },
  messagesPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#292929',
    minHeight: 0, // Force le calcul flex correct
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#a0a0a0',
    fontSize: '16px',
  },
  messagesHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #3e3e3e',
    backgroundColor: '#2d2d2d',
    flexShrink: 0, // Ne jamais réduire le header
  },
  messagesHeaderInfo: {
    flex: 1,
  },
  messagesHeaderTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '2px',
  },
  messagesHeaderSubtitle: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
  },
  message: {
    marginBottom: '16px',
  },
  messageGroup: {
    // Container pour messages groupés en mode comfy
  },
  messageAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#6264a7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    marginRight: '12px',
    flexShrink: 0,
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  },
  messageSender: {
    fontSize: '14px',
    fontWeight: 600,
    marginRight: '8px',
  },
  messageTime: {
    fontSize: '11px',
    color: '#a0a0a0',
  },
  messageTimeInline: {
    fontSize: '10px',
    color: '#6e6e6e',
    marginTop: '2px',
  },
  messageBody: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#e0e0e0',
  },
  messageBubble: {
    padding: '10px 16px',
    borderRadius: '18px',
    maxWidth: '100%',
    wordBreak: 'break-word',
  },
  messageBubbleText: {
    fontSize: '14px',
    lineHeight: '1.4',
    color: '#fff',
  },
  inputContainer: {
    display: 'flex',
    padding: '16px 24px',
    borderTop: '1px solid #3e3e3e',
    backgroundColor: '#2d2d2d',
    flexShrink: 0, // Ne jamais réduire le formulaire d'envoi
  },
  input: {
    flex: 1,
    padding: '12px',
    border: '1px solid #3e3e3e',
    borderRadius: '4px',
    backgroundColor: '#292929',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  sendButton: {
    marginLeft: '8px',
    padding: '12px 20px',
    backgroundColor: '#6264a7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  loading: {
    padding: '16px',
    textAlign: 'center',
    color: '#a0a0a0',
  },
  error: {
    padding: '16px',
    backgroundColor: '#e74856',
    color: '#fff',
    margin: '16px',
    borderRadius: '4px',
  },
  modeToggle: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#3e3e3e',
    borderRadius: '4px',
    padding: '4px',
  },
  modeButton: {
    padding: '6px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    color: '#a0a0a0',
    transition: 'all 0.2s',
  },
  modeButtonActive: {
    backgroundColor: '#6264a7',
    color: '#fff',
  },
  teamItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #3e3e3e',
    transition: 'background 0.2s',
  },
  teamItemSelected: {
    backgroundColor: '#3e3e3e',
  },
  teamIcon: {
    fontSize: '24px',
    marginRight: '12px',
  },
  teamInfo: {
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '2px',
  },
  teamDescription: {
    fontSize: '12px',
    color: '#a0a0a0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  channelsList: {
    backgroundColor: '#1f1f1f',
  },
  channelItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px 8px 40px',
    cursor: 'pointer',
    borderBottom: '1px solid #2d2d2d',
    transition: 'background 0.2s',
  },
  channelItemSelected: {
    backgroundColor: '#6264a7',
  },
  channelIcon: {
    fontSize: '14px',
    marginRight: '8px',
    color: '#a0a0a0',
  },
  channelName: {
    fontSize: '13px',
    color: '#e0e0e0',
  },
};
