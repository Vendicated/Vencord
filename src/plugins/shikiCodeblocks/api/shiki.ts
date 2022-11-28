/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/


import { WorkerClient } from "@vap/core/ipc";
import type { IShikiTheme, IThemedToken } from "@vap/shiki";

import { shikiOnigasmSrc, shikiWorkerSrcDev, shikiWorkerSrcProd } from "../../../utils/dependencies";
import { Settings } from "../../../Vencord";
import type { ShikiSpec } from "../types";
import { getGrammar, languages, resolveLang } from "./languages";
import { themes } from "./themes";

const themeUrls = Object.values(themes);

let resolveClient: (client: WorkerClient<ShikiSpec>) => void;

export const shiki = {
    client: null as WorkerClient<ShikiSpec> | null,
    currentTheme: null as IShikiTheme | null,
    currentThemeUrl: null as string | null,
    timeoutMs: 10000,
    languages,
    themes,
    loadedThemes: new Set<string>(),
    loadedLangs: new Set<string>(),
    clientPromise: new Promise<WorkerClient<ShikiSpec>>(resolve => resolveClient = resolve),

    init: async () => {
        const { debugBuild } = Settings.plugins.ShikiCodeblocks;

        const shikiWorkerSrc = debugBuild ? shikiWorkerSrcDev : shikiWorkerSrcProd;

        /** https://stackoverflow.com/q/58098143 */
        const workerBlob = await fetch(shikiWorkerSrc).then(res => res.blob());

        const client = shiki.client = new WorkerClient<ShikiSpec>(
            "shiki-client",
            "shiki-host",
            workerBlob,
        );
        await client.init();
        await client.run("setOnigasm", { wasm: shikiOnigasmSrc });
        await client.run("setHighlighter", { theme: themeUrls[0], langs: [] });
        shiki.loadedThemes.add(themeUrls[0]);
        resolveClient(client);
    },
    loadTheme: async (themeUrl: string) => {
        const client = await shiki.clientPromise;
        if (shiki.loadedThemes.has(themeUrl)) return;

        await client.run("loadTheme", { theme: themeUrl });

        shiki.loadedThemes.add(themeUrl);
    },
    setTheme: async (themeUrl: string) => {
        const client = await shiki.clientPromise;
        if (!themeUrl) themeUrl = themeUrls[0];
        if (!shiki.loadedThemes.has(themeUrl)) await shiki.loadTheme(themeUrl);

        shiki.currentThemeUrl = themeUrl;
        const { themeData } = await client.run("getTheme", { theme: themeUrl });
        shiki.currentTheme = JSON.parse(themeData);
        console.log(shiki.currentTheme);
    },
    loadLang: async (langId: string) => {
        const client = await shiki.clientPromise;
        const lang = resolveLang(langId);

        if (!lang || shiki.loadedLangs.has(lang.id)) return;

        await client.run("loadLanguage", {
            lang: {
                ...lang,
                grammar: lang.grammar ?? await getGrammar(lang),
            }
        });
        shiki.loadedLangs.add(lang.id);
    },
    tokenizeCode: async (code: string, langId: string): Promise<IThemedToken[][]> => {
        const client = await shiki.clientPromise;
        const lang = resolveLang(langId);
        if (!lang) return [];

        if (!shiki.loadedLangs.has(lang.id)) await shiki.loadLang(lang.id);

        return await client.run("codeToThemedTokens", {
            code,
            lang: langId,
            theme: shiki.currentThemeUrl ?? themeUrls[0],
        });
    },
};
