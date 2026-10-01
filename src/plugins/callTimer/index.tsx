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

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useTimer } from "@utils/react";
import { formatDuration } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import alignedChatInputFix from "./alignedChatInputFix.css?managed";

const settings = definePluginSettings({
    format: {
        type: OptionType.SELECT,
        description: "The timer format. This can be any valid moment.js format",
        options: [
            {
                label: "30d 23:00:42",
                value: "stopwatch",
                default: true
            },
            {
                label: "30d 23h 00m 42s",
                value: "human"
            }
        ] as const
    }
});



export default definePlugin({
    name: "CallTimer",
    description: "Adds a timer to vcs",
    tags: ["Voice", "Utility"],
    authors: [Devs.Ven],
    managedStyle: alignedChatInputFix,
    settings,

    startTime: 0,
    interval: void 0 as NodeJS.Timeout | undefined,

    patches: [
        {
            find: '"RTCConnectionMenu"',
            replacement: {
                match: /("RTCConnectionMenu".{0,200}?lineClamp:1,children:)(\i)(?=,|}\))/,
                replace: "$1[$2,$self.renderTimer({ channelId: this?.props?.channel?.id })]"
            }
        },
    ],

    renderTimer: ErrorBoundary.wrap(({ channelId }: { channelId: string; }) => {
        const time = useTimer({ deps: [channelId] });

        return (
            <p style={{ margin: 0, fontFamily: "var(--font-code)" }}>
                {formatDuration(time, settings.store.format === "human")}
            </p>
        );
    }, { noop: true }),
});
