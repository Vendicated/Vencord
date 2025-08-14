/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";

const settings = definePluginSettings({
    refreshFrequency: {
        description: "Stream refreshing frequency",
        type: OptionType.SLIDER,
        markers: makeRange(2, 60, 2),
        default: 20,
        stickToMarkers: false,
        restartNeeded: true
    }
});

var streaming = false;

// This changes every time the user changes stream settings (quality/refreshrate) so the old refresh loop can check if it should stop
var userSettingId: number = 0;

export default definePlugin({
    name: "streamQualityDegredationFix",
    description: "If you are streaming on Linux it can happen that the stream sets the resolution to 480p after some time. This plugin stops this.",
    authors: [Devs.Asecave],
    settings,

    patches: [
        {
            find: "}setDesktopEncodingOptions(",
            replacement: {
                match: /(setDesktopEncodingOptions\()(\i),(\i),(\i)(\){)/,
                replace: "$&\
                    const repeat = async () => {\
                        const sleep = (time) => new Promise(r => setTimeout(r, time));\
                        const userSettingsId = $self.getUserSettingsId();\
                        while ($self.isStreaming() && $self.getUserSettingsId() === userSettingsId) {\
                            console.log(\"[StreamQualityDegredationFix] refreshing stream quality\");\
                            this.originalSetDesktopEncodingOptions(640,480,30);\
                            this.originalSetDesktopEncodingOptions($2,$3,$4);\
                            await sleep($self.getTimeoutDuration());\
                        }\
                    };\
                    repeat();\
                }\
                originalSetDesktopEncodingOptions($2,$3,$4) {"
            },

        },
        {
            find: "},setGoLiveSource(",
            replacement: {
                match: /(setGoLiveSource\()(\i)(\){)(\(null==\i\?void 0:\i\.qualityOptions\)!=null)/,
                replace: "$1$2$3$self.setGoLiveSourceTrigger($2);$4"
            }
        }
    ],

    getTimeoutDuration() {
        return Math.floor(settings.store.refreshFrequency * 60000);
    },

    getUserSettingsId() {
        return userSettingId;
    },

    isStreaming() {
        return streaming;
    },

    setGoLiveSourceTrigger(options: any) {
        userSettingId++;
        if (!options || !Object.prototype.hasOwnProperty.call(options, "desktopSettings")) {
            streaming = false;
            return;
        }
        streaming = true;
    },
});


