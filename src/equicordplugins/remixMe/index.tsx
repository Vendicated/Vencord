/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageEvents } from "@api/index";
import { MessageExtra, MessageObject } from "@api/MessageEvents";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

const handleMessage = (channelID: string, message: MessageObject, messageEx: MessageExtra) => messageEx.uploads && messageEx.uploads.forEach(att => (att as any).isRemix = true);

export default definePlugin({
    name: "RemixMe",
    description: "Turns every single message with attachment to have remix tag",
    authors: [EquicordDevs.kvba],
    start: () => MessageEvents.addPreSendListener(handleMessage),
    stop: () => MessageEvents.removePreSendListener(handleMessage)
});
