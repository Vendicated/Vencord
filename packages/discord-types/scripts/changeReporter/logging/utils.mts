/*
 * discord-types
 * Copyright (C) 2024 Vencord project contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function capitalize(string: string) {
    return string.replace(/^./, c => c.toUpperCase());
}

export function codeBlock(content: unknown, indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return `\`\`\`\n${content}\n\`\`\``.replaceAll(/^/gm, indent) + "\n";
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

export function formatWarnList(warns: string[], indentLevel = 0) {
    return warns.map(warn => codeBlock(warn, indentLevel)).join("");
}

export function formatKeyList(keys: string[], indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return keys.map(key => indent + `* \`${key}\`\n`).join("");
}

export function formatEnumEntryList(entries: [key: string, value: unknown][], indentLevel = 0) {
    const indent = "  ".repeat(indentLevel);
    return entries.map(([key, value]) => indent + `* \`${key} = ${JSON.stringify(value)}\`\n`).join("");
}

export function getSummaryURL(channel?: string | undefined) {
    const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT } = process.env;
    if (GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID && GITHUB_RUN_ATTEMPT)
        return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/attempts/${GITHUB_RUN_ATTEMPT}`
            + `#:~:text=Change%20Report%20%28${formatChannel(channel)}%29`;
}
