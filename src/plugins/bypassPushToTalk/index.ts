/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "BypassPushToTalk",
    description: "Use VAD even in voice channels that require push to talk",
    authors: [Devs.alexagian],
    tags: ["Servers", "Voice"],
    patches: [
        {
            find: "PermissionVADStore",
            replacement: [
                {
                    match: /\|\|\i\.\i\.can\(\i\.\i\.USE_VAD,\i\)\|\|/,
                    replace: "||true||"
                },
                {
                    match: /(?<=(?:shouldShowWarning|canUseVoiceActivity)\(\)\{)return!\i\}/g,
                    replace: "return false}"
                },
            ]
        }
    ]
});
