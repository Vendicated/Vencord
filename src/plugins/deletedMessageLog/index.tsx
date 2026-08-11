/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import * as DataStore from "@api/DataStore";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { getGuildAcronym, openUserProfile } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { RenderModalProps } from "@vencord/discord-types";
import {
    Button,
    ChannelStore,
    Checkbox,
    FluxDispatcher,
    Forms,
    GuildStore,
    IconUtils,
    Modal,
    openModal,
    Parser,
    RelationshipStore,
    showToast,
    TextInput,
    Toasts,
    Tooltip,
    useEffect,
    UserStore,
    useState,
} from "@webpack/common";

const logger = new Logger("DeletedMessageLog");

const KEY_PREFIX = "DeletedMessageLog_msg_";
const cl = classNameFactory("vc-dml-");
const MAX_CACHE_SIZE = 3000;

interface LogEntry {
    id: string;
    channelId: string;
    guildId?: string;
    authorId: string;
    authorTag: string;
    content: string;
    attachments: string[];
    sentAt: number;
    deletedAt: number;
}

interface CachedMessage {
    authorId: string;
    authorTag: string;
    content: string;
    attachments: string[];
    sentAt: number;
    bot: boolean;
}

const settings = definePluginSettings({
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Don't log deleted messages sent by bots",
        default: false,
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Don't log deleted messages sent by yourself",
        default: false,
    },
    showFriendDMs: {
        type: OptionType.BOOLEAN,
        description: "Internal: whether to log/show DM deletions from friends. Manage this from the \"Friends\" checkbox inside the log window instead of editing it here.",
        default: true,
    },
    showUnknownDMs: {
        type: OptionType.BOOLEAN,
        description: "Internal: whether to log/show DM deletions from people who aren't friends. Manage this from the \"Unknown\" checkbox inside the log window instead of editing it here.",
        default: true,
    },
    allowedGuilds: {
        type: OptionType.STRING,
        description: "Internal: comma-separated server IDs to restrict logging to. Leave empty to log all servers. Manage this from the \"Filter Servers\" button inside the log window instead of editing it here.",
        default: "",
        multiline: true,
    },
});

// Sentinel stored in settings.store.allowedGuilds when the user has explicitly deselected every
// server. An empty string alone can't represent this, since it's also the "no filter" default.
const NONE_GUILDS_SENTINEL = "__NONE__";

/** Returns the set of allowed guild IDs, or null if there's no restriction (log/show everything). */
function getAllowedGuildIds(): string[] | null {
    const raw = settings.store.allowedGuilds;
    if (!raw) return null;
    if (raw === NONE_GUILDS_SENTINEL) return [];
    return raw.split(",").map(id => id.trim()).filter(Boolean);
}

const cache = new Map<string, CachedMessage>();

function cacheKey(channelId: string, id: string) {
    return `${channelId}:${id}`;
}

function toMillis(t: any): number {
    if (!t) return Date.now();
    if (typeof t === "number") return t;
    if (typeof t?.valueOf === "function") {
        const v = t.valueOf();
        if (typeof v === "number" && !isNaN(v)) return v;
    }
    const d = new Date(t).getTime();
    return isNaN(d) ? Date.now() : d;
}

function shouldIgnore(cached: CachedMessage, channelId: string) {
    const myId = UserStore.getCurrentUser()?.id;
    const guildId = ChannelStore.getChannel(channelId)?.guild_id;

    if (settings.store.ignoreBots && cached.bot) return true;
    if (settings.store.ignoreSelf && cached.authorId === myId) return true;

    if (!guildId) {
        const isFriend = RelationshipStore.isFriend(cached.authorId);
        if (isFriend && !settings.store.showFriendDMs) return true;
        if (!isFriend && !settings.store.showUnknownDMs) return true;
    }

    if (guildId) {
        const allowedGuilds = getAllowedGuildIds();
        if (allowedGuilds !== null && !allowedGuilds.includes(guildId)) return true;
    }

    return false;
}

function cacheMessage(message: any) {
    if (!message?.id || !message?.channel_id) return;

    const key = cacheKey(message.channel_id, message.id);
    cache.set(key, {
        authorId: message.author?.id,
        authorTag: message.author?.globalName ?? message.author?.global_name ?? message.author?.username ?? "Unknown",
        content: message.content ?? "",
        attachments: (message.attachments ?? []).map((a: any) => a.url ?? a.filename).filter(Boolean),
        sentAt: toMillis(message.timestamp),
        bot: !!message.author?.bot,
    });

    if (cache.size > MAX_CACHE_SIZE) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey !== undefined) cache.delete(oldestKey);
    }
}

