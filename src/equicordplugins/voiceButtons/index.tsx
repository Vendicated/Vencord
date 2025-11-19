/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { React } from "@webpack/common";

import { settings } from "./settings";
import { UserChatButton, UserDeafenButton, UserMuteButton } from "./utils";

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
                    match: /flipped\]:\i\}\),children:\[/,
                    replace: "$&$self.renderButtons(arguments[0].user),"
                }
            ]
        }
    ],
    renderButtons(user: User) {
        if (!user) return null;
        return (
            <Flex flexDirection="row" className="voice-user-buttons">
                {settings.store.showChatButton && <UserChatButton user={user} />}
                {settings.store.showMuteButton && <UserMuteButton user={user} />}
                {settings.store.showDeafenButton && <UserDeafenButton user={user} />}
            </Flex>
        );
    }
});
