/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { get, set } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import type { MessageJSON, User } from "@vencord/discord-types";
import { Menu, PresenceStore, SelectedChannelStore, UserStore } from "@webpack/common";

const DATA_KEY = "AlwaysNotify_UserIds";

let notifiedUsers = new Set<string>();

const pluginSettings = definePluginSettings({
    bypassDnd: {
        type: OptionType.BOOLEAN,
        description: "Notify while your status is Do Not Disturb",
        default: true
    },
    bypassStreamerMode: {
        type: OptionType.BOOLEAN,
        description: "Notify while Streamer Mode is hiding notifications",
        default: true
    },
    bypassGameFocus: {
        type: OptionType.BOOLEAN,
        description: "Notify while a game is focused, instead of leaving it to the in-game overlay",
        default: true
    },
    bypassNotificationsOff: {
        type: OptionType.BOOLEAN,
        description: "Notify even when Discord's desktop notifications are turned off entirely",
        default: false
    },
    bypassOpenChannel: {
        type: OptionType.BOOLEAN,
        description: "Notify even while you are already reading the channel the message was sent in",
        default: false
    }
});

async function toggleUser(userId: string) {
    if (!notifiedUsers.delete(userId)) {
        notifiedUsers.add(userId);
    }

    await set(DATA_KEY, notifiedUsers);
}

const isReadingChannel = (channelId: string) => document.hasFocus() && SelectedChannelStore.getChannelId() === channelId;

const UserContext: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (!user || user.id === UserStore.getCurrentUser().id) {
        return;
    }

    children.unshift(
        <Menu.MenuCheckboxItem
            id="vc-always-notify"
            label="Always Show Notifications"
            checked={notifiedUsers.has(user.id)}
            action={() => toggleUser(user.id)}
        />,
        <Menu.MenuSeparator />
    );
};

export default definePlugin({
    name: "AlwaysNotify",
    description: "Right click a user to always get a desktop notification for their messages, even in muted or mentions-only channels",
    tags: ["Notifications"],
    authors: [Devs.Nazzer],
    settings: pluginSettings,

    contextMenus: {
        "user-context": UserContext
    },

    patches: [{
        find: '"NotificationStore"',
        replacement: [
            {
                match: /\(0,\i\.\i\)\(\i,\i,!\i\)(?=,\i=\i\.\i\.getNotifyMessagesInSelectedChannel\(\))/,
                replace: "$self.forceNotify(arguments[0].message)||$&"
            },
            {
                match: /null!=\i\.getFocusedPID\(\)(?=&&!\i\.isNotificationDisabled\()/,
                replace: '$&&&!$self.bypass(arguments[0].message,"bypassGameFocus")'
            },
            {
                match: /\i\.\i\.getDesktopType\(\)===\i\.\i\.NEVER(?=\)return \i\(\i\),\i&&\i\.\i\.playNotificationSound\()/,
                replace: '$&&&!$self.bypass(arguments[0].message,"bypassNotificationsOff")'
            },
            {
                match: /(?<=notif_type:"MESSAGE_CREATE".{0,400}?)omitViewTracking:/,
                replace: 'overrideStreamerMode:$self.bypass(arguments[0].message,"bypassStreamerMode")||void 0,$&'
            }
        ]
    }],

    forceNotify(message: MessageJSON) {
        const authorId = message.author.id;
        const currentUserId = UserStore.getCurrentUser().id;

        if (authorId === currentUserId || !notifiedUsers.has(authorId)) {
            return false;
        }

        if (!pluginSettings.store.bypassOpenChannel && isReadingChannel(message.channel_id)) {
            return false;
        }

        return pluginSettings.store.bypassDnd || PresenceStore.getStatus(currentUserId) !== "dnd";
    },

    bypass(message: MessageJSON, setting: keyof typeof pluginSettings.store) {
        return pluginSettings.store[setting] && this.forceNotify(message);
    },

    async start() {
        notifiedUsers = await get(DATA_KEY) ?? new Set();
    },

    stop() {
        notifiedUsers.clear();
    }
});
