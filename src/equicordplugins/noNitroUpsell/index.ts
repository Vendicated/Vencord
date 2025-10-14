/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { OverridePremiumTypeStore } from "@webpack/common";

export default definePlugin({
    name: "NoNitroUpsell",
    description: "Removes ALL of Discord's nitro upsells by tricking the client into thinking you have nitro.",
    authors: [Devs.thororen],
    flux: {
        CONNECTION_OPEN() {
            const state = OverridePremiumTypeStore.getState();
            if (state.premiumTypeActual !== 2 || state.premiumTypeOverride === 2) return;
            state.premiumTypeOverride = 2;
        }
    },
    start() {
        OverridePremiumTypeStore.getState().premiumTypeOverride = 2;
    },
    stop() {
        OverridePremiumTypeStore.getState().premiumTypeOverride = undefined;
    }
});
