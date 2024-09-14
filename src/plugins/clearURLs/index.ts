/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    addPreEditListener,
    addPreSendListener,
    MessageObject,
    removePreEditListener,
    removePreSendListener
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
    dependencies: ["MessageEventsAPI"],

    escapeRegExp(str: string) {
        return (str && reHasRegExpChar.test(str))
            ? str.replace(reRegExpChar, "\\$&")
            : (str || "");
    },

    universalRules: new Set<RegExp>(),
    rulesByHost: new Map<string, Set<RegExp>>(),
    hostRules: new Map<string, RegExp>(),
    createRules() {
        // Can be extended upon once user configs are available
        // Eg. (useDefaultRules: boolean, customRules: Array[string])
        const rules = defaultRules;

        for (const rule of rules) {
            const [param, domain] = rule.split("@");
            const paramRule = new RegExp(`^${this.escapeRegExp(param).replace(/\\\*/, ".+?")}$`);

            if (!domain) {
                this.universalRules.add(paramRule);
                continue;
            }
            const hostRule = new RegExp("^(www\\.)?" + this.escapeRegExp(domain)
                .replace(/\\\./, "\\.")
                .replace(/^\\\*\\\./, "(.+?\\.)?")
                .replace(/\\\*/, ".+?") +
                "$");
            const hostRuleIndex = hostRule.toString();

            this.hostRules.set(hostRuleIndex, hostRule);
            if (!this.rulesByHost.get(hostRuleIndex))
                this.rulesByHost.set(hostRuleIndex, new Set());
            this.rulesByHost.get(hostRuleIndex)!.add(paramRule);
        }
    },

    execRule(rule: RegExp, url: URL) {
        for (const [param] of url.searchParams) {
            if (rule.test(param)) url.searchParams.delete(param);
        }
    },

    replacer(match: string) {
        let url: URL;
        // don't modify anything if we can't parse the URL
        try { url = new URL(match) as URL; }
        catch { return match; }

        // Cheap way to check if there are any search params
        // If there are none, we don't need to modify anything
        if (url.searchParams.entries().next().done)
            return match;

        // Check all universal rules
        for (const rule of this.universalRules)
            this.execRule(rule, url);

        // Check host rules
        for (const [hostRuleName, regex] of this.hostRules) {
            if (!regex.test(url.hostname)) continue;
            for (const rule of this.rulesByHost.get(hostRuleName)!)
                this.execRule(rule, url);
        }

        return url.toString();
    },

    handleMessage(msg: MessageObject) {
        // Only run on messages that contain URLs
        if (msg.content.match(/http(s)?:\/\//)) return;

        msg.content = msg.content.replace(
            /(https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s])/g,
            match => this.replacer(match)
        );
    },

    start() {
        this.createRules();
        this.preSend = addPreSendListener((_, msg) => this.handleMessage(msg));
        this.preEdit = addPreEditListener((_cid, _mid, msg) => this.handleMessage(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    },
});
