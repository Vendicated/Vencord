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
import { Tooltip } from "@webpack/common";

function addTooltip(str: string, timestamp: number) {
    const joinedDate = new Date(timestamp);
    const daysAgo = Math.floor((Date.now() - joinedDate.getTime()) / 86400000);
    let tooltipText = joinedDate.toLocaleString();
    if (daysAgo === 0) tooltipText += " (Today)";
    else if (daysAgo === 1) tooltipText += " (Yesterday)";
    else tooltipText += ` (${daysAgo} days ago)`;
    return (<Tooltip text={tooltipText}>
        {({ onMouseEnter, onMouseLeave }) => (
            <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                {str}
            </div>
        )}
    </Tooltip>);
}

export default definePlugin({
    name: "BetterJoinedDate",
    authors: [Devs.AutumnVN],
    description: "Add a tooltip to the joined date showing the exact time and how many days ago it was",
    patches: [{
        find: ".USER_PROFILE_MEMBER_SINCE",
        replacement: [{
            match: /children:(\(.*?(\i\.\i\.extractTimestamp\(\i\)).*?)\}/,
            replace: "children:$self.discord($1, $2)}"
        }, {
            match: /children:(\(.*?(\i\.joinedAt).*?)\}/,
            replace: "children:$self.guild($1, $2)}"
        }]
    }],
    discord(str: string, timestamp: number) {
        return addTooltip(str, timestamp);
    },
    guild(str: string, timestamp: number) {
        return addTooltip(str, timestamp);
    }
});
