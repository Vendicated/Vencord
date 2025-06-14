/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreSendListener, type MessageExtra, type MessageObject, type MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import type { UploadWithRemix } from "./types";


const handleMessage: MessageSendListener = (_: string, __: MessageObject, ex: MessageExtra) =>
    ex.uploads && (ex.uploads as UploadWithRemix[]).forEach(att => att.isRemix = true);

export default definePlugin({
    name: "RemixMe",
    description: "Turns every single message with attachment to have remix tag",
    authors: [EquicordDevs.meowabyte],
    start: () => addMessagePreSendListener(handleMessage),
    stop: () => removeMessagePreSendListener(handleMessage)
});
