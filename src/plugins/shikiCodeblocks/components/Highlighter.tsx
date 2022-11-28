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
import { Clipboard, hljs, React } from "@webpack/common";

import { resolveLang } from "../api/languages";
import { shiki } from "../api/shiki";
import { useCopyCooldown } from "../hooks/useCopyCooldown";
import { useIntersectionEffect } from "../hooks/useIntersectionEffect";
import { useShikiSettings } from "../hooks/useShikiSettings";
import { useTheme } from "../hooks/useTheme";
import { DeviconSetting, HljsSetting, ShikiSettings } from "../types";

// TODO: break this file up and make it actually readable

const cl = (className: string) => `shiki-${className}`;

const hex2Rgb = (hex: string) => {
    hex = hex.slice(1);
    if (hex.length < 6)
        hex = hex
            .split("")
            .map(c => c + c)
            .join("");
    if (hex.length === 6) hex += "ff";
    if (hex.length > 6) hex = hex.slice(0, 6);
    return hex
        .split(/(..)/)
        .filter(Boolean)
        .map(c => parseInt(c, 16));
};

export interface HighlighterProps {
    lang?: string;
    content: string;
    isPreview: boolean;
    // tryHljs: HljsSetting;
    // useDevIcon: DeviconSetting;
    // bgOpacity: number;
}
export const createHighlighter = (props: HighlighterProps) => (
    <Highlighter {...props} />
);
export const Highlighter = ({
    lang,
    content,
    isPreview,
}: HighlighterProps) => {
    const [copyCooldown, copy] = useCopyCooldown(1000);
    const [tokens, setTokens] = React.useState<IThemedToken[][] | null>(null);
    const preRef = React.useRef<HTMLPreElement>(null);

    const { tryHljs, useDevIcon, bgOpacity } = useShikiSettings(["tryHljs", "useDevIcon", "bgOpacity"]);
    const { id: currentThemeId, theme: currentTheme } = useTheme();

    const useHljs = shouldUseHLJS({ lang, tryHljs });

    useIntersectionEffect(preRef, () => {
        shiki
            .tokenizeCode(content, lang!)
            .then(tokens => setTokens(tokens))
            .catch(console.error);
    }, [lang, content, currentThemeId], () => !!(lang && !useHljs));

    const shikiLang = lang ? resolveLang(lang) : null;
    let langName = shikiLang?.name;

    const theme = React.useMemo(() => ({
        plainColor: currentTheme?.fg || "var(--text-normal)",
        accentBgColor:
            currentTheme?.colors?.["statusBar.background"] || (useHljs ? "#7289da" : "#007BC8"),
        accentFgColor: currentTheme?.colors?.["statusBar.foreground"] || "#FFF",
        backgroundColor:
            currentTheme?.colors?.["editor.background"] || "var(--background-secondary)",
    }), [useHljs, currentThemeId]);

    let lines!: JSX.Element[];

    if (useHljs) {
        const hljsLang = lang ? hljs?.getLanguage?.(lang) : null;
        langName = hljsLang?.name;
        try {
            const { value: hljsHtml } = hljs.highlight(lang!, content, true);
            lines = hljsHtml
                .split("\n")
                .map(line => <span dangerouslySetInnerHTML={{ __html: line }} />);
        } catch {
            lines = content.split("\n").map(line => <span>{line}</span>);
        }
    } else {
        const renderTokens =
            tokens ??
            content
                .split("\n")
                .map(line => [{ color: theme.plainColor, content: line } as IThemedToken]);

        lines = renderTokens.map(line => {
            // [Cynthia] this makes it so when you highlight the codeblock
            // empty lines are also selected and copied when you Ctrl+C.
            if (line.length === 0) {
                return <span>{"\n"}</span>;
            }

            return (
                <>
                    {line.map(({ content, color, fontStyle }) => (
                        <span
                            style={{
                                color,
                                fontStyle: (fontStyle ?? 0) & 1 ? "italic" : undefined,
                                fontWeight: (fontStyle ?? 0) & 2 ? "bold" : undefined,
                                textDecoration: (fontStyle ?? 0) & 4 ? "underline" : undefined,
                            }}
                        >
                            {content}
                        </span>
                    ))}
                </>
            );
        });
    }

    const codeTableRows = lines.map((line, i) => (
        <tr>
            <td style={{ color: theme.plainColor }}>{i + 1}</td>
            <td>{line}</td>
        </tr>
    ));

    const buttons: JSX.Element[] = [];

    if (Clipboard.SUPPORTS_COPY) {
        buttons.push(
            <button
                className={cl("btn")}
                onClick={() => copy(content)}
                style={{
                    backgroundColor: theme.accentBgColor,
                    color: theme.accentFgColor,
                    cursor: copyCooldown ? "default" : undefined,
                }}
            >
                {copyCooldown ? "Copied!" : "Copy"}
            </button>
        );
    }

    const preClasses = [cl("root")];
    if (!langName) preClasses.push(cl("plain"));
    if (isPreview) preClasses.push(cl("preview"));

    return (
        <pre
            ref={preRef}
            className={preClasses.join(" ")}
            style={{
                backgroundColor: useHljs
                    ? theme.backgroundColor
                    : `rgba(${hex2Rgb(theme.backgroundColor)
                        .concat(bgOpacity / 100)
                        .join(", ")})`,
                color: theme.plainColor,
            }}
        >
            <code>
                {langName && (
                    <div className={cl("lang")}>
                        {useDevIcon !== DeviconSetting.Disabled && shikiLang?.devicon && (
                            <i
                                className={`devicon-${shikiLang.devicon}${useDevIcon === DeviconSetting.Color ? " colored" : ""}`}
                            />
                        )}
                        {langName}
                    </div>
                )}
                <table className={cl("table")}>{...codeTableRows}</table>
                <div className={cl("btns")}>{buttons}</div>
            </code>
        </pre>
    );
};

const shouldUseHLJS = ({
    lang,
    tryHljs,
}: {
    lang: HighlighterProps["lang"],
    tryHljs: ShikiSettings["tryHljs"],
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
    }

    return false;
};
