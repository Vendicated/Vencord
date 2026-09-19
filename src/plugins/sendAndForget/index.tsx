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
    tags: ["Chat", "Utility"],

    patches: [
        {
            // ,3e3,{leading:!0,trailing:!1})
            find: ".FORWARD))},3e3",
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
                match: /((\i)=\i\.useCallback\(\()(\)=>\{)(null!=\i&&\i\.\i\.clearDraft)(?=.{500,2000}onClick:\2)/,
                replace: (_, beforeParen, _1, beforeBody, body) => `${beforeParen}vencordArg1${beforeBody}$self.setShift(vencordArg1);${body}`
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
