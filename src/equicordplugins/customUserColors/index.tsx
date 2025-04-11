/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { get } from "@api/DataStore";
import { definePluginSettings, Settings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { extractAndLoadChunksLazy } from "@webpack";
import { Menu } from "@webpack/common";
import { User } from "discord-types/general";

import { SetColorModal } from "./SetColorModal";

export const DATASTORE_KEY = "equicord-customcolors";
export let colors: Record<string, string> = {};


(async () => {
    colors = await get<Record<string, string>>(DATASTORE_KEY) || {};
})();

// needed for color picker to be available without opening settings (ty pindms!!)
const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}(\i\.\i\("?.+?"?\).*?).then\(\i\.bind\(\i,"?(.+?)"?\)\).{0,50}"UserSettings"/);
const ColorIcon = () => {
    return (
        <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            width="18"
            height="18"
        >
            <path d="m9.17 12.67 2.16 2.16a1 1 0 0 0 .99.25l2.57-.75A3 3 0 0 0 16.6 13l4.91-8.05a1.8 1.8 0 0 0-2.47-2.47L11 7.39a3 3 0 0 0-1.32 1.72l-.75 2.57a1 1 0 0 0 .25.99ZM8.03 13.14c.27.07.51.23.7.43l1.7 1.7c.2.19.36.43.43.7A4 4 0 0 1 7 21H2a1 1 0 1 1 0-2c.68 0 1.13-.77 1.04-1.44a4 4 0 0 1 5-4.42Z" />
        </svg>
    );
};

const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (user?.id == null) return;

    const setCustomColorItem = (
        <Menu.MenuItem
            label="Set Color"
            id="set-color"
            icon={ColorIcon}
            action={async () => {
                await requireSettingsMenu();
                openModal(modalProps => <SetColorModal userId={user.id} modalProps={modalProps} />);
            }}
        />
    );

    children.push(<Menu.MenuSeparator />, setCustomColorItem);

};

export function getCustomColorString(userId: string, withHash?: boolean): string | undefined {
    if (!colors[userId] || !Settings.plugins.CustomUserColors.enabled)
        return;

    if (withHash)
        return `#${colors[userId]}`;

    return colors[userId];
}

const settings = definePluginSettings({
    dmList: {
        type: OptionType.BOOLEAN,
        description: "Users with custom colors defined will have their name in the dm list colored",
        default: true,
    },
    colorInServers: {
        type: OptionType.BOOLEAN,
        description: "If name colors should be changed within servers",
        default: true,
    }
});

export default definePlugin({
    name: "CustomUserColors",
    description: "Lets you add a custom color to any user, anywhere! Highly recommend to use with typingTweaks and roleColorEverywhere",
    authors: [EquicordDevs.mochienya],
    contextMenus: { "user-context": userContextMenuPatch },
    settings,
    requireSettingsMenu,
    getCustomColorString,

    patches: [
        {
            // this also affects name headers in chats outside of servers
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /\i.gradientClassName]\),style:/,
                replace: "$&{color:$self.colorIfServer(arguments[0])},_style:"
            },
            predicate: () => !Settings.plugins.IrcColors.enabled
        },
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /(subText:\i\(\),)/,
                replace: "$1style:{color:`${$self.colorDMList(arguments[0])}`},"
            },
            predicate: () => settings.store.dmList,
        },
        {
            find: "!1,wrapContent",
            replacement: [
                {
                    match: /(\}=\i)/,
                    replace: ",style$1"
                },
                {
                    match: /(?<=nameAndDecorators,)/,
                    replace: "style:style||{},"
                },
            ],
            predicate: () => settings.store.dmList,
        },
        {
            find: '"Reply Chain Nudge")',
            replacement: {
                match: /(,color:)(\i),/,
                replace: "$1$self.colorInReplyingTo(arguments[0]) ?? $2,",
            },
        },
    ],

    colorDMList(a: any): string | undefined {
        const userId = a?.user?.id;
        if (!userId) return;
        const colorString = getCustomColorString(userId, true);
        if (colorString) return colorString;
        return "inherit";
    },

    colorIfServer(a: any): string | undefined {
        const roleColor = a.author?.colorString;

        if (a?.channel?.guild_id && !settings.store.colorInServers) return roleColor;

        const color = getCustomColorString(a.message.author.id, true);
        return color ?? roleColor ?? undefined;
    },

    colorInReplyingTo(a: any) {
        const { id } = a.reply.message.author;
        return getCustomColorString(id, true);
    },
});
