/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NormalizeResourceLinks",
    description: "Normalize resource links to match stable Discord",
    authors: [Devs.bb010g],
    patches: [
        {
            find: ".Messages.COPY_MESSAGE_LINK,",
            replacement: {
                match: /(\.concat\()(location\.host)(\))/,
                replace:
                    "$1$self.normalizeResourceHost($2)$3",
            },
        },
    ],
    normalizeResourceHost(host: string) {
        return host.replace(/(^|[^a-z-])(canary\.|ptb\.)(discord.com)$/, "$1$3");
    },
});
