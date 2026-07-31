/*
 * Vencord, a modification for Discord's desktop app
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { CustomBadgeDefinition } from "@api/SharedCustomProfiles";

function isEmojiIcon(icon: string): boolean {
    const trimmed = icon.trim();
    if (!trimmed || trimmed.startsWith("http") || trimmed.startsWith("data:")) return false;
    return [...trimmed].length <= 2;
}

function resolveIconSrc(icon: string): string | undefined {
    const trimmed = icon.trim();
    if (!trimmed || isEmojiIcon(trimmed)) return undefined;
    return trimmed;
}

export function CustomBadgeVisual({ badge }: { badge: CustomBadgeDefinition; }) {
    const iconSrc = resolveIconSrc(badge.icon);
    const color = `#${badge.color.toString(16).padStart(6, "0")}`;

    return (
        <div
            style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                backgroundColor: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
                flexShrink: 0,
            }}
        >
            {iconSrc
                ? (
                    <img
                        src={iconSrc}
                        alt=""
                        draggable={false}
                        style={{ width: 14, height: 14, objectFit: "contain" }}
                    />
                )
                : (
                    <span style={{ fontSize: 12, lineHeight: 1, userSelect: "none" }}>
                        {isEmojiIcon(badge.icon) ? badge.icon.trim() : "★"}
                    </span>
                )}
        </div>
    );
}
