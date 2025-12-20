/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs, IS_MAC } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const SpoilerClasses = findByPropsLazy("spoilerContent");
const MessagesClasses = findByPropsLazy("messagesWrapper", "navigationDescription");

export default definePlugin({
    name: "RevealAllSpoilers",
    description: "Reveal all spoilers in a message by Ctrl-clicking a spoiler, or in the chat with Ctrl+Shift-click",
    authors: [Devs.whqwert],

    patches: [
        {
            find: ".removeObscurity,",
            replacement: {
                match: /(?<="removeObscurity",(\i)=>{)/,
                replace: (_, event) => `$self.reveal(${event});`
            }
        }
    ],

    reveal(event: MouseEvent) {
        const { ctrlKey, metaKey, shiftKey, target } = event;

        if (!(IS_MAC ? metaKey : ctrlKey)) { return; }

        const { spoilerContent, hidden } = SpoilerClasses;
        const { messagesWrapper } = MessagesClasses;

        const parent = shiftKey
            ? document.querySelector(`div.${messagesWrapper}`)
            : (target as HTMLSpanElement).parentElement;

        for (const spoiler of parent!.querySelectorAll(`span.${spoilerContent}.${hidden}`)) {
            (spoiler as HTMLSpanElement).click();
        }
    }

});
