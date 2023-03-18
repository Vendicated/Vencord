/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const SpoilerClasses = findByPropsLazy("spoilerText");
const MessagesClasses = findByPropsLazy("messagesWrapper", "messages");

export default definePlugin({
    name: "RevealAllSpoilers",
    description: "Reveal all spoilers in a message by Ctrl-clicking a spoiler, or in the chat with Ctrl+Shift-click",
    authors: [Devs.whqwert],

    patches: [
        {
            find: ".removeObscurity=function",
            replacement: {
                match: /(?<=\.removeObscurity=function\((\i)\){)/,
                replace: (_, event) => `$self.reveal(${event});`
            }
        }
    ],

    reveal(event: MouseEvent) {
        const { ctrlKey, shiftKey, target } = event;

        if (!ctrlKey) { return; }

        const { spoilerText, hidden } = SpoilerClasses;
        const { messagesWrapper } = MessagesClasses;

        const parent = shiftKey
            ? document.querySelector(`div.${messagesWrapper}`)
            : (target as HTMLSpanElement).parentElement;

        for (const spoiler of parent!.querySelectorAll(`span.${spoilerText}.${hidden}`)) {
            (spoiler as HTMLSpanElement).click();
        }
    }

});
