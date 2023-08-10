/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ErrorCard.css";

import { classes } from "@utils/misc";
import type { HTMLProps } from "react";

export function ErrorCard(props: React.PropsWithChildren<HTMLProps<HTMLDivElement>>) {
    return (
        <div {...props} className={classes(props.className, "vc-error-card")}>
            {props.children}
        </div>
    );
}
