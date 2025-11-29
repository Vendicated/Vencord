/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useStateFromStores } from "@webpack/common";

import { Mode, VimStore } from "./core/vimStore";

const modeColors = {
    [Mode.NORMAL]: "#5865f2",
    [Mode.INSERT]: "#23a55a",
    [Mode.VISUAL]: "#f0b232"
};

export function VimStatus() {
    const { mode, buffer, count } = useStateFromStores([VimStore], () => VimStore.getState());
    const displayText = `${mode.toLowerCase()}${count ? ` ${count}` : ""}${buffer ? ` ${buffer}` : ""}`;

    return (
        <div style={{
            position: "absolute",
            bottom: 8,
            right: 12,
            padding: "4px 10px",
            borderRadius: 4,
            background: modeColors[mode],
            fontFamily: "var(--font-code)",
            fontSize: 11,
            fontWeight: 500,
            color: "#fff",
            opacity: 0.9,
            pointerEvents: "none",
            zIndex: 1000,
            letterSpacing: "0.5px"
        }}>
            {displayText}
        </div>
    );
}
