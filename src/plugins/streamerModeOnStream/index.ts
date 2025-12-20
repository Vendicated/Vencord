/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, UserStore } from "@webpack/common";

interface StreamEvent {
    streamKey: string;
}

function toggleStreamerMode({ streamKey }: StreamEvent, value: boolean) {
    if (!streamKey.endsWith(UserStore.getCurrentUser().id)) return;

    FluxDispatcher.dispatch({
        type: "STREAMER_MODE_UPDATE",
        key: "enabled",
        value
    });
}

export default definePlugin({
    name: "StreamerModeOnStream",
    description: "Automatically enables streamer mode when you start streaming in Discord",
    authors: [Devs.Kodarru],
    flux: {
        STREAM_CREATE: d => toggleStreamerMode(d, true),
        STREAM_DELETE: d => toggleStreamerMode(d, false)
    }
});
