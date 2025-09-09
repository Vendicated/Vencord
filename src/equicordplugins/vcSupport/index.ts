/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs, EquicordDevs } from "@utils/constants";
import { isEquicordPluginDev, isPluginDev } from "@utils/misc";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

export default definePlugin({
    name: "VCSupport",
    description: "Wumpus Dance + Support Warnings",
    authors: [Devs.thororen, EquicordDevs.coolesding],
    required: true,
    start() {
        const selfId = UserStore.getCurrentUser()?.id;
        if (isPluginDev(selfId) || isEquicordPluginDev(selfId)) {
            Vencord.Settings.plugins.VCSupport.enabled = false;
        } else {
            Vencord.Settings.plugins.VCSupport.enabled = true;
        }
    }
});
