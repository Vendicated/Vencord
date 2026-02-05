/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { ChannelStore, RelationshipStore, UserGuildSettingsStore } from "@webpack/common";

export const enum HideWhen {
    Never = "never",
    WhenIndefinite = "when-indefinite",
    Always = "always"
}

export const settings = definePluginSettings({
    hideMutedPrivateChannels: {
        description: "Hide muted private channels",
        type: OptionType.SELECT,
        options: [
            { label: "Never", value: HideWhen.Never },
            { label: "When indefinite", value: HideWhen.WhenIndefinite },
            { label: "Always", value: HideWhen.Always, default: true }
        ],
        restartNeeded: false
    },

    hidePrivateChannelsOfIgnoredUsers: {
        description: "Hide private channels of ignored users",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },

    avoidHidingTheFocusedPrivateChannel: {
        description: "Avoid hiding the focused private channel",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    }
})

export default definePlugin({
    name: "HideMuted",
    description: "Hide muted channels from the DMs list",
    authors: [Devs.LoganDark],

    settings,

    patches: [
        { // private channel list
            find: ";renderDM=(",
            replacement: [
                {
                    match: /(?<=let(?:{[^}]*}=(?:[^,;(]+),)*{[^}]*privateChannelIds:\i[^}]*}=)([^,;]+)/g,
                    replace: "$self.mapProps($1)"
                },
                {
                    match: /((?:\i\.)*\i)\.privateChannelIds\./g,
                    replace: "$self.mapPrivateChannelIds($1.privateChannelIds,$1.selectedChannelId,$1.channels)."
                }
            ]
        },
        { // alt+arrows
            // ;o>=a.length?o=0:o<0&&(o=a.length-1);
            find: /;(\i)>=(\i)\.length\?\1=0:\1<0&&\(\1=\2\.length-1\);/,
            replacement: [
                {
                    match: /(?<=[{;]let{channelId:(\i),[^;]+?,\i=)((?:\i\.)+getPrivateChannelIds\(\))/g,
                    replace: "$self.mapPrivateChannelIds($2, $1)"
                }
            ]
        }
    ],

    mapPrivateChannelIds(privateChannelIds: string[], selectedChannelId: string, channels?: Record<string, Channel>) {
        const {
            store: {
                hideMutedPrivateChannels,
                hidePrivateChannelsOfIgnoredUsers,
                avoidHidingTheFocusedPrivateChannel
            }
        } = settings;

        let muteFilter: (id: string) => boolean = () => true;

        if (hideMutedPrivateChannels === HideWhen.Always) {
            const mutedChannels = UserGuildSettingsStore.getMutedChannels(null);
            muteFilter = (id: string) => !mutedChannels.has(id);
        } else if (hideMutedPrivateChannels === HideWhen.WhenIndefinite) {
            const channelOverrides = UserGuildSettingsStore.getChannelOverrides(null);
            muteFilter = (id: string) => {
                const { muted, mute_config } = channelOverrides[id];
                return !muted || mute_config !== null;
            }
        }

        let ignoreFilter: (id: string) => boolean = () => true;

        if (hidePrivateChannelsOfIgnoredUsers) {
            const channelsNonNull = channels ?? ChannelStore.getMutablePrivateChannels();
            const ignoredUserIds = new Set(RelationshipStore.getIgnoredIDs());
            ignoreFilter = (id: string) => {
                const channel = channelsNonNull[id];
                if (channel?.type !== ChannelType.DM) return true;
                return !ignoredUserIds.has(channel.recipients[0]);
            }
        }

        let shouldExclude: (id: string) => boolean = () => false;

        if (avoidHidingTheFocusedPrivateChannel) {
            shouldExclude = (id: string) => id === selectedChannelId;
        }

        return privateChannelIds.filter(id => shouldExclude(id) || (muteFilter(id) && ignoreFilter(id)));
    },

    mapProps(props: any) {
        const { privateChannelIds: unmapped, selectedChannelId, channels } = props;
        const privateChannelIds = this.mapPrivateChannelIds(unmapped, selectedChannelId, channels);
        return { ...props, privateChannelIds };
    }
})
