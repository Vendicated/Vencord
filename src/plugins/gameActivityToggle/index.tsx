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

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

function GameActivityToggleButton() {
    return (
        <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg
                width="24"
                height="24"
                viewBox="0 96 960 960"
            >
                <g fill="var(--interactive-normal)">
                    <path d="M182 856q-51 0-79-35.5T82 734l42-300q9-60 53.5-99T282 296h396q60 0 104.5 39t53.5 99l42 300q7 51-21 86.5T778 856q-21 0-39-7.5T706 826l-90-90H344l-90 90q-15 15-33 22.5t-39 7.5Zm498-240q17 0 28.5-11.5T720 576q0-17-11.5-28.5T680 536q-17 0-28.5 11.5T640 576q0 17 11.5 28.5T680 616Zm-80-120q17 0 28.5-11.5T640 456q0-17-11.5-28.5T600 416q-17 0-28.5 11.5T560 456q0 17 11.5 28.5T600 496ZM310 616h60v-70h70v-60h-70v-70h-60v70h-70v60h70v70Z" />
                    <line x1="960" y1="0" x2="0" y2="960" stroke="var(--status-danger)" stroke-width="2.5" />
                </g>
            </svg>
        </div>
    );
}

export default definePlugin({
    name: "GameActivityToggle",
    description: "Adds a button next to the mic and deafen button to toggle game activity.",
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: ".Messages.ACCOUNT_SPEAKING_WHILE_MUTED",
            replacement: {
                match: /(?<=children:\[)(?=\(0,\i\.jsx\)\(\i\.\i,{tooltipText:\i\?\i\.\i\.Messages.ACCOUNT_SPEAKING_WHILE_MUTED)/,
                replace: "$self.GameActivityToggleButton(),"
            }
        }
    ],

    GameActivityToggleButton: ErrorBoundary.wrap(GameActivityToggleButton, { noop: true })
});
