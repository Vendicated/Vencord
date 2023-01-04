/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

interface SpoilerEvent {
    ctrlKey: boolean;
    shiftKey: boolean;
    target: HTMLSpanElement;
}

export default definePlugin({
    name: "RevealAllSpoilers",
    description: "Reveal all spoilers in a message (Ctrl) or in the chat (Ctrl+Shift) and clicking a spoiler.",
    authors: [Devs.whqwert],

    patches: [
        {
            find: ".revealSpoiler=",
            replacement: {
                match: /\.revealSpoiler=function\((.{1,3})\){/,
                replace: ".revealSpoiler=function($1){Vencord.Plugins.plugins.RevealAllSpoilers.reveal($1);"
            }
        }
    ],

    reveal(event: SpoilerEvent) {
        const { ctrlKey, shiftKey, target } = event;
        if (!ctrlKey) { return; }

        const parent = shiftKey
            ? document.querySelector("div[class*=messagesWrapper-]")
            : target.parentElement;

        for (const spoiler of parent!.querySelectorAll(
            "span[class*=spoilerText-][class*=hidden-]"
        )) {
            (spoiler as HTMLElement).click();
        }
    }

});
