/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findStoreLazy } from "@webpack";
import { Logger } from "@utils/Logger";
import { makeLazy } from "@utils/lazy";

const UserSettingsProtoStore = findStoreLazy("UserSettingsProtoStore");
const TIMEZONE_LIST = "https://gist.githubusercontent.com/ArjixWasTaken/e321f856f98676505efb90aad82feff1/raw/91034ee32eff93a7cb62d10702f6b1d01e0309e6/timezones.json";

export function formatTimestamp(timezone: string, timestamp: Date = new Date()): string | undefined {
    try {
        const locale = UserSettingsProtoStore.settings.localization.locale.value;
        const formatter = new Intl.DateTimeFormat(locale, {
            hour: "numeric",
            minute: "numeric",
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

    return await fetch(TIMEZONE_LIST).then(res => res.json());
}

export const getTimezonesLazy = makeLazy(getTimezones, 2);
