/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { IconComponent, ReporterTestable } from "@utils/types";
import { Button, ChannelStore, Menu, RelationshipStore, SelectedChannelStore, SelectedGuildStore, UserStore } from "@webpack/common";

import { Filter, LoggingMode, settings, TrackingMode } from "./settings";

interface VoiceStateChangeEvent {
    guildId: string;
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream: boolean;
    selfVideo: boolean;
}

function getContent({ channelId, oldChannelId }: VoiceStateChangeEvent) {
    if (channelId !== oldChannelId) {
        if (channelId) return !oldChannelId
            ? `joined <#${channelId}>`
            : `moved to <#${channelId}> from <#${oldChannelId}>`;
        if (oldChannelId) return `leaved <#${oldChannelId}>`;
    }
    return "";
}

const IdIcon: IconComponent = ({ height = 24, width = 24, className }) => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            width={width}
            height={height}
            className={className}
            role="img"
        >
            <path fill="currentColor" d="M15.3 14.48c-.46.45-1.08.67-1.86.67h-1.39V9.2h1.39c.78 0 1.4.22 1.86.67.46.45.68 1.22.68 2.31 0 1.1-.22 1.86-.68 2.31Z"></path>
            <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H5Zm1 15h2.04V7.34H6V17Zm4-9.66V17h3.44c1.46 0 2.6-.42 3.38-1.25.8-.83 1.2-2.02 1.2-3.58s-.4-2.75-1.2-3.58c-.79-.83-1.92-1.25-3.38-1.25H10Z"
            >
            </path>
        </svg>
    );
};

function MakeContextCallback(name: "Guild" | "Channel" | "User"): NavContextMenuPatchCallback {
    return (children, props) => {
        const _name = name.toLowerCase();
        const value = props[_name];
        const _id_ = value.id;

        if (!value) return;
        if (name === "Channel" && ![13, 2].includes(value.type)) return;
        if (props.label === getIntlMessage("CHANNEL_ACTIONS_MENU_LABEL")) return;

        const add_css_id = `vc-add-${_name}-id`;
        const remove_css_id = `vc-remove-${_name}-id`;
        const ids_key = `${_name}s`;

        const devContainer = findGroupChildrenByChildId(`devmode-copy-id-${_id_}`, children);

        const add_action = () => {
            if (!_id_) return;
            const ids_str: string = settings.store[ids_key];
            const ids = (ids_str?.split(",") || []).map(i => i.trim()).filter(i => i !== "");
            if (ids.includes(value.id)) return;
            ids.push(value.id);
            settings.store[ids_key] = ids.join(",");
        };

        const remove_action = () => {
            if (!_id_) return;
            const ids_str: string = settings.store[ids_key];
            const ids = (ids_str?.split(",") || []).map(i => i.trim()).filter(i => i !== "");
            if (!ids.includes(value.id)) return;
            settings.store[ids_key] = ids.filter(i => i !== value.id).join(",");
        };

        (devContainer ?? children).splice(-1, 0,
            <Menu.MenuItem
                id={add_css_id}
                label={`Add ${name} To List`}
                action={add_action}
                icon={IdIcon}
            />,
            <Menu.MenuItem
                id={remove_css_id}
                label={`Remove ${name} From List`}
                action={remove_action}
                icon={IdIcon}
            />
        );
    };
}

