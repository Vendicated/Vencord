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

import "@equicordplugins/_misc/styles.css";

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Forms } from "@webpack/common";

export default definePlugin({
    name: "NeverPausePreviews",
    description: "Prevents in-call/PiP previews (screenshare, streams, etc) from pausing even if the client loses focus",
    authors: [EquicordDevs.vappstar],
    settingsAboutComponent: () => <>
        <Forms.FormText className="plugin-warning">
            This plugin will cause discord to use more resources than normal
        </Forms.FormText>
    </>,
    patches: [
        {
            find: "streamerPaused()",
            replacement: {
                match: /return null![^}]+/,
                replace: "return false"
            }
        },
        {
            find: "emptyPreviewWrapper,children",
            replacement: {
                match: /paused:\i([^=])/,
                replace: "paused:false$1"
            }
        },
        {
            find: "let{mainText:",
            replacement: {
                match: /let{[^;]+/,
                replace: "return"
            }
        }
    ],
});
