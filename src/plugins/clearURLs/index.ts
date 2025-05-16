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

import { defaultRules } from "./defaultRules";

// From lodash
const reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
const reHasRegExpChar = RegExp(reRegExpChar.source);

export default definePlugin({
    name: "ClearURLs",
    description: "Removes tracking garbage from URLs",
    authors: [Devs.adryd],

    start() {
        this.createRules();
    },

    onBeforeMessageSend(_, msg) {
        return this.onSend(msg);
    },

    onBeforeMessageEdit(_cid, _mid, msg) {
        return this.onSend(msg);
    },

    escapeRegExp(str: string) {
        return (str && reHasRegExpChar.test(str))
            ? str.replace(reRegExpChar, "\\$&")
            : (str || "");
    },

    createRules() {
        // Can be extended upon once user configs are available
        // Eg. (useDefaultRules: boolean, customRules: Array[string])
        const rules = defaultRules;

        this.universalRules = new Set();
        this.rulesByHost = new Map();
        this.hostRules = new Map();

        for (const rule of rules) {
            const splitRule = rule.split("@");
            const paramRule = new RegExp(
                "^" +
                this.escapeRegExp(splitRule[0]).replace(/\\\*/, ".+?") +
                "$"
            );

            if (!splitRule[1]) {
                this.universalRules.add(paramRule);
                continue;
            }
            const hostRule = new RegExp(
                "^(www\\.)?" +
                this.escapeRegExp(splitRule[1])
                    .replace(/\\\./, "\\.")
                    .replace(/^\\\*\\\./, "(.+?\\.)?")
                    .replace(/\\\*/, ".+?") +
                "$"
            );
            const hostRuleIndex = hostRule.toString();

            this.hostRules.set(hostRuleIndex, hostRule);
            if (this.rulesByHost.get(hostRuleIndex) == null) {
                this.rulesByHost.set(hostRuleIndex, new Set());
            }
            this.rulesByHost.get(hostRuleIndex).add(paramRule);
        }
    },

    removeParam(rule: string | RegExp, param: string, parent: URLSearchParams) {
        if (param === rule || rule instanceof RegExp && rule.test(param)) {
            parent.delete(param);
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
        if (url.searchParams.entries().next().done) {
            // If there are none, we don't need to modify anything
            return match;
        }

        // Check all universal rules
        this.universalRules.forEach(rule => {
            url.searchParams.forEach((_value, param, parent) => {
                this.removeParam(rule, param, parent);
            });
        });

        // Check rules for each hosts that match
        this.hostRules.forEach((regex, hostRuleName) => {
            if (!regex.test(url.hostname)) return;
            this.rulesByHost.get(hostRuleName).forEach(rule => {
                url.searchParams.forEach((_value, param, parent) => {
                    this.removeParam(rule, param, parent);
                });
            });
        });

        return url.toString();
    },

    onSend(msg: MessageObject) {
        // Only run on messages that contain URLs
        if (msg.content.match(/http(s)?:\/\//)) {
            msg.content = msg.content.replace(
                /(https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s])/g,
                match => this.replacer(match)
            );
        }
    },
});
