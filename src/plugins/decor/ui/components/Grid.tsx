/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl } from "@plugins/decor/ui";
import { React } from "@webpack/common";
import { JSX } from "react";

export interface GridProps<ItemT> {
    renderItem: (item: ItemT) => JSX.Element;
    getItemKey: (item: ItemT) => string;
    itemKeyPrefix?: string;
    items: Array<ItemT>;
}

export default function Grid<ItemT,>({ renderItem, getItemKey, itemKeyPrefix: ikp, items }: GridProps<ItemT>) {
    return <div className={cl("sectioned-grid-list-grid")}>
        {items.map(item =>
            <React.Fragment
                key={`${ikp ? `${ikp}-` : ""}${getItemKey(item)}`}
            >
                {renderItem(item)}
            </React.Fragment>
        )}
    </div>;
}
