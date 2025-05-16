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
import { hljs } from "@webpack/common";
import { JSX } from "react";

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
