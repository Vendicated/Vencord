/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MessageDecorationsAPI",
    description: "API to add decorations to messages",
    authors: [Devs.TheSun],
    patches: [
        {
            find: ".withMentionPrefix",
            replacement: {
                match: /(.roleDot.{10,50}{children:.{1,2})}\)/,
                replace: "$1.concat(Vencord.Api.MessageDecorations.__addDecorationsToMessage(arguments[0]))})"
            }
        }
    ],
});
