/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
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

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { copyWithToast, getCurrentGuild } from "@utils/discord";
import { classes } from "@utils/misc";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import type { Channel, User } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { GuildRoleStore, Menu } from "@webpack/common";
import type { PropsWithChildren, ReactElement, SVGProps } from "react";

// icons
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ height = 24, width = 24, className, children, viewBox, ...svgProps }: PropsWithChildren<IconProps & { viewBox: string; }>) {
    return (
        <svg
            className={classes(className, "vc-icon")}
            aria-hidden="true"
            role="img"
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
        >
            {children}
        </svg>
    );
}

const AtIcon: IconComponent = props => (
    <Icon {...props} viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M16.44 6.96c.29 0 .51.25.47.54l-.82 6.34c-.02.08-.03.2-.03.34 0 .71.28 1.07.85 1.07.49 0 .94-.21 1.36-.63.43-.42.77-1 1.02-1.72.26-.75.38-1.57.38-2.48 0-1.35-.29-2.54-.87-3.56a5.92 5.92 0 0 0-2.45-2.35 7.68 7.68 0 0 0-3.61-.83c-1.55 0-2.96.37-4.22 1.1a7.66 7.66 0 0 0-2.96 3.07 9.53 9.53 0 0 0-1.09 4.66c0 1.45.26 2.77.78 3.95a6.3 6.3 0 0 0 2.47 2.81 8.3 8.3 0 0 0 4.36 1.05 12.43 12.43 0 0 0 5.35-1.18.5.5 0 0 1 .7.24l.46 1.07c.1.22.02.47-.19.59-.77.43-1.69.77-2.75 1.02-1.23.3-2.48.44-3.76.44-2.18 0-4-.44-5.48-1.33a8.1 8.1 0 0 1-3.27-3.57 11.93 11.93 0 0 1-1.07-5.12c0-2.24.47-4.19 1.4-5.84a9.7 9.7 0 0 1 3.86-3.8c1.62-.9 3.4-1.34 5.36-1.34 1.8 0 3.4.37 4.8 1.12 1.4.72 2.5 1.76 3.28 3.1a8.86 8.86 0 0 1 1.16 4.56c0 1.36-.23 2.57-.7 3.64a5.81 5.81 0 0 1-1.92 2.47c-.82.58-1.76.87-2.81.87a2.4 2.4 0 0 1-1.6-.5c-.4-.35-.65-.78-.73-1.32-.3.55-.74 1-1.36 1.34a4.3 4.3 0 0 1-2.03.48A3.4 3.4 0 0 1 8 16C7.33 15.16 7 14 7 12.5c0-1.14.2-2.16.6-3.05.43-.89 1-1.57 1.73-2.06a4.3 4.3 0 0 1 4.27-.31c.47.29.82.68 1.07 1.16l.3-.95c.06-.2.25-.33.46-.33h1.02Zm-5.06 8.24c.8 0 1.45-.35 1.97-1.04.51-.7.77-1.6.77-2.7 0-.88-.18-1.56-.53-2.03a1.76 1.76 0 0 0-1.5-.73c-.8 0-1.45.35-1.97 1.04a4.28 4.28 0 0 0-.78 2.67c0 .9.17 1.58.51 2.06.36.49.87.73 1.53.73Z"
        />
    </Icon>
);

const ChannelIcon: IconComponent = props => (
    <Icon {...props} viewBox="0 0 24 24">
        <path
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z"
        />
    </Icon>
);

const CopyIcon: IconComponent = props => (
    <Icon {...props} viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M3 16a1 1 0 0 1-1-1v-5a8 8 0 0 1 8-8h5a1 1 0 0 1 1 1v.5a.5.5 0 0 1-.5.5H10a6 6 0 0 0-6 6v5.5a.5.5 0 0 1-.5.5H3Z"
        />
        <path
            fill="currentColor"
            d="M6 18a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4h-3a5 5 0 0 1-5-5V6h-4a4 4 0 0 0-4 4v8Z"
        />
        <path
            fill="currentColor"
            d="M21.73 12a3 3 0 0 0-.6-.88l-4.25-4.24a3 3 0 0 0-.88-.61V9a3 3 0 0 0 3 3h2.73Z"
        />
    </Icon>
);

// settings
const settings = definePluginSettings({
    enableUserMention: {
        description: "Enable 'Copy User/Bot Mention' in user context menus",
        type: OptionType.BOOLEAN,
        default: true,
    },
    enableChannelMention: {
        description: "Enable 'Copy Channel Mention' in channel context menus",
        type: OptionType.BOOLEAN,
        default: true,
    },
    enableThreadMention: {
        description: "Enable 'Copy Thread Mention' in thread context menus",
        type: OptionType.BOOLEAN,
        default: true,
    },
    enableRoleMention: {
        description: "Enable 'Copy Role Mention' in dev context menu (role badges)",
        type: OptionType.BOOLEAN,
        default: true,
    },
});

