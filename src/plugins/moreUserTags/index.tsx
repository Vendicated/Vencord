/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./style.css";
// Plugin stylesheet: provides classes used by TagBubble and any
// supporting layout needed for placement in member lists / messages.
// Keeping styles in a managed file allows theme consistency and easier
// tweaks without touching logic.
import { definePluginSettings } from "@api/Settings";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import { addProfileBadge, removeProfileBadge, BadgePosition } from "@api/Badges";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { GuildRoleStore, GuildMemberStore, GuildStore, PermissionsBits, SelectedGuildStore, React, UserStore } from "@webpack/common";
import { findByPropsLazy } from "@webpack";
import { classes } from "@utils/misc";
import type { User, Channel } from "@vencord/discord-types";


// Configuration exposed to the user. Each option controls where tags are
// rendered and the textual labels used. These settings are read at
// runtime and polled periodically so toggles can apply without a full
// plugin restart.
const settings = definePluginSettings({
    showInMemberList: {
        type: OptionType.BOOLEAN,
        description: "Show permission badges in the member list",
        default: true
    }
    ,
    showInMemberBadges: {
        type: OptionType.BOOLEAN,
        description: "Show permission badges in the member profile",
        default: true
    }
    , hideForBots: {
        type: OptionType.BOOLEAN,
        description: "Do not show custom permission badges in member list for bot accounts",
        default: true
    }
    , showNextToMessage: {
        type: OptionType.BOOLEAN,
        description: "Show permission badges next to messages (by the author)",
        default: true
    }
    , labelOwner: {
        type: OptionType.STRING,
        description: "Label for OWNER badge",
        default: "Owner"
    }
    , labelAdministrator: {
        type: OptionType.STRING,
        description: "Label for ADMINISTRATOR badge",
        default: "Admin"
    }
    , labelStaff: {
        type: OptionType.STRING,
        description: "Label for MODERATOR_STAFF badge",
        default: "Staff"
    }
    , labelModerator: {
        type: OptionType.STRING,
        description: "Label for MODERATOR badge",
        default: "Mod"
    }
    , labelVcMod: {
        type: OptionType.STRING,
        description: "Label for VOICE_MODERATOR badge",
        default: "VC Mod"
    }
    , labelChatMod: {
        type: OptionType.STRING,
        description: "Label for CHAT_MODERATOR badge",
        default: "Chat Mod"
    }
});

// Compute effective permissions for a member in a guild and optional channel.
// This follows Discord's semantics by combining role permissions and
// applying channel permission overwrites in the proper order:
// 1) aggregate role permissions
// 2) apply @everyone overwrite
// 3) apply role overwrites in role position order
// 4) apply member-specific overwrite
// Returns a BigInt bitmask representing the computed permissions.
function computeEffectivePermissions(userId: string, guildId?: string, channel?: Channel) {
    if (!guildId) return 0n;
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return 0n;
    if (guild.ownerId === userId) return Object.values(PermissionsBits).reduce((a, b) => a | b, 0n);

    const member = GuildMemberStore.getMember(guildId, userId);
    if (!member) return 0n;

    const roles = GuildRoleStore.getSortedRoles(guildId).filter(r => r.id === guildId || member.roles.includes(r.id));
    let perms = roles.reduce((acc, r) => acc | (r.permissions ?? 0n), 0n);

    if (!channel || !channel.permissionOverwrites) return perms;

    const overwritesArr = Object.values(channel.permissionOverwrites as any) as any[];
    const apply = (ow: any) => { perms = (perms & ~BigInt(ow.deny)) | BigInt(ow.allow); };

    const everyone = overwritesArr.find((o: any) => o.id === guildId);
    if (everyone) apply(everyone);

    const roleOws = overwritesArr.filter((o: any) => member.roles.includes(o.id))
        .map((o: any) => ({ ...o, position: GuildRoleStore.getRole(guildId, o.id)?.position ?? 0 }))
        .sort((a: any, b: any) => b.position - a.position);
    for (const ow of roleOws) apply(ow);

    const memberOw = overwritesArr.find((o: any) => o.id === userId);
    if (memberOw) apply(memberOw);

    return perms;
}