export default definePlugin({
    name: "vcLogger",
    description: "Logging users (join, leave, move) between voice channels in chat",
    tags: ["Chat", "Accessibility", "Notifications", "Activity"],
    authors: [Devs.uu],
    reporterTestable: ReporterTestable.None,

    settings,

    contextMenus: {
        "guild-context": MakeContextCallback("Guild"),
        "channel-context": MakeContextCallback("Channel"),
        "thread-context": MakeContextCallback("Channel"),
        "gdm-context": MakeContextCallback("Channel"),
        "user-context": MakeContextCallback("User"),
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceStateChangeEvent[]; }) {
            if (!settings.store.enable) return;

            const joinedVoiceChannelId = SelectedChannelStore.getVoiceChannelId() as string;
            const joinedGuildId = ChannelStore.getChannel(joinedVoiceChannelId)?.guild_id;

            const CurrentlySelectedGuildId = SelectedGuildStore.getGuildId() as string;
            const CurrentlySelectedChannelId = SelectedChannelStore.getCurrentlySelectedChannelId(CurrentlySelectedGuildId) as string;

            const user = UserStore.getCurrentUser();
            const myId = user.id;

            const guilds = (settings.store.guilds?.split(",") || []).map(i => i.trim()).filter(i => i !== "");
            const channels = (settings.store.channels?.split(",") || []).map(i => i.trim()).filter(i => i !== "");
            const users = (settings.store.users?.split(",") || []).map(i => i.trim()).filter(i => i !== "");

            const { guildsFilter, channelsFilter, usersFilter, trackingMode, loggingMode, ignoreBlockedUsers, trackUsers, self } = settings.store;

            if (voiceStates.length > 3) return;

            for (var state of voiceStates) {
                const { userId, channelId, oldChannelId, guildId } = state;
                const isMe = userId === myId;
                const author = UserStore.getUser(userId);

                let enableFilters = true;

                if (!self && isMe) continue;

                if (trackUsers && (users.length && users.includes(userId) && usersFilter === Filter.WHITE)) enableFilters = false;

                if (enableFilters) {
                    if (ignoreBlockedUsers) if (RelationshipStore.isBlocked(userId)) continue;

                    if (users.length && usersFilter !== Filter.NONE) {
                        if (users.includes(userId) && usersFilter === Filter.BLACK) continue;
                        if (!users.includes(userId) && usersFilter === Filter.WHITE) continue;
                    }
                    if (channels.length && channelsFilter !== Filter.NONE) {
                        if (channels.includes(channelId as string) && channelsFilter === Filter.BLACK) continue;
                        if (!channels.includes(channelId as string) && channelsFilter === Filter.WHITE) continue;
                    }
                    if (guilds.length && guildsFilter !== Filter.NONE) {
                        if (guilds.includes(guildId) && guildsFilter === Filter.BLACK) continue;
                        if (!guilds.includes(guildId) && guildsFilter === Filter.WHITE) continue;
                    }

                    switch (trackingMode) {
                        case TrackingMode.CHANNEL:
                            if (![channelId, oldChannelId].includes(joinedVoiceChannelId)) continue;
                            break;
                        case TrackingMode.GUILD:
                            if (guildId !== joinedGuildId) continue;
                            break;
                        case TrackingMode.SELECTED_GUILD:
                            if (guildId !== CurrentlySelectedGuildId) continue;
                            break;
                        case TrackingMode.SELECTED_CHANNEL:
                            if (![channelId, oldChannelId].includes(CurrentlySelectedChannelId)) continue;
                            break;
                    }

                    if (!joinedVoiceChannelId && (trackingMode === TrackingMode.CHANNEL || trackingMode === TrackingMode.GUILD || loggingMode === LoggingMode.JOINED)) continue;
                }

                const content = getContent(state);
                if (!content) continue;

                const _channelId = loggingMode === LoggingMode.JOINED
                    ? joinedVoiceChannelId
                    : CurrentlySelectedChannelId;

                if (!_channelId) continue;

                const msg = sendBotMessage(_channelId, { content, author });
            }
        }
    },

    settingsAboutComponent: () => {
        const resetGuilds = () => {
            settings.store.guilds = "";
        };

        const resetChannels = () => {
            settings.store.channels = "";
        };

        const resetUsers = () => {
            settings.store.users = "";
        };

        const reset = () => {
            resetGuilds();
            resetChannels();
            resetUsers();
            settings.store.enable = true;
            settings.store.self = false;
            settings.store.ignoreBlockedUsers = false;
            settings.store.trackUsers = false;
            settings.store.channelsFilter = Filter.NONE;
            settings.store.guildsFilter = Filter.NONE;
            settings.store.usersFilter = Filter.NONE;
            settings.store.trackingMode = TrackingMode.CHANNEL;
            settings.store.loggingMode = LoggingMode.SELECTED;
        };

        return (
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "1rem",
                }}
                className={"vc-logger-buttons"}
            >
                <Button onClick={resetGuilds} > Reset Guilds </Button>
                <Button onClick={resetChannels} > Reset Channels </Button>
                <Button onClick={resetUsers} > Reset Users </Button>
                <Button onClick={reset} > Reset Settings </Button>
            </div>
        );
    }
});
