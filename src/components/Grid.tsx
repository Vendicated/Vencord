/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CSSProperties, JSX } from "react";

interface Props {
    columns: number;
    gap?: string;
    inline?: boolean;
}

export function Grid(props: Props & JSX.IntrinsicElements["div"]) {
    const style: CSSProperties = {
        display: props.inline ? "inline-grid" : "grid",
        gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
        gap: props.gap,
        ...props.style
    };

    return (
        <div {...props} style={style}>
            {props.children}
        </div>
    );
}
