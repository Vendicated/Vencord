/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { IconComponent } from "@utils/types";
import type { Channel, Guild } from "@vencord/discord-types";
import { ChannelStore, FluxDispatcher, GuildChannelStore, Menu, ReadStateStore } from "@webpack/common";

const logger = new Logger("hardMute");
const DataKey = "hardMuteData";

let mutedGuilds = new Set<string>();
let mutedChannels = new Set<string>();

function isGuildHardMuted(guildId?: string | null) {
    return guildId != null && mutedGuilds.has(guildId);
}

// true if the channel is hard muted directly or through its server
function isChannelHardMuted(channelId?: string | null, guildId?: string | null) {
    if (guildId && mutedGuilds.has(guildId)) return true;
    if (!channelId) return false;
    if (mutedChannels.has(channelId)) return true;
    return mutedGuilds.has(ChannelStore.getChannel(channelId)?.guild_id ?? "");
}

async function saveMutes() {
    await DataStore.set(DataKey, {
        guilds: [...mutedGuilds],
        channels: [...mutedChannels]
    });
}

// mark everything in hard muted scopes as read, throwing all pending
// notifications away. purely local, discord just forgets about them
function clearMutedNotifications() {
    try {
        const toAck = new Set<string>();

        for (const channelId of mutedChannels) {
            if (ReadStateStore.hasUnread(channelId))
                toAck.add(channelId);
        }

        for (const guildId of mutedGuilds) {
            const guildChannels = GuildChannelStore.getChannels(guildId);
            for (const entry of [...(guildChannels.SELECTABLE ?? []), ...(guildChannels.VOCAL ?? [])]) {
                // entries are { channel } objects in both cases
                const channelId = entry.channel?.id;
                if (ReadStateStore.hasUnread(channelId))
                    toAck.add(channelId);
            }
        }

        for (const channelId of toAck) {
            FluxDispatcher.dispatch({
                type: "MESSAGE_ACK",
                channelId,
                messageId: ReadStateStore.lastMessageId(channelId),
                readStateType: 0
            });
        }

        if (toAck.size > 0)
            logger.info("Cleared", toAck.size, "unread channel(s) in hard muted scopes");
    } catch (e) {
        logger.error("Failed to clear notifications:", e);
    }
}

function toggleGuildMute(guildId: string) {
    if (!mutedGuilds.delete(guildId))
        mutedGuilds.add(guildId);

    saveMutes();
    clearMutedNotifications();
}

function toggleChannelMute(channelId: string) {
    if (!mutedChannels.delete(channelId))
        mutedChannels.add(channelId);

    saveMutes();
    clearMutedNotifications();
}

const BellOffIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        width={width}
        height={height}
        className={className}
    >
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.93 6 11v5l-2 2v1h16v-1l-2-2zM3.41 2.86L2 4.27l4.99 4.99C6.36 10.31 6 11.61 6 13v5l-2 2v1h14.73l2 2 1.41-1.41L3.41 2.86z" />
    </svg>
);

interface ChannelContextProps {
    channel?: Channel;
}

const ChannelContextMenuPatch: NavContextMenuPatchCallback = (children, props: ChannelContextProps) => {
    const channel = props?.channel;
    // only server channels and threads, dms stay untouched
    if (!channel?.guild_id) return;

    children.push(
        <Menu.MenuItem
            id="vc-hard-mute-channel"
            label={isChannelHardMuted(channel.id) ? "Remove Hard Mute" : "Hard Mute"}
            action={() => toggleChannelMute(channel.id)}
            icon={BellOffIcon}
        />
    );
};

interface GuildContextProps {
    guild?: Guild;
}

const GuildContextMenuPatch: NavContextMenuPatchCallback = (children, props: GuildContextProps) => {
    const guild = props?.guild;
    if (!guild) return;

    children.push(
        <Menu.MenuItem
            id="vc-hard-mute-guild"
            label={isGuildHardMuted(guild.id) ? "Remove Hard Mute" : "Hard Mute"}
            action={() => toggleGuildMute(guild.id)}
            icon={BellOffIcon}
        />
    );
};

