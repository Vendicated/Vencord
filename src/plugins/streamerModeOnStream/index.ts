/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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

const startStreamerMode = (data: StreamEvent) => toggleStreamerMode(data, true);
const stopStreamerMode = (data: StreamEvent) => toggleStreamerMode(data, false);

export default definePlugin({
    name: "StreamerModeOnStream",
    description: "Automatically enables streamer mode when you start streaming in Discord",
    authors: [Devs.Kodarru],

    start() {
        FluxDispatcher.subscribe("STREAM_CREATE", startStreamerMode);
        FluxDispatcher.subscribe("STREAM_DELETE", stopStreamerMode);
    },

    stop() {
        FluxDispatcher.unsubscribe("STREAM_CREATE", startStreamerMode);
        FluxDispatcher.unsubscribe("STREAM_DELETE", stopStreamerMode);
    }
});
