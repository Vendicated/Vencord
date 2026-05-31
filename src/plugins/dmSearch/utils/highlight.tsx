/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ReactNode } from "react";

const RE_SPECIALS = /[.*+?^${}()|[\]\\]/g;

export function highlight(content: string, query: string): ReactNode {
    if (!query) return content;

    const re = new RegExp(escape(query), "ig");
    const parts: ReactNode[] = [];
    let last = 0;
    let key = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
        if (m.index > last) parts.push(content.slice(last, m.index));
        parts.push(<mark key={key++}>{m[0]}</mark>);
        last = re.lastIndex;
        if (m.index === re.lastIndex) re.lastIndex++;
    }
    if (last < content.length) parts.push(content.slice(last));
    return parts;
}

function escape(s: string): string {
    return s.replace(RE_SPECIALS, "\\$&");
}
