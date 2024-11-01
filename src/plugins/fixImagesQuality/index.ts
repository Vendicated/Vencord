/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "FixImagesQuality",
    description: "Prevents images from being loaded as WEBP, which can cause quality loss. Will increase image load times, and will not always improve picture quality.",
    authors: [Devs.Nuckyz],
    patches: [
        {
            find: "getFormatQuality(){",
            replacement: {
                match: /(?<=null;return )\i\.\i&&\(\i\|\|!\i\.isAnimated.+?:(?=\i&&\(\i="png"\))/,
                replace: ""
            }
        }
    ]
});
