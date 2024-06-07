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

export default definePlugin({
    name: "NeverPausePreviews",
    description: "Prevents in-call/PiP previews (screenshare, streams, etc) from pausing even if the client loses focus",
    authors: [Devs.vappster],
    patches: [
        {   //picture-in-picture player patch
            find: "streamerPaused()",
            replacement: {
                match: /return (.{0,120})&&!.{1,2}}/,
                replace: "return $1&&false}"
            }
        },
        {   //in-call player patch #1 (keep stream playing)
            find: "VideoStreamFit:",
            replacement: {
                match: /paused:.{1,2}}\)/,
                replace: "paused:false})"
            }
        },
        {   //in-call player patch #2 (disable "your stream is still running" text overlay)
            find: "let{mainText:",
            replacement: {
                match: /let{.{0,120};/,
                replace: "return;"
            }
        }
    ],
});
