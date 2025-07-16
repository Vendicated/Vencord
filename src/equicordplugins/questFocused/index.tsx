/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@equicordplugins/_misc/styles.css";

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Forms } from "@webpack/common";

export default definePlugin({
    name: "QuestFocused",
    description: "Prevent the quests player from pausing and possibly skip it all together.",
    settingsAboutComponent: () => <>
        <Forms.FormText className="plugin-warning">
            You might need to spam left mouse button on the video to skip it.
        </Forms.FormText>
    </>,
    authors: [EquicordDevs.secp192k1],
    patches: [
        // Block pausing
        {
            find: "[QV] | updatePlayerState | playerState",
            replacement: {
                match: /(?<=case \i\.\i\.PAUSED:.{0,25})\i\.current\.pause\(\),/,
                replace: ""
            }
        },
        {
            find: "[QV] | updatePlayerState | playerState:",
            replacement: {
                match: /(?<=case \i\.\i\.PLAYING:)\i\.current\.paused/,
                replace: "false"
            }
        },
    ],
});
