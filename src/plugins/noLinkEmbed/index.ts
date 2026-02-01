/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    useWhitelist: {
        name: "Limit to specific domains",
        description: "Only wrap links if they match the domains listed below",
        type: OptionType.BOOLEAN,
        default: false
    },
    domainList: {
        name: "Domains",
        description: "Comma-separated list of domains (e.g. vencord.dev,example.com)",
        type: OptionType.STRING,
        default: ""
    }
});

export default definePlugin({
    name: "NoLinkEmbed",
    description: "Prevents Discord from embedding links by automatically wrapping them in <>",
    authors: [Devs.schuh],
    settings,

    start() { },
    stop() { },

    shouldWrap(rawUrl: string): boolean {
        if (!this.settings.store.useWhitelist) return true;

        const rawDomains = this.settings.store.domainList;
        if (!rawDomains) return false;

        const allowedDomains = rawDomains
            .split(",")
            .map(d => d.trim().toLowerCase())
            .filter(Boolean);

        if (allowedDomains.length === 0) return true;

        try {
            const { hostname } = new URL(rawUrl);
            const cleanHost = hostname.toLowerCase();

            return allowedDomains.some(d => cleanHost === d || cleanHost.endsWith(`.${d}`));
        } catch (err) {
            return false;
        }
    },

    modifyContent(msg: MessageObject): void {
        if (!msg.content || typeof msg.content !== "string") return;

        const urlRegex = /https?:\/\/[^\s<]+/g;
        msg.content = msg.content.replace(urlRegex, (match, offset, fullString) => {
            const prevChar = fullString[offset - 1];
            if (prevChar === "<") {
                return match;
            }

            let cleanUrl = match;
            let suffix = "";

            const trailingPunctuation = /[.,!?;:)]+$/;
            const punctuationMatch = cleanUrl.match(trailingPunctuation);

            if (punctuationMatch) {
                suffix = punctuationMatch[0];
                cleanUrl = cleanUrl.slice(0, -suffix.length);
            }

            if (!this.shouldWrap(cleanUrl)) {
                return match;
            }

            return `<${cleanUrl}>${suffix}`;
        });
    },

    onBeforeMessageSend(_channelId, msg) {
        this.modifyContent(msg);
    },

    onBeforeMessageEdit(_channelId, _messageId, msg) {
        this.modifyContent(msg);
    }
});
