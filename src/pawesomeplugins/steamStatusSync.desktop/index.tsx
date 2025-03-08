/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

enum SteamStatus {
    Online = "online",
    Away = "away",
    Invisible = "invisible",
    Offline = "offline",
    None = "none"
}

interface SettingsProto {
    settings: {
        proto: {
            status?: {
                status: {
                    value: String;
                },
                showCurrentGame: {
                    value: Boolean;
                },
            };
        };
    };
}

export const settings = definePluginSettings({
    onlineStatus: {
        type: OptionType.SELECT,
        description: "Steam status when on Online",
        options: [
            { label: "Online", value: SteamStatus.Online, default: true },
            { label: "Away", value: SteamStatus.Away },
            { label: "Invisible", value: SteamStatus.Invisible },
            { label: "Offline (Disconnect Steam Chat & Friends)", value: SteamStatus.Offline },
            { label: "Disabled", value: SteamStatus.None }
        ],
    },
    idleStatus: {
        type: OptionType.SELECT,
        description: "Steam status when on Idle",
        options: [
            { label: "Online", value: SteamStatus.Online },
            { label: "Away", value: SteamStatus.Away, default: true },
            { label: "Invisible", value: SteamStatus.Invisible },
            { label: "Offline (Disconnect Steam Chat & Friends)", value: SteamStatus.Offline },
            { label: "Disabled", value: SteamStatus.None }
        ],
    },
    dndStatus: {
        type: OptionType.SELECT,
        description: "Steam status when on Do Not Disturb",
        options: [
            { label: "Online", value: SteamStatus.Online },
            { label: "Away", value: SteamStatus.Away, default: true },
            { label: "Invisible", value: SteamStatus.Invisible },
            { label: "Offline (Disconnect Steam Chat & Friends)", value: SteamStatus.Offline },
            { label: "Disabled", value: SteamStatus.None }
        ],
    },
    invisibleStatus: {
        type: OptionType.SELECT,
        description: "Steam status when on Invisible",
        options: [
            { label: "Online", value: SteamStatus.Online },
            { label: "Away", value: SteamStatus.Away },
            { label: "Invisible", value: SteamStatus.Invisible, default: true },
            { label: "Offline (Disconnect Steam Chat & Friends)", value: SteamStatus.Offline },
            { label: "Disabled", value: SteamStatus.None }
        ],
    },
    hiddenActivityStatus: {
        type: OptionType.SELECT,
        description: "Steam status when Discord game activity is hidden",
        options: [
            { label: "Online", value: SteamStatus.Online },
            { label: "Away", value: SteamStatus.Away },
            { label: "Invisible", value: SteamStatus.Invisible },
            { label: "Offline (Disconnect Steam Chat & Friends)", value: SteamStatus.Offline },
            { label: "Disabled", value: SteamStatus.None, default: true }
        ],
    },
});

export default definePlugin({
    name: "SteamStatusSync",
    description: "Sync your status to Steam!",
    authors: [Devs.niko],

    settings,

    flux: {
        USER_SETTINGS_PROTO_UPDATE(settingsUpdate: SettingsProto) {
            const protoStatus = settingsUpdate.settings.proto.status;

            if (protoStatus !== undefined) {
                const associatedStatus = settings.store[`${protoStatus.status.value}Status`];
                const { hiddenActivityStatus } = settings.store;

                if (hiddenActivityStatus !== SteamStatus.None && !protoStatus.showCurrentGame.value) {
                    open(`steam://friends/status/${hiddenActivityStatus}`);

                    return;
                }
                if (associatedStatus === SteamStatus.None) { return; }

                // Open steam protocol URI for status change
                open(`steam://friends/status/${associatedStatus}`);
            }
        }
    }
});
