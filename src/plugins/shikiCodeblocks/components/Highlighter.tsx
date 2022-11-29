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

import type { IThemedToken } from "@vap/shiki";
import { hljs, React } from "@webpack/common";

import { resolveLang } from "../api/languages";
import { shiki } from "../api/shiki";
import { useAsyncMemo } from "../hooks/useAsyncMemo";
import { useIntersection } from "../hooks/useIntersection";
import { useShikiSettings } from "../hooks/useShikiSettings";
import { useTheme } from "../hooks/useTheme";
import { hex2Rgb } from "../utils/color";
import { cl, shouldUseHljs } from "../utils/misc";
import { ButtonRow } from "./Buttons";
import { Code } from "./Code";
import { Header } from "./Header";

export interface ThemeBase {
    plainColor: string;
    accentBgColor: string;
    accentFgColor: string;
    backgroundColor: string;
}
export interface HighlighterProps {
    lang?: string;
    content: string;
    isPreview: boolean;
}
export const createHighlighter = (props: HighlighterProps) => (
    <Highlighter {...props} />
);
export const Highlighter = ({
    lang,
    content,
    isPreview,
}: HighlighterProps) => {
    const { tryHljs, useDevIcon, bgOpacity } = useShikiSettings(["tryHljs", "useDevIcon", "bgOpacity"]);
    const { id: currentThemeId, theme: currentTheme } = useTheme();

    const shikiLang = lang ? resolveLang(lang) : null;
    const useHljs = shouldUseHljs({ lang, tryHljs });

    const [preRef, isIntersecting] = useIntersection();

    const tokens = useAsyncMemo<IThemedToken[][] | null>(async () => {
        if (!shikiLang || useHljs || !isIntersecting) return null;
        return await shiki.tokenizeCode(content, lang!);
    }, [lang, content, currentThemeId, isIntersecting], null);

    const themeBase: ThemeBase = React.useMemo(() => ({
        plainColor: currentTheme?.fg || "var(--text-normal)",
        accentBgColor:
            currentTheme?.colors?.["statusBar.background"] || (useHljs ? "#7289da" : "#007BC8"),
        accentFgColor: currentTheme?.colors?.["statusBar.foreground"] || "#FFF",
        backgroundColor:
            currentTheme?.colors?.["editor.background"] || "var(--background-secondary)",
    }), [useHljs, currentThemeId]);

    let langName;
    if (lang) langName = useHljs ? hljs?.getLanguage?.(lang)?.name : shikiLang?.name;

    const preClasses = [cl("root")];
    if (!langName) preClasses.push(cl("plain"));
    if (isPreview) preClasses.push(cl("preview"));

    return (
        <pre
            ref={preRef}
            className={preClasses.join(" ")}
            style={{
                backgroundColor: useHljs
                    ? themeBase.backgroundColor
                    : `rgba(${hex2Rgb(themeBase.backgroundColor)
                        .concat(bgOpacity / 100)
                        .join(", ")})`,
                color: themeBase.plainColor,
            }}
        >
            <code>
                <Header
                    langName={langName}
                    useDevIcon={useDevIcon}
                    shikiLang={shikiLang}
                />
                <Code
                    theme={themeBase}
                    useHljs={useHljs}
                    lang={lang}
                    content={content}
                    tokens={tokens}
                />
                {!isPreview && <ButtonRow
                    content={content}
                    theme={themeBase}
                />}
            </code>
        </pre>
    );
};

