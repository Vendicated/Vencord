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
                match: /(?<=className:.{0,20}\.buttons.{0,50}children:)(\i)/,
                replace: "Vencord.Api.ChatButtons._injectButtons($1,arguments[0])"
            }
        }
    ]
});
