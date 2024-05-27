/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { matchKeywords } from "./parser";

export interface TriggerMetadata {
    keywordFilter: Array<string>;
    regexPatterns: Array<string>;
    allow_list: Array<string>;
}

export interface AutoModRule {
    name: string;
    id: string;
    triggerMetadata: TriggerMetadata;
    enabled: boolean;
    exemptRoles: Array<string>;
    exemptChannels: Array<string>;
    actions: Array<{ type: number; metadata: object; }>;
}

export interface MatchedRule {
    rule: AutoModRule;
    filter: string | null;
}

export function matchRules(text: string, rules: Array<AutoModRule>): MatchedRule | null {
    let [matched, keyword]: [boolean, string | null] = [false, null];
    for (const rule of rules) {
        if (rule.triggerMetadata?.keywordFilter && rule.enabled && rule.triggerMetadata.keywordFilter.length > 0) {
            [matched, keyword] = matchKeywords(text, rule.triggerMetadata.keywordFilter, rule.triggerMetadata.allow_list);
            if (matched) {
                return { rule: rule, filter: keyword };
            }
        }
    }
    return null;
}
