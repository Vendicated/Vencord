/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { classNameFactory } from "@utils/css";
import { IconComponent } from "@utils/types";
import { Channel, RenderModalProps } from "@vencord/discord-types";
import {
    Forms,
    IconUtils,
    Modal,
    NavigationRouter,
    openModal,
    Parser,
    ReactDOM,
    ScrollerThin,
    TabBar,
    Timestamp,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    UserStore,
    useState,
} from "@webpack/common";
import type { ReactNode } from "react";

import {
    fetchPins,
    formatFileSize,
    getAuthorAvatarUrl,
    getMessageJumpPath,
    isImageAttachment,
    isVideoAttachment,
    PinEntry,
    RawAttachment,
    RawEmbed,
    RawMessage,
    searchChannel,
    SearchHasFilter,
} from "./api";
import { ChevronIcon, CloseIcon, DownloadIcon, FileIcon, GalleryIcon, JumpIcon, LinkIcon, PinIcon, PlayIcon } from "./Icons";

const cl = classNameFactory("vc-bm-");

const enum Tab {
    Media,
    Files,
    Links,
    Pins
}

const MEDIA_HAS: SearchHasFilter[] = ["image", "video"];
const FILES_HAS: SearchHasFilter[] = ["file"];
const LINKS_HAS: SearchHasFilter[] = ["link"];

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

export function openGalleryModal(channel: Channel) {
    openModal(props => <GalleryModal channel={channel} modalProps={props} />);
}

function safeHostname(url: string) {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

function safeParse(content: string): ReactNode {
    if (!content) return null;
    try {
        return Parser.parse(content, true);
    } catch {
        return content;
    }
}

function displayName(author: RawMessage["author"]) {
    return author.global_name || author.username;
}

interface LinkEntry {
    url: string;
    title?: string;
    thumbnail?: string;
    provider?: string;
}

function extractLinks(message: RawMessage): LinkEntry[] {
    const results: LinkEntry[] = [];
    const seen = new Set<string>();

    for (const embed of message.embeds as RawEmbed[]) {
        if (!embed.url || seen.has(embed.url)) continue;
        seen.add(embed.url);
        results.push({
            url: embed.url,
            title: embed.title,
            thumbnail: embed.thumbnail?.proxy_url ?? embed.thumbnail?.url,
            provider: embed.provider?.name ?? embed.author?.name,
        });
    }

    if (results.length === 0 && message.content) {
        const matches = message.content.match(URL_REGEX) ?? [];
        for (const url of matches) {
            if (seen.has(url)) continue;
            seen.add(url);
            results.push({ url });
        }
    }

    return results;
}

interface MediaItem {
    key: string;
    type: "IMAGE" | "VIDEO";
    url: string;
    proxyUrl: string;
    width?: number;
    height?: number;
    filename?: string;
    messageId: string;
    isGif: boolean;
}

function extractMediaItems(message: RawMessage): MediaItem[] {
    const items: MediaItem[] = [];

    for (const a of message.attachments as RawAttachment[]) {
        if (isImageAttachment(a)) {
            items.push({ key: a.id, type: "IMAGE", url: a.url, proxyUrl: a.proxy_url, width: a.width, height: a.height, filename: a.filename, messageId: message.id, isGif: false });
        } else if (isVideoAttachment(a)) {
            items.push({ key: a.id, type: "VIDEO", url: a.url, proxyUrl: a.proxy_url, width: a.width, height: a.height, filename: a.filename, messageId: message.id, isGif: false });
        }
    }

    (message.embeds as RawEmbed[]).forEach((e, i) => {
        if (e.type === "gifv" && e.video?.url) {
            items.push({ key: `${message.id}-e${i}-v`, type: "VIDEO", url: e.video.url, proxyUrl: e.video.proxy_url ?? e.video.url, width: e.video.width, height: e.video.height, messageId: message.id, isGif: true });
        } else if (e.type === "image" && e.image?.url) {
            items.push({ key: `${message.id}-e${i}-i`, type: "IMAGE", url: e.image.url, proxyUrl: e.image.proxy_url ?? e.image.url, width: e.image.width, height: e.image.height, messageId: message.id, isGif: false });
        }
    });

    return items;
}

interface LightboxItem {
    type: "IMAGE" | "VIDEO";
    url: string;
    filename?: string;
    isGif?: boolean;
}

function MediaLightbox({ items, startingIndex, onClose }: { items: LightboxItem[]; startingIndex: number; onClose(): void; }) {
    const [index, setIndex] = useState(startingIndex);
    const item = items[index];

    const prev = useCallback(() => setIndex(i => (i - 1 + items.length) % items.length), [items.length]);
    const next = useCallback(() => setIndex(i => (i + 1) % items.length), [items.length]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowLeft") prev();
            else if (e.key === "ArrowRight") next();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose, prev, next]);

    if (!item) return null;

    return ReactDOM.createPortal(
        <div className={cl("lightbox-backdrop")} onClick={onClose}>
            <button className={cl("lightbox-close")} onClick={onClose} title="Close">
                <CloseIcon />
            </button>

            {items.length > 1 && (
                <>
                    <button className={cl("lightbox-nav", "lightbox-prev")} onClick={e => { e.stopPropagation(); prev(); }} title="Previous">
                        <ChevronIcon />
                    </button>
                    <button className={cl("lightbox-nav", "lightbox-next")} onClick={e => { e.stopPropagation(); next(); }} title="Next">
                        <ChevronIcon className={cl("lightbox-chevron-next")} />
                    </button>
                    <div className={cl("lightbox-counter")}>{index + 1} / {items.length}</div>
                </>
            )}

            <div className={cl("lightbox-content")} onClick={e => e.stopPropagation()}>
                {item.type === "VIDEO"
                    ? (
                        item.isGif
                            ? <video key={item.url} className={cl("lightbox-media")} src={item.url} autoPlay loop muted playsInline />
                            : <video key={item.url} className={cl("lightbox-media")} src={item.url} controls autoPlay />
                    )
                    : <img key={item.url} className={cl("lightbox-media")} src={item.url} alt={item.filename ?? ""} />}
            </div>
        </div>,
        document.body
    );
}

