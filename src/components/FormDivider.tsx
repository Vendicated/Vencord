/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./FormDivider.css";

import { classes } from "@utils/misc";

export function FormDivider({ className }: { className?: string; }) {
    return <div className={classes("vc-form-divider", className)} />;
}
