/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Clipboard } from "@webpack/common";

import { cl } from "../utils/misc";
import { CopyButton } from "./CopyButton";

export interface ButtonRowProps {
    theme: import("./Highlighter").ThemeBase;
    content: string;
}

export function ButtonRow({ content, theme }: ButtonRowProps) {
    const buttons: JSX.Element[] = [];

    if (Clipboard.SUPPORTS_COPY) {
        buttons.push(
            <CopyButton
                content={content}
                className={cl("btn")}
                style={{
                    backgroundColor: theme.accentBgColor,
                    color: theme.accentFgColor,
                }}
            />
        );
    }

    return <div className={cl("btns")}>{buttons}</div>;
}
