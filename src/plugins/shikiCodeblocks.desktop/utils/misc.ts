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
import { HighlighterSetting } from "@plugins/shikiCodeblocks.desktop/types";
import { classNameFactory } from "@utils/css";
import { filters, mapMangledModuleLazy } from "@webpack";

export const cl = classNameFactory("vc-shiki-");

export const arboriumLanguages = mapMangledModuleLazy('jldoctest:"julia"', {
    resolveLang: filters.byCode(/!\i.test\(/, ".toLowerCase();")
});
export const arboriumGrammars = mapMangledModuleLazy(".createSession();try{", {
    getGrammar: filters.byCode(/return null==\i&&/, /\i\.set\(\i/)
});

export const shouldUseArborium = ({
    lang,
    tryDiscordHighlighter,
}: {
    lang: HighlighterProps["lang"],
    tryDiscordHighlighter: HighlighterSetting,
}) => {
    const arboriumLang = lang ? arboriumLanguages.resolveLang(lang) : null;
    const shikiLang = lang ? resolveLang(lang) : null;
    const langName = shikiLang?.name;

    switch (tryDiscordHighlighter) {
        case HighlighterSetting.Always:
            return true;
        case HighlighterSetting.Primary:
            return !!arboriumLang || lang === "";
        case HighlighterSetting.Secondary:
            return !langName && !!arboriumLang;
        case HighlighterSetting.Never:
            return false;
        default: return false;
    }
};
