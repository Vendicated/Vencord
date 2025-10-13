/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Guild } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

import { openGuildInfoModal } from "./GuildInfoModal";

const Patch: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild; }) => {
    const group = findGroupChildrenByChildId("privacy", children);

    group?.push(
        <Menu.MenuItem
            id="vc-server-info"
            label="Server Info"
            action={() => openGuildInfoModal(guild)}
        />
    );
};

export const settings = definePluginSettings({
    sorting: {
        type: OptionType.SELECT,
        description: "Username or if applicable Display Name",
        options: [
            {
                label: "Username",
                value: "username"
            },
            {
                label: "Display Name",
                value: "displayname",
                default: true
            },
            {
                label: "Dont Sort",
                value: "none",
            }
        ]
    }
});

export default definePlugin({
    name: "ServerInfo",
    description: "Allows you to view info about a server",
    authors: [Devs.Ven, Devs.Nuckyz, EquicordDevs.Z1xus],
    dependencies: ["DynamicImageModalAPI"],
    tags: ["guild", "info", "ServerProfile"],
    isModified: true,
    contextMenus: {
        "guild-context": Patch,
        "guild-header-popout": Patch
    },
    settings
});
