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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, Constants, FluxDispatcher, GuildStore, RelationshipStore, UserStore, } from "@webpack/common";

const TYPING_REL = 69;

const TYPING_GUILDS = new Map<string, Set<string>>();
const TYPING_USERS = new Map<string, string>();
const ORIGINAL_TYPES = new Map<string, number>();
const TIMERS = new Map<string, number>();

let overlayRoot: HTMLDivElement;

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

function removeTypingOverlay(guildId: string) {
    const root = getOverlayRoot();
    const el = root.querySelector(
        `[data-guild-overlay="${guildId}"]`
    );
    el?.remove();
}

function getOverlayRoot() {
    if (overlayRoot) return overlayRoot;

    overlayRoot = document.createElement("div");
    overlayRoot.id = "typing-overlay-root";
    overlayRoot.style.position = "fixed";
    overlayRoot.style.inset = "0";
    overlayRoot.style.pointerEvents = "none";
    overlayRoot.style.zIndex = "1";
    document.body.appendChild(overlayRoot);

    return overlayRoot;
}

function hookGuildListScroll() {
    if (!settings.store.showGuildIcons) return;

    const nav = document.querySelector('nav[aria-label="Servers sidebar"]')?.querySelector("ul")?.querySelector("div")?.querySelector("div") as HTMLElement | null;
    if (!nav) return;

    nav.addEventListener("scroll", () => {
        for (const [gid, users] of TYPING_GUILDS) {
            const usersArr = [...users]
                .map(id => UserStore.getUser(id))
                .filter(Boolean);

            renderTypingIcons(gid, usersArr);
        }
    });
}

function ensureGuildAnchor(guildId: string) {
    const guildEl = document.querySelector(
        `[data-list-item-id="guildsnav___${guildId}"]`
    ) as HTMLElement | null;

    if (!guildEl) return null;
    guildEl.style.overflow = "visible";

    let anchor = guildEl.querySelector(
        `[data-typing-anchor="${guildId}"]`
    ) as HTMLElement | null;

    if (!anchor) {
        anchor = document.createElement("span");
        anchor.dataset.typingAnchor = guildId;
        anchor.style.position = "absolute";
        anchor.style.inset = "0";
        anchor.style.pointerEvents = "none";
        guildEl.appendChild(anchor);
    }

    return anchor;
}

function getGuildRect(guildId: string) {
    const anchor = document.querySelector(
        `span[data-typing-anchor="${guildId}"]`
    ) as HTMLElement | null;

    if (!anchor) return null;
    return anchor.getBoundingClientRect();
}

function makeIcon(user: any, offsetY: number, z: number) {
    const img = document.createElement("img");
    img.src = user.getAvatarURL(null, 32, true);
    img.style.position = "absolute";
    img.style.left = "0px";
    img.style.top = "50%";
    img.style.transform = `translateY(calc(-50% + ${offsetY}px))`;
    img.style.width = "16px";
    img.style.height = "16px";
    img.style.borderRadius = "50%";
    img.style.border = "2px solid var(--background-secondary)";
    img.style.pointerEvents = "none";
    img.style.zIndex = String(z);
    return img;
}

function makePlusIcon(offsetY: number, z: number) {
    const img = document.createElement("img");
    img.src = PLUS_ICON;
    img.style.position = "absolute";
    img.style.left = "0px";
    img.style.top = "50%";
    img.style.transform = `translateY(calc(-50% + ${offsetY}px))`;
    img.style.width = "16px";
    img.style.height = "16px";
    img.style.borderRadius = "50%";
    img.style.border = "2px solid var(--background-secondary)";
    img.style.pointerEvents = "none";
    img.style.zIndex = String(z);
    return img;
}

function renderTypingIcons(guildId: string, users: any[]) {
    if (!settings.store.showGuildIcons) return;

    const rect = getGuildRect(guildId);
    if (!rect) return;

    const root = getOverlayRoot();

    let container = root.querySelector(
        `[data-guild-overlay="${guildId}"]`
    ) as HTMLElement | null;

    if (!container) {
        container = document.createElement("div");
        container.dataset.guildOverlay = guildId;
        container.style.position = "fixed";
        container.style.pointerEvents = "none";
        root.appendChild(container);
    }

    const centerY = rect.top + rect.height / 2;

    container.style.left = `${rect.right + settings.store.iconHorizontalOffset}px`;
    container.style.top = `${centerY}px`;
    container.style.transform = "translateY(-50%)";

    container.replaceChildren();

    const SPACING = 16;

    const showOverflow = users.length > 3;
    const visible = showOverflow ? users.slice(0, 2) : users.slice(0, 3);

    // center
    if (visible[0]) {
        container.appendChild(
            makeIcon(visible[0], 0, 22)
        );
    }

    // above
    if (visible[1]) {
        container.appendChild(
            makeIcon(visible[1], -SPACING, 21)
        );
    }

    // below / +
    if (showOverflow) {
        container.appendChild(
            makePlusIcon(+SPACING, 20)
        );
    } else if (visible[2]) {
        container.appendChild(
            makeIcon(visible[2], +SPACING, 20)
        );
    }
}

