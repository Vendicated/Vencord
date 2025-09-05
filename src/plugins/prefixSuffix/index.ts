/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { settings } from "./settings";
import { PrefixSuffixChatBarIcon } from "./prefixSuffixIcon";

export default definePlugin({
    name: "PrefixSuffix",
    description: "Set a prefix and suffix for your messages",
    authors: [Devs.Cait],
    settings,

    renderChatBarButton: PrefixSuffixChatBarIcon,

    async onBeforeMessageSend(_, message) {
        if (!settings.store.autoPrefixSuffix) return;
        if (!message.content) return;

        // .replaceAll("\\n", "\n") is needed so using \n actually makes a new line
        message.content = settings.store.prefix.replaceAll("\\n", "\n") + message.content + settings.store.suffix.replaceAll("\\n", "\n");
    }
});
