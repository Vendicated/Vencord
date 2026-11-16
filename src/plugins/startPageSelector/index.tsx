/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, GuildChannelStore, GuildStore, NavigationRouter, SearchableSelect, SortedGuildStore } from "@webpack/common";

const FRIENDS_PATH = "/channels/@me";
const LAST_VISITED = "last";

const settings = definePluginSettings({
    startPage: {
        type: OptionType.SELECT,
        description: "Page to open when Discord launches",
        options: [
            { label: "Friends", value: FRIENDS_PATH, default: true },
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

    return startPage ?? FRIENDS_PATH;
}

let hasRedirected = false;

export default definePlugin({
    name: "StartPageSelector",
    description: "Choose your own start page, rather than whatever Discord decides to change it to",
    authors: [Devs.blodorn],
    tags: ["Customisation", "Utility"],
    settings,

    flux: {
        CONNECTION_OPEN() {
            if (hasRedirected) {
                return;
            }
            hasRedirected = true;

            NavigationRouter.transitionTo(getStartPath());
        }
    }
});
