/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "SecretRingToneEnabler",
    description: "Always play the secret version of the discord ringtone (except during special ringtone events)",
    authors: [Devs.AndrewDLO, Devs.FieryFlames, Devs.RamziAH],
    patches: [
        {
            find: '"call_ringing_beat"',
            replacement: {
                match: /500!==\i\(\)\.random\(1,1e3\)/,
                replace: "false",
            }
        },
        {
            find: '"call_ringing_beat"',
            predicate: ()=> Settings.plugins.SecretRingToneEnabler.onlySnow,
            replacement: {
                match: /"call_ringing_beat",/,
                replace: "",
            }
        },
    ],
    options: {
        onlySnow: {
            type: OptionType.BOOLEAN,
            description: "Only play the Snow Halation Theme?",
            default: false,
            restartNeeded: true
        }
    },
});