// Decide which single permission tag to show for a user. Tags are
// prioritized (owner -> admin -> staff -> chat/voice mods -> mod). The
// function returns a tag key or null when no special tag applies.
function getHighestTagForUser(user: User, guildId?: string, channel?: Channel) {
    if (!guildId) return null;
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return null;
    if (guild.ownerId === user.id) return "OWNER";

    const perms = computeEffectivePermissions(user.id, guildId, channel);
    const has = (bit: bigint) => (perms & bit) === bit;

    if (has(PermissionsBits.ADMINISTRATOR)) return "ADMINISTRATOR";
    if (has(PermissionsBits.MANAGE_GUILD) || has(PermissionsBits.MANAGE_ROLES) || has(PermissionsBits.MANAGE_CHANNELS)) return "MODERATOR_STAFF";
    if (has(PermissionsBits.MODERATE_MEMBERS)) return "CHAT_MODERATOR";
    if (has(PermissionsBits.MOVE_MEMBERS) || has(PermissionsBits.MUTE_MEMBERS) || has(PermissionsBits.DEAFEN_MEMBERS)) return "VOICE_MODERATOR";
    if (has(PermissionsBits.MANAGE_MESSAGES) || has(PermissionsBits.KICK_MEMBERS) || has(PermissionsBits.BAN_MEMBERS)) return "MODERATOR";

    return null;
}



// Try to reuse Discord's native bot/app tag classes when available.
// `findByPropsLazy` defers lookup until the module is present so we can
// match visuals even if the host changes class names across versions.
const BotTagClasses = findByPropsLazy("botTagRegular", "botText");

// Presentational component that renders a small badge/tag. We try to
// render a 'cozy' variant for messages (smaller spacing) and a regular
// variant for member lists/profile. If Discord's bot tag CSS is available
// we reuse those classes to keep a consistent look-and-feel.
function TagBubble({ text, user, cozy = false }: { text: string; user: User; cozy?: boolean; }) {
    const hasBotTagModule = BotTagClasses && BotTagClasses.botTagRegular && BotTagClasses.botText;

    if (!cozy && !hasBotTagModule) {
        return (
            <span className={classes("vc-upb-wrapper", "botTag", "botTagRegular", "px")}>
                <span className={classes("botText")}>{text}</span>
            </span>
        );
    }

    if (cozy && !hasBotTagModule) {
        return (
            <span
                className={classes("vc-upb-wrapper", "customCozy", "botTag", "botTagRegular", "rem")}
            >
                <span className={classes("botText")}>{text}</span>
            </span>
        );
    }

    if (cozy) {
        return (
            <span
                className={classes("vc-upb-wrapper", "customCozy", BotTagClasses.botTag, BotTagClasses.botTagRegular, BotTagClasses.rem)}
            >
                <span className={classes(BotTagClasses.botText, "botText")}>{text}</span>
            </span>
        );
    }

    return (
        <span className={classes("vc-upb-wrapper", BotTagClasses.botTag, BotTagClasses.botTagRegular, BotTagClasses.px)}>
            <span className={classes(BotTagClasses.botText, "botText")}>{text}</span>
        </span>
    );
}

// Translate our internal tag keys to user-visible labels. These labels are
// configurable via plugin settings so server owners can choose wording.
const labelFor = (tag: string | null) => {
    switch (tag) {
        case "OWNER": return settings.store.labelOwner ?? "Owner";
        case "ADMINISTRATOR": return settings.store.labelAdministrator ?? "Admin";
        case "MODERATOR_STAFF": return settings.store.labelStaff ?? "Staff";
        case "MODERATOR": return settings.store.labelModerator ?? "Mod";
        case "VOICE_MODERATOR": return settings.store.labelVcMod ?? "VC Mod";
        case "CHAT_MODERATOR": return settings.store.labelChatMod ?? "Chat Mod";
        default: return tag ?? "";
    }
};

