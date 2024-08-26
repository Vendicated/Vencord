/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import process from "node:process";

export function capitalize(string: string) {
    return string.replace(/^./, c => c.toUpperCase());
}

export function codeBlock(content?: unknown, indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return `\`\`\`\n${content}\n\`\`\``.replaceAll(/^/gm, indent) + "\n";
}

export function formatWarnList(warns: readonly string[], indentLevel = 0) {
    return warns.reduce((list, warn) => list + codeBlock(warn, indentLevel), "");
}

export function formatKeyList(keys: readonly string[], indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return keys.reduce((list, key) => list + indent + `* \`${key}\`\n`, "");
}

export function formatValue(value?: unknown) {
    switch (typeof value) {
        case "string":
            return JSON.stringify(value);
        case "bigint":
            return value + "n";
        default:
            return String(value);
    }
}

export function formatEnumEntryList(entries: readonly (readonly [key: string, value: unknown])[], indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return entries.reduce((list, [key, value]) => list + indent + `* \`${key} = ${formatValue(value)}\`\n`, "");
}

export function formatChannel(channel?: string) {
    switch (channel) {
        case "stable":
        case "canary":
            return capitalize(channel);
        case "ptb":
            return channel.toUpperCase();
        default:
            return "Unknown";
    }
}

export function getSummaryURL(channel?: string) {
    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT } = process.env;
    if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID && GITHUB_RUN_ATTEMPT)
        return encodeURI(
            `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/attempts/${GITHUB_RUN_ATTEMPT}`
            + `#:~:text=Change Report (${formatChannel(channel)})`
        );
}