function useSearchTab(channel: Channel, has: SearchHasFilter[], enabled: boolean) {
    const hasKey = has.join(",");

    const [state, setState] = useState({
        messages: [] as RawMessage[],
        totalResults: 0,
        loading: false,
        error: null as string | null,
        indexing: false,
        startedLoading: false,
    });

    const offsetRef = useRef(0);
    const seenIds = useRef<Set<string>>(new Set());

    const load = useCallback(async (reset: boolean) => {
        setState(s => ({ ...s, loading: true, error: null, startedLoading: true }));

        try {
            const page = await searchChannel(channel, has, reset ? 0 : offsetRef.current);

            if (page.indexing) {
                setState(s => ({ ...s, loading: false, indexing: true }));
                return;
            }

            const fresh = page.messages.filter(m => !seenIds.current.has(m.id));
            fresh.forEach(m => seenIds.current.add(m.id));
            offsetRef.current = (reset ? 0 : offsetRef.current) + page.messages.length;

            setState(s => ({
                messages: reset ? fresh : [...s.messages, ...fresh],
                totalResults: page.totalResults,
                loading: false,
                error: null,
                indexing: false,
                startedLoading: true,
            }));
        } catch (e: any) {
            setState(s => ({
                ...s,
                loading: false,
                error: e?.body?.message || e?.message || "Something went wrong while loading this tab.",
            }));
        }
    }, [channel.id, hasKey]);

    useEffect(() => {
        offsetRef.current = 0;
        seenIds.current = new Set();
        setState({ messages: [], totalResults: 0, loading: false, error: null, indexing: false, startedLoading: false });
    }, [channel.id, hasKey]);

    useEffect(() => {
        if (enabled && !state.startedLoading) load(true);
    }, [enabled, state.startedLoading, load]);

    return {
        ...state,
        hasMore: state.messages.length < state.totalResults,
        loadMore: () => load(false),
        retry: () => load(true),
    };
}

function usePins(channel: Channel, enabled: boolean) {
    const [state, setState] = useState({
        pins: [] as PinEntry[],
        loading: false,
        error: null as string | null,
        loaded: false,
    });

    const load = useCallback(async () => {
        setState(s => ({ ...s, loading: true, error: null }));
        try {
            const pins = await fetchPins(channel);
            setState({ pins, loading: false, error: null, loaded: true });
        } catch (e: any) {
            setState(s => ({ ...s, loading: false, loaded: true, error: e?.body?.message || e?.message || "Failed to load pinned messages." }));
        }
    }, [channel.id]);

    useEffect(() => {
        setState({ pins: [], loading: false, error: null, loaded: false });
    }, [channel.id]);

    useEffect(() => {
        if (enabled && !state.loaded && !state.loading) load();
    }, [enabled, state.loaded, state.loading, load]);

    return { ...state, retry: load };
}

