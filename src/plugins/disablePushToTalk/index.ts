/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { Devs } from "@utils/constants";

const patches = [
    {
        find: "PermissionVADStore",
        replacement: [
            {
                match: /\|\|\i\.\i\.can\(\i\.\i\.USE_VAD,\i\)\|\|/,
                replace: "||true||"
            },
            {
                match: /shouldShowWarning\(\)\{return!\i\}/,
                replace: "shouldShowWarning(){return false}"
            },
            {
                match: /canUseVoiceActivity\(\)\{return \i\}/,
                replace: "canUseVoiceActivity(){return true}"
            }
        ]
    }
];

export default definePlugin({
    name: "DisablePushToTalk",
    description: "Use voice activity in voice channels that require push to talk",
    authors: [Devs.alexagian],
    tags: ["Servers", "Voice"],
    patches
});