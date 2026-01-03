/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Parser, useState } from "@webpack/common";
import { Components, Settings } from "Vencord";

import { findFullDate } from "./👀";


function getTimestamp(date: Date, prefix?: string | null): string {
    const timestamp = Math.floor(date.getTime() / 1000);
    prefix ??= "t";
    const discordTimestamp = `<t:${timestamp}:${prefix}>`;
    return discordTimestamp;
}

function replaceTimestamp(content: string): string {
    const date = findFullDate(content);
    // logger.log("DATE", date);
    if (date) {
        if (date.length === 0)
            return `${content.slice(0, date.nextIndex)}${replaceTimestamp(content.slice(date.index, content.length))}`;
        return `${content[date.index - 1] === "\\" ? `${content.slice(0, date.index - 1)}${content.slice(date.index, date.nextIndex)}${replaceTimestamp(content.slice(date.nextIndex, content.length))}` : `${content.slice(0, date.index)}${getTimestamp(date.date, date.prefix)}${replaceTimestamp(content.slice(date.nextIndex))}`}`;
    }
    return content;
}

// This is used for the description
function formatDate(
    day: number | string,
    month: number | string,
    year: number | string,
    dateFormat: string,
): string {
    console.log("Date Format:", dateFormat);
    const etad = (() => {
        switch (dateFormat) {
            case "dmy":
                return `${day}/${month}/${year}`;
            case "dym":
                return `${day}/${year}/${month}`;
            case "mdy":
                return `${month}/${day}/${year}`;
            case "myd":
                return `${month}/${year}/${day}`;
            case "ymd":
                return `${year}/${month}/${day}`;
            case "ydm":
                return `${year}/${day}/${month}`;
            default:
                break;
        }
    })();
    return `${etad}`;
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
        type: OptionType.SELECT, // This uses runtime variables which typescript is not a fan of
        options: [
            { label: "", value: "t" },
            { label: "", value: "T" },
            { label: "", value: "d" },
            { label: "", value: "D" },
            { label: "", value: "f" },
            { label: "", value: "F" },
            { label: "", value: "R" },
        ],
        default: "t",
        componentProps: {
            renderOptionLabel: option => Parser.parse(`<t:${timestamp}:${option.value}> (${String.fromCharCode(option.value.charCodeAt(0) + 0xFEE0)})`),
            renderOptionValue: option => Parser.parse(`<t:${timestamp}:${option[0].value}> (${String.fromCharCode(option[0].value.charCodeAt(0) + 0xFEE0)})`)
        }
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
    },

    settingsAboutComponent() {
        const [collapsed, setCollapsed] = useState(true);

        return (
            <>
                <Components.Paragraph>
                    Timestamps plugin ported from <Components.Link href="https://github.com/lisekilis/replugged-timestamps">Replugged-Timestamps</Components.Link> by lisekilis
                </Components.Paragraph>
                <Components.TextButton variant="link" onClick={() => setCollapsed(!collapsed)} style={{ marginBottom: "10px", padding: 0 }}>
                    {collapsed ? "▶ Show" : "▼ Hide"} Usage Guide
                </Components.TextButton>
                {!collapsed && (
                    <>
                        <Components.Heading>There are a two ways to use timestamps:</Components.Heading>
                        <Components.HeadingSecondary>Absolute Timestamps</Components.HeadingSecondary>
                        <Components.Paragraph>
                            <code className="inline">{formatDate("20", "08", "2023", Settings.plugins.timestamps.dateFormat)} 23:55</code>
                            The time can be in 24-hour or 12-hour format. The date is optional and you can use any separator (/, ., -) between date parts.
                        </Components.Paragraph>
                        <Components.Paragraph>
                            <small>
                                <span>
                                    <span>
                                        Absolute timestamps do not require a prefix unless the "Require Prefix" setting is enabled.
                                    </span>
                                </span>
                            </small>
                        </Components.Paragraph>
                        <Components.Divider />
                        <Components.HeadingSecondary>Relative Timestamps</Components.HeadingSecondary>
                        <Components.Paragraph>
                            Relative: <Components.CodeBlock lang="md" content={"5d2h5h -3h now"} />. You can combine multiple time units in order of largest to smallest.
                        </Components.Paragraph>
                        <Components.HeadingTertiary>Relative timestamps always require a prefix regardless of the "Require Prefix" setting.</Components.HeadingTertiary>
                        <Components.Divider />
                        <Components.Paragraph>
                            Supported prefixes are: <code>t</code>, <code>T</code>, <code>d</code>, <code>D</code>, <code>f</code>, <code>F</code>, and <code>R</code>.
                            If no prefix is specified, the default prefix from the settings will be used.
                        </Components.Paragraph>
                    </>
                )}
            </>
        );
    },
});
