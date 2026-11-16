/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// One grammar, two strategies: first load for finds, all loads for the lazy loader.
// The all-loads variant avoids language packs to keep reporter testing fast.

const Identifier = String.raw`[A-Za-z_$][\w$]*`;
const ChunkLoader = String.raw`${Identifier}\.e\((?:"[^"]+?"|[\de]+?)\)`;
const PromiseAllChunkLoad = String.raw`Promise\.all\(\[((?:${ChunkLoader},?)+)\]\)`;
const CompleteThen = String.raw`\.then\(${Identifier}(?:\.${Identifier})?\.bind\(${Identifier},"?([^)]+?)"?(?:,[^)]+?)?\)\)`;
const PartialThen = String.raw`\.then\(${Identifier}\.bind\(${Identifier},"?([^)]+?)"?\)\)`;

const CompletePromiseRegex = new RegExp(`${PromiseAllChunkLoad}${CompleteThen}`, "y");
const CompleteSingleRegex = new RegExp(`(${ChunkLoader})${CompleteThen}`, "y");
const PartialPromiseRegex = new RegExp(`${PromiseAllChunkLoad}${PartialThen}`, "y");
const PartialSingleRegex = new RegExp(`(${ChunkLoader})${PartialThen}`, "y");

export const DefaultExtractAndLoadChunksRegex = /(?:(?:Promise\.all\(\[)?((?:\i\.e\("?[^)]+?"?\),?)+?)(?:\]\))?|Promise\.resolve\(\))\.then\(\i\.bind\(\i,"?([^)]+?)"?(?:,[^)]+?)?\)\)/;

const ChunkIdsRegex = /\((?:"([^"]+?)"|([\de]+?))\)/g;

export function parseChunkIds(rawChunkIds: string): Array<string | number> {
    return Array.from(rawChunkIds.matchAll(ChunkIdsRegex), m => m[1] ?? Number(m[2]));
}

export function findAllChunkLoads(factoryCode: string, complete: boolean): RegExpMatchArray[] {
    const promiseRegex = complete ? CompletePromiseRegex : PartialPromiseRegex;
    const singleRegex = complete ? CompleteSingleRegex : PartialSingleRegex;
    const matches: RegExpMatchArray[] = [];

    let index = 0;
    while ((index = factoryCode.indexOf("Promise.all([", index)) !== -1) {
        promiseRegex.lastIndex = index;
        const match = promiseRegex.exec(factoryCode);
        if (match) matches.push(match);
        index++;
    }

    index = 0;
    while ((index = factoryCode.indexOf(".e(", index)) !== -1) {
        let start = index;
        while (start > 0 && /[\w$]/.test(factoryCode[start - 1])) start--;

        if (start < index && /[A-Za-z_$]/.test(factoryCode[start])) {
            singleRegex.lastIndex = start;
            const match = singleRegex.exec(factoryCode);
            if (match) matches.push(match);
        }

        index += 3;
    }

    return matches.sort((a, b) => a.index! - b.index!);
}
