/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface DiffPart {
    type: "added" | "removed" | "unchanged";
    text: string;
}

function tokenizeMessage(text: string): string[] {
    const tokens: string[] = [];
    let i = 0;

    while (i < text.length) {
        // handle Discord custom emojis: <:name:id> or <a:name:id>
        if (text[i] === "<" && (text.slice(i + 1, i + 3) === ":" || text.slice(i + 1, i + 3) === "a:")) {
            const endIndex = text.indexOf(">", i);
            if (endIndex !== -1) {
                tokens.push(text.slice(i, endIndex + 1));
                i = endIndex + 1;
                continue;
            }
        }

        // handle mentions: <@id>, <@!id>, <@&id>, <#id>
        if (text[i] === "<" && text[i + 1] === "@" ||
            (text[i] === "<" && text[i + 1] === "#")) {
            const endIndex = text.indexOf(">", i);
            if (endIndex !== -1) {
                tokens.push(text.slice(i, endIndex + 1));
                i = endIndex + 1;
                continue;
            }
        }

        // handle regular characters (including Unicode emojis)
        const char = Array.from(text.slice(i))[0];
        tokens.push(char);
        i += char.length;
    }

    return tokens;
}

export function createWordDiff(oldText: string, newText: string): DiffPart[] {
    // suffix shit, if oldText is shorter than newText and newText starts with oldText
    if (oldText.length < newText.length && newText.startsWith(oldText)) {
        const added = newText.slice(oldText.length);
        const parts: DiffPart[] = [];
        if (oldText.length > 0) {
            parts.push({ type: "unchanged", text: oldText });
        }
        parts.push({ type: "added", text: added });
        return parts;
    }

    // same as above
    if (oldText.length < newText.length && newText.endsWith(oldText)) {
        const added = newText.slice(0, newText.length - oldText.length);
        const parts: DiffPart[] = [];
        parts.push({ type: "added", text: added });
        if (oldText.length > 0) {
            parts.push({ type: "unchanged", text: oldText });
        }
        return parts;
    }

    // Handle simple prefix removal: "watch this" -> "watch"
    if (newText.length < oldText.length && oldText.startsWith(newText)) {
        const removed = oldText.slice(newText.length);
        const parts: DiffPart[] = [];
        if (newText.length > 0) {
            parts.push({ type: "unchanged", text: newText });
        }
        parts.push({ type: "removed", text: removed });
        return parts;
    }

    // Handle simple suffix removal: "prefix watch" -> "watch"
    if (newText.length < oldText.length && oldText.endsWith(newText)) {
        const removed = oldText.slice(0, oldText.length - newText.length);
        const parts: DiffPart[] = [];
        parts.push({ type: "removed", text: removed });
        if (newText.length > 0) {
            parts.push({ type: "unchanged", text: newText });
        }
        return parts;
    }

    // For complex cases, fall back to LCS algorithm
    const oldChars = tokenizeMessage(oldText);
    const newChars = tokenizeMessage(newText);

    const result: DiffPart[] = [];
    const dp: number[][] = [];

    for (let i = 0; i <= oldChars.length; i++) {
        dp[i] = [];
        for (let j = 0; j <= newChars.length; j++) {
            dp[i][j] = 0;
        }
    }

    for (let i = 1; i <= oldChars.length; i++) {
        for (let j = 1; j <= newChars.length; j++) {
            if (oldChars[i - 1] === newChars[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    let i = oldChars.length;
    let j = newChars.length;

    const diffParts: DiffPart[] = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldChars[i - 1] === newChars[j - 1]) {
            diffParts.unshift({ type: "unchanged", text: oldChars[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] > dp[i - 1][j])) {
            diffParts.unshift({ type: "added", text: newChars[j - 1] });
            j--;
        } else if (i > 0) {
            diffParts.unshift({ type: "removed", text: oldChars[i - 1] });
            i--;
        }
    }

    const groupedParts: DiffPart[] = [];
    for (const part of diffParts) {
        const lastPart = groupedParts[groupedParts.length - 1];
        if (lastPart && lastPart.type === part.type) {
            lastPart.text += part.text;
        } else {
            groupedParts.push(part);
        }
    }

    return groupedParts;
}

export function createMessageDiff(previousContent: string, currentContent: string): DiffPart[] {
    return createWordDiff(previousContent, currentContent);
}
