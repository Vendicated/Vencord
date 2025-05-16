/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { openModal } from "@utils/modal";
import { ChannelStore, FluxDispatcher, Menu } from "@webpack/common";

import { SetCustomWallpaperModal, SetDiscordWallpaperModal } from "./modal";
import { ChatWallpaperStore, fetchWallpapers } from "./util";


const addWallpaperMenu = (channelId?: string, guildId?: string) => {
    const setWallpaper = (url?: string) => {
        FluxDispatcher.dispatch({
            // @ts-ignore
            type: "VC_WALLPAPER_FREE_CHANGE",
            channelId,
            guildId,
            url,
        });
    };
    return (
        <Menu.MenuItem label="Wallpaper Free" key="vc-wpfree-menu" id="vc-wpfree-menu">
            <Menu.MenuItem
                label="Set custom wallpaper"
                id="vc-wpfree-set-custom"
                action={() => openModal(props => <SetCustomWallpaperModal props={props} onSelect={setWallpaper} />)}
            />
            <Menu.MenuItem
                label="Set a Discord wallpaper"
                id="vc-wpfree-set-discord"
                action={async () => {
                    ChatWallpaperStore.shouldFetchWallpapers && await fetchWallpapers();
                    openModal(props => <SetDiscordWallpaperModal props={props} onSelect={setWallpaper} />);
                }}
            />
            <Menu.MenuSeparator />
            <Menu.MenuItem
                label="Remove Custom Wallpaper"
                id="vc-wpfree-remove"
                color="danger"
                action={() => setWallpaper(void 0)}
            />
        </Menu.MenuItem>
    );
};

const UserContextPatch: NavContextMenuPatchCallback = (children, args) => {
    if (!args.user) return;
    const dmChannelId = ChannelStore.getDMFromUserId(args.user.id);
    children.push(addWallpaperMenu(dmChannelId));
};

const ChannelContextPatch: NavContextMenuPatchCallback = (children, args) => {
    if (!args.channel) return;
    children.push(addWallpaperMenu(args.channel.id));
};

const GuildContextPatch: NavContextMenuPatchCallback = (children, args) => {
    if (!args.guild) return;
    children.push(addWallpaperMenu(void 0, args.guild.id));
};

export { ChannelContextPatch, GuildContextPatch, UserContextPatch };
