/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ChatInputButtonAPI",
    description: "API to add buttons to the chat input",
    authors: [Devs.Ven],

    patches: [
        {
            find: '"sticker")',
            replacement: {
                // FIXME(Bundler change related): Remove old compatiblity once enough time has passed
                match: /return\((!)?\i\.\i(?:\|\||&&)(?=\(\i\.isDM.+?(\i)\.push)/,
                replace: (m, not, children) => not
                    ? `${m}(Vencord.Api.ChatButtons._injectButtons(${children},arguments[0]),true)&&`
                    : `${m}(Vencord.Api.ChatButtons._injectButtons(${children},arguments[0]),false)||`
            }
        }
    ]
});
