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
import { moment } from "@webpack/common";

export default definePlugin({
    name: "DontRoundMyTimestamps",
    authors: [Devs.Lexi],
    description: "Always rounds relative timestamps down, so 7.6y becomes 7y instead of 8y",

    start() {
        moment.relativeTimeRounding(Math.floor);
    },

    stop() {
        moment.relativeTimeRounding(Math.round);
    }
});
