/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    MessageObject
} from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const CLEAR_URLS_JSON_URL = "https://raw.githubusercontent.com/ClearURLs/Rules/master/data.min.json";

interface Provider {
    urlPattern: string;
    completeProvider: boolean;
    rules?: string[];
    rawRules?: string[];
    referralMarketing?: string[];
    exceptions?: string[];
    redirections?: string[];
    forceRedirection?: boolean;
}

interface ClearUrlsData {
    providers: Record<string, Provider>;
}

interface RuleSet {
    name: string;
    urlPattern: RegExp;
    rules?: RegExp[];
    rawRules?: RegExp[];
    exceptions?: RegExp[];
}

export default definePlugin({
    name: "ClearURLs",
    description: "Automatically removes tracking elements from URLs you send",
    authors: [Devs.adryd, Devs.thororen],

    rules: [] as RuleSet[],

    async start() {
        await this.createRules();
    },

    stop() {
        this.rules = [];
    },

    onBeforeMessageSend(_, msg) {
        return this.cleanMessage(msg);
    },

    onBeforeMessageEdit(_cid, _mid, msg) {
        return this.cleanMessage(msg);
    },

    async createRules() {
        const res = await fetch(CLEAR_URLS_JSON_URL)
            .then(res => res.json()) as ClearUrlsData;

        this.rules = [];

        for (const [name, provider] of Object.entries(res.providers)) {
            const urlPattern = new RegExp(provider.urlPattern, "i");

            const rules = provider.rules?.map(rule => new RegExp(rule, "i"));
            const rawRules = provider.rawRules?.map(rule => new RegExp(rule, "i"));
            const exceptions = provider.exceptions?.map(ex => new RegExp(ex, "i"));

            this.rules.push({
                name,
                urlPattern,
                rules,
                rawRules,
                exceptions,
            });
        }
    },

    replacer(match: string) {
        // Parse URL without throwing errors
        try {
            var url = new URL(match);
        } catch (error) {
            // Don't modify anything if we can't parse the URL
            return match;
        }

        // Cheap way to check if there are any search params
        if (url.searchParams.entries().next().done) return match;

        // Check rules for each provider that matches
        this.rules.forEach(({ urlPattern, exceptions, rawRules, rules }) => {
            if (!urlPattern.test(url.href) || exceptions?.some(ex => ex.test(url.href))) return;

            const toDelete: string[] = [];

            if (rules) {
                // Add matched params to delete list
                url.searchParams.forEach((_, param) => {
                    if (rules.some(rule => rule.test(param))) {
                        toDelete.push(param);
                    }
                });
            }

            // Delete matched params from list
            toDelete.forEach(param => url.searchParams.delete(param));

            // Match and remove any raw rules
            let cleanedUrl = url.href;
            rawRules?.forEach(rawRule => {
                cleanedUrl = cleanedUrl.replace(rawRule, "");
            });
            url = new URL(cleanedUrl);
        });

        return url.toString();
    },

    cleanMessage(msg: MessageObject) {
        // Only run on messages that contain URLs
        if (/http(s)?:\/\//.test(msg.content)) {
            msg.content = msg.content.replace(
                /(https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s])/g,
                match => this.replacer(match)
            );
        }
    },
});
