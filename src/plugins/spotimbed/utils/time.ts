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

const MONTH_NAMES = "January February March April May June July August September October November December".split(" ");
const SECOND = 1e3;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const getMonth = (n: number) => MONTH_NAMES[n];

export const formatDuration = (ms: number) => {
    const parts = [Math.floor(ms / SECOND % 60).toString().padStart(2, "0")];
    parts.unshift(Math.floor(ms / MINUTE % 60).toString().padStart(2, "0"));
    if (ms >= HOUR) parts.unshift(Math.floor(ms / HOUR).toString());
    return parts.join(":").replace(/^0+(?=\d)/, "");
};
