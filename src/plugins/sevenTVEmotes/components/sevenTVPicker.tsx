/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { clear7TVCache, emoteUrl, getFavoriteEmotes, load7TVChannels, searchGlobalEmotes, toggleFavoriteEmote } from "@plugins/sevenTVEmotes/api/api";
import { ensureSevenTvCsp } from "@plugins/sevenTVEmotes/utils/csp";
import { settings } from "@plugins/sevenTVEmotes/utils/settings";
import type { Emote, SevenTVChannel } from "@plugins/sevenTVEmotes/utils/types";
import { classNameFactory } from "@utils/css";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { React, useCallback, useEffect, useState } from "@webpack/common";

const cl = classNameFactory("vc-7tv-");

interface ChannelButtonProps {
    title: string;
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}

interface SevenTVPickerProps {
    closePopout: () => void;
    onOpenSettings: () => void;
}

function ChannelButton({ title, isActive, onClick, children, className }: ChannelButtonProps) {
    return (
        <div className={cl("pill-wrapper", { "pill-active": isActive })}>
            <div className={cl("pill")} />
            <button
                type="button"
                title={title}
                aria-label={title}
                onClick={onClick}
                className={[
                    cl("channel-button"),
                    isActive ? cl("channel-button-active") : "",
                    className ?? "",
                ].filter(Boolean).join(" ")}
            >
                {children}
            </button>
        </div>
    );
}