function Spinner() {
    return <div className={cl("spinner")} />;
}

function EmptyState({ icon: Icon, label }: { icon: IconComponent; label: string; }) {
    return (
        <div className={cl("empty-state")}>
            <Icon width={32} height={32} className={cl("empty-icon")} />
            <Forms.FormText>{label}</Forms.FormText>
        </div>
    );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void; }) {
    return (
        <div className={cl("empty-state")}>
            <Forms.FormText>{message}</Forms.FormText>
            <button className={cl("retry-btn")} onClick={onRetry}>Try Again</button>
        </div>
    );
}

interface SearchTabState {
    messages: RawMessage[];
    loading: boolean;
    error: string | null;
    indexing: boolean;
    hasMore: boolean;
    loadMore(): void;
    retry(): void;
}

function SearchTabPane({ tab, emptyIcon, emptyLabel, children }: {
    tab: SearchTabState;
    emptyIcon: IconComponent;
    emptyLabel: string;
    children: ReactNode;
}) {
    if (tab.error) return <ErrorState message={tab.error} onRetry={tab.retry} />;

    if (tab.indexing) {
        return (
            <ErrorState
                message="Discord is still indexing this conversation's history for search. This can take a few minutes on large channels.. try again shortly."
                onRetry={tab.retry}
            />
        );
    }

    if (tab.loading && tab.messages.length === 0) {
        return <div className={cl("center")}><Spinner /></div>;
    }

    if (!tab.loading && tab.messages.length === 0) {
        return <EmptyState icon={emptyIcon} label={emptyLabel} />;
    }

    return (
        <ScrollerThin fade className={cl("scroller")}>
            {children}
            {tab.hasMore && (
                <div className={cl("load-more-wrap")}>
                    <button className={cl("load-more-btn")} disabled={tab.loading} onClick={tab.loadMore}>
                        {tab.loading ? "Loading…" : "Load More"}
                    </button>
                </div>
            )}
        </ScrollerThin>
    );
}

