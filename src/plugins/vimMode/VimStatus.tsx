/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useStateFromStores } from "@webpack/common";

import { Mode, VimStore } from "./vimStore";

export function VimStatus() {
    const { mode, buffer, count } = useStateFromStores(
        [VimStore],
        () => VimStore.getState()
    );

    return (
        <div
            style={{
                position: "absolute",
                bottom: "6px",
                right: "10px",
                padding: "4px 10px",
                borderRadius: "6px",
                background: mode === Mode.INSERT
                    ? "var(--orange-500)"
                    : "var(--brand-560)",
                fontFamily: "var(--font-code)",
                fontWeight: 700,
                fontSize: "12px",
                color: "var(--text-normal)",
                opacity: 0.9,
                pointerEvents: "none",
                zIndex: 9999,
            }}
        >
            {mode}
            {count && ` ${count}`}
            {buffer && ` ${buffer}`}
        </div>
    );
}

