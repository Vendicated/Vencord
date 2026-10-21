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

import { resolveLang } from "@plugins/shikiCodeblocks.desktop/api/languages";
import { HighlighterProps } from "@plugins/shikiCodeblocks.desktop/components/Highlighter";
import { HljsSetting } from "@plugins/shikiCodeblocks.desktop/types";
import { classNameFactory } from "@utils/css";
import { DefaultExtractAndLoadChunksRegex, extractAndLoadChunksLazy, filters, find } from "@webpack";

export const cl = classNameFactory("vc-shiki-");

let hljsModule: typeof import("highlight.js").default | null | undefined;
export function getHljs() {
    if (hljsModule === undefined)
        hljsModule = find(filters.byProps("highlight", "registerLanguage"), { isIndirect: true }) ?? null;

    return hljsModule;
}

export const requireHljs = extractAndLoadChunksLazy(["codeBlock:{react("], new RegExp(`"hljs".+?${DefaultExtractAndLoadChunksRegex.source}`));

export const shouldUseHljs = ({
    lang,
    tryHljs,
}: {
    lang: HighlighterProps["lang"],
    tryHljs: HljsSetting,
}) => {
    const hljs = getHljs();
    const hljsLang = hljs && lang ? hljs.getLanguage?.(lang) : null;
    const shikiLang = lang ? resolveLang(lang) : null;
    const langName = shikiLang?.name;

    switch (tryHljs) {
        case HljsSetting.Always:
            return !!hljs;
        case HljsSetting.Primary:
            return !!hljsLang || (!!hljs && lang === "");
        case HljsSetting.Secondary:
            return !langName && !!hljsLang;
        case HljsSetting.Never:
            return false;
        default: return false;
    }
};
