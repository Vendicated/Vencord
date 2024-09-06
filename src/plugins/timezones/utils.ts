/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { makeLazy } from "@utils/lazy";
import { Logger } from "@utils/Logger";
import { findStoreLazy } from "@webpack";

const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");
const TIMEZONE_LIST = "https://gist.githubusercontent.com/ArjixWasTaken/e321f856f98676505efb90aad82feff1/raw/91034ee32eff93a7cb62d10702f6b1d01e0309e6/timezones.json";

export function formatTimestamp(
    timezone: string,
    timestamp: number | Date | undefined,
    long: boolean,
): string | undefined {
    try {
        const locale = UserSettingsProtoStore.settings.localization.locale.value;
        const options: Intl.DateTimeFormatOptions = !long
            ? { hour: "numeric", minute: "numeric" }
            : {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                timeZoneName: "shortOffset",
            };

        const formatter = new Intl.DateTimeFormat(locale, {
            ...options,
            timeZone: timezone,
        });

        return formatter.format(timestamp);
    } catch (e) {
        // Probably never going to happen
        new Logger("Timezones").error(`Failed to format timestamp with timezone ${timezone}`, e);
    }
}

async function getTimezones(): Promise<string[]> {
    if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
        try {
            return Intl.supportedValuesOf("timeZone");
        } catch {
            // Fallthrough to fetching external timezone list
        }
    }

    try {
        return await fetch(TIMEZONE_LIST).then(res => res.json());
    } catch (e) {
        new Logger("Timezones").error("Failed to fetch external timezones list", e);
        return [];
    }
}

export const getTimezonesLazy = makeLazy(getTimezones, 2);
