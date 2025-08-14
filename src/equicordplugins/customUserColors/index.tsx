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
import { User } from "@vencord/discord-types";
import { extractAndLoadChunksLazy } from "@webpack";
import { Menu } from "@webpack/common";

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

export function getCustomColorString(userId: string | undefined, withHash?: boolean): string | undefined {
    if (!userId) return;
    if (!colors[userId] || !Settings.plugins.CustomUserColors.enabled) return;
    if (withHash) return `#${colors[userId]}`;
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
                // Override colorString with our custom color and disable gradients if applying the custom color.
                match: /(?<=colorString:\i,colorStrings:\i,colorRoleName:\i.*?}=)(\i),/,
                replace: "$self.wrapMessageColorProps($1, arguments[0]),"
            },
            predicate: () => !Settings.plugins.IrcColors.enabled,
            noWarn: true
        },
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /(withDisplayNameStyles\]:\i\}\),children:\i\}\),)/,
                replace: "$1style:{color:`${$self.colorDMList(arguments[0])}`},"
            },
            predicate: () => settings.store.dmList,
        },
        {
            find: '"AvatarWithText"',
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
                match: /(className:.{0,15},colorString:)(\i),/,
                replace: "$1$self.colorInReplyingTo(arguments[0]) ?? $2,",
            },
        },
    ],

    wrapMessageColorProps(colorProps: { colorString: string, colorStrings?: Record<"primaryColor" | "secondaryColor" | "tertiaryColor", string>; }, context: any) {
        try {
            const colorString = this.colorIfServer(context);
            if (colorString === colorProps.colorString) {
                return colorProps;
            }

            return {
                ...colorProps,
                colorString,
                colorStrings: colorProps.colorStrings && {
                    primaryColor: colorString,
                    secondaryColor: undefined,
                    tertiaryColor: undefined
                }
            };
        } catch (e) {
            console.error("Failed to calculate message color strings:", e);
            return colorProps;
        }
    },

    colorDMList(context: any): string | undefined {
        const userId = context?.user?.id;
        const colorString = getCustomColorString(userId, true);
        return colorString ?? "inherit";
    },

    colorIfServer(context: any): string | undefined {
        const userId = context?.message?.author?.id;
        const colorString = context?.author?.colorString;

        if (context?.message?.channel_id === "1337" && userId === "313337") return colorString;

        if (context?.channel?.guild_id && !settings.store.colorInServers) return colorString;

        const color = getCustomColorString(userId, true);
        return color ?? colorString ?? undefined;
    },

    colorInReplyingTo(a: any) {
        const { id } = a.reply.message.author;
        return getCustomColorString(id, true);
    },
});
