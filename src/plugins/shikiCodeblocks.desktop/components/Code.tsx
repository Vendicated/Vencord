/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl } from "@plugins/shikiCodeblocks.desktop/utils/misc";
import type { IThemedToken } from "@vap/shiki";
import { hljs } from "@webpack/common";
import { JSX } from "react";

import { ThemeBase } from "./Highlighter";

export interface CodeProps {
    theme: ThemeBase;
    useHljs: boolean;
    lang?: string;
    content: string;
    tokens: IThemedToken[][] | null;
}

export const Code = ({
    theme,
    useHljs,
    lang,
    content,
    tokens,
}: CodeProps) => {
    let lines!: JSX.Element[];

    if (useHljs) {
        try {
            const { value: hljsHtml } = hljs.highlight(content, { language: lang!, ignoreIllegals: true });
            lines = hljsHtml
                .split("\n")
                .map((line, i) => <span key={i} dangerouslySetInnerHTML={{ __html: line }} />);
        } catch {
            lines = content.split("\n").map((line, idx) => <span key={idx}>{line}</span>);
        }
    } else {
        const renderTokens =
            tokens ??
            content
                .split("\n")
                .map(line => [{ color: theme.plainColor, content: line } as IThemedToken]);

        lines = renderTokens.map((line, idx) => {
            // [Cynthia] this makes it so when you highlight the codeblock
            // empty lines are also selected and copied when you Ctrl+C.
            if (line.length === 0) {
                return <span key={idx}>{"\n"}</span>;
            }

            return (
                <>
                    {line.map(({ content, color, fontStyle }, i) => (
                        <span
                            key={i}
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
        <tr className={cl("table-row")} key={i}>
            <td className={cl("table-cell")} style={{ color: theme.plainColor }}>{i + 1}</td>
            <td className={cl("table-cell")}>{line}</td>
        </tr>
    ));

    return <table className={cl("table")}>{...codeTableRows}</table>;
};
