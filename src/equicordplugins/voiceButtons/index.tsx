/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { React } from "@webpack/common";

import { UserChatButton, UserDeafenButton, UserMuteButton } from "./utils";

export const settings = definePluginSettings({
    showChatButton: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Whether you want to display the chat button",
        restartNeeded: true,
    },
    showMuteButton: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Whether you want to display the mute button",
        restartNeeded: true,
    },
    showDeafenButton: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Whether you want to display the deafen button",
        restartNeeded: true,
    },
    muteSoundboard: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Toggles their soundboard upon clicking deafen button.",
        restartNeeded: false,
    },
    disableVideo: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Toggles their video upon clicking deafen button.",
        restartNeeded: false,
    },
});

export default definePlugin({
    name: "VoiceButtons",
    description: "Quickly DM, mute, or deafen any user right from the voice-call panel.",
    authors: [EquicordDevs.nicola02nb, EquicordDevs.omaw],
    settings,
    patches: [
        {
            find: "\"avatarContainerClass\",\"userNameClassName\"",
            replacement: [
                {
                    match: /:(\i)\.username.*?flipped\]:\i\}\),children:\[/,
                    replace: "$&$self.renderButtons($1),"
                }
            ]
        }
    ],
    renderPing(user?: User) {
        if (!user) return null;
        return (
            <div style={{ display: "flex", gap: "4px" }}>
                {settings.store.showChatButton && <UserChatButton user={user} />}
                {settings.store.showMuteButton && <UserMuteButton user={user} />}
                {settings.store.showDeafenButton && <UserDeafenButton user={user} />}
            </div>
        );
    }
});
