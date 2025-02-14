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
import { Menu, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { SetColorModal } from "./SetColorModal";

export const DATASTORE_KEY = "equicord-customcolors";
export let colors: Record<string, string> = {};
(async () => {
    colors = await get<Record<string, string>>(DATASTORE_KEY) || {};
})();

const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}(\i\.\i\("?.+?"?\).*?).then\(\i\.bind\(\i,"?(.+?)"?\)\).{0,50}"UserSettings"/);
// needed for color picker to be available without opening settings (ty pindms!!)
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
    if (!colors[userId] || !Settings.plugins.customUserColors.enabled)
        return;

    if (withHash)
        return `#${colors[userId]}`;

    return colors[userId];
}

const settings = definePluginSettings({
    DmList: {
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
    name: "customUserColors",
    description: "Lets you add a custom color to any user, anywhere! Highly recommend to use with typingTweaks and roleColorEverywhere",
    authors: [EquicordDevs.mochienya],
    contextMenus: { "user-context": userContextMenuPatch },
    settings,
    requireSettingsMenu,
    getCustomColorString,

    patches: [
        {
            // this also affects name headers in chats outside of servers
            find: /type:\i\.\i\.Types\.REMIX/,
            replacement: {
                match: /style:"username".*?void 0/,
                replace: "style:{color:$self.colorIfServer(arguments[0])}"
            }
        },
        {
            predicate: () => settings.store.DmList,
            find: /muted:\i=!1,highlighted:\i=!1/,
            replacement: {
                match: /(nameAndDecorators,)/,
                replace: "$1style:{color:$self.colorDMList(arguments[0])},"
            },
        },
    ],

    colorDMList(a: any): string | undefined {
        try {
            // @ts-ignore
            const { id } = UserStore.findByTag(a.avatar.props["aria-label"]);
            // get user id by props on avatars having username as aria label
            const colorString = getCustomColorString(id, true);
            if (colorString)
                return colorString;
            return "inherit";
        } catch { return; } // if you have a group in your dms then discord will crash on load without this
    },

    colorIfServer(a: any): string | undefined {
        const roleColor = a.author.colorString;

        if (a.channel.guild_id && !settings.store.colorInServers)
            return roleColor;

        const color = getCustomColorString(a.message.author.id, true);
        return color ?? roleColor;
    }
});
