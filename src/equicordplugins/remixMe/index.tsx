/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreSendListener, MessageExtra, MessageObject, removeMessagePreSendListener } from "@api/MessageEvents";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

const handleMessage = (channelID: string, message: MessageObject, messageEx: MessageExtra) => messageEx.uploads && messageEx.uploads.forEach(att => (att as any).isRemix = true);

export default definePlugin({
    name: "RemixMe",
    description: "Turns every single message with attachment to have remix tag",
    authors: [EquicordDevs.kvba],
    start: () => addMessagePreSendListener(handleMessage),
    stop: () => removeMessagePreSendListener(handleMessage)
});
