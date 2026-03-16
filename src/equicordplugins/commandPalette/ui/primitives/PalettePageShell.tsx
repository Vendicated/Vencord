/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import type { ReactNode } from "react";

const cl = classNameFactory("vc-command-palette-");

interface PalettePageShellProps {
    title?: string;
    children: ReactNode;
    error?: string | null;
}

export function PalettePageShell({ title, children, error }: PalettePageShellProps) {
    return (
        <div className={cl("page")}>
            {title && (
                <div className={cl("page-title")}>{title}</div>
            )}
            <div className={cl("page-content")}>
                {children}
            </div>
            {error && (
                <div className={cl("page-error")}>{error}</div>
            )}
        </div>
    );
}
