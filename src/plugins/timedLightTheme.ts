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

import { Settings } from "@api/settings";
import { Devs } from "@utils/constants.js";
import Logger from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { UserSettingsProtoStore } from "@webpack/common";

let updateTheme: (theme: "light" | "dark") => Promise<void>;
waitFor(["updateTheme"], m => ({ updateTheme } = m));
const getTheme = () => UserSettingsProtoStore.settings.appearance.theme === 1 ? "dark" : "light";
const logger = new Logger("TimedLightTheme");
let interval: NodeJS.Timer;

export default definePlugin({
    name: "TimedLightTheme",
    authors: [Devs.TheSun],
    description: "Automatically enables/disable light theme based on the time of day",
    options: {
        start: {
            description: "When to enter light mode (24-hour time)",
            type: OptionType.STRING,
            default: "08:00",
            placeholder: "xx:xx",
            isValid: t => /^\d{0,2}(?::\d{0,2})?$/.test(t),
        },
        end: {
            description: "When to enter dark mode (24-hour time)",
            type: OptionType.STRING,
            default: "20:00",
            placeholder: "xx:xx",
            isValid: t => /^\d{0,2}(?::\d{0,2})?$/.test(t),
        },
    },

    // eslint-disable-next-line consistent-return
    checkForUpdate() {
        const { start, end } = Settings.plugins[this.name];
        if (!start || !end) {
            logger.warn("Invalid settings: no start or end time. Stopping plugin");
            return this.stop();
        }

        function toAdjustedTimestamp(t: string): number {
            const [hours, minutes] = t.split(":").map(i => i && parseInt(i, 10));
            return new Date().setHours(hours as number, minutes || 0, 0, 0);
        }

        const startTimestamp = toAdjustedTimestamp(start);
        const endTimestamp = toAdjustedTimestamp(end);
        if (startTimestamp >= endTimestamp) {
            logger.warn("Invalid settings: start time higher than end time. Stopping plugin");
            return this.stop();
        }
        const now = Date.now();
        const theme = getTheme();
        // do not remove
        if (!theme) return null;

        if ((now >= endTimestamp || now <= startTimestamp) && theme === "light") return updateTheme("dark");
        else if ((now <= endTimestamp && now >= startTimestamp) && theme === "dark") return updateTheme("light");
    },

    start() {
        interval = setInterval(() => this.checkForUpdate(), 60_000);
        this.checkForUpdate();
    },

    stop() {
        clearInterval(interval);
    },
});
