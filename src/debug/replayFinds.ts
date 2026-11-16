/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { FindMethod, RecordedFind } from "@webpack";

export type FindReplayAdapter = Record<FindMethod, (...args: any[]) => any>;

export interface FindReplayFailure {
    label: string;
    error: unknown;
}

function formatFindFailure(method: FindMethod, args: any[], result: any) {
    let label = method;

    if (method === "find" || method === "proxyLazyWebpack" || method === "LazyComponentWebpack") {
        if (args[0].$$vencordProps != null) {
            label += `(${args[0].$$vencordProps.map(arg => `"${arg}"`).join(", ")})`;
        } else {
            label += `(${args[0].toString().slice(0, 147)}...)`;
        }
    } else if (method === "extractAndLoadChunks") {
        label += `([${args[0].map(arg => `"${arg}"`).join(", ")}], ${args[1].toString()})`;
    } else if (method === "mapMangledModule") {
        const failedMappings = Object.keys(args[1]).filter(key => result?.[key] == null);
        label += `("${args[0]}", {\n${failedMappings.map(mapping => `\t${mapping}: ${args[1][mapping].toString().slice(0, 147)}...`).join(",\n")}\n})`;
    } else {
        label += `(${args.map(arg => `"${arg}"`).join(", ")})`;
    }

    return label;
}

export async function replayFinds(
    history: readonly RecordedFind[],
    adapter: FindReplayAdapter
): Promise<FindReplayFailure[]> {
    const failures: FindReplayFailure[] = [];

    for (const [method, args] of history) {
        let result: any;
        try {
            if (method === "proxyLazyWebpack" || method === "LazyComponentWebpack") {
                const [factory] = args;
                result = factory();
            } else if (method === "extractAndLoadChunks") {
                const [code, matcher] = args;
                result = await adapter.extractAndLoadChunks(code, matcher);
                if (result === false) result = null;
            } else if (method === "mapMangledModule") {
                const [code, mapper, includeBlacklistedExports] = args;
                result = adapter.mapMangledModule(code, mapper, includeBlacklistedExports);
                if (Object.keys(result).length !== Object.keys(mapper).length) throw new Error("Webpack Find Fail");
            } else {
                result = adapter[method](...args);
            }

            if (result == null || (result.$$vencordGetWrappedComponent != null && result.$$vencordGetWrappedComponent() == null)) throw new Error("Webpack Find Fail");
        } catch (error) {
            failures.push({ label: formatFindFailure(method, args, result), error });
        }
    }

    return failures;
}
