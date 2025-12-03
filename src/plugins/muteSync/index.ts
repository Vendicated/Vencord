/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";


export default definePlugin({
    name: "MuteSync",
    description: "Mutes a microphone when it's physically muted",
    authors: [Devs.roli2py],
    // Due to how is the `AUDIO_INPUT_DETECTED` Flux event works, we're
    // patching instead of subscribing to the event
    patches: [
        {
            find: "handleNoInput",
            replacement: {
                match: /(?<=\i\.emit\(\i\.\i\.Silence,!(\i)\))/,
                replace: ";$self.checkInputDetection(e)",
            },
        },
    ],

    // A variable to indicate that the plugin caught the initial wrong
    // input detection
    isInitialized: false,
    checkInputDetection(inputDetected: boolean) {
        if (this.isInitialized && !inputDetected) {
            FluxDispatcher.dispatch({
                type: "AUDIO_SET_SELF_MUTE",
                context: "default",
                mute: true,
                playSoundEffect: true,
            });
        }
        this.isInitialized = true;
    },
});
