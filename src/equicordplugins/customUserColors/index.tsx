/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { get } from "@api/DataStore";
import { definePluginSettings, migratePluginSettings, Settings } from "@api/Settings";
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

const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (user?.id == null) return;

    const setCustomColorItem = (
        <Menu.MenuItem
            label="Set Color"
            id="set-color"
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


migratePluginSettings("CustomUserColors", "customUserColors");
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
            find: ".USERNAME),{",
            replacement: {
                match: /style:"username"===.{0,25}void 0/,
                replace: "style:{color:$self.colorIfServer(arguments[0])}"
            },
            noWarn: true,
        },
        {
            predicate: () => settings.store.dmList,
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /(highlighted:\i,)/,
                replace: "$1style:{color:`${$self.colorDMList(arguments[0])}`},"
            },
        },
        {
            predicate: () => settings.store.dmList,
            find: "!1,wrapContent",
            replacement: [
                {
                    match: /(innerClassName:\i)(\}=\i)/,
                    replace: "$1,style$2"
                },
                {
                    match: /(nameAndDecorators,)/,
                    replace: "$1style,"
                },
            ],
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
    }
});
