/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    incommingRingtoneURL: {
        description: "Incomming Call Ringtone URL",
        default: "https://discord.com/assets/986703daecf955ce3ce3.mp3",
        placeholder: "https://discord.com/assets/986703daecf955ce3ce3.mp3",
        type: OptionType.STRING,
        restartNeeded: true
    },
    outgoingRingtoneURL: {
        description: "Outgoing Ringtone URL",
        default: "https://discord.com/assets/11b68eb8f243b5f6c8d7.mp3",
        placeholder: "https://discord.com/assets/11b68eb8f243b5f6c8d7.mp3",
        type: OptionType.STRING,
        restartNeeded: true
    },
});

export default definePlugin({
    name: "ChangeRingtone",
    description: "Change the default calling ringtones (both rare and normal)",
    authors: [Devs.Furo],
    settings,
    patches: [
        {
            find: "99b1d8a6fe0b95e99827",
            replacement: {
                match: "e.exports=n.p+\"99b1d8a6fe0b95e99827.mp3\"",
                replace: "e.exports=Vencord.Settings.plugins.ChangeRingtone.incommingRingtoneURL"
            },
        },
        {
            find: "986703daecf955ce3ce3",
            replacement: {
                match: "e.exports=n.p+\"986703daecf955ce3ce3.mp3\"",
                replace: "e.exports=Vencord.Settings.plugins.ChangeRingtone.incommingRingtoneURL"
            },
        },
        {
            find: "11b68eb8f243b5f6c8d7",
            replacement: {
                match: "e.exports=n.p+\"11b68eb8f243b5f6c8d7.mp3\"",
                replace: "e.exports=Vencord.Settings.plugins.ChangeRingtone.outgoingRingtoneURL"
            },
        }
    ],
});
