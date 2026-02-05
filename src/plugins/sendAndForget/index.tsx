/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { KeyboardEvent } from "react";

let ignore = false;

export default definePlugin({
    name: "NoFollowForwards",
    description: "After forwarding a single message, don't jump to it. Hold shift to ignore this behavior",
    authors: [Devs.Sqaaakoi, Devs.sadan],

    patches: [
        {
            find: ".ToastType.FORWARD",
            replacement: [
                {
                    match: /(?<=transitionToDestination:)(1===\i\.length)(?=,|\})/,
                    replace: "$self.shouldTransition($1)"
                }
            ]
        },
        {
            // the event for clicking the final forward button is dispatched here
            find: "#{intl::MESSAGE_FORWARD_MESSAGE_PLACEHOLDER}",
            replacement: {
                match: /(useCallback\(\()(\)=>\{)(\i\.\i\.clearDraft)/,
                replace: (_, beforeParen, beforeBody, body) => `${beforeParen}vencordArg1${beforeBody}$self.setShift(vencordArg1);${body}`
            }
        }
    ],

    shouldTransition(origCond: boolean): boolean {
        return ignore ? origCond : false;
    },

    setShift(event: KeyboardEvent | undefined) {
        ignore = !!event?.shiftKey;
    }
});
