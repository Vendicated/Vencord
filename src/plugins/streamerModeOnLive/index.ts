/* eslint-disable simple-header/header */
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const updateStreamerMode = (state: boolean) => FluxDispatcher.dispatch({ type: "STREAMER_MODE_UPDATE", key: "enabled", value: state });

export default definePlugin({
    name: "StreamerModeOnLive",
    description: "Enables streamer mode when you start live on discord.",
    authors: [Devs.Rawir],

    handleStreamStart: () => updateStreamerMode(true),
    handleStreamStop: () => updateStreamerMode(false),

    start() {
        FluxDispatcher.subscribe("STREAM_START", this.handleStreamStart);
        FluxDispatcher.subscribe("STREAM_STOP", this.handleStreamStop);
    },

    stop() {
        FluxDispatcher.unsubscribe("STREAM_START", this.handleStreamStart);
        FluxDispatcher.unsubscribe("STREAM_STOP", this.handleStreamStop);
    }
});
