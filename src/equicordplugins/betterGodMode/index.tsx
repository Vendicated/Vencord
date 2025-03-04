/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { GuildStore, Menu, PermissionStore, React } from "@webpack/common";
import { Guild } from "discord-types/general";

const NeedsToBePatchedFns = [
    "can",
    "canAccessMemberSafetyPage",
    "canAccessGuildSettings",
    "canBasicChannel",
    "canImpersonateRole",
    "canManageUser",
    "canWithPartialContext",
    "getGuildVersion",
    "getChannelsVersion",
    "getChannelPermissions",
    "getHighestRole",
    "initialize",
    "constructor",
    "isRoleHigher"
];

let OriginalFns;

const godModeEnabledGuilds = new Set<string>();

function getGuildIdFromArgs(args: any[]): string | null {
    for (const arg of args) {
        if (typeof arg === "string" && GuildStore.getGuild(arg))
            return arg;
        if (arg?.guild_id && GuildStore.getGuild(arg.guild_id))
            return arg.guild_id;
        if (arg?.guildId && GuildStore.getGuild(arg.guildId))
            return arg.guildId;
        if (arg?.id && GuildStore.getGuild(arg.id))
            return arg.id;
    }
    return null;
}

const ContextMenuPatch: NavContextMenuPatchCallback = (children, { guild }: { guild: Guild; }) => {
    const [checked, setChecked] = React.useState(godModeEnabledGuilds.has(guild.id));

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuCheckboxItem
            id="bgm-toggle-god-mode"
            label="God Mode"
            checked={checked}
            action={() => {
                if (checked)
                    godModeEnabledGuilds.delete(guild.id);
                else
                    godModeEnabledGuilds.add(guild.id);
                setChecked(!checked);
            }}
        ></Menu.MenuCheckboxItem>
    );
};

export default definePlugin({
    name: "BetterGodMode",
    description: "Get all permissions on any guild. Option to toggle per-guild basis (client-side).",
    authors: [EquicordDevs.TheArmagan],
    start: () => {
        OriginalFns = Object.fromEntries(
            NeedsToBePatchedFns.map(fnName => [fnName, PermissionStore[fnName]])
        );

        NeedsToBePatchedFns.forEach(fnName => {
            PermissionStore[fnName] = function (...args: any[]) {
                const guildId = getGuildIdFromArgs(args);
                if (guildId && godModeEnabledGuilds.has(guildId))
                    return true;
                return OriginalFns[fnName].apply(this, args);
            };
        });
    },

    stop: () => {
        if (!OriginalFns) return;

        godModeEnabledGuilds.clear();
        NeedsToBePatchedFns.forEach(fnName => {
            PermissionStore[fnName] = OriginalFns[fnName];
        });
    },

    contextMenus: {
        "guild-context": ContextMenuPatch,
    }
});
