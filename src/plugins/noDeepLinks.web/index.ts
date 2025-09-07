/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "DisableDeepLinks",
    description: "Disables Discord's stupid deep linking feature which tries to force you to use their Desktop App",
    authors: [Devs.Ven, Devs.Cootshk],
    required: true,

    noop: () => { },
    acceptInvite: () => {
        open(document.location.href.replace(/invite/, "app/invite-with-guild-onboarding"), "_self");
    },

    patches: [
        {
            find: /\.openNativeAppModal\(.{0,50}?\.DEEP_LINK/,
            replacement: {
                match: /\i\.\i\.openNativeAppModal/,
                replace: "$self.noop",
            }
        },
        { // This says that it has no effect, but it does
            find: /openApp\(/,
            replacement: {
                match: /\i\.\i\.launch\(\i,\i=>\{\i\.\i\.dispatch\(\i\?\{.*?\}:\{.*?\}\)\}\)/,
                replace: "$self.acceptInvite()",
            },
            all: true
        }
    ]
});
