/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";

const settings = definePluginSettings({
    guild: {
        description: "Mute Guild",
        type: OptionType.BOOLEAN,
        default: true
    },
    everyone: {
        description: "Suppress @everyone and @here",
        type: OptionType.BOOLEAN,
        default: true
    },
    role: {
        description: "Suppress All Role @mentions",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "MuteNewGuild",
    description: "Mutes newly joined guilds",
    authors: [Devs.Glitch, Devs.Nuckyz, Devs.carince],
    patches: [
        {
            find: ",acceptInvite:function",
            replacement: {
                match: /INVITE_ACCEPT_SUCCESS.+?;(\i)=null.+?;/,
                replace: (m, guildId) => `${m}$self.handleMute(${guildId});`
            }
        },
        {
            find: "{joinGuild:function",
            replacement: {
                match: /guildId:(\w+),lurker:(\w+).{0,20}\)}\)\);/,
                replace: (m, guildId, lurker) => `${m}if(!${lurker})$self.handleMute(${guildId});`
            }
        }
    ],
    settings,

    handleMute(guildId: string | null) {
        if (guildId === "@me" || guildId === "null" || guildId == null) return;
        findByProps("updateGuildNotificationSettings").updateGuildNotificationSettings(guildId,
            {
                muted: settings.store.guild,
                suppress_everyone: settings.store.everyone,
                suppress_roles: settings.store.role
            }
        );
    }
});
