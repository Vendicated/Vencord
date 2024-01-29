/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function TimerText({ text }: Readonly<{ text: string; }>) {
    return <p className="usernameFont__71dd5 username__73ce9" style={{
        margin: 0,
        fontWeight: "bold",
        fontFamily: "monospace",
        fontSize: 12,
        position: "absolute",
        bottom: -8,
        left: 38,
        padding: 2,
        borderRadius: 3
    }}>{text}</p>;
}