// Main plugin registration. The plugin registers decorators and badges
// with the host at runtime according to user settings. Most runtime
// behavior is controlled from the `start()` and `stop()` hooks below.
export default definePlugin({
    name: "MoreUserTags",
    description: "Adds tags for moderative roles (owner, admin, etc.)",
    authors: [Devs.Cyn, Devs.TheSun, Devs.RyanCaoDev, Devs.LordElias, Devs.AutumnVN, Devs.Stellaros],
    settings,

    start() {
        // Callback used by the MemberListDecorators API. This is invoked
        // for each member row rendered by the host; returning a React
        // element will place that element in the decorators wrapper.
        const decoratorCallback = (props: any) => {
            const { user, type, channel } = props as any;
            if (!user) return null;

            if (settings.store.hideForBots && !!user.bot) return null;

            const guildId = type === "guild" ? SelectedGuildStore.getGuildId() : channel?.guild_id;
            if (!guildId) return null;

            const tag = getHighestTagForUser(user, guildId as string, channel);
            if (!tag) return null;

            return <TagBubble text={labelFor(tag)} user={user} cozy={false} />;
        };

        // Runtime state persisted to `window` so the plugin can survive
        // hot reloads during development. The fields track whether we've
        // registered decorators/badges and hold references to observers
        // and polling intervals for clean teardown.
        const state = (window as any).__vc_upb_state = (window as any).__vc_upb_state || { registered: false, observer: undefined, interval: undefined, messageRegistered: false, profileRegistered: false, profileBadge: undefined };

        // Profile badge: a small React component descriptor used by the
        // Badges API to render a badge inside the user profile modal.
        // `shouldShow` is consulted by the host before calling `component`.
        const profileBadge = {
            key: 'UserPermissionBadge',
            position: BadgePosition.END,
            component: (props: any) => {
                const user = UserStore.getUser(props.userId);
                if (!user) return null;
                if (settings.store.hideForBots && !!user.bot) return null;
                const tag = getHighestTagForUser(user, props.guildId as string | undefined);
                if (!tag) return null;
                return <TagBubble text={labelFor(tag)} user={user} cozy={false} />;
            },
            shouldShow: (args: any) => {
                const user = UserStore.getUser(args.userId);
                if (!user) return false;
                if (settings.store.hideForBots && !!user.bot) return false;
                const tag = getHighestTagForUser(user, args.guildId as string | undefined);
                return !!tag;
            },
        } as any;
        state.profileBadge = profileBadge;

        // Register the member list decorator which adds TagBubble elements
        // to the member list rows. This uses the host API and avoids
        // fragile DOM manipulation for member lists.
        const ensureRegistered = () => {
            if (state.registered) return;
            addMemberListDecorator("UserPermissionBadges", decoratorCallback);
            state.registered = true;
        };

        const ensureUnregistered = () => {
            if (!state.registered) return;
            try { removeMemberListDecorator("UserPermissionBadges"); } catch { }
            state.registered = false;
            try { if (state.observer) { state.observer.disconnect(); state.observer = undefined; } } catch { }
        };

        // Message decoration callback: returns a compact (cozy) TagBubble
        // to be placed next to the message author's name in chat. We
        // compute the guild context for the message to apply channel- or
        // server-specific permission checks.
        const messageCallback = (props: any) => {
            const { message } = props as any;
            if (!message || !message.author) return null;
            const user = message.author;

            if (!settings.store.showNextToMessage) return null;
            if (settings.store.hideForBots && !!user.bot) return null;

            const guildId = message?.channel_id ? (message.channel?.guild_id ?? SelectedGuildStore.getGuildId()) : SelectedGuildStore.getGuildId();
            const tag = getHighestTagForUser(user, (guildId ?? undefined), message.channel);
            if (!tag) return null;

            return <TagBubble text={labelFor(tag)} user={user} cozy={true} />;
        };

        // Register message decorations and start an observer to adjust
        // placement of the generated elements. The observer attempts a
        // minimal DOM reparent operation to move our tag into the final
        // decorations location while avoiding race conditions.
        const ensureRegisteredMessage = () => {
            if (state.messageRegistered) return;
            addMessageDecoration("UserPermissionBadgesMessage", messageCallback);
            state.messageRegistered = true;
            try {
                if (!state.observer) {
                    const observer = new MutationObserver((mutations) => {
                        for (const m of mutations) {
                            for (const node of Array.from(m.addedNodes)) {
                                try {
                                    if (!(node instanceof Element)) continue;
                                    const wrappers = node.matches?.('.vc-message-decorations-wrapper') ? [node] : Array.from(node.querySelectorAll?.('.vc-message-decorations-wrapper') || []);
                                    for (const wrapper of wrappers) {
                                        if (!wrapper.parentElement) continue;
                                        const inner = wrapper.querySelector('.vc-upb-wrapper') || wrapper.querySelector('.botTag') || wrapper.querySelector('span');
                                        if (inner && wrapper.parentElement) {
                                            const parent = wrapper.parentElement;
                                            if (parent.contains(wrapper)) {
                                                try {
                                                    parent.insertBefore(inner, wrapper);
                                                    setTimeout(() => { try { if (parent.contains(wrapper)) parent.removeChild(wrapper); } catch { } }, 0);
                                                } catch (e) {
                                                    try {
                                                        const frag = document.createDocumentFragment();
                                                        while (wrapper.firstChild) frag.appendChild(wrapper.firstChild);
                                                        parent.insertBefore(frag, wrapper);
                                                        if (parent.contains(wrapper)) parent.removeChild(wrapper);
                                                    } catch { /* ignore */ }
                                                }
                                            }
                                        }
                                    }
                                } catch { }
                            }
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                    state.observer = observer;
                }
            } catch { /* ignore */ }
        };

        const ensureUnregisteredMessage = () => {
            if (!state.messageRegistered) return;
            try { removeMessageDecoration("UserPermissionBadgesMessage"); } catch { }
            state.messageRegistered = false;
        };

        if (settings.store.showInMemberList) ensureRegistered(); else ensureUnregistered();
        if (settings.store.showInMemberBadges) { try { addProfileBadge(state.profileBadge); state.profileRegistered = true; } catch { } } else { try { removeProfileBadge(state.profileBadge); } catch { } state.profileRegistered = false; }
        if (settings.store.showNextToMessage) ensureRegisteredMessage(); else ensureUnregisteredMessage();

        try {
            // Small polling interval that watches the settings object and
            // applies toggles at runtime. This keeps the plugin responsive
            // to user preference changes without requiring a restart.
            if (!state.interval) {
                state.interval = setInterval(() => {
                    try {
                        const shouldMember = !!settings.store.showInMemberList;
                        if (shouldMember && !state.registered) ensureRegistered();
                        if (!shouldMember && state.registered) ensureUnregistered();

                        const shouldProfile = !!settings.store.showInMemberBadges;
                        if (shouldProfile && !state.profileRegistered) { try { addProfileBadge(state.profileBadge); state.profileRegistered = true; } catch { } }
                        if (!shouldProfile && state.profileRegistered) { try { removeProfileBadge(state.profileBadge); state.profileRegistered = false; } catch { } }

                        const shouldMessage = !!settings.store.showNextToMessage;
                        if (shouldMessage && !state.messageRegistered) ensureRegisteredMessage();
                        if (!shouldMessage && state.messageRegistered) ensureUnregisteredMessage();
                    } catch { }
                }, 500);
            }
        } catch { }
    },

    stop() {
        try {
            const state = (window as any).__vc_upb_state;
            if (state) {
                try { if (state.interval) { clearInterval(state.interval); state.interval = undefined; } } catch { }
                try { if (state.observer) { state.observer.disconnect(); state.observer = undefined; } } catch { }
                try { if (state.registered) { removeMemberListDecorator("UserPermissionBadges"); state.registered = false; } } catch { }
                try { if (state.messageRegistered) { removeMessageDecoration("UserPermissionBadgesMessage"); state.messageRegistered = false; } } catch { }
                try { if (state.profileRegistered && state.profileBadge) { try { removeProfileBadge(state.profileBadge); } catch { } state.profileRegistered = false; state.profileBadge = undefined; } } catch { }
                try { delete (window as any).__vc_upb_state; } catch { }
            } else {
                try { removeMemberListDecorator("UserPermissionBadges"); } catch { }
                try { removeMessageDecoration("UserPermissionBadgesMessage"); } catch { }
            }
        } catch { }

        try { delete (window as any).vcTestUPB; } catch { }
    }
});
