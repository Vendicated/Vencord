import { RenderModalProps } from '@vencord/discord-types';
import { ChannelActionCreators, MessageActions, Modal, NavigationRouter, React, useEffect, useMemo, useRef, useState } from '@webpack/common';
import { SearchMessageResult, SearchPersonResult, SearchProgress, SearchTab } from '../types.js';
import { searchAllDMs, searchPeople } from '../utils/search.js';
import '../styles.css';

interface SearchModalProps {
  modalProps: RenderModalProps;
  onClose: () => void;
  maxResults?: number;
  searchGroupDms?: boolean;
  highlightSearchTerms?: boolean;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  modalProps,
  onClose,
  maxResults = 100,
  searchGroupDms = true,
  highlightSearchTerms = true,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('messages');
  const [messages, setMessages] = useState<SearchMessageResult[]>([]);
  const [people, setPeople] = useState<SearchPersonResult[]>([]);
  const [progress, setProgress] = useState<SearchProgress | null>(null);

  const searchAbortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const clean = query.trim();

    if (!clean) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      setMessages([]);
      setPeople([]);
      setProgress(null);
      return;
    }

    // 1. Instant People Search (Local memory store)
    const matchedPeople = searchPeople(clean);
    setPeople(matchedPeople);

    // 2. Debounced Network Search across all DMs
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    searchAbortRef.current = abortController;

    const timer = setTimeout(async () => {
      try {
        const results = await searchAllDMs(clean, {
          maxResults,
          searchGroupDms,
          signal: abortController.signal,
          onProgress: (p) => {
            if (!abortController.signal.aborted) {
              setProgress(p);
            }
          },
        });

        if (!abortController.signal.aborted) {
          setMessages(results);
        }
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          console.warn('[AllDmSearch] Search error:', err);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query, maxResults, searchGroupDms]);

  // Filtered views
  const mediaResults = useMemo(() => messages.filter((m) => m.hasMedia), [messages]);
  const linkResults = useMemo(() => messages.filter((m) => m.hasLink), [messages]);

  // Highlight search terms helper
  const renderHighlightedText = (text: string, searchQuery: string) => {
    if (!highlightSearchTerms || !searchQuery.trim()) {
      return text;
    }

    const terms = searchQuery
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0)
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (terms.length === 0) return text;

    const regex = new RegExp(`(${terms.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="vc-alldm-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Click on Message result: Jump to exact message & close modal
  const handleSelectMessage = (msg: SearchMessageResult) => {
    onClose();
    try {
      if (NavigationRouter && NavigationRouter.transitionTo) {
        NavigationRouter.transitionTo(`/channels/@me/${msg.channelId}/${msg.id}`);
      }
      if (MessageActions && MessageActions.jumpToMessage) {
        MessageActions.jumpToMessage({
          channelId: msg.channelId,
          messageId: msg.id,
          flash: true,
          jumpType: 'INSTANT',
        });
      }
    } catch (e) {
      console.warn('[AllDmSearch] Navigation error:', e);
    }
  };

  // Click on Person result: Open DM channel & close modal
  const handleSelectPerson = (person: SearchPersonResult) => {
    onClose();
    try {
      if (person.channelId && NavigationRouter && NavigationRouter.transitionTo) {
        NavigationRouter.transitionTo(`/channels/@me/${person.channelId}`);
      } else if (ChannelActionCreators && ChannelActionCreators.openPrivateChannel) {
        ChannelActionCreators.openPrivateChannel(person.id);
      }
    } catch (e) {
      console.warn('[AllDmSearch] Open DM error:', e);
    }
  };

  return (
    <Modal.ModalRoot
      {...modalProps}
      size={Modal.ModalSize.DYNAMIC}
      className="vc-alldm-modal-root"
    >
      <div className="vc-alldm-container">
        {/* Top Header & Search Bar */}
        <div className="vc-alldm-header">
          <button
            type="button"
            className="vc-alldm-back-btn"
            onClick={onClose}
            title="Back / Close (Esc)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="vc-alldm-search-input-wrap">
            <svg className="vc-alldm-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              className="vc-alldm-input"
              placeholder="Search messages across all DMs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {query && (
              <button
                type="button"
                className="vc-alldm-clear-btn"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="vc-alldm-tabs">
          <button
            type="button"
            className={`vc-alldm-tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <span>Messages</span>
            <span className="vc-alldm-tab-badge">{messages.length}</span>
          </button>

          <button
            type="button"
            className={`vc-alldm-tab ${activeTab === 'people' ? 'active' : ''}`}
            onClick={() => setActiveTab('people')}
          >
            <span>People</span>
            <span className="vc-alldm-tab-badge">{people.length}</span>
          </button>

          <button
            type="button"
            className={`vc-alldm-tab ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            <span>Media</span>
            <span className="vc-alldm-tab-badge">{mediaResults.length}</span>
          </button>

          <button
            type="button"
            className={`vc-alldm-tab ${activeTab === 'links' ? 'active' : ''}`}
            onClick={() => setActiveTab('links')}
          >
            <span>Links</span>
            <span className="vc-alldm-tab-badge">{linkResults.length}</span>
          </button>
        </div>

        {/* Live Progress Bar */}
        {progress && progress.isSearching && (
          <div className="vc-alldm-progress-wrap">
            <span>
              Searching DMs... ({progress.searchedChannels} / {progress.totalChannels} conversations)
            </span>
            <div className="vc-alldm-progress-bar">
              <div
                className="vc-alldm-progress-fill"
                style={{
                  width: `${Math.round((progress.searchedChannels / (progress.totalChannels || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Results Area */}
        <div className="vc-alldm-results-scroll">
          {!query.trim() ? (
            <div className="vc-alldm-empty">
              <svg className="vc-alldm-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div className="vc-alldm-empty-title">Search All Direct Messages</div>
              <div className="vc-alldm-empty-desc">
                Type a keyword, name, or phrase to search messages across all your 1-to-1 and Group DMs.
              </div>
            </div>
          ) : activeTab === 'people' ? (
            people.length === 0 ? (
              <div className="vc-alldm-empty">
                <div className="vc-alldm-empty-title">No people found</div>
                <div className="vc-alldm-empty-desc">No friends or DM contacts match "{query}".</div>
              </div>
            ) : (
              people.map((p) => (
                <div
                  key={p.id}
                  className="vc-alldm-person-card"
                  onClick={() => handleSelectPerson(p)}
                >
                  <img src={p.avatarUrl} alt="" className="vc-alldm-avatar" />
                  <div className="vc-alldm-person-info">
                    <div className="vc-alldm-person-name">
                      {renderHighlightedText(p.displayName, query)}
                    </div>
                    <div className="vc-alldm-person-sub">
                      @{p.username} {p.isFriend && '• Friend'}
                    </div>
                  </div>
                  <button type="button" className="vc-alldm-dm-action-btn">
                    Message
                  </button>
                </div>
              ))
            )
          ) : (
            (() => {
              const currentList =
                activeTab === 'media'
                  ? mediaResults
                  : activeTab === 'links'
                  ? linkResults
                  : messages;

              if (currentList.length === 0) {
                return (
                  <div className="vc-alldm-empty">
                    <div className="vc-alldm-empty-title">No results found</div>
                    <div className="vc-alldm-empty-desc">
                      {progress?.isSearching
                        ? 'Searching through your conversations...'
                        : `No ${activeTab} matching "${query}" found across your DMs.`}
                    </div>
                  </div>
                );
              }

              return currentList.map((msg) => (
                <div
                  key={msg.id}
                  className="vc-alldm-result-card"
                  onClick={() => handleSelectMessage(msg)}
                >
                  <img src={msg.author.avatarUrl} alt="" className="vc-alldm-avatar" />

                  <div className="vc-alldm-card-body">
                    <div className="vc-alldm-card-header">
                      <div className="vc-alldm-author-wrap">
                        <span className="vc-alldm-author-name">{msg.author.displayName}</span>
                        <span className="vc-alldm-channel-badge">
                          {msg.isGroupDM ? `👥 ${msg.channelName}` : `💬 ${msg.channelName}`}
                        </span>
                      </div>
                      <span className="vc-alldm-time">{msg.relativeTime}</span>
                    </div>

                    {msg.content && (
                      <div className="vc-alldm-message-text">
                        {renderHighlightedText(msg.content, query)}
                      </div>
                    )}

                    {/* Compact Embed Preview */}
                    {msg.embeds.length > 0 && (
                      <div className="vc-alldm-embed-box">
                        {msg.embeds[0].author?.name && (
                          <div style={{ fontSize: '11px', color: '#949ba4', marginBottom: '2px' }}>
                            {msg.embeds[0].author.name}
                          </div>
                        )}
                        {msg.embeds[0].title && (
                          <div className="vc-alldm-embed-title">
                            {renderHighlightedText(msg.embeds[0].title, query)}
                          </div>
                        )}
                        {msg.embeds[0].description && (
                          <div style={{ color: '#dbdee1' }}>
                            {renderHighlightedText(msg.embeds[0].description, query)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attachment preview tags */}
                    {msg.attachments.length > 0 && (
                      <div>
                        {msg.attachments.map((att) => (
                          <span key={att.id} className="vc-alldm-attachment-tag">
                            📎 {att.filename}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      </div>
    </Modal.ModalRoot>
  );
};
