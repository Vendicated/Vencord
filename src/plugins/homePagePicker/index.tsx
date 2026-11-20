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
import { ChannelRouter, ChannelStore, GuildChannelStore, GuildStore, NavigationRouter, SearchableSelect, SelectedChannelStore, SelectedGuildStore, SortedGuildStore } from "@webpack/common";

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

let isSwitchingAccount = false;
let previousCache: PreviousChannel | undefined;

const FRIENDS_PATH = "/channels/@me";
const LAST_VISITED = "last";
const PREVIOUS_CHANNEL = "previous";

const settings = definePluginSettings({
    startPage: {
        type: OptionType.SELECT,
        description: "Page to open when Discord launches",
        options: [
            { label: "Previous Channel", value: PREVIOUS_CHANNEL, default: true },
            { label: "Friends", value: FRIENDS_PATH },
            { label: "Direct Message", value: "dm" },
            { label: "Server", value: "server" },
            { label: "Favorites", value: "/channels/@favorites" },
            { label: "Discover", value: "/discovery/servers" },
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
        description: "When switching accounts, atempt to navigate back to the channel you were in. When disabled, the selected page is opened instead",
        default: true
    },
    guildId: {
        type: OptionType.STRING,
        description: "Server to open",
        default: "",
        hidden: true
    },
    channelId: {
        type: OptionType.STRING,
        description: "Channel to open",
        default: LAST_VISITED,
        hidden: true
    },
    dmId: {
        type: OptionType.STRING,
        description: "DM to open",
        default: "",
        hidden: true
    }
});

function TargetSetting() {
    const { startPage, guildId, channelId, dmId } = settings.use(["startPage", "guildId", "channelId", "dmId"]);

    if (startPage === "dm") {
        const dmOptions = ChannelStore.getSortedPrivateChannels().map(channel => ({
            label: channel.name || channel.rawRecipients.map(user => user.global_name ?? user.username).join(", "),
            value: channel.id
        }));

        return (
            <SettingsSection id="dmId" name="DM" description={settings.def.dmId.description}>
                <SearchableSelect
                    placeholder="Select a DM"
                    options={dmOptions}
                    value={dmId}
                    onChange={id => settings.store.dmId = id}
                    maxVisibleItems={5}
                    closeOnSelect
                />
            </SettingsSection>
        );
    } else if (startPage === "server") {
        const guildOptions = SortedGuildStore.getFlattenedGuildIds()
            .map(id => GuildStore.getGuild(id))
            .filter(Boolean)
            .map(guild => ({ label: guild.name, value: guild.id }));

        const channelOptions = [{ label: "Last visited", value: LAST_VISITED }];
        if (guildId) {
            const channels = GuildChannelStore.getSelectableChannels(guildId);
            channelOptions.push(...channels.map(({ channel }) => ({ label: `#${channel.name}`, value: channel.id })));
        }

        return (
            <>
                <SettingsSection id="guildId" name="Server" description={settings.def.guildId.description}>
                    <SearchableSelect
                        placeholder="Select a server"
                        options={guildOptions}
                        value={guildId}
                        onChange={id => {
                            settings.store.guildId = id;
                            settings.store.channelId = LAST_VISITED;
                        }}
                        maxVisibleItems={5}
                        closeOnSelect
                    />
                </SettingsSection>
                {guildId && (
                    <SettingsSection id="channelId" name="Channel" description={settings.def.channelId.description}>
                        <SearchableSelect
                            placeholder="Select a channel"
                            options={channelOptions}
                            value={channelId}
                            onChange={id => settings.store.channelId = id}
                            maxVisibleItems={5}
                            closeOnSelect
                        />
                    </SettingsSection>
                )}
            </>
        );
    }

    return null;
}

function getStartPath() {
    const { startPage, guildId, channelId, dmId } = settings.store;

    if (startPage === "dm") {
        if (dmId) {
            return `${FRIENDS_PATH}/${dmId}`;
        } else {
            return FRIENDS_PATH;
        }
    } else if (startPage === "server") {
        if (!guildId) {
            return FRIENDS_PATH;
        }
        if (channelId === LAST_VISITED) {
            return `/channels/${guildId}`;
        } else {
            return `/channels/${guildId}/${channelId}`;
        }
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
