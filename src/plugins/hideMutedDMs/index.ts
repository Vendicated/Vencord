/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelType } from "@vencord/discord-types/enums";
import { ChannelStore, RelationshipStore, UserGuildSettingsStore, useStateFromStores } from "@webpack/common";

export const enum HideWhen {
    Never = "never",
    WhenIndefinite = "when-indefinite",
    Always = "always"
}

export const settings = definePluginSettings({
    hideMutedPrivateChannels: {
        description: "When to hide private channels of muted users",
        type: OptionType.SELECT,
        options: [
            { label: "Never", value: HideWhen.Never },
            { label: "When indefinite", value: HideWhen.WhenIndefinite },
            { label: "Always", value: HideWhen.Always, default: true }
        ]
    },

    hidePrivateChannelsOfIgnoredUsers: {
        description: "Whether to hide private channels of ignored users",
        type: OptionType.BOOLEAN,
        default: false
    },

    avoidHidingTheFocusedPrivateChannel: {
        description: "Whether to avoid hiding the focused private channel",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "HideMutedDMs",
    description: "Hide muted channels from the DMs list",
    authors: [Devs.LoganDark],

    settings,

    patches: [
        { // private channel list
            find: ";renderDM=(",
            replacement: {
                // (0,i.jsx)(J,{...e,density:t,channels:E,privateChannelIds:A,listRef:C,theme:I??a,version:S})
                match: /(?<=\(0,\i\.jsx\)\(\i,){\.\.\.\i,[^}]*?privateChannelIds:[^}]+}/,
                replace: "$self.usePrivateChannelListProps($&)"
            }
        },
        { // alt+arrows
            find: 'binds:["alt+down"]',
            replacement: {
                // let{channelId:i,path:r,basePath:a}=o.A.getState(),s=_.A.getPrivateChannelIds(),
                match: /(?<=[{;]let{channelId:(\i),[^;]+?,\i=)(?:\i\.)+getPrivateChannelIds\(\)/,
                replace: "$self.mapPrivateChannelIds($&,$1)"
            }
        }
    ],

    mapPrivateChannelIds(privateChannelIds: string[], selectedChannelId?: string | null) {
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
                const channelOverride = channelOverrides[id];
                return !channelOverride?.muted || channelOverride.mute_config?.end_time != null;
            };
        }

        let ignoreFilter: (id: string) => boolean = () => true;

        if (hidePrivateChannelsOfIgnoredUsers) {
            const ignoredUserIds = new Set(RelationshipStore.getIgnoredIDs());
            ignoreFilter = (id: string) => {
                const channel = ChannelStore.getChannel(id);
                if (channel?.type !== ChannelType.DM) return true;
                return !ignoredUserIds.has(channel.recipients[0]);
            };
        }

        let shouldExclude: (id: string) => boolean = () => false;

        if (avoidHidingTheFocusedPrivateChannel) {
            shouldExclude = (id: string) => id === selectedChannelId;
        }

        return privateChannelIds.filter(id => shouldExclude(id) || (muteFilter(id) && ignoreFilter(id)));
    },

    usePrivateChannelListProps<T extends { privateChannelIds: string[]; selectedChannelId?: string | null; }>(props: T): T {
        const {
            hideMutedPrivateChannels,
            hidePrivateChannelsOfIgnoredUsers,
            avoidHidingTheFocusedPrivateChannel
        } = settings.use();

        const privateChannelIds = useStateFromStores(
            [UserGuildSettingsStore, RelationshipStore],
            () => this.mapPrivateChannelIds(props.privateChannelIds, props.selectedChannelId),
            [hideMutedPrivateChannels, hidePrivateChannelsOfIgnoredUsers, avoidHidingTheFocusedPrivateChannel, props.privateChannelIds, props.selectedChannelId],
            (old, current) => old.length === current.length && old.every((id, i) => id === current[i])
        );

        return { ...props, privateChannelIds };
    }
});
