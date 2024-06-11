/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "FavoriteDMs",
    description: "Allows favoriting DMs and Threads when using the \"Favorites Server\" Experiment",
    authors: [Devs.F53],
    patches: [{
        find: "useCanFavoriteChannel",
        replacement: {
            match: /!\(\i\.isDM\(\)\|\|\i\.isThread\(\)\)/,
            replace: "true",
        }
    }],
});
