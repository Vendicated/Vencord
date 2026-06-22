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
            find: "renderVoiceUsers()",
            replacement: [
                {
                    match: /collapsedMax:(\d+),voiceStates:(\i),withGuildIcon:(\i)/,
                    replace: "collapsedMax:$1,voiceStates:$self.sortVoiceStates($2),withGuildIcon:$3"
                }
            ]
        }
    ],

    sortVoiceStates(voiceStates: any) {
        const serverMuteCounts = !settings.store.ignoreServerMute;
        if (!voiceStates) return voiceStates;
        return [...voiceStates].sort((a, b) => { // stable sorting
            const score = item => {
                const vs = item.voiceState;
                if (settings.store.pinSelf && vs.userId === getSelfId()) return -1;
                if (vs.selfStream) return 0;
                if (vs.selfVideo) return 1;
                if (vs.selfMute || (serverMuteCounts && vs.mute)) return 3;
                if (vs.selfDeaf || (serverMuteCounts && vs.dead)) return 4;
                return 2;
            };
            return score(a) - score(b);
        });
    }
});
