/*
* Vencord, a Discord client mod
* Copyright (c) 2025 AtomicByte/Jaisal*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

// I had called this Message Search, but Global Search is probably more accurate so you may see that in the code ;3

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { MessageSearchChatBarIcon } from "./MessageSearchChatBarIcon";

export default definePlugin({
    name: "Global Search",
    description: "Search through messages in all DM channels and group DMs globally",
    authors: [Devs.atomic],
    renderChatBarButton: MessageSearchChatBarIcon
});