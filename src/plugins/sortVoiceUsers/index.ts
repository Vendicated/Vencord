/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

let selfId: string | undefined;

function getSelfId() {
    return selfId ??= UserStore.getCurrentUser()?.id;
}

const settings = definePluginSettings({
    ignoreServerMute: {
        type: OptionType.BOOLEAN,
        description: "Ignore server mute/deafen (red icons) when sorting users",
        default: true,
        restartNeeded: true
    },
    pinSelf: {
        type: OptionType.BOOLEAN,
        description: "Always show yourself at the top of the voice chat you are in",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "Sort Voice Users",
    description:
        "Sorts users in voice chats by their status (streaming, camera, muted, deafened)",
    authors: [Devs.Paneddo],
    tags: ["Voice"],
    settings,

    patches: [
        {
            find: 'selfStream?"\\0":"\\x01"',
            replacement: {
                match: /function (\i)\((\i),(\i)\)\{return`[^`]+`\}/,
                replace: "function $1($2,$3){return $self.buildComparator($2,$3)}"
            }
        }
    ],

    buildComparator(voiceState: any, nick: string) {
        let tier: string;
        const countServerMute = !settings.store.ignoreServerMute;

        if (settings.store.pinSelf && voiceState.userId === getSelfId()) tier = "\x01";
        else if (voiceState.selfStream) tier = "\x02";
        else if (voiceState.selfVideo) tier = "\x03";
        else if (voiceState.selfDeaf || (voiceState.deaf && countServerMute)) tier = "\x06";
        else if (voiceState.selfMute || (voiceState.mute && countServerMute)) tier = "\x05";
        else tier = "\x04";

        return `${tier}${nick.toLowerCase()}${voiceState.userId}`;
    }
});
