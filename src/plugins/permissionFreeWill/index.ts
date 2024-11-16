/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { canonicalizeMatch } from "@utils/patches";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    lockout: {
        type: OptionType.BOOLEAN,
        default: true,
        description: 'Bypass the permission lockout prevention ("Pretty sure you don\'t want to do this")',
        restartNeeded: true
    },
    onboarding: {
        type: OptionType.BOOLEAN,
        default: true,
        description: 'Bypass the onboarding requirements ("Making this change will make your server incompatible [...]")',
        restartNeeded: true
    }
});

export default definePlugin({
    name: "PermissionFreeWill",
    description: "Disables the client-side restrictions for channel permission management.",
    authors: [Devs.lewisakura],

    patches: [
        // Permission lockout, just set the check to true
        {
            find: "#{intl::STAGE_CHANNEL_CANNOT_OVERWRITE_PERMISSION}",
            replacement: [
                {
                    match: /case"DENY":.{0,50}if\((?=\i\.\i\.can)/,
                    replace: "$&true||"
                }
            ],
            predicate: () => settings.store.lockout
        },
        // Onboarding, same thing but we need to prevent the check
        {
            find: "#{intl::ONBOARDING_CHANNEL_THRESHOLD_WARNING}",
            replacement: [
                {
                    match: /{(\i:function\(\){return \i},?){2}}/,
                    replace: m => m.replaceAll(canonicalizeMatch(/return \i/g), "return ()=>Promise.resolve(true)")
                }
            ],
            predicate: () => settings.store.onboarding
        }
    ],
    settings
});
