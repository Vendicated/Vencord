/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ReactNode } from "../";

export default function ({
    children,
    divider = false,
    disabled = false
}: { children: ReactNode, divider?: boolean, disabled?: boolean; }) {
    return <div style={{
        display: "flex",
        flexDirection: "column",
        marginBottom: "20px"
    }}>
        {disabled ? <div style={{
            pointerEvents: "none",
            opacity: .5,
            cursor: "not-allowed"
        }}>{children}</div> : children}
        {divider && <div className="colorwaysSettingsDivider" />}
    </div>;
}
