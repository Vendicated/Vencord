/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Parser } from "@webpack/common";

import { findFullDate } from "./👀";



function getTimestamp(date: Date, prefix?: string | null): string {
    const timestamp = Math.floor(date.getTime() / 1000);
    prefix ??= "t";
    const discordTimestamp = `<t:${timestamp}:${prefix}>`;
    return discordTimestamp;
}

export function replaceTimestamp(content: string): string {
    const date = findFullDate(content);
    // logger.log("DATE", date);
    if (date) {
        if (date.length === 0)
            return `${content.slice(0, date.nextIndex)}${replaceTimestamp(content.slice(date.index, content.length))}`;
        return `${content[date.index - 1] === "\\" ? `${content.slice(0, date.index - 1)}${content.slice(date.index, date.nextIndex)}${replaceTimestamp(content.slice(date.nextIndex, content.length))}` : `${content.slice(0, date.index)}${getTimestamp(date.date, date.prefix)}${replaceTimestamp(content.slice(date.nextIndex))}`}`;
    }
    return content;
}


// export async function start(): Promise<void> {
//   inject.before(messages, "sendMessage", (_args) => {
//     _args[1].content = replaceTimestamp(_args[1].content);
//     return _args;
//   });
//   inject.before(messages, "editMessage", (_args) => {
//     _args[2].content = replaceTimestamp(_args[2].content);
//     return _args;
//   });
// }
// export function stop(): void {
//   inject.uninjectAll();
// }
const timestamp = Math.floor(Date.now() / 1000);

const settings = definePluginSettings({
    requirePrefix: {
        description: "Only convert timestamps with a prefix (e.g. 't-', 'T-')",
        type: OptionType.BOOLEAN,
        default: false,
    },
    defaultPrefix: {
        description: "default prefix for timestamps (used for formatting if none is specified)",
        type: OptionType.SELECT,
        options: [
            { label: `${Parser.parse(`<t:${timestamp}:t>`)} (ｔ-) `, value: "t" },
            { label: `${Parser.parse(`<t:${timestamp}:T>`)} (Ｔ-) `, value: "T" },
            { label: `${Parser.parse(`<t:${timestamp}:d>`)} (ｄ-) `, value: "d" },
            { label: `${Parser.parse(`<t:${timestamp}:D>`)} (Ｄ-) `, value: "D" },
            { label: `${Parser.parse(`<t:${timestamp}:f>`)} (ｆ-) `, value: "f" },
            { label: `${Parser.parse(`<t:${timestamp}:F>`)} (Ｆ-) `, value: "F" },
            { label: `${Parser.parse(`<t:${timestamp}:R>`)} (Ｒ-) `, value: "R" },
        ],
        default: "t",
    },
    dateFormat: {
        description: "Date format to recognize",
        type: OptionType.SELECT,
        options: [
            { label: "DD/MM/YYYY", value: "dmy", },
            { label: "DD/YYYY/MM", value: "dym", }, // Mental illness
            { label: "MM/DD/YYYY", value: "mdy", },
            { label: "MM/YYYY/DD", value: "myd", }, // Mental illness pt.2
            { label: "YYYY/MM/DD", value: "ymd", },
            { label: "YYYY/DD/MM", value: "ydm", },
        ],
        default: "dmy",
    },
    useShortYear: {
        description: "Use short year format (e.g. 23 instead of 2023)",
        type: OptionType.BOOLEAN,
        default: true,
    }

});

export default definePlugin({
    name: "timestamps",
    description: "Timestamps in your messages. With extensive formatting options (ported from replugged)",
    authors: [Devs.lisekilis],
    settings,

    onBeforeMessageSend(_, message) {
        message.content = replaceTimestamp(message.content);
    },
    onBeforeMessageEdit(_, __, message) {
        message.content = replaceTimestamp(message.content);
    }

});
