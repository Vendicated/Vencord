/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { useAwaiter, useIntersection } from "@utils/react";
import { hljs, React } from "@webpack/common";

import { resolveLang } from "../api/languages";
import { shiki } from "../api/shiki";
import { useShikiSettings } from "../hooks/useShikiSettings";
import { useTheme } from "../hooks/useTheme";
import { hex2Rgb } from "../utils/color";
import { cl, shouldUseHljs } from "../utils/misc";
import { ButtonRow } from "./ButtonRow";
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
    tempSettings?: Record<string, any>;
}

export const createHighlighter = (props: HighlighterProps) => (
    <pre className={cl("container")}>
        <ErrorBoundary>
            <Highlighter {...props} />
        </ErrorBoundary>
    </pre>
);
export const Highlighter = ({
    lang,
    content,
    isPreview,
    tempSettings,
}: HighlighterProps) => {
    const {
        tryHljs,
        useDevIcon,
        bgOpacity,
    } = useShikiSettings(["tryHljs", "useDevIcon", "bgOpacity"], tempSettings);
    const { id: currentThemeId, theme: currentTheme } = useTheme();

    const shikiLang = lang ? resolveLang(lang) : null;
    const useHljs = shouldUseHljs({ lang, tryHljs });

    const [rootRef, isIntersecting] = useIntersection(true);

    const [tokens] = useAwaiter(async () => {
        if (!shikiLang || useHljs || !isIntersecting) return null;
        return await shiki.tokenizeCode(content, lang!);
    }, {
        fallbackValue: null,
        deps: [lang, content, currentThemeId, isIntersecting],
    });

    const themeBase: ThemeBase = {
        plainColor: currentTheme?.fg || "var(--text-normal)",
        accentBgColor:
            currentTheme?.colors?.["statusBar.background"] || (useHljs ? "#7289da" : "#007BC8"),
        accentFgColor: currentTheme?.colors?.["statusBar.foreground"] || "#FFF",
        backgroundColor:
            currentTheme?.colors?.["editor.background"] || "var(--background-secondary)",
    };

    let langName;
    if (lang) langName = useHljs ? hljs?.getLanguage?.(lang)?.name : shikiLang?.name;

    return (
        <div
            ref={rootRef}
            className={cl("root", { plain: !langName, preview: isPreview })}
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
        </div>
    );
};