function MediaGrid({ messages, onJump }: { messages: RawMessage[]; onJump(messageId: string): void; }) {
    const items = useMemo(() => messages.flatMap(extractMediaItems), [messages]);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    return (
        <>
            <div className={cl("grid")}>
                {items.map((it, i) => (
                    <div key={it.key} className={cl("grid-item")} onClick={() => setLightboxIndex(i)}>
                        {it.type === "VIDEO"
                            ? (
                                <video
                                    className={cl("grid-media")}
                                    src={it.proxyUrl}
                                    muted
                                    loop={it.isGif}
                                    autoPlay={it.isGif}
                                    playsInline={it.isGif}
                                    preload={it.isGif ? "auto" : "metadata"}
                                />
                            )
                            : <img className={cl("grid-media")} src={it.proxyUrl} loading="lazy" alt={it.filename ?? ""} />}
                        {it.type === "VIDEO" && !it.isGif && <PlayIcon className={cl("play-icon")} />}
                        <button
                            className={cl("grid-jump-btn")}
                            title="Jump to message"
                            onClick={e => { e.stopPropagation(); onJump(it.messageId); }}
                        >
                            <JumpIcon />
                        </button>
                    </div>
                ))}
            </div>

            {lightboxIndex != null && (
                <MediaLightbox
                    items={items.map(it => ({ type: it.type, url: it.url, filename: it.filename, isGif: it.isGif }))}
                    startingIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}
        </>
    );
}

function FilesList({ messages, onJump }: { messages: RawMessage[]; onJump(messageId: string): void; }) {
    const rows = useMemo(
        () => messages.flatMap(message => (message.attachments as RawAttachment[]).map(attachment => ({ message, attachment }))),
        [messages]
    );

    return (
        <div className={cl("row-list")}>
            {rows.map(({ message, attachment }) => (
                <div
                    key={attachment.id}
                    className={cl("row")}
                    onClick={() => VencordNative.native.openExternal(attachment.url)}
                >
                    {isImageAttachment(attachment)
                        ? <img className={cl("row-thumb")} src={attachment.proxy_url} alt="" loading="lazy" />
                        : <div className={cl("row-icon-wrap")}><FileIcon /></div>}

                    <div className={cl("row-info")}>
                        <div className={cl("row-title")} title={attachment.filename}>{attachment.filename}</div>
                        <div className={cl("row-meta")}>
                            {formatFileSize(attachment.size)} · {displayName(message.author)} · <Timestamp timestamp={new Date(message.timestamp)} />
                        </div>
                    </div>

                    <div className={cl("row-actions")}>
                        <button
                            className={cl("icon-btn")}
                            title="Open / Download"
                            onClick={e => { e.stopPropagation(); VencordNative.native.openExternal(attachment.url); }}
                        >
                            <DownloadIcon />
                        </button>
                        <button
                            className={cl("icon-btn")}
                            title="Jump to message"
                            onClick={e => { e.stopPropagation(); onJump(message.id); }}
                        >
                            <JumpIcon />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function LinksList({ messages, onJump }: { messages: RawMessage[]; onJump(messageId: string): void; }) {
    const rows = useMemo(
        () => messages.flatMap(message => extractLinks(message).map(link => ({ message, link }))),
        [messages]
    );

    return (
        <div className={cl("row-list")}>
            {rows.map(({ message, link }, i) => (
                <div
                    key={message.id + i}
                    className={cl("row")}
                    onClick={() => VencordNative.native.openExternal(link.url)}
                >
                    {link.thumbnail
                        ? <img className={cl("row-thumb")} src={link.thumbnail} alt="" loading="lazy" />
                        : <div className={cl("row-icon-wrap")}><LinkIcon /></div>}

                    <div className={cl("row-info")}>
                        <div className={cl("row-title")}>{link.title || link.url}</div>
                        <div className={cl("row-meta")}>
                            {link.provider || safeHostname(link.url)} · {displayName(message.author)} · <Timestamp timestamp={new Date(message.timestamp)} />
                        </div>
                    </div>

                    <div className={cl("row-actions")}>
                        <button
                            className={cl("icon-btn")}
                            title="Jump to message"
                            onClick={e => { e.stopPropagation(); onJump(message.id); }}
                        >
                            <JumpIcon />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PinsList({ pins, onJump }: { pins: PinEntry[]; onJump(messageId: string): void; }) {
    const [lightbox, setLightbox] = useState<{ items: LightboxItem[]; index: number; } | null>(null);

    return (
        <div className={cl("pins-list")}>
            {pins.map(({ message }) => {
                const mediaAttachments = (message.attachments as RawAttachment[]).filter(a => isImageAttachment(a) || isVideoAttachment(a));
                const otherAttachments = (message.attachments as RawAttachment[]).filter(a => !isImageAttachment(a) && !isVideoAttachment(a));

                return (
                    <div key={message.id} className={cl("pin-row")}>
                        <img className={cl("pin-avatar")} src={getAuthorAvatarUrl(message.author)} alt="" />
                        <div className={cl("pin-body")}>
                            <div className={cl("pin-meta")}>
                                <span className={cl("pin-author")}>{displayName(message.author)}</span>
                                <Timestamp timestamp={new Date(message.timestamp)} />
                            </div>
                            {message.content && <div className={cl("pin-content")}>{safeParse(message.content)}</div>}
                            {(mediaAttachments.length > 0 || otherAttachments.length > 0) && (
                                <div className={cl("pin-attachments")}>
                                    {mediaAttachments.map((a, i) => (
                                        <div
                                            key={a.id}
                                            className={cl("pin-attachment-media")}
                                            onClick={() => setLightbox({
                                                items: mediaAttachments.map(m => ({
                                                    type: isVideoAttachment(m) ? "VIDEO" : "IMAGE",
                                                    url: m.url,
                                                    filename: m.filename,
                                                })),
                                                index: i,
                                            })}
                                        >
                                            <img className={cl("pin-attachment-thumb")} src={a.proxy_url} alt={a.filename} loading="lazy" />
                                            {isVideoAttachment(a) && <PlayIcon className={cl("pin-attachment-play")} />}
                                        </div>
                                    ))}
                                    {otherAttachments.map(a => (
                                        <span
                                            key={a.id}
                                            className={cl("pin-attachment-file")}
                                            onClick={() => VencordNative.native.openExternal(a.url)}
                                        >
                                            <FileIcon width={14} height={14} /> {a.filename}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button className={cl("icon-btn")} title="Jump to message" onClick={() => onJump(message.id)}>
                            <JumpIcon />
                        </button>
                    </div>
                );
            })}

            {lightbox && (
                <MediaLightbox
                    items={lightbox.items}
                    startingIndex={lightbox.index}
                    onClose={() => setLightbox(null)}
                />
            )}
        </div>
    );
}

function ChannelHeader({ channel }: { channel: Channel; }) {
    let title: string;
    let avatarUrl: string | undefined;

    if (channel.isGroupDM()) {
        title = channel.name || "Group DM";
        avatarUrl = channel.icon
            ? IconUtils.getChannelIconURL({ id: channel.id, icon: channel.icon, size: 80 })
            : undefined;
    } else if (channel.isDM()) {
        const recipient = UserStore.getUser(channel.recipients?.[0]);
        title = recipient ? (recipient.globalName || recipient.username) : (channel.name || "Direct Message");
        avatarUrl = recipient ? IconUtils.getUserAvatarURL(recipient, true, 80) : undefined;
    } else {
        title = `#${channel.name}`;
    }

    return (
        <div className={cl("header")}>
            {avatarUrl && <img className={cl("header-avatar")} src={avatarUrl} alt="" />}
            <Forms.FormTitle tag="h5" className={cl("header-title")}>{title}</Forms.FormTitle>
        </div>
    );
}

function GalleryModal({ channel, modalProps }: { channel: Channel; modalProps: RenderModalProps; }) {
    const [tab, setTab] = useState<Tab>(Tab.Media);

    const media = useSearchTab(channel, MEDIA_HAS, tab === Tab.Media);
    const files = useSearchTab(channel, FILES_HAS, tab === Tab.Files);
    const links = useSearchTab(channel, LINKS_HAS, tab === Tab.Links);
    const pins = usePins(channel, tab === Tab.Pins);

    const onJump = (messageId: string) => {
        NavigationRouter.transitionTo(getMessageJumpPath(channel, messageId));
        modalProps.onClose();
    };

    return (
        <Modal {...modalProps} size="xl" title={<ChannelHeader channel={channel} />}>
            <TabBar
                type="top"
                look="brand"
                className={cl("tab-bar")}
                selectedItem={tab}
                onItemSelect={setTab}
            >
                <TabBar.Item className={cl("tab", { selected: tab === Tab.Media })} id={Tab.Media}>
                    Media{media.totalResults > 0 ? ` (${media.totalResults})` : ""}
                </TabBar.Item>
                <TabBar.Item className={cl("tab", { selected: tab === Tab.Files })} id={Tab.Files}>
                    Files{files.totalResults > 0 ? ` (${files.totalResults})` : ""}
                </TabBar.Item>
                <TabBar.Item className={cl("tab", { selected: tab === Tab.Links })} id={Tab.Links}>
                    Links{links.totalResults > 0 ? ` (${links.totalResults})` : ""}
                </TabBar.Item>
                <TabBar.Item className={cl("tab", { selected: tab === Tab.Pins })} id={Tab.Pins}>
                    Pins{pins.pins.length > 0 ? ` (${pins.pins.length})` : ""}
                </TabBar.Item>
            </TabBar>

            <div className={cl("tab-content")}>
                {tab === Tab.Media && (
                    <SearchTabPane tab={media} emptyIcon={GalleryIcon} emptyLabel="No images or videos found">
                        <MediaGrid messages={media.messages} onJump={onJump} />
                    </SearchTabPane>
                )}
                {tab === Tab.Files && (
                    <SearchTabPane tab={files} emptyIcon={FileIcon} emptyLabel="No files found">
                        <FilesList messages={files.messages} onJump={onJump} />
                    </SearchTabPane>
                )}
                {tab === Tab.Links && (
                    <SearchTabPane tab={links} emptyIcon={LinkIcon} emptyLabel="No links found">
                        <LinksList messages={links.messages} onJump={onJump} />
                    </SearchTabPane>
                )}
                {tab === Tab.Pins && (
                    pins.error ? (
                        <ErrorState message={pins.error} onRetry={pins.retry} />
                    ) : pins.loading && pins.pins.length === 0 ? (
                        <div className={cl("center")}><Spinner /></div>
                    ) : pins.pins.length === 0 ? (
                        <EmptyState icon={PinIcon} label="No pinned messages yet" />
                    ) : (
                        <ScrollerThin fade className={cl("scroller")}>
                            <PinsList pins={pins.pins} onJump={onJump} />
                        </ScrollerThin>
                    )
                )}
            </div>
        </Modal>
    );
}
