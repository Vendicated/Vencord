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

import { Settings } from "../api/settings";
import { Devs } from "../utils/constants";
import definePlugin, { OptionType } from "../utils/types";
import { FluxDispatcher } from "../webpack/common";

export default definePlugin({
    name: "CallTimer",
    description: "Adds a timer to vcs",
    authors: [Devs.Ven],

    style: void 0 as HTMLStyleElement | undefined,
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


    formatDuration(ms: number) {
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
    },

    setTimer(ms: number) {
        if (!this.style) return;

        this.style.textContent = `
        [class*="connection-"] [class*="channel-"]::after {
            content: "Connected for ${this.formatDuration(ms)}";
            display: block;
        }
        `;
    },

    start() {
        const style = this.style = document.createElement("style");
        style.id = "VencordCallTimer";
        document.head.appendChild(style);

        this.setTimer(0);

        this.handleRtcConnectionState = this.handleRtcConnectionState.bind(this);
        FluxDispatcher.subscribe("RTC_CONNECTION_STATE", this.handleRtcConnectionState);
    },

    handleRtcConnectionState(e: { state: string; }) {
        if (e.state === "RTC_CONNECTED" || e.state === "RTC_DISCONNECTED") {
            clearInterval(this.interval);
            if (e.state === "RTC_CONNECTED") {
                this.startTime = Date.now();
                this.interval = setInterval(
                    () => this.setTimer(Math.round(Date.now() - this.startTime)),
                    1000
                );
            } else this.startTime = 0;
            this.setTimer(0);
        }
    },

    stop() {
        FluxDispatcher.unsubscribe("RCT_CONNECTION_STATE", this.handleRtcConnectionState);
        this.style?.remove();
        clearInterval(this.interval);
    }
});
