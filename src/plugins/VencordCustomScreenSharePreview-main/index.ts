/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

import { SendCustomScreenSharePreviewImageButton } from "./components/SendCustomScreenSharePreviewImageButton";
import { CustomStreamPreviewState } from "./state";
import { StreamCreateEvent, StreamDeleteEvent } from "./types";
import { parseStreamKey, stopSendingScreenSharePreview } from "./utilities";


export default definePlugin({
    name: "CustomScreenSharePreview",
    description: "Adds ability to select your own image as screen share preview.",
    authors: [{
        name: "no one",
        id: 238416205193847602n,
    }],
    flux: {
        async STREAM_CREATE({ streamKey }: StreamCreateEvent): Promise<void> {
            const { userId } = parseStreamKey(streamKey);

            if (userId !== UserStore.getCurrentUser().id) {
                return;
            }

            CustomStreamPreviewState.setState({
                isStreaming: true,
            });
        },
        async STREAM_DELETE({ streamKey }: StreamDeleteEvent): Promise<void> {
            const { userId } = parseStreamKey(streamKey);

            if (userId !== UserStore.getCurrentUser().id) {
                return;
            }

            CustomStreamPreviewState.setState({
                isStreaming: false,
            });
            stopSendingScreenSharePreview();
        },
    },
    patches: [
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /className:\w+\.buttons,.{0,100}children:\[/,
                replace: "$&$self.SendCustomScreenSharePreviewImageButton(),"
            }
        }
    ],
    SendCustomScreenSharePreviewImageButton: SendCustomScreenSharePreviewImageButton,
});
