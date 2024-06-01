/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Notices } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";


const settings = definePluginSettings({
    idleTimeout: {
        description: "Minutes before Discord goes idle (0 to disable auto-idle)",
        type: OptionType.SLIDER,
        markers: makeRange(0, 60, 5),
        default: 10,
        stickToMarkers: false,
        restartNeeded: true, // Because of the setInterval patch
        onChange: () => {
            settings.store.idleTimeoutValue = settings.store.idleTimeout;
        }
    },
    idleTimeoutValue: {
        description: "Minutes before Discord goes idle (0 to disable auto-idle)",
        type: OptionType.NUMBER,
        default: 10,
        restartNeeded: true,
        isValid: (value: number) => {
            if (value && value < 0 || value > 60) return "value must be between 0 and 60";
            return true;
        },
        onChange: () => {
            settings.store.idleTimeout = settings.store.idleTimeoutValue;
        }
    }
    ,
    remainInIdle: {
        description: "When you come back to Discord, remain idle until you confirm you want to go online",
        type: OptionType.BOOLEAN,
        default: true
    },
    resetIdleTimeout: {
        description: "Reset the values of Idle timeout values to default on save",
        type: OptionType.BOOLEAN,
        default: false,
        onChange: () => {
            if (!settings.store.resetIdleTimeout) return;
            settings.store.idleTimeout = 10;
            settings.store.idleTimeoutValue = 10;
            settings.store.resetIdleTimeout = false;
        }
    }
});

export default definePlugin({
    name: "CustomIdle",
    description: "Allows you to set the time before Discord goes idle (or disable auto-idle)",
    authors: [Devs.newwares],
    settings,
    patches: [
        {
            find: "IDLE_DURATION:function(){return",
            replacement: {
                match: /(IDLE_DURATION:function\(\){return )\i/,
                replace: "$1$self.getIdleTimeout()"
            }
        },
        {
            find: 'type:"IDLE",idle:',
            replacement: [
                {
                    match: /Math\.min\((\i\.AfkTimeout\.getSetting\(\)\*\i\.default\.Millis\.SECOND),\i\.IDLE_DURATION\)/,
                    replace: "$1" // Decouple idle from afk (phone notifications will remain at user setting or 10 min maximum)
                },
                {
                    match: /\i\.default\.dispatch\({type:"IDLE",idle:!1}\)/,
                    replace: "$self.handleOnline()"
                },
                {
                    match: /(setInterval\(\i,\.25\*)\i\.IDLE_DURATION/,
                    replace: "$1$self.getIntervalDelay()" // For web installs
                }
            ]
        }
    ],

    getIntervalDelay() {
        return Math.min(6e5, this.getIdleTimeout());
    },

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
    },
});
