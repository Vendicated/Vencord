/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    notificationVolume: {
        type: OptionType.SLIDER,
        description: "Notification volume",
        markers: [0, 25, 50, 75, 100],
        default: 100,
        stickToMarkers: false
    }
});

export default definePlugin({
    name: "NotificationVolume",
    description: "Save your ears and set a separate volume for notifications and in-app sounds",
    authors: [Devs.philipbry],
    settings,
    patches: [
        {
            find: "ensureAudio(){",
            replacement: {
                match: /(?=Math\.min\(\i\.\i\.getOutputVolume\(\)\/100)/g,
                replace: "$self.settings.store.notificationVolume/100*"
            },
        },
    ],
});
