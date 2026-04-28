/* eslint-disable simple-header/header */
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

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const DEFAULT_HISTORY_RETENTION_DAYS = 14;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const settings = definePluginSettings({
    whitelistedIds: {
        default: "",
        type: OptionType.STRING,
        description: "Whitelisted user IDs to stalk"
    },
    historyRetentionDays: {
        default: DEFAULT_HISTORY_RETENTION_DAYS,
        type: OptionType.NUMBER,
        description: "How many days of presence history to retain (0 to keep everything)"
    },
    debug: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Enable debug logging"
    }
});

export function getWhitelistedIds(): string[] {
    return settings.store.whitelistedIds ? settings.store.whitelistedIds.split(",").map(s => s.trim()).filter(Boolean) : [];
}

export function getRetentionDays() {
    const value = settings.store.historyRetentionDays;
    if (Number.isNaN(value)) return DEFAULT_HISTORY_RETENTION_DAYS;
    return Math.max(0, value);
}

export function getRetentionCutoffMs() {
    const days = getRetentionDays();
    if (!days) return 0;
    return Date.now() - days * MS_PER_DAY;
}

export function isDebugEnabled() {
    return settings.store.debug;
}

