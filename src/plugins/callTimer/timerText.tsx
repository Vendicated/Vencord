/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function TimerText({ text, className }: Readonly<{ text: string; className: string; }>) {
    return <div className={`timeCounter ${className}`} style={{
        marginTop: -6, // this margin value doesn't change the default size of the user container
        fontWeight: "bold",
        fontFamily: "monospace",
        fontSize: 11, // good size that doesn't touch username
        position: "relative",
    }}>{text}</div>;
}