async function persistEntry(channelId: string, id: string, cached: CachedMessage) {
    const channel = ChannelStore.getChannel(channelId);
    const entry: LogEntry = {
        id: crypto.randomUUID(),
        channelId,
        guildId: channel?.guild_id,
        authorId: cached.authorId,
        authorTag: cached.authorTag,
        content: cached.content,
        attachments: cached.attachments,
        sentAt: cached.sentAt,
        deletedAt: Date.now(),
    };

    await DataStore.set(KEY_PREFIX + entry.id, entry);
}

function handleCreate({ message }: any) {
    cacheMessage(message);
}

function handleUpdate({ message }: any) {
    cacheMessage(message);
}

function handleLoadMessages({ messages }: any) {
    messages?.forEach(cacheMessage);
}

async function handleDelete({ channelId, id }: any) {
    const key = cacheKey(channelId, id);
    const cached = cache.get(key);
    cache.delete(key);
    if (!cached || shouldIgnore(cached, channelId)) return;

    await persistEntry(channelId, id, cached);
}

async function handleDeleteBulk({ channelId, ids }: any) {
    for (const id of ids ?? []) {
        await handleDelete({ channelId, id });
    }
}

async function getAllEntries(): Promise<LogEntry[]> {
    const all = await DataStore.entries<string, LogEntry>();
    return all
        .filter(([key]) => (key as string).startsWith(KEY_PREFIX))
        .map(([, value]) => value)
        .sort((a, b) => b.deletedAt - a.deletedAt);
}

async function removeEntry(id: string) {
    await DataStore.del(KEY_PREFIX + id);
}

async function clearAll() {
    const all = await DataStore.entries<string, LogEntry>();
    const keys = all.map(([key]) => key).filter((key): key is string => (key as string).startsWith(KEY_PREFIX));
    await DataStore.delMany(keys);
}

