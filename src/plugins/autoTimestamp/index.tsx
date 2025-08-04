/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 OpenAsar
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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";


function parseTime(message: string, relativePrefix: string): string {
    const now = new Date();
    let hour = 0, minute = 0, second = 0;
    let isPM = false;
    let hasMinutes = false;
    let hasSeconds = false;

    let isRelative = false;
    if (relativePrefix && message.startsWith(relativePrefix)) {
        isRelative = true;
        message = message.slice(relativePrefix.length);
    }

    const timeRegex = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?$/i;
    const res = message.trim().match(timeRegex);
    if (!res) return message;

    hour = parseInt(res[1], 10);
    if (res[2] !== undefined) {
        minute = parseInt(res[2], 10);
        hasMinutes = true;
    }
    if (res[3] !== undefined) {
        second = parseInt(res[3], 10);
        hasSeconds = true;
    }
    if (res[4]) {
        isPM = res[4].toLowerCase() === "pm";
    }

    if (res[4]) {
        if (isPM && hour < 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;
    }

    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, second);
    if (date.getTime() <= now.getTime()) {
        date.setDate(date.getDate() + 1);
    }
    const unix = Math.floor(date.getTime() / 1000);

    let format = "t";
    if ((hasMinutes && minute !== 0) || hasSeconds) {
        format = "T";
    }
    if (isRelative) format = "R";
    return `<t:${unix}:${format}>`;
}

function parseDate(dateStr: string, format: string, relativePrefix: string): string {
    let day = 1, month = 0, year = 1970;
    let match: RegExpMatchArray | null = null;
    let isRelative = false;
    if (relativePrefix && dateStr.startsWith(relativePrefix)) {
        isRelative = true;
        dateStr = dateStr.slice(relativePrefix.length);
    }
    if (format === "DD/MM/YYYY") {
        match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match) {
            day = parseInt(match[1], 10);
            month = parseInt(match[2], 10) - 1;
            year = parseInt(match[3], 10);
        }
    } else if (format === "MM/DD/YYYY") {
        match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (match) {
            month = parseInt(match[1], 10) - 1;
            day = parseInt(match[2], 10);
            year = parseInt(match[3], 10);
        }
    } else if (format === "YYYY/MM/DD") {
        match = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        if (match) {
            year = parseInt(match[1], 10);
            month = parseInt(match[2], 10) - 1;
            day = parseInt(match[3], 10);
        }
    } else if (format === "YYYY/DD/MM") {
        match = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        if (match) {
            year = parseInt(match[1], 10);
            day = parseInt(match[2], 10);
            month = parseInt(match[3], 10) - 1;
        }
    } else {
        return dateStr;
    }
    if (!match) return dateStr;
    const date = new Date(year, month, day);
    const unix = Math.floor(date.getTime() / 1000);
    const tsFormat = isRelative ? "R" : "D";
    return `<t:${unix}:${tsFormat}>`;
}

