/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import {
    ChannelStore,
    Constants,
    Menu,
    MessageActions,
    MessageStore,
    Popout,
    RestAPI,
    Text,
    useEffect,
    useRef,
    useStateFromStores,
    useState,
    UserStore,
} from "@webpack/common";

interface BookmarkEntry {
    messageId: string;
    channelId: string;
    guildId: string | null;
    authorId: string;
    timestamp: number;
    content: string;
}

export const settings = definePluginSettings({
    bookmarksByUser: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, BookmarkEntry[]>,
        description: "Bookmarks stored per user",
    },
});

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '"aria-haspopup":');
const ChannelMessage = findComponentByCodeLazy("childrenExecutedCommand:", ".hideAccessories");

const PopoutClasses = findCssClassesLazy("messagesPopoutWrap", "header", "titleContainer", "messagesPopout");
const MessageClasses = findCssClassesLazy("messageGroupWrapper", "messageGroupCozy", "actionButtons", "buttonContainer");
const ScrollerClasses = findCssClassesLazy("thin", "scrollerBase");
const HeaderIconClasses = findCssClassesLazy("iconWrapper", "clickable", "icon");

const messageCache = new Map<string, Message>();
const pendingFetches = new Set<string>();

async function fetchMessage(channelId: string, messageId: string): Promise<Message | null> {
    const cached = messageCache.get(messageId);
    if (cached) return cached;

    if (pendingFetches.has(messageId)) return null;
    pendingFetches.add(messageId);

    try {
        const res = await RestAPI.get({
            url: Constants.Endpoints.MESSAGES(channelId),
            query: { around: messageId, limit: 1 },
            retries: 2,
        } as any);

        const data: any[] = res?.body ?? [];
        const msg = data.find((m: any) => m.id === messageId);
        if (msg) {
            MessageStore.receiveMessage?.(channelId, msg);
            const stored = MessageStore.getMessage(channelId, messageId) as Message | undefined;
            const result = stored ?? msg as unknown as Message;
            messageCache.set(messageId, result);
            pendingFetches.delete(messageId);
            return result;
        }
    } catch (e) {
        pendingFetches.delete(messageId);
        return null;
    }

    pendingFetches.delete(messageId);
    return null;
}

function getCurrentUserId(): string {
    return UserStore.getCurrentUser()?.id ?? "";
}

function getBookmarks(): BookmarkEntry[] {
    const uid = getCurrentUserId();
    if (!uid) return [];
    return settings.store.bookmarksByUser[uid] ?? [];
}

function isBookmarked(messageId: string): boolean {
    return getBookmarks().some(b => b.messageId === messageId);
}

function getMessageContent(message: any): string {
    if (message?.content) return message.content as string;
    const snap = message?.messageSnapshots?.[0]?.message?.content;
    if (snap) return snap as string;
    const embed = message?.embeds?.[0]?.rawDescription;
    if (embed) return embed as string;
    return "";
}

function addBookmark(message: any): void {
    const uid = getCurrentUserId();
    if (!uid) return;
    if (isBookmarked(message.id)) return;

    const entry: BookmarkEntry = {
        messageId: message.id,
        channelId: message.channel_id,
        guildId: message.guild_id ?? ChannelStore.getChannel(message.channel_id)?.guild_id ?? null,
        authorId: message.author?.id ?? "",
        timestamp: Date.now(),
        content: getMessageContent(message),
    };

    const prev = settings.store.bookmarksByUser;
    settings.store.bookmarksByUser = {
        ...prev,
        [uid]: [entry, ...(prev[uid] ?? [])],
    };
}

function removeBookmark(messageId: string): void {
    const uid = getCurrentUserId();
    if (!uid) return;
    const prev = settings.store.bookmarksByUser;
    settings.store.bookmarksByUser = {
        ...prev,
        [uid]: (prev[uid] ?? []).filter(b => b.messageId !== messageId),
    };
}

// TODO: icons.tsx (or not :)

