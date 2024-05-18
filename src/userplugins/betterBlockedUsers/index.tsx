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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, Tooltip } from "@webpack/common";

export const settings = definePluginSettings({
    showingAllowed: {
        description: "Allow Blocked Messages to be opened",
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "BetterBlockedMessages",
    description: "Makes blocked messages less intrusive and cleaner to look at",
    authors: [{
        name: "IThundxr",
        id: 0n
    }],
    settings,
    patches: [{
        find: "isBeforeGroup:",
        replacement: {
            match: /(\.collapsedReason;return\(0,\w\.jsx\)\(\w+\.Z,{.*?childrenMessageContent:\(0,\w\.jsx\)\()\w+\.Z,{/,
            replace: (_, head) => `${head}$self.actionBarComponent,{...arguments[0],`
        }
    }],

    actionBarComponent(props: {
        onClick: () => void;
        expanded: number; // actually a boolean, but fuck TS
        count: number;
        compact: boolean;
        collapsedReason: unknown;
    }) {
        const { onClick, count: msgCount } = props;

        const { showingAllowed } = settings.use(["showingAllowed"]);
        const text = msgCount === 1 ? "Blocked Message" : `${msgCount} Blocked Messages`;

        return (
            <div className="vc-betterblockedmessages-main" id="---blocked-message-bar" role="separator">
                <span className="vc-betterblockedmessages-divider">
                    <svg className="vc-betterblockedmessages-svg" aria-hidden="true" role="img" width="8" height="13" viewBox="0 0 8 13">
                        <path className="vc-betterblockedmessages-color" stroke="currentColor" fill="transparent" d="M8.16639 0.5H9C10.933 0.5 12.5 2.067 12.5 4V9C12.5 10.933 10.933 12.5 9 12.5H8.16639C7.23921 12.5 6.34992 12.1321 5.69373 11.4771L0.707739 6.5L5.69373 1.52292C6.34992 0.86789 7.23921 0.5 8.16639 0.5Z"></path>
                    </svg>
                    {
                        showingAllowed ?
                            <Tooltip
                                text={
                                    ["Show", "Hide"][props.expanded + 0] +
                                    " Blocked Message" +
                                    (msgCount > 1 && "s" || "")
                                }
                            >
                                {(tooltipProps: any) => (
                                    <button {...tooltipProps} className="vc-betterblockedmessages-button" onClick={onClick}>
                                        {text}
                                    </button>
                                )}
                            </Tooltip>
                            :
                            <span className="vc-betterblockedmessages-span">{text}</span>
                    }
                </span>
            </div>
        );
    },
});