// helpers
/** substring used to locate Discord's "Copy ID" menu item (ID format: "{context}-devmode-copy-id-{snowflake}") */
const DEVMODE_COPY_ID_SUBSTR = "devmode-copy-id";

/**
 * checks if a menu item with the given ID already exists in children array.
 * prevents duplicate menu items from being added on re-renders.
 */
function menuItemExists(children: Array<ReactElement<any> | null>, menuItemId: string): boolean {
    return children.some(child => child?.props?.id === menuItemId);
}

/**
 * inserts a menu item near Discord's "Copy ID" option for consistent UX.
 * falls back to appending at the end if "Copy ID" is not found (e.g., developer mode off).
 */
function insertMentionMenuItem(
    children: Array<ReactElement<any> | null>,
    menuItemId: string,
    label: string,
    mentionText: string,
    toastMessage: string,
    icon: IconComponent
): void {
    // prevent duplicate entries on re-renders
    if (menuItemExists(children, menuItemId)) return;

    const menuItem = (
        <Menu.MenuItem
            id={menuItemId}
            label={label}
            action={() => copyWithToast(mentionText, toastMessage)}
            icon={icon}
        />
    );

    // try to insert after "Copy ID" for consistent positioning
    const group = findGroupChildrenByChildId(DEVMODE_COPY_ID_SUBSTR, children, true);
    if (group) {
        const copyIdIndex = group.findIndex(c => c?.props?.id?.includes(DEVMODE_COPY_ID_SUBSTR));
        if (copyIdIndex !== -1) {
            group.splice(copyIdIndex + 1, 0, menuItem);
            return;
        }
    }

    // fallback: append to menu (developer mode might be disabled)
    children.push(menuItem);
}

// context menu patches
const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!settings.store.enableUserMention) return;
    if (!user?.id) return;

    const isBot = Boolean(user.bot);
    const displayName = user.globalName || user.username || "User";

    insertMentionMenuItem(
        children,
        "vc-copy-user-mention",
        isBot ? "Copy Bot Mention" : "Copy User Mention",
        `<@${user.id}>`,
        isBot ? `Copied @${displayName} bot mention!` : `Copied @${displayName} mention!`,
        AtIcon
    );
};

/** determines the appropriate toast message based on channel type */
function getChannelToastMessage(channel: Channel): string {
    const name = channel.name || "channel";

    switch (channel.type) {
        case ChannelType.GUILD_VOICE:
        case ChannelType.GUILD_STAGE_VOICE:
            return `Copied ${name} voice mention!`;
        case ChannelType.GUILD_FORUM:
        case ChannelType.GUILD_MEDIA:
            return `Copied ${name} channel mention!`;
        default:
            return `Copied #${name} mention!`;
    }
}

/** determines the appropriate toast message for thread types */
function getThreadToastMessage(channel: Channel): string {
    const name = channel.name || "thread";
    return `Copied ${name} thread mention!`;
}

const ChannelContextMenuPatch: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (!settings.store.enableChannelMention) return;
    if (!channel?.id) return;

    insertMentionMenuItem(
        children,
        "vc-copy-channel-mention",
        "Copy Channel Mention",
        `<#${channel.id}>`,
        getChannelToastMessage(channel),
        ChannelIcon
    );
};

const ThreadContextMenuPatch: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (!settings.store.enableThreadMention) return;
    if (!channel?.id) return;

    insertMentionMenuItem(
        children,
        "vc-copy-thread-mention",
        "Copy Thread Mention",
        `<#${channel.id}>`,
        getThreadToastMessage(channel),
        ChannelIcon
    );
};

const DevContextMenuPatch: NavContextMenuPatchCallback = (children, { id }: { id: string; }) => {
    if (!settings.store.enableRoleMention) return;
    if (!id) return;

    const guild = getCurrentGuild();
    if (!guild?.id) return;

    const role = GuildRoleStore.getRole(guild.id, id);
    if (!role?.id) return;

    const roleName = role.name || "role";

    insertMentionMenuItem(
        children,
        "vc-copy-role-mention",
        "Copy Role Mention",
        `<@&${role.id}>`,
        `Copied @${roleName} role mention!`,
        CopyIcon
    );
};

export default definePlugin({
    name: "CopyMentions",
    authors: [Devs.naystie],
    description: "Adds the ability to copy mentions for users, channels, and roles from their respective context menus",
    settings,

    contextMenus: {
        "user-context": UserContextMenuPatch,
        "user-profile-actions": UserContextMenuPatch,
        "user-profile-overflow-menu": UserContextMenuPatch,
        "channel-context": ChannelContextMenuPatch,
        "thread-context": ThreadContextMenuPatch,
        "dev-context": DevContextMenuPatch,
    },
});
