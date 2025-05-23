/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { useStateFromStores } from "@webpack/common";
import { Channel } from "discord-types/general";

import { ChannelContextPatch, GuildContextPatch, UserContextPatch } from "./components/ctxmenu";
import { GlobalDefaultComponent, TipsComponent, Wallpaper } from "./components/util";
import { WallpaperFreeStore } from "./store";


const settings = definePluginSettings({
    forceReplace: {
        description: "If a dm wallpaper is already set, your custom wallpaper will be used instead.",
        type: OptionType.BOOLEAN,
        default: false,
    },
    stylingTips: {
        description: "",
        type: OptionType.COMPONENT,
        component: TipsComponent,
    },
    globalDefault: {
        description: "Set a global default wallpaper for all channels.",
        type: OptionType.COMPONENT,
        component: GlobalDefaultComponent
    }
});

export default definePlugin({
    name: "WallpaperFree",
    authors: [Devs.Joona],
    description: "Use the DM wallpapers anywhere or set a custom wallpaper",
    patches: [
        {
            find: ".wallpaperContainer,",
            group: true,
            replacement: [
                {
                    match: /return null==(\i).+?\?null:/,
                    replace: "const vcWpFreeCustom = $self.customWallpaper(arguments[0].channel,$1);return !($1||vcWpFreeCustom)?null:"
                },
                {
                    match: /,{chatWallpaperState:/,
                    replace: "$&vcWpFreeCustom||"
                },
                {
                    match: /(\i)=(.{1,50}asset.+?(?=,\i=))(?=.+?concat\(\1)/,
                    replace: "$1=arguments[0].chatWallpaperState.vcWallpaperUrl||($2)"
                },
                {
                    match: /(\i\.isViewable&&)(null!=\i)/,
                    replace: "$1($2||arguments[0].chatWallpaperState.vcWallpaperUrl)"
                },
            ]
        }
    ],
    settings,
    contextMenus: {
        "user-context": UserContextPatch,
        "channel-context": ChannelContextPatch,
        "thread-context": ChannelContextPatch,
        "guild-context": GuildContextPatch,
        "gdm-context": ChannelContextPatch,
    },
    customWallpaper(channel: Channel, wp: Wallpaper | undefined) {
        const { forceReplace } = settings.use(["forceReplace"]);
        const url = useStateFromStores([WallpaperFreeStore], () => WallpaperFreeStore.getUrl(channel));

        if (!forceReplace && wp?.id)
            return wp;

        if (url) {
            return {
                wallpaperId: "id",
                vcWallpaperUrl: url,
                isViewable: true,
            };
        }

        return void 0;
    },
});