function parseDateTime(dateTimeStr: string, relativePrefix: string): string {
    let isRelative = false;
    if (relativePrefix && dateTimeStr.startsWith(relativePrefix)) {
        isRelative = true;
        dateTimeStr = dateTimeStr.slice(relativePrefix.length);
    }
    dateTimeStr = dateTimeStr.trim();
    const dateFirst = /(?<date>(\d{1,4}[/-]\d{1,2}[/-]\d{1,4}))\s+(?<time>(\d{1,2}(?::\d{2})?(?::\d{2})?\s*(?:AM|PM|am|pm)?))/;
    const timeFirst = /(?<time>(\d{1,2}(?::\d{2})?(?::\d{2})?\s*(?:AM|PM|am|pm)?))\s+(?<date>(\d{1,4}[/-]\d{1,2}[/-]\d{1,4}))/;
    const match = dateTimeStr.match(dateFirst) || dateTimeStr.match(timeFirst);
    if (!match || !match.groups) return dateTimeStr;
    const { date, time } = match.groups;
    let day = 1, month = 0, year = 1970;
    const dmy = date.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    const ymd = date.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (dmy) {
        day = parseInt(dmy[1], 10);
        month = parseInt(dmy[2], 10) - 1;
        year = parseInt(dmy[3], 10);
    } else if (ymd) {
        year = parseInt(ymd[1], 10);
        month = parseInt(ymd[2], 10) - 1;
        day = parseInt(ymd[3], 10);
    } else {
        return dateTimeStr;
    }
    let hour = 0, minute = 0, second = 0;
    const t = time.match(/(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(am|pm)?/i);
    if (t) {
        hour = parseInt(t[1], 10);
        if (t[2]) minute = parseInt(t[2], 10);
        if (t[3]) second = parseInt(t[3], 10);
        if (t[4]) {
            const isPM = t[4].toLowerCase() === "pm";
            if (isPM && hour < 12) hour += 12;
            if (!isPM && hour === 12) hour = 0;
        }
    }
    const dateObj = new Date(year, month, day, hour, minute, second);
    const unix = Math.floor(dateObj.getTime() / 1000);
    const tsFormat = isRelative ? "R" : "f";
    return `<t:${unix}:${tsFormat}>`;
}

const settings = definePluginSettings({
    replaceTime: {
        description: "Replace time in message contents(e.g. 10:00, 10pm)",
        type: OptionType.BOOLEAN,
        default: true,
    },
    replaceDate: {
        description: "Replace date in message contents(e.g. 20/2/2005)",
        type: OptionType.BOOLEAN,
        default: true,
    },
    replaceDateTime: {
        description: "Replace date and time in message contents(e.g. 20/2/2005 10:00 or 10pm 20/2/2005)",
        type: OptionType.BOOLEAN,
        default: true,
    },
    parseWrapper: {
        description: "Message wrapper to use for time parsing(e.g. `10pm`)",
        type: OptionType.STRING,
        default: "`",
        placeholder: "empty for no wrapper",
    },
    dateFormat: {
        description: "Date format to use for date replacement",
        type: OptionType.SELECT,
        options: [
            { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
            { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
            { label: "YYYY/MM/DD", value: "YYYY/MM/DD" },
            { label: "YYYY/DD/MM", value: "YYYY/DD/MM" },
        ],
        default: "DD/MM/YYYY",
    },
    relativePrefix: {
        description: "Prefix for relative timestamps (e.g. ':10pm', ':20/2/2005', ':10pm 20/2/2005')",
        type: OptionType.STRING,
        default: ":",
        placeholder: "empty for disabled",
    }

});

export default definePlugin({
    name: "AutoTimestamp",
    description: "Automatically convert times in messages to Discord timestamps",
    authors: [Devs.catsonluna],
    settings,


    onBeforeMessageSend(_, msg) {
        const wrapper = settings.store.parseWrapper.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const { relativePrefix } = settings.store;
        const relPrefixPattern = relativePrefix ? `${relativePrefix}` : "";
        if (settings.store.replaceDateTime) {
            const dateTimeRegex = new RegExp(`(?:${relPrefixPattern})?(?:\\d{1,2}(?::\\d{2})?(?::\\d{2})?\\s*(?:AM|PM|am|pm)?\\s+[\\d/-]{6,}|[\\d/-]{6,}\\s+\\d{1,2}(?::\\d{2})?(?::\\d{2})?\\s*(?:AM|PM|am|pm)?)`, "g");
            msg.content = msg.content.replace(dateTimeRegex, substring => parseDateTime(substring, relativePrefix));
        }
        if (settings.store.replaceTime) {
            const regex = new RegExp(`${wrapper}(${relPrefixPattern}?(?:\\d{1,2}:(?:\\d{2})(?::\\d{2})?\\s*(?:AM|PM|am|pm)?|\\d{1,2}\\s*(?:AM|PM|am|pm)))${wrapper}`, "g");
            msg.content = msg.content.replace(regex, (_, time) => parseTime(time, relativePrefix));
        }
        if (settings.store.replaceDate) {
            const dateRegex = new RegExp(`${wrapper}(${relPrefixPattern}?(?:\\d{1,4}[/-]\\d{1,2}[/-]\\d{1,4}))${wrapper}`, "g");
            msg.content = msg.content.replace(dateRegex, (substring, date) => parseDate(String(date), settings.store.dateFormat ?? "DD/MM/YYYY", relativePrefix));
        }
    }

});
