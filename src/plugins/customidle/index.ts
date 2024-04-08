/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Notices, Notifications } from "@api/index";
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
        stickToMarkers: false
    },
    enableGracePeriod: {
        description: "When you come back online, make Discord will wait a few seconds before changing your status",
        type: OptionType.BOOLEAN,
        default: true
    },
    gracePeriod: {
        description: "Grace period (in seconds)",
        type: OptionType.SLIDER,
        markers: makeRange(0, 60, 5),
        default: 5,
        stickToMarkers: true
    }
});
function updateGraceAlert(timer: NodeJS.Timer, elapsed:number) {

    const toAdd=["GENERIC", `You will go online in ${elapsed} seconds. Click the button to stop the timer and stay idle.`, "Stay idle", () => {
        clearInterval(timer);
        Notices.popNotice();
        runningTimer=false;
        forceIdle=true;
        Notifications.showNotification({
            title: "Timer Stopped",
            body: "You will stay idle. You will have to set your status to Online manually.",
        });
    }];
    if (!Notices.noticesQueue.length) {
        Notices.noticesQueue.unshift(toAdd);
    } else {
        Notices.noticesQueue[0]=toAdd;
    }
    Notices.nextNotice();
}
let runningTimer = false;
let forceIdle = false;
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
                replace: "$1$self.getIdleDuration()"
            }
        },
        {
            find: "type:\"IDLE\",idle:",
            replacement: {
                match: /\i\.default\.dispatch\({type:"IDLE",idle:!1}\)/,
                replace: "$self.handleOnline()"
            }

        },
        {
            find: "MenuCustomItem:function(){return",
            replacement: {
                match: /(onClick:\i\?void 0:)(\i)/,
                replace: "$1VencordCustomReplyEvent=>{$2(VencordCustomReplyEvent);$self.handleManualOnline(arguments[0]);}"
            }
        }
    ],
    getIdleDuration() { // milliseconds, default is 6e5
        const { idleTimeout } = settings.store;
        return idleTimeout===0?Number.MAX_SAFE_INTEGER:idleTimeout*60000;
    },
    handleOnline() {
        if (runningTimer||forceIdle||!settings.store.enableGracePeriod) return;
        runningTimer = true;
        let remaining = settings.store.gracePeriod;
        const timer= setInterval(()=>{
            if (remaining<=0) {
                clearInterval(timer);
                FluxDispatcher.dispatch({
                    type: "IDLE",
                    idle: false
                });
                Notices.popNotice();
                runningTimer=false;
                return;
            }
            updateGraceAlert(timer, remaining--);
        },1000);
        updateGraceAlert(timer, remaining--);
    },
    handleManualOnline({ id }) {
        if (id==="online"&&forceIdle) {
            FluxDispatcher.dispatch({
                type: "IDLE",
                idle: false
            });
            forceIdle=false;
        }
    },
    start() {
        runningTimer=false;
        forceIdle=false;
    },
});
