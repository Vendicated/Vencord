/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Notices } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const settings = definePluginSettings({
    idleTimeout: {
        description: "Minutes before Discord goes idle (0 to disable auto-idle)",
        type: OptionType.SLIDER,
        markers: makeRange(0, 60, 5),
        default: 10,
        stickToMarkers: false,
        restartNeeded: true // Because of the setInterval patch
    },
    remainInIdle: {
        description: "When you come back to Discord, remain idle until you confirm you want to go online",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "CustomIdle",
    description: "Allows you to set the time before Discord goes idle (or disable auto-idle)",
    authors: [Devs.newwares],
    settings,
    patches: [
        {
            find: 'type:"IDLE",idle:',
            replacement: [
                {
                    match: /(?<=Date\.now\(\)-\i>)\i\.\i\|\|/,
                    replace: "$self.getIdleTimeout()||"
                },
                {
                    match: /Math\.min\((\i\*\i\.\i\.\i\.SECOND),\i\.\i\)/,
                    replace: "$1" // Decouple idle from afk (phone notifications will remain at user setting or 10 min maximum)
                },
                {
                    match: /\i\.\i\.dispatch\({type:"IDLE",idle:!1}\)/,
                    replace: "$self.handleOnline()"
                }
            ]
        }
    ],

    handleOnline() {
        if (!settings.store.remainInIdle) {
            FluxDispatcher.dispatch({
                type: "IDLE",
                idle: false
            });
            return;
        }

        const backOnlineMessage = "Welcome back! Click the button to go online. Click the X to stay idle until reload.";
        if (
            Notices.currentNotice?.[1] === backOnlineMessage ||
            Notices.noticesQueue.some(([, noticeMessage]) => noticeMessage === backOnlineMessage)
        ) return;

        Notices.showNotice(backOnlineMessage, "Exit idle", () => {
            Notices.popNotice();
            FluxDispatcher.dispatch({
                type: "IDLE",
                idle: false
            });
        });
    },

    getIdleTimeout() { // milliseconds, default is 6e5
        const { idleTimeout } = settings.store;
        return idleTimeout === 0 ? Infinity : idleTimeout * 60000;
    }
});
