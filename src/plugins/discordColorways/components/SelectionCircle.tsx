/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export default function () {
    return <div style={{
        borderRadius: "50%",
        width: "calc(100% + 4px)",
        height: "calc(100% + 4px)",
        position: "absolute",
        top: "-2px",
        left: "-2px",
        cursor: "default",
        pointerEvents: "none",
        boxShadow: "inset 0 0 0 2px var(--brand-500),inset 0 0 0 4px var(--background-primary)"
    }}>
        <svg style={{ position: "absolute", right: "0" }} aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="var(--white-500)" />
            <path fill="currentColor" fill-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm5.7-13.3a1 1 0 0 0-1.4-1.4L10 14.58l-2.3-2.3a1 1 0 0 0-1.4 1.42l3 3a1 1 0 0 0 1.4 0l7-7Z" clip-rule="evenodd" style={{ color: "var(--brand-500)" }} />
        </svg>
    </div>;
}
