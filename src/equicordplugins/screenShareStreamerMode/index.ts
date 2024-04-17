/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { UserStore } from "@webpack/common";

interface StreamEvent {
    streamKey: string;
}

interface StreamCreateEvent extends StreamEvent {
    type: "STREAM_CREATE";
    region: string;
    viewerIds: string[];
    rtcServerId: string;
    paused: boolean;
}

interface StreamCloseEvent extends StreamEvent {
    type: "STREAM_CLOSE";
    streamKey: string;
    canShowFeedback: boolean;
}

interface StreamerModeSettings {
    enabled: boolean;
    autoToggle: boolean;
    hideInstantInvites: boolean;
    hidePersonalInformation: boolean;
    disableSounds: boolean;
    disableNotifications: boolean;
    enableContentProtection: boolean;
}

const StreamerModeActions: {
    setEnabled(enabled: boolean): void;
    update(settings: StreamerModeSettings): void;
} = findByPropsLazy("setEnabled", "update");

function isSelf(streamKey: string) {
    return streamKey.split(":").at(-1) === UserStore.getCurrentUser().id;
}

export default definePlugin({
    name: "SSSMode",
    description: "Automatically enables streamer mode while screen sharing",
    authors: [Devs.D3SOX],

    flux: {
        STREAM_CREATE({ streamKey }: StreamCreateEvent) {
            if (isSelf(streamKey)) {
                StreamerModeActions.setEnabled(true);
            }
        },
        STREAM_CLOSE({ streamKey }: StreamCloseEvent) {
            if (isSelf(streamKey)) {
                StreamerModeActions.setEnabled(false);
            }
        },
    }
});
