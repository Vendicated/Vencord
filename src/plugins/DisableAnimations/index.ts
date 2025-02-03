/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NeverAnimate",
    description: "Freezes profile and server-centric that can be animated, but leaves embeded gifs untouched.",
    authors: [Devs.Rylie],

    patches: [
        {
            find: "canAnimate:",
            all: true,
            noWarn: true,
            replacement: {
                match: /canAnimate:.+?([,}].*?\))/g,
                replace: (m, rest) => {
                    const destructuringMatch = rest.match(/}=.+/);
                    if (destructuringMatch == null) return `canAnimate:!1${rest}`;
                    return m;
                }
            }
        },
        {
            find: "#{intl::GUILD_OWNER}",
            replacement: {
                match: /(?<=\.activityEmoji,.+?animate:)\i/,
                replace: "!1"
            }
        },
        {
            find: ".animatedBannerHoverLayer,onMouseEnter:",
            replacement: {
                match: /(?<=guildBanner:\i,animate:)\i(?=}\))/,
                replace: "!1"
            }
        }
    ]
});
