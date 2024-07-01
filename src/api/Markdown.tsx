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

export interface SlateRule {
    type: string;
    after?: string;
    before?: string;
    [k: string]: any;
}

export interface ParserRules {
    [k: string]: Rule;
}

export interface MarkdownRulesType {
    RULES: ParserRules;
    CHANNEL_TOPIC_RULES: ParserRules;
    VOICE_CHANNEL_STATUS_RULES: ParserRules;
    EMBED_TITLE_RULES: ParserRules;
    INLINE_REPLY_RULES: ParserRules;
    GUILD_VERIFICATION_FORM_RULES: ParserRules;
    GUILD_EVENT_RULES: ParserRules;
    PROFILE_BIO_RULES: ParserRules;
    AUTO_MODERATION_SYSTEM_MESSAGE_RULES: ParserRules;
    NATIVE_SEARCH_RESULT_LINK_RULES: ParserRules;
}

export type PluginMarkdownRulesType = Partial<MarkdownRulesType>;

export const MarkdownRules: MarkdownRulesType = {} as MarkdownRulesType;

export type PluginRulesFunction = (r: MarkdownRulesType) => MarkdownRulesType | PluginMarkdownRulesType;

const PendingRulesMap = new Map<string, PluginRulesFunction>();

export const AddAPendingRule = (name: string, rules: PluginRulesFunction) => PendingRulesMap.set(name, rules);
export const RemoveAPendingRule = (name: string) => PendingRulesMap.delete(name);

export function patchMarkdownRules(originalMarkdownRules: MarkdownRulesType) {
    /**
     * patchs the markdown rules
     * by overwriting and/or adding each rule to the original rules entries
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
            assignEntries(MarkdownRules, rule(originalMarkdownRules));
            RemoveAPendingRule(name);
        } catch (e) {
            logger.error("Failed to add Markdown rules for", name, e);
        }
    }
    assignEntries(originalMarkdownRules, MarkdownRules);
    return originalMarkdownRules;
}

export function patchSlateRules(slate: { [k: string]: SlateRule; }) {
    /**
     * patchs the default slates
     * overwriting and/or adding each rule slate to the slate entries
     * @param slate The original slate
     * @returns The patched slate
     */
    for (const [name, rule] of Object.entries(MarkdownRules)) {
        slate[name] = rule.Slate ?? slate[name] ?? { type: "skip" };
    }
    return slate;
}
