import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { findByProps } from "@webpack";
import { Button, ChannelStore, FluxDispatcher, Forms, GuildChannelStore,GuildStore, NavigationRouter, TextInput, useCallback, useEffect, useMemo, useRef, UserStore, useState } from "@webpack/common";

import { setAllChannelsViewOpen, settings } from "../index";

type ReactEl = React.ReactElement | string;

const PrivateChannelsStore = findByProps("getPrivateChannelIds");
const RoleStore = findByProps("getRole");

interface LiveMessage {
    id: string;
    channelId: string;
    channelName: string;
    guildId: string | null;
    guildName: string;
    guildIcon: string | null;
    authorId: string;
    authorName: string;
    authorAvatar: string | null;
    content: string;
    timestamp: number;
    attachments: Attachment[];
    embeds: Embed[];
    isDM: boolean;
    mentions: any[];
    mention_roles: string[];
    stickerItems: StickerItem[];
    editHistory: string[];
}

interface StickerItem {
    id: string;
    name: string;
    format_type: number; // 1=PNG, 2=APNG, 3=LOTTIE, 4=GIF
}

interface Attachment {
    id: string;
    filename: string;
    url: string;
    proxy_url: string;
    content_type?: string;
    width?: number;
    height?: number;
}

interface Embed {
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    type?: string;
    thumbnail?: { url: string; proxy_url?: string; width?: number; height?: number };
    image?: { url: string; proxy_url?: string; width?: number; height?: number };
    video?: { url: string; proxy_url?: string; width?: number; height?: number };
    author?: { name: string; icon_url?: string };
    footer?: { text: string; icon_url?: string; proxy_icon_url?: string };
    fields?: { name: string; value: string; inline?: boolean }[];
    provider?: { name?: string; url?: string };
}

interface ChannelInfo {
    id: string;
    name: string;
    guildId: string | null;
    guildName: string;
    guildIcon: string | null;
    type: "guild" | "dm" | "group";
    recipients?: string[];
}

let liveMessageStore: LiveMessage[] = [];
let selectedChannelsStore: Set<string> = new Set();
const MAX_MESSAGES = 200;

function getChannelsByCategory() {
    const result: {
        guilds: { [guildId: string]: { name: string; icon: string | null; channels: ChannelInfo[] } };
        dms: ChannelInfo[];
        groups: ChannelInfo[];
    } = { guilds: {}, dms: [], groups: [] };

    const guilds = Object.values(GuildStore.getGuilds());
    for (const guild of guilds) {
        const channels = GuildChannelStore.getChannels((guild as any).id) as any;
        const textChannels: ChannelInfo[] = [];

        if (channels?.SELECTABLE) {
            for (const ch of channels.SELECTABLE) {
                if (ch.channel && (ch.channel.type === 0 || ch.channel.type === 5)) {
                    textChannels.push({
                        id: ch.channel.id,
                        name: ch.channel.name,
                        guildId: (guild as any).id,
                        guildName: (guild as any).name,
                        guildIcon: (guild as any).icon,
                        type: "guild"
                    });
                }
            }
        }

        if (textChannels.length > 0) {
            result.guilds[(guild as any).id] = {
                name: (guild as any).name,
                icon: (guild as any).icon,
                channels: textChannels
            };
        }
    }

    try {
        const privateChannels = PrivateChannelsStore?.getPrivateChannelIds?.() || [];
        for (const channelId of privateChannels) {
            const channel = ChannelStore.getChannel(channelId);
            if (!channel) continue;

            if ((channel as any).type === 1) {
                const recipientId = (channel as any).recipients?.[0];
                const user = recipientId ? UserStore.getUser(recipientId) : null;
                const displayName = user?.username || user?.globalName || "Unknown User";
                result.dms.push({
                    id: channel.id,
                    name: displayName,
                    guildId: null,
                    guildName: "Direct Messages",
                    guildIcon: null,
                    type: "dm",
                    recipients: [displayName]
                });
            } else if ((channel as any).type === 3) {
                const recipientIds = (channel as any).recipients || [];
                const names = recipientIds.map((id: string) => {
                    const u = UserStore.getUser(id);
                    return u?.globalName || u?.username || "Unknown";
                });
                result.groups.push({
                    id: channel.id,
                    name: (channel as any).name || names.join(", ") || "Group",
                    guildId: null,
                    guildName: "Group DMs",
                    guildIcon: null,
                    type: "group",
                    recipients: names
                });
            }
        }
    } catch (e) {
        console.error("[AllChannels] Error getting private channels:", e);
    }

    return result;
}

const animationStyles = `
    @keyframes vcFadeIn {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes vcSlideIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
    }
    .vc-msg-item { animation: vcFadeIn 0.2s ease-out; }
    .vc-channel-item { transition: background 0.15s ease; }
    .vc-channel-item:hover { background: #4f545c !important; }
    .vc-checkbox { transition: transform 0.1s ease; }
    .vc-link { color: #00aff4; text-decoration: none; }
    .vc-link:hover { text-decoration: underline; }
    .vc-btn-hover { transition: all 0.15s ease; }
    .vc-btn-hover:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    
    .vc-scrollable::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    .vc-scrollable::-webkit-scrollbar-track {
        background: transparent;
        margin: 2px 0;
    }
    .vc-scrollable::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thin-thumb, #1a1b1e);
        border-radius: 100px;
        border: 2px solid transparent;
        background-clip: padding-box;
        min-height: 40px;
    }
    .vc-scrollable::-webkit-scrollbar-thumb:hover {
        background-color: var(--scrollbar-thin-thumb, #1a1b1e);
    }
    .vc-scrollable::-webkit-scrollbar-corner {
        background: transparent;
    }
    .vc-scrollable {
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thin-thumb, #1a1b1e) transparent;
    }
    
    .vc-mention {
        background: rgba(88, 101, 242, 0.3);
        color: #dee0fc;
        padding: 0 2px;
        border-radius: 3px;
        font-weight: 500;
        cursor: pointer;
    }
    .vc-mention:hover {
        background: #5865f2;
        color: #ffffff;
    }
    .vc-role-mention {
        padding: 0 2px;
        border-radius: 3px;
        font-weight: 500;
    }
    .vc-channel-mention {
        background: rgba(88, 101, 242, 0.3);
        color: #dee0fc;
        padding: 0 2px;
        border-radius: 3px;
        cursor: pointer;
    }
    .vc-emoji {
        width: 22px;
        height: 22px;
        vertical-align: middle;
        object-fit: contain;
    }
`;

