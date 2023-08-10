/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "SettingsStoreAPI",
    description: "Patches Discord's SettingsStores to expose their group and name",
    authors: [Devs.Nuckyz],

    patches: [
        {
            find: '"textAndImages","renderSpoilers"',
            replacement: [
                {
                    match: /(?<=INFREQUENT_USER_ACTION.{0,20}),useSetting:function/,
                    replace: ",settingsStoreApiGroup:arguments[0],settingsStoreApiName:arguments[1]$&"
                }
            ]
        }
    ]
});
