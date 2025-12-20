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
    name: "MessageUpdaterAPI",
    description: "API for updating and re-rendering messages.",
    authors: [Devs.Nuckyz],

    patches: [
        {
            // Message accessories have a custom logic to decide if they should render again, so we need to make it not ignore changed message reference
            find: "}renderEmbeds(",
            replacement: {
                match: /(?<=this.props,\i,\[)"message",/,
                replace: ""
            }
        }
    ]
});