export function AllChannelsModal(props: ModalProps) {
    const [messages, setMessages] = useState<LiveMessage[]>(liveMessageStore);
    const [searchQuery, setSearchQuery] = useState("");
    const [isPaused, setIsPaused] = useState(false);
    const [showChannelSelector, setShowChannelSelector] = useState(false);
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(selectedChannelsStore);
    const [expandedImages, setExpandedImages] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const styleId = "vc-allchannels-animations";
        if (!document.getElementById(styleId)) {
            const style = document.createElement("style");
            style.id = styleId;
            style.textContent = animationStyles;
            document.head.appendChild(style);
        }
    }, []);

    const getGuildIconUrl = (guildId: string | null | undefined, icon: string | null | undefined, size = 32): string | undefined => {
        if (!guildId || !icon) return undefined;
        return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=${size}`;
    };

    const parseText = (text: string, guildId: string | null, mentions: any[], keyPrefix: string): ReactEl[] => {
        if (!text) return [];

        const elements: ReactEl[] = [];
        let lastIndex = 0;

        const pattern = /(https?:\/\/[^\s<]+)|<@!?(\d+)>|<@&(\d+)>|<#(\d+)>|<a?:(\w+):(\d+)>/g;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                elements.push(text.slice(lastIndex, match.index));
            }

            if (match[1]) {
                const url = match[1];
                elements.push(
                    <a
                        key={`${keyPrefix}-url-${match.index}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="vc-link"
                        onClick={e => e.stopPropagation()}
                    >
                        {url}
                    </a>
                );
            } else if (match[2]) {
                const userId = match[2];
                const mentionedUser = mentions?.find((m: any) => m.id === userId);
                const displayName = mentionedUser?.global_name || mentionedUser?.globalName || mentionedUser?.username || "Unknown User";
                elements.push(
                    <span key={`${keyPrefix}-m-${match.index}`} className="vc-mention">
                        @{displayName}
                    </span>
                );
            } else if (match[3]) {
                const roleId = match[3];
                const role = guildId ? RoleStore?.getRole?.(guildId, roleId) : null;
                const roleColor = role?.color ? `#${role.color.toString(16).padStart(6, "0")}` : "#99aab5";
                elements.push(
                    <span
                        key={`${keyPrefix}-r-${match.index}`}
                        className="vc-role-mention"
                        style={{ background: `${roleColor}33`, color: roleColor }}
                    >
                        @{role?.name || "Unknown Role"}
                    </span>
                );
            } else if (match[4]) {
                const channelId = match[4];
                const channel = ChannelStore.getChannel(channelId);
                elements.push(
                    <span
                        key={`${keyPrefix}-c-${match.index}`}
                        className="vc-channel-mention"
                        onClick={e => {
                            e.stopPropagation();
                            if (channel?.guild_id) {
                                NavigationRouter.transitionToGuild(channel.guild_id, channelId);
                            } else {
                                (NavigationRouter as any).transitionTo?.(`/channels/@me/${channelId}`);
                            }
                            props.onClose();
                        }}
                    >
                        #{channel?.name || "unknown-channel"}
                    </span>
                );
            } else if (match[5] && match[6]) {
                const isAnimated = text.slice(match.index, match.index + 2) === "<a";
                elements.push(
                    <img
                        key={`${keyPrefix}-e-${match.index}`}
                        className="vc-emoji"
                        src={`https://cdn.discordapp.com/emojis/${match[6]}.${isAnimated ? "gif" : "png"}?size=48`}
                        alt={`:${match[5]}:`}
                        title={`:${match[5]}:`}
                    />
                );
            }

            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
            elements.push(text.slice(lastIndex));
        }

        return elements;
    };

    const parseMarkdown = (text: string, keyPrefix: string): ReactEl[] => {
        if (!text) return [];
        const elements: ReactEl[] = [];

        const lines = text.split("\n");
        let i = 0;
        while (i < lines.length) {
            if (lines[i].startsWith("```")) {
                const codeLines: string[] = [];
                i++;
                while (i < lines.length && !lines[i].startsWith("```")) {
                    codeLines.push(lines[i]);
                    i++;
                }
                if (i < lines.length) i++; // skip closing ```
                elements.push(
                    <pre key={`${keyPrefix}-codeblock-${i}`} style={{ background: "#2f3136", padding: "8px 12px", borderRadius: "4px", fontSize: "85%", fontFamily: "monospace", margin: "4px 0", overflowX: "auto", whiteSpace: "pre-wrap", border: "1px solid #202225" }}>
                        <code>{codeLines.join("\n")}</code>
                    </pre>
                );
                continue;
            }

            if (lines[i].startsWith(">>> ")) {
                const quoteLines = [lines[i].slice(4)];
                i++;
                while (i < lines.length) {
                    quoteLines.push(lines[i]);
                    i++;
                }
                elements.push(
                    <div key={`${keyPrefix}-mquote-${i}`} style={{ borderLeft: "4px solid #4f545c", paddingLeft: "12px", margin: "4px 0", color: "#dcddde" }}>
                        {quoteLines.map((ql, qi) => <span key={qi}>{qi > 0 && <br />}{parseInlineMarkdown(ql, `${keyPrefix}-mq-${qi}`)}</span>)}
                    </div>
                );
                continue;
            }

            if (lines[i].startsWith("> ")) {
                const quoteLines: string[] = [];
                while (i < lines.length && lines[i].startsWith("> ")) {
                    quoteLines.push(lines[i].slice(2));
                    i++;
                }
                elements.push(
                    <div key={`${keyPrefix}-quote-${i}`} style={{ borderLeft: "4px solid #4f545c", paddingLeft: "12px", margin: "4px 0", color: "#dcddde" }}>
                        {quoteLines.map((ql, qi) => <span key={qi}>{qi > 0 && <br />}{parseInlineMarkdown(ql, `${keyPrefix}-q-${qi}`)}</span>)}
                    </div>
                );
                continue;
            }

            const headerMatch = lines[i].match(/^(#{1,3})\s+(.+)$/);
            if (headerMatch) {
                const level = headerMatch[1].length;
                const sizes = { 1: "1.5em", 2: "1.25em", 3: "1.1em" };
                elements.push(
                    <div key={`${keyPrefix}-h-${i}`} style={{ fontWeight: "700", fontSize: sizes[level as 1|2|3], margin: "4px 0" }}>
                        {parseInlineMarkdown(headerMatch[2], `${keyPrefix}-h${level}-${i}`)}
                    </div>
                );
                i++;
                continue;
            }

            if (lines[i].startsWith("-# ")) {
                elements.push(
                    <div key={`${keyPrefix}-sub-${i}`} style={{ fontSize: "0.8em", color: "#a3a6aa" }}>
                        {parseInlineMarkdown(lines[i].slice(3), `${keyPrefix}-sub-${i}`)}
                    </div>
                );
                i++;
                continue;
            }

            if (i > 0 && elements.length > 0) elements.push(<br key={`${keyPrefix}-br-${i}`} />);
            const inlineEls = parseInlineMarkdown(lines[i], `${keyPrefix}-l-${i}`);
            elements.push(...inlineEls);
            i++;
        }

        return elements;
    };

    const parseInlineMarkdown = (text: string, keyPrefix: string): ReactEl[] => {
        if (!text) return [];
        const elements: ReactEl[] = [];
        let lastIndex = 0;
        const mdPattern = /`([^`]+)`|\|\|(.+?)\|\||\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|~~(.+?)~~|_(.+?)_/g;
        let match;
        while ((match = mdPattern.exec(text)) !== null) {
            if (match.index > lastIndex) {
                elements.push(text.slice(lastIndex, match.index));
            }
            if (match[1] !== undefined) {
                elements.push(<code key={`${keyPrefix}-code-${match.index}`} style={{ background: "#2f3136", padding: "1px 4px", borderRadius: "3px", fontSize: "85%", fontFamily: "monospace" }}>{match[1]}</code>);
            } else if (match[2] !== undefined) {
                elements.push(<span key={`${keyPrefix}-sp-${match.index}`} style={{ background: "#202225", color: "#202225", borderRadius: "3px", padding: "0 2px", cursor: "default" }} onMouseEnter={e => { e.currentTarget.style.color = "#dcddde"; }} onMouseLeave={e => { e.currentTarget.style.color = "#202225"; }}>{parseInlineMarkdown(match[2], `${keyPrefix}-sp-${match.index}`)}</span>);
            } else if (match[3] !== undefined) {
                elements.push(<strong key={`${keyPrefix}-bi-${match.index}`}><em style={{ fontStyle: "italic" }}>{parseInlineMarkdown(match[3], `${keyPrefix}-bi-${match.index}`)}</em></strong>);
            } else if (match[4] !== undefined) {
                elements.push(<strong key={`${keyPrefix}-b-${match.index}`}>{parseInlineMarkdown(match[4], `${keyPrefix}-b-${match.index}`)}</strong>);
            } else if (match[5] !== undefined) {
                elements.push(<em key={`${keyPrefix}-i-${match.index}`} style={{ fontStyle: "italic" }}>{parseInlineMarkdown(match[5], `${keyPrefix}-i-${match.index}`)}</em>);
            } else if (match[6] !== undefined) {
                elements.push(<u key={`${keyPrefix}-u-${match.index}`}>{parseInlineMarkdown(match[6], `${keyPrefix}-u-${match.index}`)}</u>);
            } else if (match[7] !== undefined) {
                elements.push(<s key={`${keyPrefix}-s-${match.index}`}>{parseInlineMarkdown(match[7], `${keyPrefix}-s-${match.index}`)}</s>);
            } else if (match[8] !== undefined) {
                elements.push(<em key={`${keyPrefix}-ui-${match.index}`} style={{ fontStyle: "italic" }}>{parseInlineMarkdown(match[8], `${keyPrefix}-ui-${match.index}`)}</em>);
            }
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
            elements.push(text.slice(lastIndex));
        }
        return elements;
    };

    const parseMessageContent = (msg: LiveMessage): React.ReactElement => {
        const { content } = msg;
        if (!content) return <></>;
        const elements = parseText(content, msg.guildId, msg.mentions, msg.id);

        const finalElements: ReactEl[] = [];
        elements.forEach((el, i) => {
            if (typeof el === "string") {
                finalElements.push(...parseMarkdown(el, `${msg.id}-md-${i}`));
            } else {
                finalElements.push(el);
            }
        });

        return <>{finalElements}</>;
    };



    const toggleChannel = useCallback((channelId: string) => {
        setSelectedChannels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(channelId)) {
                newSet.delete(channelId);
            } else {
                newSet.add(channelId);
            }
            selectedChannelsStore = newSet;
            return newSet;
        });
    }, []);

    const selectAllInCategory = useCallback((channelIds: string[]) => {
        setSelectedChannels(prev => {
            const newSet = new Set(prev);
            for (const id of channelIds) newSet.add(id);
            selectedChannelsStore = newSet;
            return newSet;
        });
    }, []);

    const deselectAllInCategory = useCallback((channelIds: string[]) => {
        setSelectedChannels(prev => {
            const newSet = new Set(prev);
            for (const id of channelIds) newSet.delete(id);
            selectedChannelsStore = newSet;
            return newSet;
        });
    }, []);

    const selectAll = useCallback((allChannelIds: string[]) => {
        const newSet = new Set<string>(allChannelIds);
        setSelectedChannels(newSet);
        selectedChannelsStore = newSet;
    }, []);

    const deselectAll = useCallback(() => {
        setSelectedChannels(new Set());
        selectedChannelsStore = new Set();
    }, []);

    useEffect(() => {
        setAllChannelsViewOpen(true);

        const handleNewMessage = (data: any) => {
            if (isPaused) return;

            const { message, channelId } = data;
            if (!message || !channelId) return;

            const channel = ChannelStore.getChannel(channelId);
            if (!channel) return;

            if (selectedChannels.size > 0 && !selectedChannels.has(channelId)) {
                return;
            }

            const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
            const isDM = !guild;

            let guildName = "Direct Messages";
            let channelName = channel.name || "Unknown";
            let guildIcon: string | null = null;

            if (guild) {
                guildName = (guild as any).name;
                guildIcon = (guild as any).icon;
            } else if ((channel as any).type === 3) {
                guildName = "Group DM";
                const recipientIds = (channel as any).recipients || [];
                const names = recipientIds.map((id: string) => {
                    const u = UserStore.getUser(id);
                    return u?.globalName || u?.username || "Unknown";
                });
                channelName = (channel as any).name || names.join(", ") || "Group";
            } else if ((channel as any).type === 1) {
                const recipientId = (channel as any).recipients?.[0];
                const user = recipientId ? UserStore.getUser(recipientId) : null;
                channelName = user?.username || user?.globalName || "Unknown User";
            }

            const newMsg: LiveMessage = {
                id: message.id,
                channelId: channelId,
                channelName: channelName,
                guildId: guild ? (guild as any).id : null,
                guildName: guildName,
                guildIcon: guildIcon,
                authorId: message.author?.id || "",
                authorName: message.author?.global_name || message.author?.globalName || message.author?.username || "Unknown",
                authorAvatar: message.author?.avatar,
                content: message.content || "",
                timestamp: Date.now(),
                attachments: message.attachments || [],
                embeds: message.embeds || [],
                isDM: isDM,
                mentions: message.mentions || [],
                mention_roles: message.mention_roles || [],
                stickerItems: message.sticker_items || [],
                editHistory: []
            };

            if (message.message_snapshots?.length > 0) {
                const snapshot = message.message_snapshots[0]?.message;
                if (snapshot) {
                    if (!newMsg.content && snapshot.content) {
                        newMsg.content = "↪ " + snapshot.content;
                    } else if (!newMsg.content) {
                        newMsg.content = "↪ Forwarded message";
                    }
                    if (snapshot.embeds?.length > 0 && newMsg.embeds.length === 0) {
                        newMsg.embeds = snapshot.embeds;
                    }
                    if (snapshot.attachments?.length > 0 && newMsg.attachments.length === 0) {
                        newMsg.attachments = snapshot.attachments;
                    }
                }
            }

            liveMessageStore = [newMsg, ...liveMessageStore].slice(0, MAX_MESSAGES);
            setMessages([...liveMessageStore]);
        };

        const handleMessageUpdate = (data: any) => {
            const { message } = data;
            if (!message?.id) return;

            const hasEmbedUpdate = message.embeds?.length > 0;
            const hasContentUpdate = typeof message.content === "string";

            if (!hasEmbedUpdate && !hasContentUpdate) return;

            liveMessageStore = liveMessageStore.map(msg => {
                if (msg.id !== message.id) return msg;

                const updated = { ...msg };

                if (hasEmbedUpdate) {
                    updated.embeds = message.embeds;
                }

                if (hasContentUpdate && settings.store.trackEdits && message.content !== msg.content) {
                    updated.editHistory = [...msg.editHistory, msg.content];
                    updated.content = message.content;
                }

                return updated;
            });
            setMessages([...liveMessageStore]);
        };

        FluxDispatcher.subscribe("MESSAGE_CREATE", handleNewMessage);
        FluxDispatcher.subscribe("MESSAGE_UPDATE", handleMessageUpdate);

        return () => {
            setAllChannelsViewOpen(false);
            FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleNewMessage);
            FluxDispatcher.unsubscribe("MESSAGE_UPDATE", handleMessageUpdate);
        };
    }, [isPaused, selectedChannels]);

    const navigateToMessage = (guildId: string | null, channelId: string, messageId: string) => {
        if (guildId) {
            NavigationRouter.transitionToGuild(guildId, channelId, messageId);
        } else {
            (NavigationRouter as any).transitionTo?.(`/channels/@me/${channelId}/${messageId}`);
        }
        props.onClose();
    };

    const clearMessages = () => {
        liveMessageStore = [];
        setMessages([]);
    };

    const toggleImageExpand = (attachmentId: string) => {
        const newSet = new Set(expandedImages);
        if (newSet.has(attachmentId)) {
            newSet.delete(attachmentId);
        } else {
            newSet.add(attachmentId);
        }
        setExpandedImages(newSet);
    };

    const filteredMessages = messages.filter(msg => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            msg.content.toLowerCase().includes(query) ||
            msg.authorName.toLowerCase().includes(query) ||
            msg.channelName.toLowerCase().includes(query) ||
            msg.guildName.toLowerCase().includes(query)
        );
    });

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };

    const getAvatarUrl = (msg: LiveMessage) => {
        const user = UserStore.getUser(msg.authorId);
        if (user) {
            return user.getAvatarURL(msg.guildId, 80);
        }
        if (msg.authorAvatar) {
            const ext = msg.authorAvatar.startsWith("a_") ? "gif" : "png";
            return `https://cdn.discordapp.com/avatars/${msg.authorId}/${msg.authorAvatar}.${ext}?size=80`;
        }
        const defaultIndex = Number((BigInt(msg.authorId) >> 22n) % 6n);
        return `https://cdn.discordapp.com/embed/avatars/${isNaN(defaultIndex) ? 0 : defaultIndex}.png`;
    };

    const isImageAttachment = (attachment: Attachment) => {
        return attachment.content_type?.startsWith("image/") ||
               /\.(png|jpg|jpeg|gif|webp)$/i.test(attachment.filename);
    };

    const renderAttachment = (attachment: Attachment) => {
        if (isImageAttachment(attachment)) {
            const isExpanded = expandedImages.has(attachment.id);
            return (
                <div
                    key={attachment.id}
                    onClick={e => { e.stopPropagation(); toggleImageExpand(attachment.id); }}
                    style={{
                        cursor: "pointer",
                        marginTop: "8px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        maxWidth: isExpanded ? "100%" : "300px",
                        transition: "max-width 0.3s ease"
                    }}
                >
                    <img
                        src={attachment.proxy_url || attachment.url}
                        alt={attachment.filename}
                        style={{
                            maxWidth: "100%",
                            maxHeight: isExpanded ? "500px" : "200px",
                            objectFit: "contain",
                            borderRadius: "8px",
                            transition: "max-height 0.3s ease"
                        }}
                    />
                </div>
            );
        }

        return (
            <div
                key={attachment.id}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    background: "#2f3136",
                    borderRadius: "4px",
                    marginTop: "8px",
                    cursor: "pointer"
                }}
                onClick={e => { e.stopPropagation(); window.open(attachment.url, "_blank"); }}
            >
                <span style={{ fontSize: "20px" }}>📎</span>
                <span style={{ color: "#00aff4", textDecoration: "underline" }}>
                    {attachment.filename}
                </span>
            </div>
        );
    };

    const renderEmbed = (embed: Embed, index: number, guildId: string | null) => {
        const borderColor = embed.color ? `#${embed.color.toString(16).padStart(6, "0")}` : "#5865f2";

        const parseEmbedText = (text: string | undefined, keyBase: string): React.ReactElement => {
            if (!text) return <></>;
            const lines = text.split("\n");
            const result: ReactEl[] = [];
            lines.forEach((line, lineIdx) => {
                if (lineIdx > 0) result.push(<br key={`${keyBase}-br-${lineIdx}`} />);
                if (line.startsWith("> ")) {
                    result.push(
                        <span key={`${keyBase}-q-${lineIdx}`} style={{ borderLeft: "3px solid #4f545c", paddingLeft: "8px", display: "inline-block" }}>
                            {parseEmbedInline(line.slice(2), `${keyBase}-ql-${lineIdx}`)}
                        </span>
                    );
                    return;
                }
                result.push(...parseEmbedInline(line, `${keyBase}-l-${lineIdx}`));
            });
            return <>{result}</>;
        };

        const parseEmbedInline = (text: string, keyBase: string): ReactEl[] => {
            const elements: ReactEl[] = [];
            let lastIndex = 0;
            const pattern = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\|\|(.+?)\|\||\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|~~(.+?)~~|_(.+?)_|(https?:\/\/[^\s<]+)/g;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    elements.push(text.slice(lastIndex, match.index));
                }
                if (match[1] && match[2]) {
                    elements.push(<a key={`${keyBase}-${match.index}`} href={match[2]} target="_blank" rel="noopener noreferrer" className="vc-link" onClick={e => e.stopPropagation()}>{match[1]}</a>);
                } else if (match[3] !== undefined) {
                    elements.push(<code key={`${keyBase}-c-${match.index}`} style={{ background: "#202225", padding: "1px 4px", borderRadius: "3px", fontSize: "85%", fontFamily: "monospace" }}>{match[3]}</code>);
                } else if (match[4] !== undefined) {
                    elements.push(<span key={`${keyBase}-sp-${match.index}`} style={{ background: "#202225", color: "#202225", borderRadius: "3px", padding: "0 2px", cursor: "default" }} onMouseEnter={e => { e.currentTarget.style.color = "#dcddde"; }} onMouseLeave={e => { e.currentTarget.style.color = "#202225"; }}>{parseEmbedInline(match[4], `${keyBase}-sp-${match.index}`)}</span>);
                } else if (match[5]) {
                    elements.push(<strong key={`${keyBase}-bi-${match.index}`}><em style={{ fontStyle: "italic" }}>{match[5]}</em></strong>);
                } else if (match[6]) {
                    elements.push(<strong key={`${keyBase}-b-${match.index}`}>{match[6]}</strong>);
                } else if (match[7]) {
                    elements.push(<em key={`${keyBase}-i-${match.index}`} style={{ fontStyle: "italic" }}>{match[7]}</em>);
                } else if (match[8]) {
                    elements.push(<u key={`${keyBase}-u-${match.index}`}>{match[8]}</u>);
                } else if (match[9]) {
                    elements.push(<s key={`${keyBase}-s-${match.index}`}>{match[9]}</s>);
                } else if (match[10]) {
                    elements.push(<em key={`${keyBase}-ui-${match.index}`} style={{ fontStyle: "italic" }}>{match[10]}</em>);
                } else if (match[11]) {
                    elements.push(<a key={`${keyBase}-${match.index}`} href={match[11]} target="_blank" rel="noopener noreferrer" className="vc-link" onClick={e => e.stopPropagation()}>{match[11]}</a>);
                }
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < text.length) {
                elements.push(text.slice(lastIndex));
            }
            return elements;
        };

        return (
            <div
                key={index}
                style={{
                    borderLeft: `4px solid ${borderColor}`,
                    background: "#2f3136",
                    borderRadius: "4px",
                    padding: "12px",
                    marginTop: "8px",
                    maxWidth: "400px"
                }}
            >
                {embed.author && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        {(embed.author.icon_url || (embed.author as any).proxy_icon_url) && (
                            <img src={embed.author.icon_url || (embed.author as any).proxy_icon_url} alt="" style={{ width: "20px", height: "20px", borderRadius: "50%" }} />
                        )}
                        <span style={{ color: "#ffffff", fontSize: "13px", fontWeight: "500" }}>{embed.author.name}</span>
                    </div>
                )}
                {embed.title && (
                    <div style={{ color: "#00aff4", fontWeight: "600", marginBottom: "4px", fontSize: "14px" }}>
                        {embed.url ? <a href={embed.url} target="_blank" rel="noopener noreferrer" className="vc-link" onClick={e => e.stopPropagation()}>{embed.title}</a> : embed.title}
                    </div>
                )}
                {embed.description && (
                    <div style={{ color: "#dcddde", fontSize: "13px", marginBottom: "8px", lineHeight: "1.375" }}>
                        {parseEmbedText(embed.description, `embed-${index}-desc`)}
                    </div>
                )}
                {embed.fields && embed.fields.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                        {embed.fields.map((field, i) => (
                            <div key={i} style={{ gridColumn: field.inline ? "span 1" : "span 3" }}>
                                <div style={{ color: "#ffffff", fontSize: "12px", fontWeight: "600" }}>{field.name}</div>
                                <div style={{ color: "#b9bbbe", fontSize: "12px" }}>{parseEmbedText(field.value, `embed-${index}-f${i}`)}</div>
                            </div>
                        ))}
                    </div>
                )}
                {embed.video && (() => {
                    const vUrl = embed.video.proxy_url || embed.video.url;
                    const isPlayable = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(vUrl) || /discord(app)?\.com|discord\.net/i.test(vUrl);
                    return isPlayable ? (
                        <div style={{ marginTop: "8px", borderRadius: "4px", overflow: "hidden", maxWidth: "400px" }}>
                            <video
                                src={vUrl}
                                poster={embed.thumbnail?.proxy_url || embed.thumbnail?.url}
                                controls
                                preload="metadata"
                                onClick={e => e.stopPropagation()}
                                style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "4px", display: "block" }}
                            />
                        </div>
                    ) : (embed.thumbnail || embed.image) ? (
                        <img
                            src={embed.thumbnail?.proxy_url || embed.thumbnail?.url || embed.image?.proxy_url || embed.image?.url}
                            alt=""
                            style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "4px", marginTop: "8px" }}
                        />
                    ) : null;
                })()}
                {!embed.video && (embed.image || embed.thumbnail) && (
                    <img
                        src={embed.image?.proxy_url || embed.image?.url || embed.thumbnail?.proxy_url || embed.thumbnail?.url}
                        alt=""
                        style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "4px", marginTop: "8px" }}
                    />
                )}
                {embed.footer && (
                    <div style={{ color: "#72767d", fontSize: "11px", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        {(embed.footer.icon_url || embed.footer.proxy_icon_url) && (
                            <img src={embed.footer.proxy_icon_url || embed.footer.icon_url} alt="" style={{ width: "16px", height: "16px", borderRadius: "50%" }} />
                        )}
                        {embed.footer.text}
                    </div>
                )}
            </div>
        );
    };

    const channelData = useMemo(() => getChannelsByCategory(), [showChannelSelector]);

    const allChannelIds = useMemo(() => {
        const ids: string[] = [];
        for (const guild of Object.values(channelData.guilds)) {
            for (const ch of guild.channels) ids.push(ch.id);
        }
        for (const ch of channelData.dms) ids.push(ch.id);
        for (const ch of channelData.groups) ids.push(ch.id);
        return ids;
    }, [channelData]);

    // Memoize the channel selector content to prevent React from re-diffing
    // thousands of vDOM nodes when transitionState changes during close animation
    const channelSelectorContent = useMemo(() => (
        <>
            <ModalHeader>
                <span style={{ color: "#ffffff", fontSize: "16px", fontWeight: "600", lineHeight: "32px" }}>
                    Select Channels
                </span>
            </ModalHeader>

            <ModalContent style={{ padding: "16px", overflowX: "clip", overflowY: "visible", position: "relative" } as any}>

                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center", position: "absolute", right: "16px", top: "-24px", zIndex: 1 }}>
                    <Button size={Button.Sizes.SMALL} onClick={() => selectAll(allChannelIds)} className="vc-btn-hover">
                        Select All
                    </Button>
                    <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={() => deselectAll()} className="vc-btn-hover">
                        Deselect All
                    </Button>
                    <ModalCloseButton onClick={props.onClose} />
                </div>

                <div style={{ color: "#b9bbbe", marginBottom: "12px", fontSize: "13px" }}>
                    {selectedChannels.size === 0
                        ? "No channels selected = showing ALL messages"
                        : `Showing messages from ${selectedChannels.size} channel(s)`}
                </div>

                <div className="vc-scrollable" style={{
                    maxHeight: "450px", overflowY: "auto", overflowX: "hidden", paddingRight: "8px",
                    willChange: "transform"
                }}>
                    {channelData.dms.length > 0 && (
                        <div className="vc-server-group" style={{ marginBottom: "16px", contentVisibility: "auto", containIntrinsicSize: "0 auto 200px" } as any}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "8px",
                                padding: "10px 12px",
                                background: "#36393f",
                                borderRadius: "6px"
                            }}>
                                <span style={{ fontSize: "24px" }}>💬</span>
                                <span style={{ color: "#ffffff", fontWeight: "600", flex: 1 }}>Direct Messages</span>
                                <Button size={Button.Sizes.SMALL} onClick={() => selectAllInCategory(channelData.dms.map(c => c.id))}>All</Button>
                                <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={() => deselectAllInCategory(channelData.dms.map(c => c.id))}>None</Button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "4px", paddingLeft: "8px" }}>
                                {channelData.dms.map(ch => (
                                    <div
                                        key={ch.id}
                                        onClick={() => toggleChannel(ch.id)}
                                        className="vc-channel-item"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "8px 12px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            background: selectedChannels.has(ch.id) ? "#5865f2" : "#40444b",
                                            color: "#ffffff"
                                        }}
                                    >
                                        <span className="vc-checkbox" style={{
                                            width: "18px", height: "18px",
                                            border: "2px solid #ffffff", borderRadius: "4px",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: "12px", fontWeight: "bold",
                                            background: selectedChannels.has(ch.id) ? "#ffffff" : "transparent",
                                            color: selectedChannels.has(ch.id) ? "#5865f2" : "transparent"
                                        }}>✓</span>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            @{ch.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {channelData.groups.length > 0 && (
                        <div className="vc-server-group" style={{ marginBottom: "16px", contentVisibility: "auto", containIntrinsicSize: "0 auto 200px" } as any}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "8px",
                                padding: "10px 12px",
                                background: "#36393f",
                                borderRadius: "6px"
                            }}>
                                <span style={{ fontSize: "24px" }}>👥</span>
                                <span style={{ color: "#ffffff", fontWeight: "600", flex: 1 }}>Group DMs</span>
                                <Button size={Button.Sizes.SMALL} onClick={() => selectAllInCategory(channelData.groups.map(c => c.id))}>All</Button>
                                <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={() => deselectAllInCategory(channelData.groups.map(c => c.id))}>None</Button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "4px", paddingLeft: "8px" }}>
                                {channelData.groups.map(ch => (
                                    <div
                                        key={ch.id}
                                        onClick={() => toggleChannel(ch.id)}
                                        className="vc-channel-item"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "8px 12px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            background: selectedChannels.has(ch.id) ? "#5865f2" : "#40444b",
                                            color: "#ffffff"
                                        }}
                                    >
                                        <span className="vc-checkbox" style={{
                                            width: "18px", height: "18px",
                                            border: "2px solid #ffffff", borderRadius: "4px",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: "12px", fontWeight: "bold",
                                            background: selectedChannels.has(ch.id) ? "#ffffff" : "transparent",
                                            color: selectedChannels.has(ch.id) ? "#5865f2" : "transparent"
                                        }}>✓</span>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {ch.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {Object.entries(channelData.guilds).map(([guildId, guild]) => (
                        <div key={guildId} className="vc-server-group" style={{ marginBottom: "16px", contentVisibility: "auto", containIntrinsicSize: "0 auto 200px" } as any}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "8px",
                                padding: "10px 12px",
                                background: "#36393f",
                                borderRadius: "6px",
                                overflow: "hidden"
                            }}>
                                {guild.icon ? (
                                    <img
                                        src={getGuildIconUrl(guildId, guild.icon)}
                                        alt=""
                                        style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0 }}
                                    />
                                ) : (
                                    <div style={{
                                        width: "28px", height: "28px", borderRadius: "50%",
                                        background: "#5865f2", display: "flex", alignItems: "center", justifyContent: "center",
                                        color: "#ffffff", fontSize: "12px", fontWeight: "600", flexShrink: 0
                                    }}>
                                        {guild.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span style={{ color: "#ffffff", fontWeight: "600", marginRight: "auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, maxWidth: "300px" }}>{guild.name}</span>
                                <Button size={Button.Sizes.SMALL} style={{ flexShrink: 0 }} onClick={() => selectAllInCategory(guild.channels.map(c => c.id))}>All</Button>
                                <Button size={Button.Sizes.SMALL} style={{ flexShrink: 0 }} color={Button.Colors.RED} onClick={() => deselectAllInCategory(guild.channels.map(c => c.id))}>None</Button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "4px", paddingLeft: "8px" }}>
                                {guild.channels.map(ch => (
                                    <div
                                        key={ch.id}
                                        onClick={() => toggleChannel(ch.id)}
                                        className="vc-channel-item"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            padding: "8px 12px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            background: selectedChannels.has(ch.id) ? "#5865f2" : "#40444b",
                                            color: "#ffffff"
                                        }}
                                    >
                                        <span className="vc-checkbox" style={{
                                            width: "18px", height: "18px",
                                            border: "2px solid #ffffff", borderRadius: "4px",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: "12px", fontWeight: "bold",
                                            background: selectedChannels.has(ch.id) ? "#ffffff" : "transparent",
                                            color: selectedChannels.has(ch.id) ? "#5865f2" : "transparent"
                                        }}>✓</span>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px" }}>
                                            #{ch.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

            </ModalContent>
            <ModalFooter>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => setShowChannelSelector(false)}
                    className="vc-btn-hover"
                >
                    Done{selectedChannels.size > 0 ? ` (${selectedChannels.size} selected)` : ""}
                </Button>
            </ModalFooter>
        </>
    ), [channelData, selectedChannels, allChannelIds, props.onClose]);

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            {showChannelSelector ? channelSelectorContent : (
                <>
            <ModalHeader>
                <Forms.FormTitle tag="h2" style={{ margin: 0, color: "#ffffff" }}>
                    Live Message Feed
                </Forms.FormTitle>
                <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
                    <Button
                        size={Button.Sizes.SMALL}
                        onClick={() => setShowChannelSelector(true)}
                        className="vc-btn-hover"
                    >
                        📋 Channels ({selectedChannels.size || "All"})
                    </Button>
                    <Button
                        size={Button.Sizes.SMALL}
                        onClick={() => setIsPaused(!isPaused)}
                        color={isPaused ? Button.Colors.GREEN : Button.Colors.PRIMARY}
                        className="vc-btn-hover"
                    >
                        {isPaused ? "▶ Resume" : "⏸ Pause"}
                    </Button>
                    <Button
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.RED}
                        onClick={clearMessages}
                        className="vc-btn-hover"
                    >
                        🗑 Clear
                    </Button>
                    <div style={{ marginLeft: "8px" }}>
                        <ModalCloseButton onClick={props.onClose} />
                    </div>
                </div>
            </ModalHeader>

            <ModalContent style={{ padding: "16px" }}>
                <div style={{ marginBottom: "12px" }}>
                    <TextInput
                        placeholder="Filter messages..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                    />
                </div>

                {isPaused && (
                    <div style={{
                        background: "linear-gradient(90deg, #faa61a, #f57731)",
                        color: "#ffffff",
                        padding: "10px 14px",
                        borderRadius: "6px",
                        marginBottom: "12px",
                        textAlign: "center",
                        fontWeight: "600",
                        boxShadow: "0 2px 10px rgba(250, 166, 26, 0.3)"
                    }}>
                        ⏸ Feed paused - new messages won't appear until you resume
                    </div>
                )}

                <div className="vc-scrollable" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", maxHeight: "500px", paddingRight: "8px" }}>
                    {filteredMessages.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "60px 20px" }}>
                            <div style={{ fontSize: "64px", marginBottom: "16px" }}>📬</div>
                            <Forms.FormTitle style={{ color: "#ffffff" }}>
                                Waiting for messages...
                            </Forms.FormTitle>
                            <p style={{ color: "#b9bbbe" }}>
                                {selectedChannels.size > 0
                                    ? `Monitoring ${selectedChannels.size} channel(s)`
                                    : "Monitoring all channels"}
                            </p>
                        </div>
                    ) : (
                        filteredMessages.map(msg => (
                            <div
                                key={msg.id}
                                className="vc-msg-item"
                                onClick={() => navigateToMessage(msg.guildId, msg.channelId, msg.id)}
                                style={{
                                    display: "flex",
                                    padding: "12px 14px",
                                    cursor: "pointer",
                                    borderRadius: "8px",
                                    marginBottom: "6px",
                                    background: "#2f3136",
                                    gap: "12px",
                                    transition: "background 0.15s ease, transform 0.1s ease"
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "#36393f"; e.currentTarget.style.transform = "translateX(2px)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "#2f3136"; e.currentTarget.style.transform = "translateX(0)"; }}
                            >
                                <img
                                    src={getAvatarUrl(msg)}
                                    alt=""
                                    style={{ width: "44px", height: "44px", borderRadius: "50%" }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                                        <span style={{ fontWeight: "600", color: "#ffffff" }}>
                                            {msg.authorName}
                                        </span>
                                        <span style={{ color: "#72767d", fontSize: "12px" }}>in</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            {msg.guildIcon && msg.guildId ? (
                                                <img
                                                    src={getGuildIconUrl(msg.guildId, msg.guildIcon, 16)}
                                                    alt=""
                                                    style={{ width: "16px", height: "16px", borderRadius: "50%" }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: "14px" }}>{msg.isDM ? "💬" : "🏠"}</span>
                                            )}
                                            <span style={{
                                                fontSize: "12px",
                                                background: msg.isDM ? "#5865f2" : "#40444b",
                                                padding: "2px 8px",
                                                borderRadius: "10px",
                                                color: "#ffffff"
                                            }}>
                                                {msg.isDM ? `Direct Messages / @${msg.channelName}` : `${msg.guildName} / #${msg.channelName}`}
                                            </span>
                                        </div>
                                        <span style={{ color: "#72767d", fontSize: "11px", marginLeft: "auto" }}>
                                            {formatTime(msg.timestamp)}
                                        </span>
                                    </div>

                                    {msg.content && (
                                        <div style={{ color: "#dcddde", wordBreak: "break-word", marginBottom: "4px", lineHeight: "1.375" }}>
                                            {parseMessageContent(msg)}
                                            {msg.editHistory.length > 0 && (
                                                <span style={{ color: "#72767d", fontSize: "10px", marginLeft: "4px" }}>(edited)</span>
                                            )}
                                        </div>
                                    )}

                                    {msg.editHistory.length > 0 && (
                                        <div style={{
                                            background: "#2a2d31",
                                            borderLeft: "3px solid #faa61a",
                                            borderRadius: "0 4px 4px 0",
                                            padding: "6px 10px",
                                            marginBottom: "4px",
                                            fontSize: "12px"
                                        }}>
                                            {msg.editHistory.map((oldContent, i) => (
                                                <div key={i} style={{ color: "#b9bbbe", marginBottom: i < msg.editHistory.length - 1 ? "4px" : 0 }}>
                                                    <span style={{ color: "#f23f43", textDecoration: "line-through" }}>{oldContent || "(empty)"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.attachments.length > 0 && (
                                        <div>
                                            {msg.attachments.map(att => renderAttachment(att))}
                                        </div>
                                    )}

                                    {msg.stickerItems.length > 0 && (
                                        <div style={{ marginTop: "4px" }}>
                                            {msg.stickerItems.map(sticker => (
                                                <div key={sticker.id} style={{ display: "inline-block", marginRight: "4px" }}>
                                                    {sticker.format_type === 3 ? (
                                                        <span style={{ color: "#b9bbbe", fontSize: "13px" }}>🩹 {sticker.name}</span>
                                                    ) : (
                                                        <img
                                                            src={`https://media.discordapp.net/stickers/${sticker.id}.${sticker.format_type === 4 ? "gif" : "png"}?size=160`}
                                                            alt={sticker.name}
                                                            title={sticker.name}
                                                            style={{ maxWidth: "160px", maxHeight: "160px", borderRadius: "4px" }}
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.embeds.length > 0 && (
                                        <div>
                                            {msg.embeds.slice(0, 3).map((embed, i) => renderEmbed(embed, i, msg.guildId))}
                                            {msg.embeds.length > 3 && (
                                                <div style={{ color: "#72767d", fontSize: "12px", marginTop: "4px" }}>
                                                    +{msg.embeds.length - 3} more embed(s)
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!msg.content && msg.attachments.length === 0 && msg.embeds.length === 0 && msg.stickerItems.length === 0 && (
                                        <span style={{ color: "#72767d", fontStyle: "italic" }}>
                                            No text content
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ModalContent>

            <ModalFooter>
                <span style={{ color: "#72767d", fontSize: "12px" }}>
                    {messages.length} messages
                    {isPaused && " • Paused"}
                    {" • "}
                    {selectedChannels.size > 0 ? `${selectedChannels.size} channels` : "All channels"}
                    {" • Click to jump"}
                </span>
            </ModalFooter>
                </>
            )}
        </ModalRoot>
    );
}
