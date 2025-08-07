/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "SendAndForget",
    description: "After forwarding a single message, don't jump to it",
    authors: [Devs.Sqaaakoi, Devs.sadan],

    patches: [
        {
            find: ".ToastType.FORWARD",
            replacement: {
                match: /(?<=transitionToDestination:)1===\i\.length/,
                replace: "false"
            }
        }
    ]
});
