/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "CleanUserArea",
    description: "Hide nameplate in the user area",
    authors: [EquicordDevs.Prism],
    patches: [
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /nameplate:\i,hovered/,
                replace: "nameplate:null,hovered",
            },
        },
    ],
});
