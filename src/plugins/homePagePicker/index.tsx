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

import * as DataStore from "@api/DataStore";
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { ChannelRouter, ChannelStore, GuildStore, NavigationRouter, SearchableSelect, SelectedChannelStore, SelectedGuildStore } from "@webpack/common";

export interface LogoutEvent {
    type: "LOGOUT";
    isSwitchingAccount: boolean;
}

interface ChannelSelectEvent {
    type: "CHANNEL_SELECT";
    channelId: string | null;
    guildId: string | null;
}

interface PreviousChannel {
    guildId: string | null;
    channelId: string | null;
}

const ChannelSearch = findByPropsLazy("queryChannels", "queryGroupDMs", "queryDMChannels");

let isSwitchingAccount = false;
let previousCache: PreviousChannel | undefined;

const FRIENDS_PATH = "/channels/@me";
const PREVIOUS_CHANNEL = "previous";

const settings = definePluginSettings({
    startPage: {
        type: OptionType.SELECT,
        description: "Page to open when Discord launches",
        options: [
            { label: "Previous Channel", value: PREVIOUS_CHANNEL, default: true },
            { label: "Friends", value: FRIENDS_PATH },
            { label: "Channel", value: "channel" },
            { label: "Favorites", value: "/channels/@favorites" },
            { label: "Server Discovery", value: "/discovery/servers" },
            { label: "Quests", value: "/quest-home" },
            { label: "Shop", value: "/shop" },
            { label: "Nitro Home", value: "/store" }
        ] as const
    },
    target: {
        type: OptionType.COMPONENT,
        component: TargetSetting
    },
    keepChannelOnSwitch: {
        type: OptionType.BOOLEAN,
        displayName: "Always Return To Previous Channel On Account Switch",
        description: "When switching accounts, attempt to navigate back to the channel you were in. When disabled, the selected page is opened instead",
        default: true
    },
    channelId: {
        type: OptionType.STRING,
        description: "Channel or DM to open",
        hidden: true
    }
});

function getChannelLabel(channel: Channel) {
    if (channel.guild_id) {
        return `#${channel.name} - ${GuildStore.getGuild(channel.guild_id)?.name}`;
    }

    return channel.name || channel.rawRecipients.map(user => user.global_name ?? user.username).join(", ");
}

function toOption(channel: Channel) {
    return { label: getChannelLabel(channel), value: channel.id };
}

async function searchChannels(query: string) {
    const results = [
        ...ChannelSearch.queryChannels({ query, limit: 10, allowEmptyQueries: true }),
        ...ChannelSearch.queryGroupDMs({ query, limit: 10 }),
        ...ChannelSearch.queryDMChannels({ query, limit: 10 })
    ];

    return results
        .sort((a, b) => b.score - a.score)
        .map(result => toOption(result.record));
}

function TargetSetting() {
    const { startPage, channelId } = settings.use(["startPage", "channelId"]);

    if (startPage !== "channel") {
        return null;
    }

    const channel = ChannelStore.getChannel(channelId ?? "");

    return (
        <SettingsSection id="channelId" name="Channel" description={settings.def.channelId.description}>
            <SearchableSelect
                placeholder="Search for a channel or DM"
                options={searchChannels}
                value={channel && toOption(channel)}
                onChange={option => settings.store.channelId = option.value}
                filter={false}
                debounceTime={100}
                maxVisibleItems={5}
                closeOnSelect
            />
        </SettingsSection>
    );
}

function getStartPath() {
    const { startPage, channelId } = settings.store;

    if (startPage === "channel") {
        const channel = ChannelStore.getChannel(channelId ?? "");
        if (!channel) {
            return FRIENDS_PATH;
        }

        return `/channels/${channel.guild_id ?? "@me"}/${channel.id}`;
    }

    if (!startPage || startPage === PREVIOUS_CHANNEL) {
        return FRIENDS_PATH;
    }

    return startPage;
}

let hasRedirected = false;

migratePluginSettings("HomePagePicker", "KeepCurrentChannel");

export default definePlugin({
    name: "HomePagePicker",
    description: "Choose the page Discord opens on launch, or return to the channel you were in. Also keeps your current channel when switching accounts.",
    tags: ["Utility", "Organisation", "Customisation"],
    authors: [Devs.Nuckyz, Devs.blodorn],
    settings,

    patches: [
        {
            find: '"Switching accounts"',
            replacement: {
                match: /goHomeAfterSwitching:\i/,
                replace: "goHomeAfterSwitching:!1"
            }
        }
    ],

    flux: {
        LOGOUT(e: LogoutEvent) {
            ({ isSwitchingAccount } = e);
        },

        CONNECTION_OPEN() {
            if (!hasRedirected) {
                hasRedirected = true;

                if (settings.store.startPage !== PREVIOUS_CHANNEL) {
                    NavigationRouter.transitionTo(getStartPath());
                }
            }

            if (!isSwitchingAccount) return;
            isSwitchingAccount = false;

            if (!settings.store.keepChannelOnSwitch && settings.store.startPage !== PREVIOUS_CHANNEL) {
                NavigationRouter.transitionTo(getStartPath());
            } else if (previousCache?.channelId) {
                if (ChannelStore.hasChannel(previousCache.channelId)) {
                    ChannelRouter.transitionToChannel(previousCache.channelId);
                } else {
                    NavigationRouter.transitionToGuild("@me");
                }
            }
        },

        async CHANNEL_SELECT({ guildId, channelId }: ChannelSelectEvent) {
            if (isSwitchingAccount) return;

            previousCache = {
                guildId,
                channelId
            };
            await DataStore.set("KeepCurrentChannel_previousData", previousCache);
        }
    },

    async start() {
        previousCache = await DataStore.get<PreviousChannel>("KeepCurrentChannel_previousData");
        if (!previousCache) {
            previousCache = {
                guildId: SelectedGuildStore.getGuildId(),
                channelId: SelectedChannelStore.getChannelId() ?? null
            };

            await DataStore.set("KeepCurrentChannel_previousData", previousCache);
        } else if (previousCache.channelId && settings.store.startPage === PREVIOUS_CHANNEL) {
            ChannelRouter.transitionToChannel(previousCache.channelId);
        }
    }
});
