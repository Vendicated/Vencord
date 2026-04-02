/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Constants, FluxDispatcher, GuildStore, React, RelationshipStore, UserStore } from "@webpack/common";

const TYPING_REL = 69;

const TYPING_GUILDS = new Map<string, Set<string>>();
const TYPING_USERS = new Map<string, string>();
const TYPING_LOCATIONS = new Map<string, string | null>();
const ORIGINAL_TYPES = new Map<string, number>();
const TIMERS = new Map<string, number>();
const GUILD_ICON_LISTENERS = new Set<() => void>();

const PLUS_ICON = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
        <rect x="0" y="0" width="16" height="16" rx="8" fill="#e3e5e8"/>
        <path d="M8 4v8M4 8h8"
            stroke="#2b2d31"
            stroke-width="2"
            stroke-linecap="round"
        />
    </svg>`
);

interface TypingEvent {
    userId: string;
    channelId: string;
}

interface PluginNode {
    type: string;
    id: string;
}

function TypingBadge({ src, offsetY, z }: { src: string; offsetY: number; z: number; }) {
    return (
        <img
            src={src}
            style={{
                position: "absolute",
                right: settings.store.iconHorizontalOffset,
                top: "50%",
                transform: `translateY(calc(-50% + ${offsetY}px))`,
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2px solid var(--background-secondary)",
                pointerEvents: "none",
                zIndex: z
            }}
        />
    );
}

function getTypingBadgeOffsets(count: number): number[] {
    switch (count) {
        case 1: return [0];
        case 2: return [-8, 8];
        default: return [-16, 0, 16];
    }
}

function notifyGuildIconListeners() {
    for (const listener of GUILD_ICON_LISTENERS) listener();
}

const GuildTypingIcons = ErrorBoundary.wrap(function GuildTypingIcons({ guildId }: { guildId: string; }) {
    const forceUpdate = useForceUpdater();

    React.useEffect(() => {
        GUILD_ICON_LISTENERS.add(forceUpdate);
        return () => void GUILD_ICON_LISTENERS.delete(forceUpdate);
    }, [forceUpdate]);

    if (!settings.store.showGuildIcons) return null;

    const users = [...(TYPING_GUILDS.get(guildId) ?? [])]
        .map(id => UserStore.getUser(id))
        .filter(Boolean);

    if (!users.length) return null;

    const showOverflow = users.length > 3;
    const visible = showOverflow ? users.slice(0, 2) : users.slice(0, 3);
    const offsets = getTypingBadgeOffsets(showOverflow ? 3 : visible.length);

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                overflow: "visible",
                pointerEvents: "none"
            }}
        >
            {visible[0] && <TypingBadge src={visible[0].getAvatarURL(null, 32, true)} offsetY={offsets[0]} z={22} />}
            {visible[1] && <TypingBadge src={visible[1].getAvatarURL(null, 32, true)} offsetY={offsets[1]} z={21} />}
            {showOverflow
                ? <TypingBadge src={PLUS_ICON} offsetY={offsets[2]} z={20} />
                : visible[2] && <TypingBadge src={visible[2].getAvatarURL(null, 32, true)} offsetY={offsets[2]} z={20} />}
        </div>
    );
}, { noop: true });

function cleanupTyping(gid: string | null, userId: string): void {
    const relationships = RelationshipStore.getMutableRelationships();
    const original = ORIGINAL_TYPES.get(userId);
    const previousGuildId = gid ?? TYPING_LOCATIONS.get(userId) ?? null;

    if (original != null) {
        relationships.set(userId, original);
        ORIGINAL_TYPES.delete(userId);
        RelationshipStore.emitChange();
    }

    TYPING_USERS.delete(String(userId));
    TYPING_LOCATIONS.delete(String(userId));
    TIMERS.delete(userId);

    if (!previousGuildId) return;

    const set = TYPING_GUILDS.get(previousGuildId);
    set?.delete(String(userId));
    if (set?.size === 0) TYPING_GUILDS.delete(previousGuildId);
    notifyGuildIconListeners();
}

function onTypingStart(e: TypingEvent) {
    if (!RelationshipStore.isFriend(e.userId)) return;

    const relationships = RelationshipStore.getMutableRelationships();

    if (!ORIGINAL_TYPES.has(e.userId)) {
        ORIGINAL_TYPES.set(e.userId, RelationshipStore.getRelationshipType(e.userId));
    }

    const channel = ChannelStore.getChannel(e.channelId);
    if (!channel) return;

    const previousGuildId = TYPING_LOCATIONS.get(e.userId) ?? null;
    if (previousGuildId && previousGuildId !== channel.guild_id) {
        const previousSet = TYPING_GUILDS.get(previousGuildId);
        previousSet?.delete(String(e.userId));
        if (previousSet?.size === 0) TYPING_GUILDS.delete(previousGuildId);
    }

    if (!channel.guild_id) {
        TYPING_USERS.set(String(e.userId), "DMs");
        TYPING_LOCATIONS.set(String(e.userId), null);

        relationships.set(e.userId, TYPING_REL as any);
        RelationshipStore.emitChange();

        clearTimeout(TIMERS.get(e.userId));
        TIMERS.set(
            e.userId,
            window.setTimeout(() => cleanupTyping(null, e.userId), settings.store.typingTimeout)
        );
        notifyGuildIconListeners();

        return;
    }

    const gid = channel.guild_id;
    const guild = GuildStore.getGuild(gid);
    if (guild) TYPING_USERS.set(String(e.userId), guild.name);
    TYPING_LOCATIONS.set(String(e.userId), gid);

    if (!TYPING_GUILDS.has(gid)) TYPING_GUILDS.set(gid, new Set());
    TYPING_GUILDS.get(gid)!.add(String(e.userId));
    relationships.set(e.userId, TYPING_REL as any);
    RelationshipStore.emitChange();

    clearTimeout(TIMERS.get(e.userId));

    TIMERS.set(
        e.userId,
        window.setTimeout(() => cleanupTyping(gid, e.userId), settings.store.typingTimeout)
    );
    notifyGuildIconListeners();
}

function onTypingStop(e: TypingEvent) {
    const timer = TIMERS.get(e.userId);
    if (!timer) return;

    clearTimeout(timer);
    TIMERS.delete(e.userId);

    const channel = ChannelStore.getChannel(e.channelId);
    cleanupTyping(channel?.guild_id ?? null, e.userId);
}

function syncShowFriendsSection() {
    (window as any).__friendsTypingShowSection = settings.store.showFriendsSection;
}

const settings = definePluginSettings({
    main: {
        type: OptionType.COMPONENT,
        component: () => { syncShowFriendsSection(); return null; }
    },
    showFriendsSection: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show a Typing section in the Friends list",
    },
    showGuildIcons: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show typing indicators on server icons",
    },
    typingTimeout: {
        type: OptionType.NUMBER,
        default: 9000,
        description: "Time (ms) before typing indicator clears",
    },
    iconHorizontalOffset: {
        type: OptionType.NUMBER,
        default: 0,
        description: "Horizontal offset (px) for typing indicators next to server icons",
    },
});

export default definePlugin({
    name: "TypingFriends",
    description: "See which of your friends are typing anywhere",
    authors: [Devs.Xylen],
    settings: settings,

    patches: [
        {
            find: "online:t.toString()",
            predicate: () => settings.store.showFriendsSection,
            replacement: {
                match: /case\s+([A-Za-z0-9_$]+\.[A-Za-z0-9_$]+)\.ONLINE:\s*return\b/,
                replace: 'case $1.TYPING:return "Typing — " + arguments[1];case $1.ONLINE:return '
            }
        },
        {
            find: "SECTION_ONLINE:",
            predicate: () => settings.store.showFriendsSection,
            replacement: {
                match: /(SECTION_ONLINE:\s*\{[\s\S]*?renderContent:\s*\(\)\s*=>\s*\(0,\s*)(\i)\.(jsx)\)\((\i\.\i),\s*\{note:[\s\S]*?\}\s*\)\s*\}\s*,/,
                replace: "$1$2.$3)($4,{note:$self.getTypingEmptyStateText()})},SECTION_TYPING:{lightSrc:n(939333),darkSrc:n(492055),width:421,height:218,renderContent:()=> $self.renderTypingEmptyState($2,$4)},"
            }
        },
        {
            find: "FriendsEmptyState: Invalid empty state",
            predicate: () => settings.store.showFriendsSection,
            replacement: {
                match: /return\s+([A-Za-z0-9_$.]+)\.SECTION_ALL;\s*case\s+([A-Za-z0-9_$.]+)\./,
                replace: "return $1.SECTION_ALL;case $2.TYPING:return $1.SECTION_TYPING;case $2."
            }
        },
        {
            find: "#{intl::FRIENDS_SECTION_ONLINE}),className:",
            predicate: () => settings.store.showFriendsSection,
            replacement: {
                match: /,{id:(\i\.\i)\.PENDING,show:.+?className:(\i\.\i)(?=\},\{id:)/,
                replace: ',{id:$1.TYPING,show:window.__friendsTypingShowSection,className:$2,content:"Typing"}$&'
            }
        },
        {
            find: '"FriendsStore"',
            predicate: () => settings.store.showFriendsSection,
            replacement: {
                match: /(?<=case (\i\.\i)\.SUGGESTIONS:return \d+===(\i)\.type)/,
                replace: ";case $1.TYPING:return (window.__friendsTypingShowSection && $2.type===69)"
            }
        },
        {
            find: "this.handleOpenPrivateChannel",
            predicate: () => settings.store.showFriendsSection,
            replacement: {
                match: /subText:\s*\(0,\s*([A-Za-z0-9_$]+)\.jsx\)\(\s*([A-Za-z0-9_$]+\.[A-Za-z0-9_$]+)\s*,\s*\{([\s\S]*?)\}\s*\)/,
                replace: 'subText:(window.__typingUsers?.has(e.id)?(0,$1.jsx)("div",{children:"Typing in "+window.__typingUsers.get(e.id)}):(0,$1.jsx)($2,{$3}))'
            }
        },
        {
            find: '("guildsnav")',
            predicate: () => settings.store.showGuildIcons,
            replacement: {
                match: /children:\s*(?:Vencord\.Api\.ServerList\.renderAll\(Vencord\.Api\.ServerList\.ServerListRenderPosition\.In\)\.concat\()?(\i)\.map\(\s*\((\i),\s*(\i)\)\s*=>\s*(\i)\(\2,\3,\1\.length\)\)(?:\))?/,
                replace: "children:Vencord.Api.ServerList.renderAll(Vencord.Api.ServerList.ServerListRenderPosition.In).concat($1.map(($2,$3)=>$self.wrapTreeNode($4($2,$3,$1.length),$2)))"
            }
        },
    ],

    wrapTreeNode(rendered: React.ReactNode, node: PluginNode) {
        if (node?.type !== "guild") return rendered;

        return (
            <div style={{ position: "relative", overflow: "visible" }}>
                {rendered}
                <GuildTypingIcons guildId={node.id} />
            </div>
        );
    },

    getTypingEmptyStateText() {
        return "No one is typing right now.";
    },

    renderTypingEmptyState(jsxRuntime: any, emptyStateComponent: any) {
        return (0, jsxRuntime.jsx)(emptyStateComponent, {
            note: this.getTypingEmptyStateText()
        });
    },

    start() {
        syncShowFriendsSection();

        (window as any).__typingUsers = TYPING_USERS;
        Constants.FriendsSections.TYPING = "TYPING";

        FluxDispatcher.subscribe("TYPING_START", onTypingStart);
        FluxDispatcher.subscribe("TYPING_STOP", onTypingStop);
    },

    stop() {
        delete (window as any).__typingUsers;
        delete (window as any).__friendsTypingShowSection;

        FluxDispatcher.unsubscribe("TYPING_START", onTypingStart);
        FluxDispatcher.unsubscribe("TYPING_STOP", onTypingStop);

        const relationships = RelationshipStore.getMutableRelationships();
        for (const [id, original] of ORIGINAL_TYPES) relationships.set(id, original);
        for (const timer of TIMERS.values()) clearTimeout(timer);

        TYPING_GUILDS.clear();
        TYPING_USERS.clear();
        TYPING_LOCATIONS.clear();
        notifyGuildIconListeners();

        ORIGINAL_TYPES.clear();
        TIMERS.clear();

        RelationshipStore.emitChange();
    }
});
