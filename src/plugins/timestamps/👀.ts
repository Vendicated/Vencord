/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// import { Logger } from "replugged";
// import { cfg } from "./config";

import { Settings } from "@api/Settings";

import {
    findDateResult,
    findPrefixResult,
    findResult,
    findTextResult,
    findTimeResult,
} from "./types";

// const logger = Logger.plugin("Replugged-Timestamps");

function findPrefix(content: string, index?: number): findPrefixResult | null {
    // logger.log("Prefix Content: ", content.slice(index, content.length));
    const match = /(?<prefix>[dDtTfFR])-/.exec(content.slice(index, content.length));
    if (match) {
        return {
            prefix: match.groups!.prefix,
            index: (index ?? 0) + match.index,
            length: match[0].length,
            nextIndex: match.index + match[0].length,
        };
    }
    return null;
}
function findText(content: string, index?: number): findTextResult | null {
    // logger.log("Text Content: ", content.slice(index, content.length));
    const match =
        /^(now|(((?<years>-?\d+)yr?))?([, ]?(?<months>-?\d+)mth)?([, ]?(?<weeks>-?\d+)w)?([, ]?(?<days>-?\d+)d)?([, ]?(?<hours>-?\d+)h)?([, ]?(?<minutes>-?\d+)m)?([, ]?(?<seconds>-?\d+)s)?)/i.exec(
            content.slice(index, content.length),
        ); // Warning! this matches an empty string
    if (match && match[0].toLowerCase() === "now")
        return {
            text: match[0],
            offset: 0,
            index: (index ?? 0) + match.index,
            length: match[0].length,
            nextIndex: (index ?? 0) + match.index + match[0].length,
        };
    if (match && match[0] !== "") {
        // logger.log("Text Match:", match);
        return {
            text: match[0],
            offset:
                Number(match.groups?.years ?? 0) * 31556952000 +
                Number(match.groups?.months ?? 0) * 2629746000 +
                Number(match.groups?.weeks ?? 0) * 604800000 +
                Number(match.groups?.days ?? 0) * 86400000 +
                Number(match.groups?.hours ?? 0) * 3600000 +
                Number(match.groups?.minutes ?? 0) * 60000 +
                Number(match.groups?.seconds ?? 0) * 1000,
            index: (index ?? 0) + match.index,
            length: match[0].length,
            nextIndex: (index ?? 0) + match.index + match[0].length,
        };
    }
    return null;
}
function findDate(
    content: string,
    dateFormat: string,
    shortYear: boolean,
    index?: number,
): findDateResult | null {
    // logger.log("Date Content: ", content.slice(index, content.length));
    const year = "(?<year>\\d+)";
    const month = "(?<month>1[0-2]|0?[0-9])";
    const day = "(?<day>[0-2]?[0-9]|3[0-1])";
    let dateRegex;
    switch (dateFormat) {
        case "dmy":
            dateRegex = new RegExp(`(?<![^\\\\\\s(])${day}[./-]${month}[./-]${year}\\b`);
            break;
        case "dym":
            dateRegex = new RegExp(`(?<![^\\\\\\s(])${day}[./-]${year}[./-]${month}\\b`); // mental illness
            break;
        case "mdy":
            dateRegex = new RegExp(`(?<![^\\\\\\s(])${month}[./-]${day}[./-]${year}\\b`);
            break;
        case "myd":
            dateRegex = new RegExp(`(?<![^\\\\\\s(])${month}[./-]${year}[./-]${day}\\b`); // mental illness
            break;
        case "ymd":
            dateRegex = new RegExp(`(?<![^\\\\\\s(])${year}[./-]${month}[./-]${day}\\b`);
            break;
        case "ydm":
            dateRegex = new RegExp(`(?<![^\\\\\\s(])${year}[./-]${day}[./-]${month}\\b`);
            break;
        default:
            return null;
    }
    const match = dateRegex.exec(content.slice(index, content.length));
    // logger.log("DateRegex:", { regex: dateRegex, match });
    const now = new Date();
    if (match) {
        if (shortYear && match.groups?.year.length === 2)
            match.groups.year = `${Number(match.groups.year) + now.getFullYear() - (now.getFullYear() % 100)}`;
        return {
            year: Number(match.groups!.year),
            month: Number(match.groups!.month),
            day: Number(match.groups!.day),
            index: (index ?? 0) + match.index,
            length: match[0].length,
            nextIndex: (index ?? 0) + match.index + match[0].length,
        };
    }
    return null;
}
function findTime(content: string, index?: number): findTimeResult | null {
    // logger.log("Time Content: ", content.slice(index, content.length));
    const shortTimeRegex =
        /(?<![^\\\s(])(?<hour>0?[1-9]|1[0-2]):(?<minute>[0-5]?[0-9])\s*(?<am_pm>am|pm)/i;
    const longTimeRegex = /(?<![^\\\s(])(?<hour>[0-1]?[0-9]|2[0-4]):(?<minute>[0-5]?[0-9])/;
    shortTimeRegex.lastIndex = index ?? 0;
    longTimeRegex.lastIndex = index ?? 0;
    const shortTimeMatch = shortTimeRegex.exec(content.slice(index, content.length));
    if (shortTimeMatch) {
        if (shortTimeMatch.groups?.am_pm.toLowerCase() === "pm" && shortTimeMatch.groups.hour !== "12")
            shortTimeMatch.groups.hour = `${Number(shortTimeMatch.groups.hour) + 12}`;
        if (
            shortTimeMatch.groups?.hour === "12" &&
            shortTimeMatch.groups.am_pm.toLowerCase() === "am"
        )
            shortTimeMatch.groups.hour = "0";
        if (
            shortTimeMatch.groups?.hour === "00" &&
            shortTimeMatch.groups.minute === "00" &&
            shortTimeMatch.groups.am_pm.toLowerCase() === "pm"
        )
            shortTimeMatch.groups.hour = "24";
        return {
            hour: Number(shortTimeMatch.groups!.hour),
            minute: Number(shortTimeMatch.groups!.minute),
            second: 0,
            ms: 0,
            index: (index ?? 0) + shortTimeMatch.index,
            length: shortTimeMatch[0].length,
            nextIndex: (index ?? 0) + shortTimeMatch.index + shortTimeMatch[0].length,
        };
    }
    const longTimeMatch = longTimeRegex.exec(content.slice(index, content.length));
    if (longTimeMatch) {
        return {
            hour: Number(longTimeMatch.groups!.hour),
            minute: Number(longTimeMatch.groups!.minute),
            second: 0,
            ms: 0,
            index: (index ?? 0) + longTimeMatch.index,
            length: longTimeMatch[0].length,
            nextIndex: (index ?? 0) + longTimeMatch.index + longTimeMatch[0].length,
        };
    }
    return null;
}
function findCrap(content: string): string | null {
    // logger.log("Crap Content: ", content);
    const crap = /\S*.*\S/gm;
    const match = crap.exec(content);
    if (match) return match[0];
    return null;
}
export function findFullDate(content: string): findResult | null {
    const prefix = findPrefix(content);
    if (!prefix && Settings.plugins.Timestamps.requirePrefix /* cfg.get("prefix", false)*/) return null;
    const now = new Date();
    const text = prefix ? findText(content, prefix.nextIndex) : null;
    // logger.log("Text:", text);
    if (prefix && text)
        return {
            prefix: prefix.prefix,
            date: new Date(now.valueOf() + text.offset),
            index: prefix.index,
            length: prefix.length + text.length,
            nextIndex: text.nextIndex,
        };
    const date = findDate(
        content,
        Settings.plugins.Timestamps.dateFormat /* cfg.get("dateFormat", "mdy")*/,
        Settings.plugins.Timestamps.useShortYear /* cfg.get("shortYear", true)*/,
        prefix ? prefix.nextIndex : 0,
    );
    const time = findTime(content, date ? date.nextIndex : prefix ? prefix.nextIndex : 0);
    // logger.log("Prefix:", prefix);
    // logger.log("Date:", date);
    // logger.log("Time:", time);
    // edge case returns
    if (!time) return null;
    const errReturn: findResult = {
        prefix: null,
        date: new Date(),
        index: prefix ? prefix.index : date ? date.index : time.index,
        length: 0,
        nextIndex: prefix ? prefix.nextIndex : date ? date.nextIndex : 0,
    };
    if (prefix && date && findCrap(content.slice(prefix.nextIndex, date.index))) {
        // logger.log(1);
        return errReturn;
    }
    if (date && findCrap(content.slice(date.nextIndex, time.index))) {
        // logger.log(2);
        return errReturn;
    }
    if (prefix && date == null && findCrap(content.slice(prefix.nextIndex, time.index))) {
        // logger.log(3);
        return errReturn;
    }

    let fullDate = new Date();
    if (date)
        fullDate = new Date(date.year, date.month - 1, date.day, time.hour, time.minute, time.second);
    else
        fullDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            time.hour,
            time.minute,
            time.second,
            time.ms,
        );
    return {
        prefix: prefix ? prefix.prefix : null,
        date: fullDate,
        index: prefix ? prefix.index : date ? date.index : time.index,
        length:
            (prefix ? prefix.length : 0) +
            (text ? text.length : 0) +
            (date ? date.length : 0) +
            time.length,
        nextIndex: text ? text.nextIndex : time.nextIndex,
    };
}