function cleanupTyping(gid: string, userId: string): void {
    const relationships = RelationshipStore.getMutableRelationships();
    const original = ORIGINAL_TYPES.get(userId);

    if (original != null) {
        relationships.set(userId, original);
        ORIGINAL_TYPES.delete(userId);
        RelationshipStore.emitChange();
    }

    const set = TYPING_GUILDS.get(gid);
    set?.delete(String(userId));
    if (set?.size === 0) TYPING_GUILDS.delete(gid);

    TYPING_USERS.delete(String(userId));
    TIMERS.delete(userId);

    setTimeout(() => {
        const set = TYPING_GUILDS.get(gid);

        if (!set || set.size === 0) {
            removeTypingOverlay(gid);
        } else {
            const usersArr = [...set]
                .map(id => UserStore.getUser(id))
                .filter(Boolean);

            renderTypingIcons(gid, usersArr);
        }
    }, 0);
}

function onTypingStart(e: TypingEvent) {
    if (!RelationshipStore.isFriend(e.userId)) return;

    const relationships = RelationshipStore.getMutableRelationships();

    if (!ORIGINAL_TYPES.has(e.userId)) {
        ORIGINAL_TYPES.set(e.userId, RelationshipStore.getRelationshipType(e.userId));
    }

    const channel = ChannelStore.getChannel(e.channelId);
    if (!channel?.guild_id) return;

    const gid = channel.guild_id;
    const guild = GuildStore.getGuild(gid);
    if (guild) TYPING_USERS.set(String(e.userId), guild.name);

    if (!TYPING_GUILDS.has(gid)) TYPING_GUILDS.set(gid, new Set());
    TYPING_GUILDS.get(gid)!.add(String(e.userId));
    const usersArr = [...TYPING_GUILDS.get(gid)!]
        .map(id => UserStore.getUser(id))
        .filter(Boolean);

    setTimeout(() => {
        renderTypingIcons(gid, usersArr);
    }, 0);

    relationships.set(e.userId, TYPING_REL as any);
    RelationshipStore.emitChange();

    clearTimeout(TIMERS.get(e.userId));

    TIMERS.set(
        e.userId,
        window.setTimeout(() => cleanupTyping(gid, e.userId), settings.store.typingTimeout)
    );
}

function onTypingStop(e: TypingEvent) {
    const timer = TIMERS.get(e.userId);
    if (!timer) return;

    clearTimeout(timer);
    TIMERS.delete(e.userId);

    const channel = ChannelStore.getChannel(e.channelId);
    if (!channel?.guild_id) return;
    cleanupTyping(channel.guild_id, e.userId);
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
        default: 2,
        description: "Horizontal offset (px) for typing indicators next to server icons",
    },
});

export default definePlugin({
    name: "TypingFriends",
    description: "Shows which friends are typing across servers.",
    authors: [Devs.Xylen],
    settings: settings,

    patches: [
        {
            find: "#{intl::FRIENDS_ALL_HEADER}",
            replacement: {
                match: /concat\(n\)\);case (\i\.\i)\.SUGGESTIONS/,
                replace:
                    'concat(n));case $1.TYPING:return "Typing — "+arguments[1];case $1.SUGGESTIONS'
            }
        },
        {
            find: "FriendsEmptyState: Invalid empty state",
            replacement: {
                match: /case (\i\.\i)\.ONLINE:(?=return (\i)\.SECTION_ONLINE)/,
                replace: "case $1.ONLINE:case $1.TYPING:"
            }
        },
        {
            find: "#{intl::FRIENDS_SECTION_ONLINE}),className:",
            replacement: {
                match:
                    /,{id:(\i\.\i)\.PENDING,show:.+?className:(\i\.\i)(?=\},\{id:)/,
                replace: (rest, relationShipTypes, className) =>
                    `,{id:${relationShipTypes}.TYPING,show:window.__friendsTypingShowSection,className:${className},content:"Typing"}${rest}`
            }
        },
        {
            find: '"FriendsStore"',
            replacement: {
                match:
                    /(?<=case (\i\.\i)\.SUGGESTIONS:return \d+===(\i)\.type)/,
                replace: `;case $1.TYPING:return (window.__friendsTypingShowSection && $2.type===${TYPING_REL})`
            }
        },
        {
            find: "subText:(0,r.jsx)(I.A,{",
            replacement: {
                match: /subText:\s*\(0,r\.jsx\)\(I\.A,\{([\s\S]*?)\}\)/,
                replace: 'subText:(window.__typingUsers?.has(e.id)?(0,r.jsx)("div",{children:"Typing in "+window.__typingUsers.get(e.id)}):(0,r.jsx)(I.A,{$1}))'
            }
        },
        {
            find: "guildsnav",
            replacement: {
                match: /(\i)\.map\(\(\i,\i\)=>\s*(\i)\(\i,\i,\1\.length\)\)/,
                replace:
                    "$1.map((e,t)=>$self.wrapTreeNode($2(e,t,$1.length),e))"
            }
        },
    ],

    wrapTreeNode(rendered: React.ReactNode, node: PluginNode) {
        if (node?.type === "guild") setTimeout(() => { ensureGuildAnchor(node.id); }, 0);
        return rendered;
    },

    start() {
        syncShowFriendsSection();
        hookGuildListScroll();

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

        TYPING_GUILDS.clear();
        ORIGINAL_TYPES.clear();

        const relationships = RelationshipStore.getMutableRelationships();
        for (const [id, original] of ORIGINAL_TYPES) relationships.set(id, original);
        RelationshipStore.emitChange();
    }
});