export function SevenTVPicker({ closePopout, onOpenSettings }: SevenTVPickerProps) {
    const [channels, setChannels] = useState<SevenTVChannel[]>([]);
    const [selectedChannelKey, setSelectedChannelKey] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [favorites, setFavorites] = useState<Emote[]>([]);
    const [globalSearchResults, setGlobalSearchResults] = useState<Emote[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [cspReady, setCspReady] = useState(IS_WEB);
    const [reloadNonce, setReloadNonce] = useState(0);

    const userIds = settings.store.channels
        .split(",").map((s: string) => s.trim()).filter(Boolean);

    useEffect(() => {
        let alive = true;

        if (IS_WEB) {
            setCspReady(true);
            return;
        }

        ensureSevenTvCsp().then(ready => {
            if (!alive) return;
            setCspReady(ready);
            if (!ready) setLoading(false);
        });

        return () => { alive = false; };
    }, []);

    useEffect(() => {
        let alive = true;
        getFavoriteEmotes().then(list => {
            if (!alive) return;
            setFavorites(list);
        });
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (!cspReady) return;

        let alive = true;
        setLoading(true);

        load7TVChannels(userIds).then(list => {
            if (!alive) return;

            setChannels(list);
            setSelectedChannelKey(cur =>
                cur === "all" || list.some(ch => ch.key === cur) ? cur : "all"
            );
            setLoading(false);
        });

        return () => { alive = false; };
    }, [cspReady, settings.store.channels, reloadNonce]);

    useEffect(() => {
        if (selectedChannelKey !== "all") {
            setGlobalSearchResults([]);
            setSearchLoading(false);
            return;
        }

        const query = search.trim();
        if (!query) {
            setGlobalSearchResults([]);
            setSearchLoading(false);
            return;
        }

        let alive = true;
        setSearchLoading(true);
        const timeout = setTimeout(() => {
            searchGlobalEmotes(query).then(list => {
                if (!alive) return;
                setGlobalSearchResults(list);
                setSearchLoading(false);
            });
        }, 250);

        return () => {
            alive = false;
            clearTimeout(timeout);
        };
    }, [search, selectedChannelKey]);

    const allEmotes = channels
        .flatMap(ch => ch.emotes)
        .filter((e, i, arr) => arr.findIndex(o => o.id === e.id) === i);

    const favoriteIds = new Set(favorites.map(favorite => favorite.id));

    const activeEmotes = selectedChannelKey === "all"
        ? (search.trim() ? globalSearchResults : allEmotes)
        : selectedChannelKey === "favorites"
            ? favorites
            : channels.find(ch => ch.key === selectedChannelKey)?.emotes ?? [];

    const filtered = search
        ? selectedChannelKey === "all"
            ? activeEmotes
            : activeEmotes.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
        : activeEmotes;

    const sendEmote = useCallback((emote: Emote) => {
        insertTextIntoChatInputBox(`${emoteUrl(emote.id, emote.animated, "4x")} `);
        closePopout();
    }, [closePopout]);

    const handleEmoteClick = useCallback(async (emote: Emote, event: React.MouseEvent) => {
        if (event.ctrlKey || event.metaKey) {
            const updated = await toggleFavoriteEmote(emote);
            setFavorites(updated);
            if (selectedChannelKey === "favorites") {
                setGlobalSearchResults([]);
            }
            return;
        }

        sendEmote(emote);
    }, [selectedChannelKey, sendEmote]);

    const handleEmoteContextMenu = useCallback(async (emote: Emote, event: React.MouseEvent) => {
        event.preventDefault();
        const updated = await toggleFavoriteEmote(emote);
        setFavorites(updated);
    }, []);

    const refreshChannels = useCallback(() => {
        clear7TVCache();
        setReloadNonce(n => n + 1);
    }, []);

    return (
        <div className={cl("root")} style={{
            display: "flex",
            height: "100%",
            width: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
        }}>
            <div style={{
                width: "60px",
                minWidth: "60px",
                flexShrink: 0,
                position: "relative",
                background: "var(--background-secondary)",
                borderRight: "1px solid var(--background-modifier-accent)",
                display: "flex",
                flexDirection: "column",
            }}>
                <div
                    className={cl("sidebar", "scrollbar")}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        overflowY: "auto",
                        overflowX: "hidden",
                        flex: 1,
                        paddingTop: "8px",
                        paddingBottom: "8px",
                    }}
                >
                    <ChannelButton
                        title="All channels"
                        isActive={selectedChannelKey === "all"}
                        onClick={() => setSelectedChannelKey("all")}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M5 13.5H3.5V20.5H10.5V13.5H9M13.5 5V3.5H20.5V10.5H13.5V9M3.5 3.5H10.5V10.5H3.5V3.5ZM13.5 13.5H20.5V20.5H13.5V13.5Z"
                                stroke="#23a55a"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </ChannelButton>
                    <ChannelButton
                        title="Favorites"
                        isActive={selectedChannelKey === "favorites"}
                        onClick={() => setSelectedChannelKey("favorites")}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFD700" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M12 2l2.9 5.88L21.4 9l-4.7 4.58L17.8 21 12 17.97 6.2 21l1.1-7.42L2.6 9l6.5-1.12L12 2z" />
                        </svg>
                    </ChannelButton>
                    <div style={{
                        width: "32px",
                        height: "2px",
                        borderRadius: "1px",
                        background: "var(--background-modifier-accent)",
                        flexShrink: 0,
                        margin: "2px 0",
                    }} />

                    {channels.map(ch => (
                        <ChannelButton
                            key={ch.key}
                            title={ch.name}
                            isActive={selectedChannelKey === ch.key}
                            onClick={() => setSelectedChannelKey(ch.key)}
                        >
                            {ch.avatarUrl ? (
                                <img
                                    src={ch.avatarUrl}
                                    alt={ch.name}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    loading="lazy"
                                />
                            ) : (
                                <span style={{ fontSize: "11px" }}>
                                    {ch.name.slice(0, 2).toUpperCase()}
                                </span>
                            )}
                        </ChannelButton>
                    ))}

                    <div style={{ flex: 1, minHeight: "8px" }} />

                    <ChannelButton
                        title="7TV settings"
                        isActive={false}
                        onClick={onOpenSettings}
                        className={cl("settings-button")}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                        </svg>
                    </ChannelButton>
                </div>
            </div>

            <div style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                minHeight: 0,
                flex: 1,
                gap: "8px",
                padding: "8px",
                background: "var(--background-primary)",
            }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                        type="text"
                        placeholder="Search 7TV emotes..."
                        value={search}
                        onChange={ev => setSearch(ev.target.value)}
                        onClick={ev => ev.stopPropagation()}
                        onKeyDown={ev => { ev.stopPropagation(); ev.nativeEvent.stopImmediatePropagation(); }}
                        onKeyUp={ev => { ev.stopPropagation(); ev.nativeEvent.stopImmediatePropagation(); }}
                        onKeyPress={ev => { ev.stopPropagation(); ev.nativeEvent.stopImmediatePropagation(); }}
                        autoFocus
                        className={cl("search-input")}
                        style={{
                            borderRadius: "4px",
                            padding: "6px 10px",
                            width: "100%",
                            minWidth: 0,
                            boxSizing: "border-box",
                            outline: "none",
                            fontSize: "14px",
                            border: "1px solid var(--input-border, var(--background-tertiary))",
                            background: "var(--input-background)",
                            color: "inherit",
                            WebkitTextFillColor: "inherit",
                            caretColor: "inherit"
                        }}
                    />
                    <button
                        type="button"
                        title="Refresh emotes"
                        aria-label="Refresh emotes"
                        className="vc-7tv-refresh-button"
                        onClick={ev => {
                            ev.stopPropagation();
                            refreshChannels();
                        }}
                        style={{
                            borderRadius: "4px",
                            border: "1px solid var(--background-modifier-accent)",
                            background: "var(--background-secondary)",
                            height: "32px",
                            padding: "0 10px",
                            fontSize: "12px",
                            fontWeight: 600,
                            cursor: "pointer",
                            flexShrink: 0,
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                        >
                            <path
                                d="M20 4V9H15"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M4 20V15H9"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M5.5 9C6.45 6.67 8.95 5 11.83 5C14.27 5 16.43 6.18 17.79 8"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                            <path
                                d="M18.5 15C17.55 17.33 15.05 19 12.17 19C9.73 19 7.57 17.82 6.21 16"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                            />
                        </svg>
                    </button>
                </div>

                {loading ? (
                    <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "20px" }}>
                        Loading emotes...
                    </p>
                ) : (
                    <div className={cl("emote-grid", "scrollbar")} style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, 64px)",
                        gap: "4px",
                        overflowY: "auto",
                        overflowX: "hidden",
                        flexGrow: 1,
                        alignContent: "start",
                        paddingBottom: "8px",
                    }}>
                        {filtered.map(emote => (
                            <button
                                key={emote.id}
                                title={emote.name}
                                onClick={event => void handleEmoteClick(emote, event)}
                                onContextMenu={event => void handleEmoteContextMenu(emote, event)}
                                style={{
                                    position: "relative",
                                    background: "none",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    padding: "4px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    width: "64px",
                                    height: "72px",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--background-modifier-hover)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "none")}
                            >
                                {favoriteIds.has(emote.id) && (
                                    <span className="vc-7tv-favorite-star" aria-hidden="true">★</span>
                                )}
                                <img
                                    src={emoteUrl(emote.id, emote.animated, "2x")}
                                    alt={emote.name}
                                    style={{ width: "48px", height: "48px", objectFit: "contain" }}
                                    loading="lazy"
                                />
                                <span style={{
                                    fontSize: "9px",
                                    color: "var(--text-muted)",
                                    width: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textAlign: "center",
                                }}>
                                    {emote.name}
                                </span>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <p style={{ color: "var(--text-muted)", gridColumn: "1/-1", textAlign: "center" }}>
                                No emotes found
                            </p>
                        )}
                    </div>
                )}
                {selectedChannelKey === "all" && searchLoading && (
                    <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
                        Searching 7TV...
                    </p>
                )}
            </div>
        </div>
    );
}
