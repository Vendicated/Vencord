/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    howToUse: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => (
            <div style={{
                padding: "1em",
                background: "#f3f3f3",
                borderRadius: "8px",
                color: "#222"
            }}>
                <div style={{ marginBottom: "0.5em", fontWeight: "bold" }}>How to use:</div>
                <div style={{ marginBottom: "0.3em" }}>• Hide a server: Right-click server → "Hide Server"</div>
                <div style={{ marginBottom: "0.3em" }}>• Unhide a server: Hold Ctrl+H → Right-click server → "Unhide Server"</div>
                <div>• Temporarily reveal all: Hold Ctrl+H (release to hide again)</div>
            </div>
        )
    },

    hiddenGuilds: {
        type: OptionType.CUSTOM,
        default: [] as string[],
        description: "List of guild IDs that are currently hidden",
        hidden: true,
    },

    _toggleReveal: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Internal state toggled by hotkey to show hidden guilds",
        hidden: true,
    },
});
