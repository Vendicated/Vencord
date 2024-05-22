/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    listeningActivities: {
        type: OptionType.STRING,
        description: "Comma separated list of activity IDs/names to change to Listening",
        placeholder: "235839274917592729, YouTube Music"
    },
    watchingActivities: {
        type: OptionType.STRING,
        description: "Comma separated list of activity IDs/names to change to Watching",
        placeholder: "706754902072267788, YouTube"
    },
    competingActivities: {
        type: OptionType.STRING,
        description: "Comma separated list of activity IDs/names to change to Competing",
        placeholder: "373833473001936546, Overwatch"
    },
    noLargeImageTextListening: {
        type: OptionType.STRING,
        description: "Comma separated list of activity IDs/names to remove the large image text for",
        placeholder: "589556910426816513, Minecraft"
    }
});

export default definePlugin({
    name: "RPCTypeEditor",
    description: "Allows editing the type of any Rich Presence. (Configure in settings)",
    authors: [Devs.nin0dev],
    patches: [
        {
            find: "LocalActivityStore",
            replacement: {
                match: /LOCAL_ACTIVITY_UPDATE:function\((\i)\)\{/,
                replace: "$&$self.patchActivity($1.activity);",
            }
        }
    ],
    settings,
    patchActivity(activity: any) {
        // not finished, this'll change all activities to listening :husk:
        activity.type = 2;
    },
});
