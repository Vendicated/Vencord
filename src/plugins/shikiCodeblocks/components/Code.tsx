/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { IThemedToken } from "@vap/shiki";
import { hljs } from "@webpack/common";

import { cl } from "../utils/misc";
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
            const { value: hljsHtml } = hljs.highlight(lang!, content, true);
            lines = hljsHtml
                .split("\n")
                .map((line, i) => <span key={i} dangerouslySetInnerHTML={{ __html: line }} />);
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
        <tr key={i}>
            <td style={{ color: theme.plainColor }}>{i + 1}</td>
            <td>{line}</td>
        </tr>
    ));

    return <table className={cl("table")}>{...codeTableRows}</table>;
};
