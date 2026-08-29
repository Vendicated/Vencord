/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl } from "@plugins/kaomojiPicker/cl";
import { Kaomoji } from "@plugins/kaomojiPicker/data/kaomoji";
import { Clickable } from "@webpack/common";
import type { MouseEvent } from "react";

interface GridItemProps {
    item: Kaomoji;
    sectionTitle: string;
    onInsert: (item: Kaomoji) => void;
    onHover: (item: Kaomoji) => void;
    onContextMenu: (e: MouseEvent<HTMLDivElement>, item: Kaomoji, sectionTitle: string) => void;
}

export function GridItem({ item, sectionTitle, onInsert, onHover, onContextMenu }: GridItemProps) {
    return (
        <Clickable
            className={cl("item")}
            onClick={() => onInsert(item)}
            onMouseEnter={() => onHover(item)}
            onContextMenu={e => onContextMenu(e, item, sectionTitle)}
        >
            <span className={cl("item-value")}>{item.value}</span>
        </Clickable>
    );
}
