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

import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { useTimer } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

function formatDuration(ms: number) {
    // here be dragons (moment fucking sucks)
    const human = Settings.plugins.CallTimer.format === "human";

    const format = (n: number) => human ? n : n.toString().padStart(2, "0");
    const unit = (s: string) => human ? s : "";
    const delim = human ? " " : ":";

    // thx copilot
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor(((ms % 86400000) % 3600000) / 60000);
    const s = Math.floor((((ms % 86400000) % 3600000) % 60000) / 1000);

    let res = "";
    if (d) res += `${d}d `;
    if (h || res) res += `${format(h)}${unit("h")}${delim}`;
    if (m || res || !human) res += `${format(m)}${unit("m")}${delim}`;
    res += `${format(s)}${unit("s")}`;

    return res;
}

export default definePlugin({
    name: "CallTimer",
    description: "Adds a timer to vcs",
    authors: [Devs.Ven],

    startTime: 0,
    interval: void 0 as NodeJS.Timeout | undefined,

    options: {
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
            ]
        }
    },

    patches: [{
        find: "renderConnectionStatus(){",
        replacement: {
            match: /(?<=renderConnectionStatus\(\)\{.+\.channel,children:)\i(?=\})/,
            replace: "[$&, $self.renderTimer(this.props.channel.id)]"
        }
    }],

    renderTimer(channelId: string) {
        return <ErrorBoundary noop>
            <this.Timer channelId={channelId} />
        </ErrorBoundary>;
    },

    Timer({ channelId }: { channelId: string; }) {
        const time = useTimer({
            deps: [channelId]
        });

        return <p style={{ margin: 0 }}>Connected for <span style={{ fontFamily: "var(--font-code)" }}>{formatDuration(time)}</span></p>;
    }
});