export default definePlugin({
    name: "HardMute",
    description: "Hard mute servers and channels from the context menu. No @everyone, @here, @role, or @member pings.",
    tags: ["Notifications", "Organisation"],
    authors: [Devs.f3tch],

    patches: [
        {
            // make discord itself treat hard muted scopes as muted.
            // this gives us the native behaviour for free: dimmed channel
            // names and server icons, no badges, no unread indicators
            find: '"UserGuildSettingsStore"',
            replacement: [
                {
                    match: /isChannelMuted\((\i),(\i)\)\{/,
                    replace: "$&if($self.isChannelHardMuted($2,$1))return true;"
                },
                {
                    match: /isCategoryMuted\((\i),(\i)\)\{/,
                    replace: "$&if($self.isChannelHardMuted($2,$1))return true;"
                },
                {
                    match: /(?<=)isMuted\((\i)\)\{/,
                    replace: "$&if($self.isGuildHardMuted($1))return true;"
                }
            ]
        },
        {
            // stop messages in hard muted scopes from ever being counted
            // as mentions in the first place. same spot noBlockedMessages
            // patches for blocked users
            find: '"ReadStateStore"',
            replacement: {
                match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                replace: (_, props) => `if($self.isChannelHardMuted(${props}.message?.channel_id))return;`
            }
        },
        {
            // the guild read state store keeps its own mention totals for
            // the server icon badges, block those too
            find: "getTotalMentionCount(){",
            replacement: {
                match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                replace: (_, props) => `if($self.isChannelHardMuted(${props}.message?.channel_id))return;`
            }
        },
        {
            // stop desktop notifications and sounds from hard muted scopes.
            // same spots onePingPerDM patches, stays compatible with it
            find: '"NotificationStore"',
            replacement: [
                {
                    match: /(\i\.\i\.getDesktopType\(\)===\i\.\i\.NEVER)\)/,
                    replace: "$&if($self.isChannelHardMuted(arguments[0]?.message?.channel_id))return;else "
                },
                {
                    match: /sound:(?!\$self\.isChannelHardMuted)((?:!\$self\.[^(]*\([^)]*\)\?undefined:)?)((?:\i\?)\i:void 0,volume:\i,onClick)/,
                    replace: "sound:$self.isChannelHardMuted(arguments[0]?.message?.channel_id)?undefined:$1$2"
                }
            ]
        }
    ],

    contextMenus: {
        "channel-context": ChannelContextMenuPatch,
        "thread-context": ChannelContextMenuPatch,
        "guild-context": GuildContextMenuPatch,
        "guild-header-popout": GuildContextMenuPatch
    },

    flux: {
        // read messages of hard muted scopes right away, so even if some
        // other state breaks, nothing can ever pile up. deferred because
        // discord does not allow dispatching in the middle of a dispatch
        MESSAGE_CREATE({ message }: { message?: { id: string; channel_id: string; }; }) {
            if (!message?.channel_id || !isChannelHardMuted(message.channel_id)) return;

            const { channel_id: channelId, id: messageId } = message;
            setTimeout(() => {
                try {
                    FluxDispatcher.dispatch({
                        type: "MESSAGE_ACK",
                        channelId,
                        messageId,
                        readStateType: 0
                    });
                } catch (e) {
                    logger.error("Failed to ack muted message:", e);
                }
            }, 0);
        }
    },

    async start() {
        const data = await DataStore.get<{ guilds?: string[]; channels?: string[]; }>(DataKey);
        mutedGuilds = new Set(data?.guilds ?? []);
        mutedChannels = new Set(data?.channels ?? []);

        logger.info("Loaded", mutedGuilds.size, "hard muted server(s) and", mutedChannels.size, "hard muted channel(s)");

        // read states arrive from the server shortly after startup, so
        // throw away the notifications of hard muted scopes a few times
        clearMutedNotifications();
        for (const delay of [1000, 3000, 6000])
            setTimeout(clearMutedNotifications, delay);
    },

    isChannelHardMuted,
    isGuildHardMuted
});


