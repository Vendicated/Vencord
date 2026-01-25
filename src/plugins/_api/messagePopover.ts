/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MessagePopoverAPI",
    description: "API to add buttons to message popovers.",
    authors: [Devs.KingFish, Devs.Ven, Devs.Nuckyz],
    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}",
            replacement: {
                match: /(?<=\]\}\)),(.{0,40}togglePopout:.+?\}\))\]\}\):null,(?<=\((\i\.\i),\{label:.+?:null,(\i)\?\(0,\i\.jsxs?\)\(\i\.Fragment.+?message:(\i).+?)/,
                replace: (_, ReactButton, ButtonComponent, showReactButton, message) => "" +
                    `]}):null,Vencord.Api.MessagePopover._buildPopoverElements(${ButtonComponent},${message}),${showReactButton}?${ReactButton}:null,`
            }
        }
    ]
});
