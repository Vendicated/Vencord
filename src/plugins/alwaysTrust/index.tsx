/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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

const settings = definePluginSettings({
    domain: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove the untrusted domain popup when opening links",
        restartNeeded: true
    },
    file: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove the 'Potentially Dangerous Download' popup when opening links",
        restartNeeded: true
    },
    noDeleteSafety: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Removes the enter server name requirement when deleting a server",
        restartNeeded: true
    },
    confirmModal: {
        type: OptionType.BOOLEAN,
        description: "Should a \"are you sure you want to delete\" modal be shown?",
        default: true
    },
});

export default definePlugin({
    name: "AlwaysTrust",
    description: "Removes the annoying untrusted domain and suspicious file popup",
    authors: [Devs.zt, Devs.Trwy],
    isModified: true,
    settings,
    patches: [
        {
            find: '="MaskedLinkStore",',
            replacement: {
                match: /(?<=isTrustedDomain\(\i\){)return \i\(\i\)/,
                replace: "return true"
            },
            predicate: () => settings.store.domain
        },
        {
            find: "bitbucket.org",
            replacement: {
                match: /function \i\(\i\){(?=.{0,30}pathname:\i)/,
                replace: "$&return null;"
            },
            predicate: () => settings.store.file
        },
        {
            find: ".DELETE,onClick(){let",
            replacement: {
                match: /let\{name:\i\}=(\i)\.guild/,
                replace: "$self.HandleGuildDeleteModal($1);$&"
            },
            predicate: () => settings.store.noDeleteSafety
        }
    ],
    async HandleGuildDeleteModal(server) {
        if (settings.store.confirmModal) {
            return Alerts.show({
                title: "Delete server?",
                body: <p>It's permanent, if that wasn't obvious.</p>,
                confirmColor: Button.Colors.RED,
                confirmText: "Delete",
                onConfirm: () => GetPropsAndDeleteGuild(server.id),
                cancelText: "Cancel"
            });
        } else {
            return GetPropsAndDeleteGuild(server.id);
        }
    },
});
