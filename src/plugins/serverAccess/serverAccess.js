/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const { definePluginSettings } = require("@api/Settings");
const { Devs } = require("@utils/constants");
const { find, findByProps } = require("@webpack");
const { Patcher, Webpack: { getModule } } = require("@vencord/types");

const settings = definePluginSettings({
    enabled: {
        type: "boolean",
        description: "Enable server access",
        default: true,
        restartNeeded: true
    }
});

module.exports = class ServerAccessPlugin {
    constructor() {
        this.patches = [];
    }

    async start() {
        const PermissionStore = await getModule(m => m?.canBasicChannel);
        const UserStore = await getModule(m => m?.getUserStoreVersion);
        const GuildStore = await getModule(findByProps("getGuilds"));

        // Patch permission checks
        this.patches.push(
            Patcher.instead(PermissionStore, "can", () => true),
            Patcher.instead(PermissionStore, "canAccessGuildSettings", () => true),
            Patcher.instead(PermissionStore, "canAccessMemberSafetyPage", () => true),
            Patcher.instead(PermissionStore, "canBasicChannel", () => true),
            Patcher.instead(PermissionStore, "canImpersonateRole", () => true),
            Patcher.instead(PermissionStore, "canManageUser", () => true),
            Patcher.instead(PermissionStore, "canWithPartialContext", () => true),
            Patcher.instead(PermissionStore, "isRoleHigher", () => true)
        );

        // Patch guild ownership checks
        const guilds = GuildStore.getGuilds();
        for (const guild of Object.values(guilds)) {
            this.patches.push(
                Patcher.instead(guild, "isOwner", (_, [id]) =>
                    [UserStore.getCurrentUser()?.id, guild.ownerId].includes(id)
                ),
                Patcher.instead(guild, "isOwnerWithRequiredMfaLevel", (_, [id]) =>
                    [UserStore.getCurrentUser()?.id, guild.ownerId].includes(id)
                )
            );
        }
    }

    stop() {
        Patcher.unpatchAll(this.patches);
    }

    getSettingsPanel() {
        return settings.makeSettingsElement(settings);
    }
};

module.exports.meta = {
    name: "ServerAccess",
    description: "Bypass server permission checks and gain admin access",
    authors: [Devs.YourNameHere],
    dependencies: [],
    settings
};
