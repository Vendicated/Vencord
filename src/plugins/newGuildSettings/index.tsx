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

import {
    findGroupChildrenByChildId,
    NavContextMenuPatchCallback
} from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { CogWheel } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Guild } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy, findStoreLazy } from "@webpack";
import { GuildStore, Menu, UserStore } from "@webpack/common";

const { updateGuildNotificationSettings } = findByPropsLazy("updateGuildNotificationSettings");
const toggleShowAllChannels: (guildId: string, optInEnabled: boolean) => void = findByCodeLazy("guild_enabled", "guild_disabled");
const isOptInEnabledForGuild = findByCodeLazy(".COMMUNITY)||", ".isOptInEnabled(");
const LurkingStore = findStoreLazy("LurkingStore");

const knownGuilds = new Set<string>();
const appliedGuilds = new Set<string>();

const settings = definePluginSettings({
    guild: {
        description: "Mute Guild automatically",
        type: OptionType.BOOLEAN,
        default: true
    },
    messages: {
        description: "Server Notification Settings",
        type: OptionType.SELECT,
        options: [
            { label: "All messages", value: 0 },
            { label: "Only @mentions", value: 1 },
            { label: "Nothing", value: 2 },
            { label: "Server default", value: 3, default: true }
        ],
    },
    everyone: {
        description: "Suppress @everyone and @here",
        type: OptionType.BOOLEAN,
        default: true
    },
    role: {
        description: "Suppress All Role @mentions",
        type: OptionType.BOOLEAN,
        default: true
    },
    highlights: {
        description: "Suppress Highlights automatically",
        type: OptionType.BOOLEAN,
        default: true
    },
    events: {
        description: "Mute New Events automatically",
        type: OptionType.BOOLEAN,
        default: true
    },
    showAllChannels: {
        description: "Show all channels automatically",
        type: OptionType.BOOLEAN,
        default: true
    }
});

const makeContextMenuPatch: (shouldAddIcon: boolean) => NavContextMenuPatchCallback = (shouldAddIcon: boolean) => (children, { guild }: { guild: Guild, onClose(): void; }) => {
    if (!guild) return;

    const group = findGroupChildrenByChildId("privacy", children);
    group?.push(
        <Menu.MenuItem
            label="Apply NewGuildSettings"
            id="vc-newguildsettings-apply"
            icon={shouldAddIcon ? CogWheel : void 0}
            leadingAccessory={shouldAddIcon ? { type: "icon", icon: CogWheel } : void 0}
            action={() => applyDefaultSettings(guild.id)}
        />
    );
};

function applyDefaultSettings(guildId: string | null) {
    if (guildId === "@me" || guildId === "null" || guildId == null) return;
    knownGuilds.add(guildId);
    appliedGuilds.add(guildId);
    updateGuildNotificationSettings(guildId, {
        muted: settings.store.guild,
        suppress_everyone: settings.store.everyone,
        suppress_roles: settings.store.role,
        mute_scheduled_events: settings.store.events,
        notify_highlights: settings.store.highlights ? 1 : 0,
        ...(settings.store.messages !== 3 ? { message_notifications: settings.store.messages } : null)
    });
    if (settings.store.showAllChannels && isOptInEnabledForGuild(guildId)) {
        toggleShowAllChannels(guildId, false);
    }
}

export default definePlugin({
    name: "NewGuildSettings",
    description: "Automatically mute new servers and change various other settings upon joining",
    tags: ["Servers", "Customisation"],
    searchTerms: ["MuteNewGuild", "mute", "server"],
    authors: [Devs.Glitch, Devs.Nuckyz, Devs.carince, Devs.Mopi, Devs.GabiRP],
    contextMenus: {
        "guild-context": makeContextMenuPatch(false),
        "guild-header-popout": makeContextMenuPatch(true)
    },
    patches: [
        {
            find: ",acceptInvite(",
            replacement: {
                match: /INVITE_ACCEPT_SUCCESS.+?,(\i)=\i\?\.guild_id\?\?\i\?\.guild\?\.id.+?;/,
                replace: (m, guildId) => `${m}$self.applyDefaultSettings(${guildId});`
            }
        },
        {
            find: "{joinGuild:",
            replacement: {
                match: /guildId:(\i),lurker:(\i).{0,20}}\);/,
                replace: (m, guildId, lurker) => `${m}if(!${lurker})$self.applyDefaultSettings(${guildId});`
            }
        }
    ],
    settings,
    applyDefaultSettings,
    start() {
        for (const id of GuildStore.getGuildIds()) {
            if (!LurkingStore.isLurking(id)) knownGuilds.add(id);
        }
    },
    flux: {
        CONNECTION_OPEN({ guilds, unavailableGuilds }: { guilds: Array<{ id: string; }>; unavailableGuilds?: string[]; }) {
            for (const guild of guilds) knownGuilds.add(guild.id);
            if (unavailableGuilds) {
                for (const id of unavailableGuilds) knownGuilds.add(id);
            }
        },
        CACHE_LOADED({ guilds }: { guilds?: Array<{ id: string; }>; }) {
            if (!guilds) return;
            for (const guild of guilds) knownGuilds.add(guild.id);
        },
        CACHE_LOADED_LAZY({ guilds }: { guilds?: Array<{ id: string; }>; }) {
            if (!guilds) return;
            for (const guild of guilds) knownGuilds.add(guild.id);
        },
        OVERLAY_INITIALIZE({ guilds }: { guilds?: Array<{ properties?: { id: string; }; id?: string; }>; }) {
            if (!guilds) return;
            for (const guild of guilds) {
                const id = guild.properties?.id ?? guild.id;
                if (id) knownGuilds.add(id);
            }
        },
        GUILD_CREATE({ guild }: { guild: { id: string; joined_at?: string | null; }; }) {
            if (!guild?.id) return;
            const isJoined = (guild.joined_at != null || GuildStore.getGuild(guild.id)?.joinedAt != null) && !LurkingStore.isLurking(guild.id);
            if (!isJoined) return;

            if (!knownGuilds.has(guild.id)) {
                applyDefaultSettings(guild.id);
            } else if (appliedGuilds.has(guild.id) && settings.store.showAllChannels && isOptInEnabledForGuild(guild.id)) {
                toggleShowAllChannels(guild.id, false);
            }
        },
        GUILD_DELETE({ guild }: { guild: { id: string; unavailable?: boolean; }; }) {
            if (!guild?.unavailable) {
                knownGuilds.delete(guild.id);
                appliedGuilds.delete(guild.id);
            }
        },
        GUILD_JOIN_REQUEST_UPDATE({ guildId, request, status }) {
            if (status === "APPROVED" && request.user_id === UserStore.getCurrentUser().id)
                applyDefaultSettings(guildId);
        },
        GUILD_ONBOARDING_COMPLETE({ guildId }) {
            if (settings.store.showAllChannels && isOptInEnabledForGuild(guildId))
                toggleShowAllChannels(guildId, false);
        }
    }
});
