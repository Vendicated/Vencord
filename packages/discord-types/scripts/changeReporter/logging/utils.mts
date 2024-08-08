/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function capitalize(string: string) {
    return string.replace(/^./, c => c.toUpperCase());
}

export function codeBlock(content?: unknown, indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return `\`\`\`\n${content}\n\`\`\``.replaceAll(/^/gm, indent) + "\n";
}

export function formatWarnList(warns: string[], indentLevel = 0) {
    return warns.reduce((list, warn) => list + codeBlock(warn, indentLevel), "");
}

export function formatKeyList(keys: string[], indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return keys.reduce((list, key) => list + indent + `* \`${key}\`\n`, "");
}

export function formatValue(value?: unknown) {
    if (typeof value === "string")
        return JSON.stringify(value);
    if (typeof value === "bigint")
        return value.toString() + "n";
    return String(value);
}

export function formatEnumEntryList(entries: [key: string, value: unknown][], indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return entries.reduce((list, [key, value]) => list + indent + `* \`${key} = ${formatValue(value)}\`\n`, "");
}

export function formatChannel(channel?: string | undefined) {
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

export function getSummaryURL(channel?: string | undefined) {
    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT } = process.env;
    if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID && GITHUB_RUN_ATTEMPT)
        return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/attempts/${GITHUB_RUN_ATTEMPT}`
            + `#:~:text=Change%20Report%20%28${formatChannel(channel)}%29`;
}
