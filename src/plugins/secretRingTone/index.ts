/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

// NOTE - Ultimately should probably be turned into a ringtone picker plugin
export default definePlugin({
    name: "SecretRingToneEnabler",
    description: "Always play the secret version of the discord ringtone (except during special ringtone events)",
    authors: [Devs.AndrewDLO, Devs.FieryFlames],
    patches: [
        {
            find: "call_ringing_beat\"",
            replacement: {
                match: /500===\i\(\)\.random\(1,1e3\)/,
                replace: "true"
            }
        },
    ],
});
