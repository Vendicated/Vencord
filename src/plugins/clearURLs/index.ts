/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
    tags: ["Privacy", "Utility"],
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

            const rules = provider.rules?.map(rule => new RegExp("^(?:" + rule + ")$", "i")); // Disallow substring matches
            const rawRules = provider.rawRules?.map(rule => new RegExp(rule, "gi"));
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
        let href = match, url: URL;

        // Verify input is actually a valid URL
        try {
            url = new URL(href);
        } catch (e) {
            return match;
        }

        // Check rules for each provider that matches
        for (const { urlPattern, exceptions, rawRules, rules } of this.rules) {
            if (!urlPattern.test(href) || exceptions?.some(ex => ex.test(href)))
                continue;

            const pHref = href;

            rawRules?.forEach(rawRule => href = href.replace(rawRule, ""));

            try {
                url = new URL(href);
            } catch (e) {
                // If something goes wrong, restore string representation and continue
                href = pHref;
                continue;
            }

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

            // Update string representation of URL
            href = url.href;
        }

        return href;
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
