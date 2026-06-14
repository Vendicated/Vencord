/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const enum RunAt {
    DocumentStart = "document-start",
    DocumentEnd = "document-end",
    DocumentIdle = "document-idle",
}

export interface UserScriptMetadata {
    name?: string;
    version?: string;
    description?: string;
    author?: string;
    matches: string[];
    includes: string[];
    requires: string[];
    runAt?: RunAt;
    raw: Record<string, string[]>;
}

export interface ActivityUserScript {
    id: string;
    isEnabled: boolean;
    names: string[];
    activityIds: string[];
    notifyOnRun: boolean;
    code: string;
    sourceUrl?: string;
    lastImportedCode?: string;
    metadata: UserScriptMetadata;
    runAt: RunAt;
    autoNames: string[];
    autoActivityIds: string[];
}

const MetadataBlockRegex = /\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/;
const MetadataLineRegex = /^\s*\/\/\s*@(\S+)(?:\s+(.*))?$/gm;
const DiscordSaysActivityRegex = /(?:^|[/:*.])([a-zA-Z0-9_-]+)\.discordsays\.com\b/;
const ExplicitDiscordSaysHostRegex = /^https?:\/\/([a-zA-Z0-9_-]+)\.discordsays\.com(?:[/*?#].*)?$/;

function uniq(values: string[]) {
    return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)));
}

function parseRunAt(value?: string) {
    switch (value) {
        case RunAt.DocumentStart:
        case RunAt.DocumentEnd:
        case RunAt.DocumentIdle:
            return value;
        default:
            return undefined;
    }
}

export function parseActivityIds(values: string[]) {
    return uniq(values.flatMap(value => {
        const trimmed = value.trim();
        if (!trimmed) return [];

        const exactHostMatch = trimmed.match(ExplicitDiscordSaysHostRegex);
        if (exactHostMatch) return [exactHostMatch[1]];

        const discordSaysMatch = trimmed.match(DiscordSaysActivityRegex);
        if (discordSaysMatch && discordSaysMatch[1] !== "*") return [discordSaysMatch[1]];

        if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return [trimmed];
        return [];
    }));
}

export function parseUserScriptMetadata(code: string): UserScriptMetadata {
    const block = code.match(MetadataBlockRegex)?.[1] ?? "";
    const raw: Record<string, string[]> = {};

    for (const [, key, value = ""] of block.matchAll(MetadataLineRegex)) {
        (raw[key] ??= []).push(value.trim());
    }

    const runAt = parseRunAt(raw["run-at"]?.[0]);

    return {
        name: raw.name?.[0],
        version: raw.version?.[0],
        description: raw.description?.[0],
        author: raw.author?.[0],
        matches: raw.match ?? [],
        includes: raw.include ?? [],
        requires: raw.require ?? [],
        runAt,
        raw,
    };
}

export function getMetadataNames(metadata: UserScriptMetadata) {
    return uniq(metadata.raw.name ?? []);
}

export function getMetadataActivityIds(metadata: UserScriptMetadata) {
    return parseActivityIds([
        ...metadata.matches,
        ...metadata.includes,
    ]);
}

export function createUserScript(code = "", sourceUrl?: string): ActivityUserScript {
    const metadata = parseUserScriptMetadata(code);
    const autoNames = getMetadataNames(metadata);
    const autoActivityIds = getMetadataActivityIds(metadata);

    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        isEnabled: false,
        names: autoNames,
        activityIds: autoActivityIds,
        notifyOnRun: true,
        code,
        sourceUrl,
        lastImportedCode: sourceUrl ? code : undefined,
        metadata,
        runAt: metadata.runAt ?? RunAt.DocumentEnd,
        autoNames,
        autoActivityIds,
    };
}

export function refreshUserScriptMetadata(script: ActivityUserScript, code: string): ActivityUserScript {
    const metadata = parseUserScriptMetadata(code);
    const nextAutoNames = getMetadataNames(metadata);
    const nextAutoActivityIds = getMetadataActivityIds(metadata);

    const namesWereAutoManaged = !script.names.length || script.names.every(name => script.autoNames.includes(name));
    const idsWereAutoManaged = !script.activityIds.length || script.activityIds.every(id => script.autoActivityIds.includes(id));

    return {
        ...script,
        code,
        metadata,
        names: namesWereAutoManaged ? nextAutoNames : script.names,
        activityIds: idsWereAutoManaged ? nextAutoActivityIds : script.activityIds,
        runAt: metadata.runAt ?? script.runAt,
        autoNames: nextAutoNames,
        autoActivityIds: nextAutoActivityIds,
    };
}

export function getScriptDisplayName(script: ActivityUserScript) {
    return script.names[0] || script.metadata.name || "Untitled UserScript";
}

export function getScriptEnabled(script: ActivityUserScript) {
    return script.isEnabled;
}

export function setScriptEnabled(script: ActivityUserScript, isEnabled: boolean): ActivityUserScript {
    return {
        ...script,
        isEnabled,
    };
}
