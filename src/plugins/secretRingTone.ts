/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "SecretRingToneEnabler",
    description: "Always play the secret version of the discord ringtone",
    authors: [Devs.AndrewDLO],
    patches: [
        {
            find: "84a1b4e11d634dbfa1e5dd97a96de3ad",
            replacement: {
                match: "84a1b4e11d634dbfa1e5dd97a96de3ad.mp3",
                replace: "b9411af07f154a6fef543e7e442e4da9.mp3",
            },
        },
    ],
});
