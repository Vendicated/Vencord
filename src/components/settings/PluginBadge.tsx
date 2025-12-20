/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function AddonBadge({ text, color }) {
    return (
        <div className="vc-addon-badge" style={{
            backgroundColor: color,
            justifySelf: "flex-end",
            marginLeft: "auto"
        }}>
            {text}
        </div>
    );
}
