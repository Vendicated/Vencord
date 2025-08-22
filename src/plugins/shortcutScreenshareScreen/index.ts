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

import { settings } from "./settings";
import { startStreaming, stopStreaming, toggleAudio, toggleGameOrScreen, toggleStream } from "./streamManager";

export default definePlugin({
    name: "ShortcutScreenShare",
    description: "Screenshare screen from keyboard shortcut when no game is running.",
    authors: [Devs.nicola02nb],
    settings,
    keybinds: [
        { name: "startStreaming", function: startStreaming, options: { blurred: false, focused: false, keydown: true, keyup: false } },
        { name: "stopStreaming", function: stopStreaming, options: { blurred: false, focused: false, keydown: true, keyup: false } },
        { name: "toggleAudio", function: toggleAudio, options: { blurred: false, focused: false, keydown: true, keyup: false } },
        { name: "toggleStream", function: toggleStream, options: { blurred: false, focused: false, keydown: true, keyup: false } },
        { name: "toggleGameOrScreen", function: toggleGameOrScreen, options: { blurred: false, focused: true, keydown: true, keyup: false } }
    ],
    start: () => {
    },
    stop: () => {
    }
});
