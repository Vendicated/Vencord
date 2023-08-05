/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Parser } from "@webpack/common";

// taken from simple-markdown, don't know if a types package exists
type State = {
    key?: string | number;
    inline?: boolean;
    [key: string]: any;
};
type Capture = | (string[] & {index: number;}) | (string[] & {index?: number;})
type MatchFunction = {regex?: RegExp;} & ((source: string, state: State) => Capture | null);
type SingleASTNode = {
    type: string;
    [key: string]: any;
};
type UnTypedASTNode = {
    [key: string]: any;
};
type ASTNode = SingleASTNode | SingleASTNode[];
type Parser = ((source: string, state?: State) => SingleASTNode[]);
type ParseFunction = ((capture: Capture, parse: Parser, state: State) => UnTypedASTNode | ASTNode);
type Output<Result> = ((node: ASTNode, state?: State) => Result);
type NodeOutput<Result> = ((node: SingleASTNode, nestedOutput: Output<Result>, state: State) => Result);

interface MarkdownRule {
    order: number;
    match: MatchFunction;
    parse: ParseFunction;
    react: NodeOutput<JSX.Element>;
}

interface SlateRule {
    type: "skip" | "verbatim" | "inlineObject" | "inlineStyle";
    before?: string;
    after?: string;
}

type MarkdownRuleFactory = ((rules: Record<string, MarkdownRule>) => MarkdownRule)

const markdownRules: Map<string, MarkdownRuleFactory> = new Map();
const slateRules: Map<string, SlateRule> = new Map();
const slateDecorators: Map<string, string> = new Map();

export function addRule(name: string, markdownRule: MarkdownRuleFactory, slateRule: SlateRule, decorator?: string) {
    markdownRules.set(name, markdownRule);
    slateRules.set(name, slateRule);

    // should this propigate an error if its not inlineStyle but decorator is set?
    if (decorator != null && slateRule.type === "inlineStyle") {
        slateDecorators.set(name, decorator);
    }

    __rebuildParsers();
}
export function removeRule(name: string) {
    if (markdownRules.has(name)) markdownRules.delete(name);
    if (slateRules.has(name)) slateRules.delete(name);
    if (slateDecorators.has(name)) slateDecorators.delete(name);

    __rebuildParsers();
}

type Ruleset = "RULES" | "CHANNEL_TOPIC_RULES" | "EMBED_TITLE_RULES" | "INLINE_REPLY_RULES" | "GUILD_VERIFICATION_FORM_RULES" | "GUILD_EVENT_RULES" | "PROFILE_BIO_RULES" | "AUTO_MODERATION_SYSTEM_MESSAGE_RULES"

const blacklistedRules: Map<string, Set<string>> = new Map();

export function addBlacklist(ruleset: Ruleset, rule: string) {
    if (!blacklistedRules.has(ruleset)) blacklistedRules.set(ruleset, new Set());
    blacklistedRules.get(ruleset)?.add(rule);

    __rebuildParsers();
}
export function removeBlacklist(ruleset: Ruleset, rule: string) {
    if (blacklistedRules.has(ruleset)) blacklistedRules.get(ruleset)?.delete(rule);

    __rebuildParsers();
}

const rulesets = findByPropsLazy("RULES");
function __getCustomRules(ruleset: string) {
    const rules = {};
    const blacklist = blacklistedRules.get(ruleset);
    for (const [name, rule] of markdownRules.entries()) {
        if (blacklist?.has(name)) continue;

        rules["vc_" + name] = rule(rulesets[ruleset] ?? rulesets.RULES);
    }

    return rules;
}

// i have exhausted all my options for figuring out ways to not have to "rebuild" every parser.
const parserMap = [
    {
        ruleset: "RULES",
        key: "defaultRules",
        react: "parse",
        ast: "parseToAST",
        reactOptions: { enableBuildOverrides: true },
    },
    {
        ruleset: "RULES",
        react: "parseForumPostGuidelines",
        omit: ["paragraph", "newline"],
    },
    {
        ruleset: "CHANNEL_TOPIC_RULES",
        react: "parseTopic",
        ast: "parseTopicToAST",
        reactOptions: { ...Parser.defaultReactRuleOptions, emojiTooltipPosition: "bottom" },
        overrides: { codeBlock: "text" },
    },
    {
        ruleset: "EMBED_TITLE_RULES",
        react: "parseEmbedTitle",
        ast: "parseEmbedTitleToAST",
    },
    {
        ruleset: "INLINE_REPLY_RULES",
        react: "parseInlineReply",
        ast: "parseInlineReplyToAST",
    },
    {
        ruleset: "GUILD_VERIFICATION_FORM_RULES",
        react: "parseGuildVerificationFormRule",
    },
    {
        ruleset: "GUILD_EVENT_RULES",
        key: "guildEventRules",
        react: "parseGuildEventDescription",
    },
    {
        ruleset: "INLINE_REPLY_RULES",
        react: "parseForumPostMostRecentMessage",
        reactOptions: { ...Parser.defaultReactRuleOptions, emoji: { height: 14, width: 14, lineHeight: 18 } },
    },
    {
        ruleset: "AUTO_MODERATION_SYSTEM_MESSAGE_RULES",
        react: "parseAutoModerationSystemMessage",
        ast: "parseAutoModerationSystemMessageToAST",
    },
    {
        ruleset: "RULES",
        key: "notifCenterV2MessagePreviewRules",
        react: "parseNotifCenterMessagePreview",
        reactOptions: { ...Parser.defaultReactRuleOptions, emoji: { height: 14, width: 14, lineHeight: 18 } },
        omit: ["paragraph", "newline", "strong", "codeBlock", "inlineCode", "u", "link", "url", "autolink", "list", "heading"],
    },
];
function __rebuildParsers() {
    for (const props of parserMap) {
        const customRules = __getCustomRules(props.ruleset);

        const reactOptions = props.reactOptions ?? Parser.defaultReactRuleOptions;
        const overrides = {};
        if (props.overrides) {
            for (const [rule, override] of Object.entries(props.overrides)) {
                overrides[rule] = rulesets.RULES[override].react;
            }
        }

        let rules = { ...rulesets[props.ruleset], ...customRules };
        rules = Parser.combineAndInjectMentionRule(rules, [Parser.createReactRules(reactOptions), overrides]);
        if (props.omit) {
            window._.omit(rules, ...props.omit);
        }

        if (props.key) {
            Parser[props.key] = rules;
        }
        if (props.react) {
            Parser[props.react] = Parser.reactParserFor(rules);
        }
        if (props.ast) {
            Parser[props.ast] = Parser.astParserFor(rules);
        }
    }
}

export function __getSlateRule(rule: string): SlateRule | null | undefined {
    return slateRules.get(rule.substring(3));
}

export function __getSlateDecorator(rule: string): string | null | undefined {
    return slateDecorators.get(rule.substring(3));
}
