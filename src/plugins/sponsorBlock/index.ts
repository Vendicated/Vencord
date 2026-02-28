/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "SponsorBlock",
    description: "Skips sponsors in YouTube embeds using native injection.",
    authors: [Devs.caedencode],
    patches: [
        {
            find: "VideoPlayer",
            replacement: {
                match: /renderIframe\(\)\{/,
                replace: 'renderIframe(){const returnValue=$&;if(returnValue?.props?.src?.includes("youtube.com/embed/")){returnValue.props["data-sb-target"]="true"}return returnValue'
            }
        }
    ]
});
