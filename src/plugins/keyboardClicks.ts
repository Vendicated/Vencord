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

const keydown = (e: KeyboardEvent) => {
    const audio = new Audio("https://cdn.discordapp.com/attachments/1019011011786833921/1054854818109345913/click2.wav");
    audio.play();
};

export default definePlugin({
    name: "keyboardClicks",
    description: "When typing in a message box play a sound, like on opera.",
    authors: [Devs.Sambot],
    dependencies: ["MessageEventsAPI"],
    start() {
        document.addEventListener("keydown", keydown);
    },
    stop() {
        document.removeEventListener("keydown", keydown);
    }
});
