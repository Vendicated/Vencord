/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function Caret({ disabled, direction }: { disabled: boolean; direction: "left" | "right"; }) {
    return (
        <svg className={`vc-bactivities-caret-${direction.toLowerCase()} ${disabled && "disabled"}`} width="24" height="24" viewBox="0 0 24 24">
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M16.59 8.59004L12 13.17L7.41 8.59004L6 10L12 16L18 10L16.59 8.59004Z" />
        </svg>
    );
}
