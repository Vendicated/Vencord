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

const units: Intl.RelativeTimeFormatUnit[] = ["second", "minute", "hour", "day", "week", "month", "year"];
const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];

export default definePlugin({
    name: "MessageTimeAgo",
    description: "Adds relative time (\"time from now\") to chat message timestamps.",
    authors: [Devs.aelew],
    patches: [
        {
            find: "Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL",
            replacement: {
                match: /.{13}"LT"\):\(.{8}(.{1})\)/,
                replace: (match, moment) => `${match}+' • '+$self.getRelativeTime(${moment})`
            }
        }
    ],
    getRelativeTime(moment: moment.Moment) {
        const elapsed = moment.valueOf() - Date.now();
        const deltaSeconds = Math.round(elapsed / 1000);

        const unitIndex = cutoffs.findIndex(cutoff => cutoff > Math.abs(deltaSeconds));
        const divisor = unitIndex ? cutoffs[unitIndex - 1] : 1;

        const rtf = new Intl.RelativeTimeFormat(navigator.language, { numeric: "auto" });
        return rtf.format(Math.min(0, Math.round(deltaSeconds / divisor)), units[unitIndex]);
    }
});
