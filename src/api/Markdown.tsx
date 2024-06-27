/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Output, ParserRule, State } from "simple-markdown";

const logger = new Logger("Markdown");

export interface Rule extends ParserRule {
    requiredFirstCharacters: Array<string>;
    react: (node: any, recurseOutput: Output<any>, state: State) => JSX.Element;
    Slate?: object;
    [k: string]: any;
}

export interface Rules {
    [k: string]: Rule;
}

export interface MarkDownRules {
    RULES: Rules;
    CHANNEL_TOPIC_RULES: Rules;
    VOICE_CHANNEL_STATUS_RULES: Rules;
    EMBED_TITLE_RULES: Rules;
    INLINE_REPLY_RULES: Rules;
    GUILD_VERIFICATION_FORM_RULES: Rules;
    GUILD_EVENT_RULES: Rules;
    PROFILE_BIO_RULES: Rules;
    AUTO_MODERATION_SYSTEM_MESSAGE_RULES: Rules;
    NATIVE_SEARCH_RESULT_LINK_RULES: Rules;
}

export type PluginMarkDownRules = Partial<MarkDownRules>;

export const Rules: MarkDownRules = {} as MarkDownRules;

export type PluginRulesFunction = (r: MarkDownRules) => MarkDownRules | PluginMarkDownRules;

const PendingRulesMap = new Map<string, PluginRulesFunction>();

export const AddAPendingRule = (name: string, rules: PluginRulesFunction) => PendingRulesMap.set(name, rules);
export const RemoveAPendingRule = (name: string) => PendingRulesMap.delete(name);

export function patchMarkdownRules(originalRules: MarkDownRules) {
    /**
     * patchs the markdown rules
     * @param originalRles the original discord markdown rules
     * @returns The patched rules
     */
    function assignEntries(target: any, source: any) {
        for (const [k, v] of Object.entries(source)) {
            target[k] = Object.assign(target[k] ?? {}, v);
        }
    }
    for (const [name, rule] of PendingRulesMap) {
        try {
            const rules = rule(originalRules);
            assignEntries(Rules, rules);
            delete PendingRulesMap[name];
        } catch (e) {
            logger.error("Failed to add markdown rules for ", name, e);
        }
    }
    assignEntries(originalRules, Rules);
    return originalRules;
}

export function insertSlateRules(slate: any) {
    return Object.assign(
        slate,
        Object.fromEntries(
            Array.from(
                Object.entries(Rules), ([_, rules]: [string, Rules]) => Object.entries(rules).map(([name, rule]: [string, Rule]) => [name, (rule.Slate ?? slate[name]) ?? { type: "skip" }])).flat()
        )
    );
}
