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

const PreloadedUserSettings = findLazy(m => m.ProtoClass?.typeName === "discord_protos.discord_users.v1.PreloadedUserSettings");

import * as DataStore from "@api/DataStore";
import { findLazy } from "@webpack";
export const DATASTORE_KEY = "plugins.Timezones.savedTimezones";
import type { timezones } from "./all_timezones";


export interface TimezoneDB {
    [userId: string]: typeof timezones[number];
}

const API_URL = "https://timezonedb.catvibers.me/";
const Cache = new Map<string, string | null>();

export async function getUserTimezone(discordID: string): Promise<string | null> {
    const timezone = (await DataStore.get(DATASTORE_KEY) as TimezoneDB | undefined)?.[discordID];
    if (timezone) return timezone;

    if (Cache.has(discordID)) {
        return Cache.get(discordID) as string | null;
    }

    const response = await fetch(API_URL + "api/user/" + discordID);
    const timezone_res = await response.json();

    if (response.status !== 200) {
        Cache.set(discordID, null);
        return null;
    }

    Cache.set(discordID, timezone_res.timezoneId);
    return timezone_res.timezoneId;
}

export function getTimeString(timezone: string, timestamp = new Date()): string {
    const locale = PreloadedUserSettings.getCurrentValue().localization.locale.value;

    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "numeric", timeZone: timezone }).format(timestamp); // we hate javascript
}
