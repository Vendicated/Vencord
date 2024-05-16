/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

export default definePlugin({
    name: "NoDefaultHangStatus",
    description: "Disable the default hang status",
    authors: [Devs.D3SOX],

    flux: {
        UPDATE_HANG_STATUS: ({ status, saveAsDefault }: { status: string, saveAsDefault?: boolean }) => {
            if (saveAsDefault === undefined && status) {
                FluxDispatcher.dispatch({ type: "CLEAR_HANG_STATUS" });
            }
        },
    }
});
