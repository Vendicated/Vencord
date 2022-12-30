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

import { findByPropsLazy } from "@webpack";


const API_URL = "https://timezonedb.catvibers.me/";
const Cache = new Map();
export const moment: typeof import("moment") = findByPropsLazy("parseTwoDigitYear");

export interface Timezone {
    userID: string,
    timezoneId: string,
    timezone: string;
    error: string;
}
const getSettings = () => Vencord.Settings.plugins.Timezones;

export async function getUserTimezone(discordID: string): Promise<Timezone> {

    if (getSettings()[`timezones.${discordID}`])
        return {
            timezone: getSettings()[`timezones.${discordID}`],
        } as Timezone;

    if (Cache.has(discordID)) {
        return Cache.get(discordID).timezone;
    }

    const timezone = await fetch(API_URL + "api/user/" + discordID).then(
        r => r.json()
    );
    Cache.set(discordID, timezone);
    return timezone.timezone;
}

export function getTimeString(timezone: Timezone, timestamp = moment()): string {

    const time = timestamp.utcOffset(Number(timezone));

    return time.format(Vencord.Settings.plugins.Timezones.use24hr ? "HH:mm" : "h:mm A");
}
