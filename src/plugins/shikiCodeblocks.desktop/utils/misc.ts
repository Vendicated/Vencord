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

import { classNameFactory } from "@api/Styles";
import { hljs } from "@webpack/common";

import { resolveLang } from "../api/languages";
import { HighlighterProps } from "../components/Highlighter";
import { HljsSetting } from "../types";

export const cl = classNameFactory("vc-shiki-");

export const shouldUseHljs = ({
    lang,
    tryHljs,
}: {
    lang: HighlighterProps["lang"],
    tryHljs: HljsSetting,
}) => {
    const hljsLang = lang ? hljs?.getLanguage?.(lang) : null;
    const shikiLang = lang ? resolveLang(lang) : null;
    const langName = shikiLang?.name;

    switch (tryHljs) {
        case HljsSetting.Always:
            return true;
        case HljsSetting.Primary:
            return !!hljsLang || lang === "";
        case HljsSetting.Secondary:
            return !langName && !!hljsLang;
        case HljsSetting.Never:
            return false;
        default: return false;
    }
};
