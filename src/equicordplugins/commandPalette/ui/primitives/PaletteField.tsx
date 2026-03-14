/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import type { ReactNode } from "react";

const cl = classNameFactory("vc-command-palette-");

interface PaletteFieldProps {
    label: string;
    children: ReactNode;
}

export function PaletteField({ label, children }: PaletteFieldProps) {
    return (
        <div className={cl("page-field")}>
            <label className={cl("page-field-label")}>{label}</label>
            {children}
        </div>
    );
}
