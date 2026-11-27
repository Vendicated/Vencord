/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./List.css";

import { classes } from "@utils/misc";
import type { ComponentPropsWithRef } from "react";

// Discord applies insane styles to lists, making them unusable. So here are our own super basic list components.

export function OrderedList({ className, ...props }: ComponentPropsWithRef<"ol">) {
    return <ol className={classes("vc-list", className)} {...props} />;
}

export function UnorderedList({ className, ...props }: ComponentPropsWithRef<"ul">) {
    return <ul className={classes("vc-list", className)} {...props} />;
}
