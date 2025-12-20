/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    domain: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove the untrusted domain popup when opening links",
        restartNeeded: true
    },
    file: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Remove the 'Potentially Dangerous Download' popup when opening links",
        restartNeeded: true
    }
});

export default definePlugin({
    name: "AlwaysTrust",
    description: "Removes the annoying untrusted domain and suspicious file popup",
    authors: [Devs.zt, Devs.Trwy],
    patches: [
        {
            find: '="MaskedLinkStore",',
            replacement: {
                match: /(?<=isTrustedDomain\(\i\){)return \i\(\i\)/,
                replace: "return true"
            },
            predicate: () => settings.store.domain
        },
        {
            find: "bitbucket.org",
            replacement: {
                match: /function \i\(\i\){(?=.{0,30}pathname:\i)/,
                replace: "$&return null;"
            },
            predicate: () => settings.store.file
        }
    ],
    settings
});
