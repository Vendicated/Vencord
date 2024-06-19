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

    patches: [{
        find: '"sticker")',
        replacement: {
            match: /[^\w$]return.(?=(?:.(?![^\w$]return[^\w$]))*[^\w$](\i)\.push\((?:.(?![^\w$]return[^\w$]))*children:\1[^\w$])/,
            replace: "$&(Vencord.Api.ChatButtons._injectButtons($1,arguments[0]),!0)&&"
        }
    }]
});
