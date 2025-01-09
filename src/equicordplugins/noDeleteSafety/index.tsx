/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Alerts, Button, GuildStore } from "@webpack/common";
const DeleteGuild = findByPropsLazy("deleteGuild", "sendTransferOwnershipPincode").deleteGuild;

function GetPropsAndDeleteGuild(id) {
    const GotGuild = GuildStore.getGuild(id);
    if (!GotGuild) return;

    DeleteGuild(id, GotGuild.name);
}

const settings = definePluginSettings(
    {
        confirmModal: {
            type: OptionType.BOOLEAN,
            description: "Should a \"are you sure you want to delete\" modal be shown?",
            default: true
        },
    });

export default definePlugin({
    name: "NoDeleteSafety",
    description: "Removes the \"enter server name\" requirement when deleting a server",
    authors: [Devs.Samwich],
    settings,
    async HandleGuildDeleteModal(server) {
        if (settings.store.confirmModal) {
            return Alerts.show({ title: "Delete server?", body: <p>It's permanent, if that wasn't obvious.</p>, confirmColor: Button.Colors.RED, confirmText: "Delete", onConfirm: () => GetPropsAndDeleteGuild(server.id), cancelText: "Cancel" });
        } else {
            return GetPropsAndDeleteGuild(server.id);
        }
    },
    patches: [
        {
            find: ".DELETE,onClick(){let",
            replacement: {
                match: /let \i=(\i).guild.toString\(\)/,
                replace: "$self.HandleGuildDeleteModal($1);$&"
            }
        }
    ]
});
