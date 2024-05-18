/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { matchKeywords } from "./parser";

/*
const action_types = {
    0: "custom_message", // custom message when the message got automoded
    1: "duration_seconds", // the timeout duration to give mute to the automoded member
    2: "channel_id" // channel id to send the logs
};
*/
export interface Action {
    type: number; // action_types
    metadata: object;
}

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
    actions: Array<Action>;
}

export interface MatchedRule {
    rule: AutoModRule;
    filter: string | null;
    regex: boolean;
}

export function matchRules(text: string, rules: Array<AutoModRule>): MatchedRule | null {
    let [matched, keyword]: [boolean, string | null] = [false, null];
    for (const rule of rules) {
        if (rule.triggerMetadata?.keywordFilter && rule.enabled && rule.triggerMetadata.keywordFilter.length > 0) {
            [matched, keyword] = matchKeywords(text, rule.triggerMetadata.keywordFilter, rule.triggerMetadata.allow_list);
            if (matched) {
                return { rule: rule, filter: keyword, regex: false };
            }
        }
    }
    return null;
}
