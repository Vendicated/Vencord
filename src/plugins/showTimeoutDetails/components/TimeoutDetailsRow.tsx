/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy } from "@webpack";
import { Tooltip } from "@webpack/common";
import { JSXElementConstructor, ReactNode } from "react";

const rowClasses = findByPropsLazy("row", "rowIcon", "rowGuildName");

export default function TimeoutDetailsRow(props: {
    description: ReactNode;
    icon: JSXElementConstructor<any>;
    children: ReactNode;
    condition?: boolean | string;
}) {
    if (props.condition === undefined ? !props.children : !props.condition) return null;
    return <div className={rowClasses.row}>
        <Tooltip text={props.description}>
            {p => <props.icon {...p} className={rowClasses.rowIcon} height="24" width="24" />}
        </Tooltip>
        {props.children}
    </div>;
}