function formatTime(ms: number) {
    return new Date(ms).toLocaleString([], {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

function parseContent(content: string, channelId: string) {
    try {
        return Parser.parse(content, true, {
            channelId,
            allowLinks: true,
            allowHeading: true,
            allowList: true,
            allowEmojiLinks: true,
        });
    } catch {
        return content;
    }
}

function getAvatarUrl(authorId: string) {
    const user = UserStore.getUser(authorId);
    return user
        ? IconUtils.getUserAvatarURL(user, true, 32)
        : IconUtils.getDefaultAvatarURL(authorId);
}

function formatLocation(entry: LogEntry) {
    const channel = ChannelStore.getChannel(entry.channelId);
    if (entry.guildId) {
        const guildName = GuildStore.getGuild(entry.guildId)?.name ?? "Unknown Server";
        return `${guildName} • #${channel?.name ?? "unknown"}`;
    }
    return channel?.name || "Direct Message";
}

function LogIcon() {
    return (
        <svg viewBox="0 0 24 24" width={24} height={24}>
            <path
                fill="currentColor"
                d="M6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Zm3-4h6a1 1 0 0 1 1 1v1h5v2H3V5h5V4a1 1 0 0 1 1-1Zm0 8v8h2v-8H9Zm4 0v8h2v-8h-2Z"
            />
        </svg>
    );
}

function ServerListButton() {
    return (
        <Tooltip text="Deleted Messages Log" position="right">
            {tooltipProps => (
                <div
                    {...tooltipProps}
                    className="vc-dml-serverlist-btn"
                    role="button"
                    onClick={() => openModal(props => <ErrorBoundary><LogModal {...props} /></ErrorBoundary>)}
                >
                    <LogIcon />
                </div>
            )}
        </Tooltip>
    );
}

function ServerFilterModal(props: RenderModalProps) {
    const guilds = GuildStore.getGuildsArray()
        .filter(g => g?.id && g.name)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
    const storedAllowedIds = getAllowedGuildIds();

    const [allowed, setAllowed] = useState<Set<string>>(
        new Set(storedAllowedIds === null ? guilds.map(g => g.id) : storedAllowedIds)
    );
    const [search, setSearch] = useState("");

    const filtered = search.trim()
        ? guilds.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
        : guilds;

    // Persists immediately on every change instead of requiring a separate Save step
    const persist = (next: Set<string>) => {
        setAllowed(next);
        try {
            let value: string;
            if (next.size === guilds.length) value = "";
            else if (next.size === 0) value = NONE_GUILDS_SENTINEL;
            else value = Array.from(next).join(",");
            settings.store.allowedGuilds = value;
        } catch (e) {
            logger.error("Failed to update server filter", e);
            showToast("Failed to update server filter, check the console (Ctrl+Shift+I)", Toasts.Type.FAILURE);
        }
    };

    const toggle = (id: string) => {
        const next = new Set(allowed);
        if (next.has(id)) next.delete(id); else next.add(id);
        persist(next);
    };

    const selectAll = () => persist(new Set(guilds.map(g => g.id)));
    const deselectAll = () => persist(new Set());

    return (
        <Modal
            {...props}
            title="Filter Servers"
            actions={[
                { text: "Done", variant: "primary", onClick: () => props.onClose() },
                { text: "Log All Servers", variant: "secondary", onClick: selectAll },
            ]}
        >
            <Forms.FormText className={cl("filter-hint")}>
                Uncheck any server you don't want to see — changes apply instantly, no need to save. This hides that
                server's entries from the log right away and stops logging new deletions from it. DMs are not
                affected by this list.
            </Forms.FormText>

            <TextInput
                className={cl("search")}
                placeholder="Search servers..."
                value={search}
                onChange={setSearch}
            />

            <div className={cl("guild-list-actions")}>
                <span className={cl("guild-list-link")} role="button" onClick={selectAll}>Select All</span>
                <span className={cl("guild-list-link")} role="button" onClick={deselectAll}>Deselect All</span>
                <span className={cl("guild-list-count")}>{allowed.size} / {guilds.length} selected</span>
            </div>

            <div className={cl("guild-list")}>
                {filtered.length === 0 ? (
                    <div className={cl("empty")}>No servers match your search.</div>
                ) : filtered.map(guild => (
                    <div key={guild.id} className={cl("guild-item")}>
                        <Checkbox
                            value={allowed.has(guild.id)}
                            onChange={() => toggle(guild.id)}
                            shape={Checkbox.Shapes?.BOX}
                            type={Checkbox.Types?.ROW}
                        >
                            <div className={cl("guild-item-label")}>
                                {guild.icon ? (
                                    <img
                                        className={cl("guild-icon")}
                                        src={IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, size: 32 })}
                                        alt=""
                                    />
                                ) : (
                                    <span className={cl("guild-icon", "guild-icon-fallback")}>{getGuildAcronym(guild)}</span>
                                )}
                                {guild.name}
                            </div>
                        </Checkbox>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

function LogModal(props: RenderModalProps) {
    const { allowedGuilds, showFriendDMs, showUnknownDMs } = settings.use(["allowedGuilds", "showFriendDMs", "showUnknownDMs"]);
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const refresh = () => {
        setLoading(true);
        getAllEntries().then(e => {
            setEntries(e);
            setLoading(false);
        });
    };

    useEffect(refresh, []);

    const remove = async (id: string) => {
        await removeEntry(id);
        refresh();
    };

    const clear = async () => {
        await clearAll();
        refresh();
    };

    // Referencing allowedGuilds subscribes this component to changes so getAllowedGuildIds() re-evaluates
    void allowedGuilds;
    const allowedGuildIds = getAllowedGuildIds();
    const visibleEntries = entries.filter(e => {
        if (e.guildId) return allowedGuildIds === null || allowedGuildIds.includes(e.guildId);
        return RelationshipStore.isFriend(e.authorId) ? showFriendDMs : showUnknownDMs;
    });

    const filtered = search.trim()
        ? visibleEntries.filter(e =>
            e.content.toLowerCase().includes(search.toLowerCase()) ||
            e.authorTag.toLowerCase().includes(search.toLowerCase())
        )
        : visibleEntries;

    return (
        <Modal
            {...props}
            title={`Deleted Messages${visibleEntries.length ? ` (${visibleEntries.length})` : ""}`}
            actions={[
                {
                    text: "Clear All",
                    variant: "critical-primary",
                    onClick: clear,
                },
                {
                    text: "Filter Servers",
                    variant: "secondary",
                    onClick: () => openModal(p => <ErrorBoundary><ServerFilterModal {...p} /></ErrorBoundary>),
                },
            ]}
        >
            <TextInput
                className={cl("search")}
                placeholder="Search by content or author..."
                value={search}
                onChange={setSearch}
            />

            <div className={cl("toggle-row")}>
                <Checkbox
                    value={!!showFriendDMs}
                    onChange={() => { settings.store.showFriendDMs = !showFriendDMs; }}
                    shape={Checkbox.Shapes?.SMALL_BOX}
                    type={Checkbox.Types?.ROW}
                >
                    Friends
                </Checkbox>
                <Checkbox
                    value={!!showUnknownDMs}
                    onChange={() => { settings.store.showUnknownDMs = !showUnknownDMs; }}
                    shape={Checkbox.Shapes?.SMALL_BOX}
                    type={Checkbox.Types?.ROW}
                >
                    Unknown
                </Checkbox>
            </div>

            {loading ? (
                <Forms.FormText>Loading...</Forms.FormText>
            ) : filtered.length === 0 ? (
                <div className={cl("empty")}>No deleted messages logged yet.</div>
            ) : (
                <div className={cl("list")}>
                    {filtered.map(entry => (
                        <div key={entry.id} className={cl("item")}>
                            <div className={cl("item-header")}>
                                <div
                                    className={cl("item-author-group")}
                                    role="button"
                                    onClick={() => openUserProfile(entry.authorId)}
                                >
                                    <img className={cl("item-avatar")} src={getAvatarUrl(entry.authorId)} alt="" />
                                    <span className={cl("item-author")}>
                                        {entry.authorTag}
                                        {!entry.guildId && (
                                            <span
                                                className={cl(
                                                    "item-relation-badge",
                                                    RelationshipStore.isFriend(entry.authorId) ? "relation-friend" : "relation-unknown"
                                                )}
                                            >
                                                {RelationshipStore.isFriend(entry.authorId) ? "Friend" : "Unknown"}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <span className={cl("item-meta")}>{formatTime(entry.deletedAt)}</span>
                            </div>
                            <div className={cl("item-location")}>{formatLocation(entry)}</div>
                            {entry.content && <div className={cl("item-content")}>{parseContent(entry.content, entry.channelId)}</div>}
                            {entry.attachments.map((url, i) => (
                                <a key={i} className={cl("item-attachment")} href={url} target="_blank" rel="noreferrer">
                                    {url}
                                </a>
                            ))}
                            <div className={cl("item-footer")}>
                                <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={() => remove(entry.id)}>
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}

export default definePlugin({
    name: "DeletedMessageLog",
    description: "Permanently logs deleted messages sent while Discord is open, so they're kept even after they're gone",
    tags: ["Chat", "Utility"],
    authors: [Devs.why],
    dependencies: ["ServerListAPI"],
    settings,

    toolboxActions: {
        "Open Deleted Messages Log"() {
            openModal(props => <ErrorBoundary><LogModal {...props} /></ErrorBoundary>);
        },
    },

    renderServerListButton: ErrorBoundary.wrap(ServerListButton, { noop: true }),

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderServerListButton);
        FluxDispatcher.subscribe("MESSAGE_CREATE", handleCreate);
        FluxDispatcher.subscribe("MESSAGE_UPDATE", handleUpdate);
        FluxDispatcher.subscribe("LOAD_MESSAGES_SUCCESS", handleLoadMessages);
        FluxDispatcher.subscribe("MESSAGE_DELETE", handleDelete);
        FluxDispatcher.subscribe("MESSAGE_DELETE_BULK", handleDeleteBulk);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderServerListButton);
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", handleCreate);
        FluxDispatcher.unsubscribe("MESSAGE_UPDATE", handleUpdate);
        FluxDispatcher.unsubscribe("LOAD_MESSAGES_SUCCESS", handleLoadMessages);
        FluxDispatcher.unsubscribe("MESSAGE_DELETE", handleDelete);
        FluxDispatcher.unsubscribe("MESSAGE_DELETE_BULK", handleDeleteBulk);
        cache.clear();
    },

    settingsAboutComponent() {
        return (
            <>
                <Forms.FormText>
                    Permanently logs any message that gets deleted while you have Discord open, so you can still
                    read it afterwards. This plugin adds its own icon right above the Home button, at the very top of
                    your server list — click it to open the log. No other plugin needs to be enabled for this to work,
                    and it won't conflict with other plugins like VencordToolbox.
                </Forms.FormText>
                <Forms.FormText>
                    Important limitation: a message can only be logged if Discord was open and running at the exact
                    moment it got deleted. If Discord is fully closed when someone deletes a message, this plugin has
                    no way to catch it.
                </Forms.FormText>
                <Forms.FormText>
                    In DMs, senders get a green "Friend" tag next to their name if you two are friends on Discord, or a
                    red "Unknown" tag if they're not. Click a name to open that person's profile. Two checkboxes above
                    the list, "Friends" and "Unknown", let you independently show/hide each group — unchecking one
                    instantly hides its entries and stops logging new ones from that group.
                </Forms.FormText>
                <Forms.FormText>
                    Use the "Filter Servers" button inside the log window to pick exactly which of your servers show
                    up — unchecking a server hides its entries immediately and stops new deletions from it being
                    logged. Entries aren't deleted, just hidden — recheck the server to see them again.
                </Forms.FormText>
                <Forms.FormText>
                    Entries are saved forever until you manually remove them (per-entry "Remove" button, or "Clear All"
                    inside the log window).
                </Forms.FormText>
            </>
        );
    },
});
