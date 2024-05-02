/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Tooltip } from "@webpack/common";

export default definePlugin({
    name: "BetterJoinedDate",
    authors: [Devs.AutumnVN],
    description: "Add a tooltip to the joined date showing the exact time and how many days ago it was",
    patches: [{
        find: ".USER_PROFILE_MEMBER_SINCE",
        replacement: [{
            match: /\(0,\i.\i\)\((\i\.\i\.extractTimestamp\(\i\)),\i\)/,
            replace: "$self.addTooltip($&, $1)"
        }, {
            match: /\(0,\i.\i\)\((\i\.joinedAt),\i\)/,
            replace: "$self.addTooltip($&, $1)"
        }]
    }],
    addTooltip(str: string, timestamp: number) {
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
});