function BookmarkIcon({ width = 20, height = 20, style, className }: { width?: number; height?: number; style?: React.CSSProperties; className?: string; }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            style={style}
            className={className}
        >
            <path d="M5 2a2 2 0 0 0-2 2v18l9-4 9 4V4a2 2 0 0 0-2-2H5Z" />
        </svg>
    );
}

function RemoveIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            className={"icon_a22cb0"}
        >
            <path d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" />
        </svg>
    );
}

function BookmarkItem({ entry, onRemove }: { entry: BookmarkEntry; onRemove: () => void; }) {
    const [message, setMessage] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);

    const storeMessage = useStateFromStores(
        [MessageStore],
        () => MessageStore.getMessage(entry.channelId, entry.messageId) as Message | undefined,
    );

    useEffect(() => {
        const cached = messageCache.get(entry.messageId);
        if (cached) {
            setMessage(cached);
            setLoading(false);
            return;
        }
        if (storeMessage) {
            messageCache.set(entry.messageId, storeMessage);
            setMessage(storeMessage);
            setLoading(false);
            return;
        }
        setLoading(true);
        fetchMessage(entry.channelId, entry.messageId).then(m => {
            setMessage(m);
            setLoading(false);
        });
    }, [entry.messageId, entry.channelId, storeMessage]);

    const channel = ChannelStore.getChannel(entry.channelId);

    const jumpToMessage = () => MessageActions.jumpToMessage({
        channelId: entry.channelId,
        messageId: entry.messageId,
        flash: true,
        jumpType: "INSTANT",
    } as any);

    return (
        <div className={MessageClasses.messageGroupWrapper}>
            <div className={MessageClasses.messageGroupCozy}>
                {message && channel
                    ? <ChannelMessage
                        id={`vc-bookmark-${entry.messageId}`}
                        message={message}
                        channel={channel}
                        subscribeToComponentDispatch={false}
                        hideAccessories={false}
                    />
                    : <Text variant="text-sm/normal" style={{ padding: "8px 16px" }}>
                        {loading ? (entry.content || "Loading...") : (entry.content || "Message unavailable")}
                    </Text>
                }
            </div>
            <div className={MessageClasses.actionButtons}>
                <div className={MessageClasses.buttonContainer}>
                    <Button variant="secondary" size="small" onClick={jumpToMessage}>Jump</Button>
                </div>
                <div className={MessageClasses.buttonContainer}>
                    <Button variant="secondary" size="small" onClick={onRemove} aria-label="Remove Bookmark">
                        <RemoveIcon />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function BookmarksPopout({ channelId }: { channelId: string; }) {
    const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => getBookmarks().filter(b => b.channelId === channelId));

    useEffect(() => {
        setBookmarks(getBookmarks().filter(b => b.channelId === channelId));
    }, [channelId]);

    const handleRemove = (messageId: string) => {
        removeBookmark(messageId);
        setBookmarks(prev => prev.filter(b => b.messageId !== messageId));
    };

    return (
        <div aria-label="Bookmarked Messages" role="dialog" tabIndex={-1} aria-modal="true">
            <div className={PopoutClasses.messagesPopoutWrap} style={{ maxHeight: "calc(100vh - 150px)" }}>
                <div className={PopoutClasses.header}>
                    <div className={PopoutClasses.titleContainer}>
                        <BookmarkIcon width={24} height={24} style={{ color: "var(--interactive-text-default)" }} />
                        <Text variant="text-lg/semibold" style={{ color: "var(--interactive-text-active)", marginLeft: 8 }}>
                            Bookmarked Messages
                        </Text>
                    </div>
                </div>
                <div
                    className={`${PopoutClasses.messagesPopout} ${ScrollerClasses.thin} ${ScrollerClasses.scrollerBase}`}
                    dir="ltr"
                    style={{ overflowY: "scroll", paddingRight: 10 }}
                >
                    <div role="list" tabIndex={0} aria-orientation="vertical">
                        {bookmarks.length === 0
                            ? <Text variant="text-sm/normal" style={{ padding: "16px", color: "var(--text-muted)" }}>
                                No bookmarks in this channel.
                            </Text>
                            : bookmarks.map(entry => (
                                <BookmarkItem
                                    key={entry.messageId}
                                    entry={entry}
                                    onRemove={() => handleRemove(entry.messageId)}
                                />
                            ))
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}

export function BookmarkButton({ channelId, className }: { channelId: string; className?: string; }) {
    const buttonRef = useRef<HTMLElement>(null);
    const [show, setShow] = useState(false);

    return (
        <Popout
            position="bottom"
            align="right"
            animation={(Popout as any).Animation?.NONE ?? 0}
            shouldShow={show}
            onRequestClose={() => setShow(false)}
            targetElementRef={buttonRef}
            renderPopout={() => <BookmarksPopout channelId={channelId} />}
        >
            {(_: any, { isShown }: { isShown: boolean; }) => (
                <HeaderBarIcon
                    ref={buttonRef}
                    className={`${className ?? ""} ${HeaderIconClasses.iconWrapper} ${HeaderIconClasses.clickable}`}
                    onClick={() => setShow(v => !v)}
                    tooltip={isShown ? null : "Bookmarks"}
                    icon={() => <BookmarkIcon className={HeaderIconClasses.icon} />}
                    selected={isShown}
                />
            )}
        </Popout>
    );
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    const { message } = props as { message: Message; };
    if (!message) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    const copyTextIndex = group.findIndex((c: any) => c?.props?.id === "copy-text");
    if (copyTextIndex === -1) return;

    const bookmarked = isBookmarked(message.id);
    group.splice(copyTextIndex + 1, 0,
        <Menu.MenuItem
            id="vc-bookmark-message"
            key="vc-bookmark-message"
            label={bookmarked ? "Remove Bookmark" : "Add Bookmark"}
            action={() => bookmarked ? removeBookmark(message.id) : addBookmark(message)}
        />
    );
};

// -----------------------------cartel del ork------------------------------------

export default definePlugin({
    name: "MessageBookmarks",
    description: "Bookmark messages and view them via a button in the chat header.",
    authors: [Devs.DeviMorris],
    settings,

    contextMenus: {
        "message": messageContextMenuPatch,
    },

    patches: [
        {
            find: "Missing channel in Channel.renderHeaderToolbar",
            replacement: [
                {
                    match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_TEXT:(?=.+?(\i\.push.{0,50}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                    replace: (m: string, pushNotif: string, channel: string, isLurking: string) =>
                        `${m}if(!${isLurking}&&${channel}){const _cls=${pushNotif.split(".push")[0]}[0]?.props?.className;${pushNotif.split(".push")[0]}.push($self.renderBookmarkButton(${channel}.id,_cls));}`
                },
                {
                    match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_MEDIA:(?=.+?(\i\.push.{0,40}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                    replace: (m: string, pushNotif: string, channel: string, isLurking: string) =>
                        `${m}if(!${isLurking}&&${channel}){const _cls=${pushNotif.split(".push")[0]}[0]?.props?.className;${pushNotif.split(".push")[0]}.push($self.renderBookmarkButton(${channel}.id,_cls));}`
                },
                {
                    match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.DM:(?=.+?(\i\.push.{0,50}channel:(\i)},"notifications"\)\)))/,
                    replace: (m: string, pushNotif: string, channel: string) =>
                        `${m}if(${channel}){const _cls=${pushNotif.split(".push")[0]}[0]?.props?.className;${pushNotif.split(".push")[0]}.push($self.renderBookmarkButton(${channel}.id,_cls));}`
                },
                {
                    match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GROUP_DM:(?=.+?(\i\.push.{0,50}channel:(\i)},"notifications"\)\)))/,
                    replace: (m: string, pushNotif: string, channel: string) =>
                        `${m}if(${channel}){const _cls=${pushNotif.split(".push")[0]}[0]?.props?.className;${pushNotif.split(".push")[0]}.push($self.renderBookmarkButton(${channel}.id,_cls));}`
                },
            ]
        },
    ],

    renderBookmarkButton(channelId: string, className?: string) {
        return (
            <ErrorBoundary noop key="vc-bookmark-button">
                <BookmarkButton channelId={channelId} className={className} />
            </ErrorBoundary>
        );
    },
});