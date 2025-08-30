/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Channel, Guild, User } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { Menu, SelectedGuildStore } from "@webpack/common";

import settings from "../settings";
import AudioPlayer from "./AudioPlayer";
import { getUserName } from "./utils";

const TTSIcon = findByCodeLazy('"evenodd",', '"M12 22a10 10 0 1');

function toggleItemInArray(array: string[], item: string) {
    const indexOfItem = array.indexOf(item);
    if (indexOfItem === -1) {
        array.push(item);
    } else {
        array = array.splice(indexOfItem, 1);
    }
}

export const PatchGuildContextMenu: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild; }) => {
    const group = findGroupChildrenByChildId(["mute-guild", "unmute-guild"], children);

    group?.push(
        <Menu.MenuCheckboxItem
            id="bettertts-subscribe-guild"
            label="TTS Subscribe Guild"
            checked={settings.store.subscribedGuilds.includes(guild.id)}
            action={() => toggleItemInArray(settings.store.subscribedGuilds, guild.id)}
        />
    );
};
export const PatchChannelContextMenu: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    const group = findGroupChildrenByChildId(["mute-channel", "unmute-channel"], children);

    group?.push(
        <Menu.MenuCheckboxItem
            id="bettertts-subscribe-channel"
            label="TTS Subscribe Channel"
            checked={settings.store.subscribedChannels.includes(channel.id)}
            action={() => toggleItemInArray(settings.store.subscribedChannels, channel.id)}
        />
    );
};
export const PatchUserContextMenu: NavContextMenuPatchCallback = (children, { user, channel }: { user: User; channel: Channel; }) => {
    const groupUser = findGroupChildrenByChildId(["mute"], children);
    const groupChannel = findGroupChildrenByChildId(["mute-channel", "unmute-channel"], children);

    groupUser?.push(
        <Menu.MenuCheckboxItem
            id="bettertts-mute-user"
            label="Mute TTS Messages"
            checked={settings.store.mutedUsers.includes(user.id)}
            action={() => toggleItemInArray(settings.store.mutedUsers, user.id)}
        />,
        <Menu.MenuItem
            id="bettertts-speak-announcement"
            label="Speak Announcement"
            action={() => AudioPlayer.startTTS(`${getUserName(user.id, SelectedGuildStore.getGuildId())} joined`, true)}
            icon={TTSIcon}
        />
    );
    groupChannel?.push(
        <Menu.MenuCheckboxItem
            id="bettertts-subscribe-channel"
            label="TTS Subscribe Channel"
            checked={settings.store.subscribedChannels.includes(channel.id)}
            action={() => toggleItemInArray(settings.store.subscribedChannels, channel.id)}
        />
    );
};

/* function TTSIcon() { // TODO: add to icons library
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                fillRule="evenodd"
                d="M12 22a10 10 0 1 0-8.45-4.64c.13.19.11.44-.04.61l-2.06 2.37A1 1 0 0 0 2.2 22H12Zm2-5.26c0 .61.56 1.09 1.14.87a6 6 0 0 0 0-11.22c-.58-.22-1.14.26-1.14.87v.1c0 .45.32.83.73 1.03a4 4 0 0 1 0 7.22c-.41.2-.73.58-.73 1.04v.09Zm0-3.32c0 .69.7 1.15 1.18.65a2.99 2.99 0 0 0 0-4.14c-.48-.5-1.18-.04-1.18.65v2.84ZM12 7a1 1 0 0 0-1-1h-.05a1 1 0 0 0-.75.34L7.87 9H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1.87l2.33 2.66a1 1 0 0 0 .75.34H11a1 1 0 0 0 1-1V7Z"
                clipRule="evenodd"
            />
        </svg>
    );
} */

