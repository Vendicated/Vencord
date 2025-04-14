/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NormalizeMessageLinks",
    description: "Strip canary/ptb from message links",
    authors: [Devs.bb010g],
    patches: [
        {
            find: "#{intl::COPY_MESSAGE_LINK}",
            replacement: {
                match: /\.concat\(location\.host\)/,
                replace: ".concat($self.normalizeHost(location.host))",
            },
        },
    ],
    normalizeHost(host: string) {
        return host.replace(/(^|\b)(canary\.|ptb\.)(discord.com)$/, "$1$3");
    },
});
