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

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { ExpandableSection } from "@components/ExpandableCard";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Span } from "@components/Span";
import { TooltipContainer } from "@components/TooltipContainer";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { React, TextInput, useState } from "@webpack/common";

const cl = classNameFactory("vc-textReplace-");

type Rule = Record<"find" | "replace" | "onlyIfIncludes" | "id", string>;

interface TextReplaceProps {
    title: string;
    description: string;
    rulesArray: Rule[];
    isRegex?: boolean;
}

const makeEmptyRule: () => Rule = () => ({
    find: "",
    replace: "",
    onlyIfIncludes: "",
    id: crypto.randomUUID()
});
const makeEmptyRuleArray = () => [makeEmptyRule()];

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        component: () => {
            const { stringRules, regexRules } = settings.use(["stringRules", "regexRules"]);

            return (
                <>
                    <TextReplaceTesting />
                    <TextReplace
                        title="Simple Replacements"
                        description="Simple find and replace rules. For example, find 'brb' and replace it with 'be right back'"
                        rulesArray={stringRules}
                    />
                    <TextReplace
                        title="Regex Replacements"
                        description="More powerful replacements using Regular Expressions. This section is for advanced users. If you don't understand it, just ignore it"
                        rulesArray={regexRules}
                        isRegex
                    />
                </>
            );
        }
    },
    stringRules: {
        type: OptionType.CUSTOM,
        default: makeEmptyRuleArray(),
    },
    regexRules: {
        type: OptionType.CUSTOM,
        default: makeEmptyRuleArray(),
    }
});

function stringToRegex(str: string) {
    const match = str.match(/^(\/)?(.+?)(?:\/([gimsuyv]*))?$/); // Regex to match regex
    return match
        ? new RegExp(
            match[2], // Pattern
            match[3]
                ?.split("") // Remove duplicate flags
                .filter((char, pos, flagArr) => flagArr.indexOf(char) === pos)
                .join("")
            ?? "g"
        )
        : new RegExp(str); // Not a regex, return string
}

function renderFindError(find: string) {
    try {
        stringToRegex(find);
        return null;
    } catch (e) {
        return (
            <span style={{ color: "var(--text-feedback-critical)" }}>
                {String(e)}
            </span>
        );
    }
}

function Input({ initialValue, onChange, placeholder }: {
    placeholder: string;
    initialValue: string;
    onChange(value: string): void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            spellCheck={false}
            onBlur={() => value !== initialValue && setTimeout(() => onChange(value), 0)}
        />
    );
}

function TextRow({ label, description, value, onChange }: { label: string; description: string; value: string; onChange(value: string): void; }) {
    return (
        <>
            <TooltipContainer text={description}>
                <Span weight="medium" size="md">{label}</Span>
            </TooltipContainer>
            <Input
                placeholder={description}
                initialValue={value}
                onChange={onChange}
            />
        </>
    );
}

const isEmptyRule = (rule: Rule) => !rule.find;

function TextReplace({ title, description, rulesArray, isRegex = false }: TextReplaceProps) {
    function onClickRemove(index: number) {
        rulesArray.splice(index, 1);
    }

    function onChange(e: string, index: number, key: string) {
        rulesArray[index][key] = e;

        // If a rule is empty after editing and is not the last rule, remove it
        if (rulesArray[index].find === "" && rulesArray[index].replace === "" && rulesArray[index].onlyIfIncludes === "" && index !== rulesArray.length - 1) {
            rulesArray.splice(index, 1);
        }
    }

    return (
        <>
            <div>
                <HeadingSecondary>{title}</HeadingSecondary>
                <Paragraph>{description}</Paragraph>
            </div>
            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {rulesArray.map((rule, index) =>
                    <ExpandableSection
                        key={rule.id}
                        renderContent={() => (
                            <>
                                <div className={cl("input-grid")}>
                                    <TextRow
                                        label="Find"
                                        description={isRegex ? "The regex pattern" : "The text to replace"}
                                        value={rule.find}
                                        onChange={e => onChange(e, index, "find")}
                                    />
                                    <TextRow
                                        label="Replace"
                                        description="The text to replace the found text with"
                                        value={rule.replace}
                                        onChange={e => onChange(e, index, "replace")}
                                    />
                                    <TextRow
                                        label="Only if includes"
                                        description="This rule will only be applied if the message includes this text. This is optional"
                                        value={rule.onlyIfIncludes}
                                        onChange={e => onChange(e, index, "onlyIfIncludes")}
                                    />
                                </div>
                                {isRegex && renderFindError(rule.find)}
                                <Button
                                    className={cl("delete-button")}
                                    variant="dangerPrimary"
                                    onClick={() => onClickRemove(index)}
                                >
                                    Delete Rule
                                </Button>
                            </>
                        )}
                    >
                        <Paragraph weight="medium" size="md">
                            {isEmptyRule(rule)
                                ? `Empty Rule ${index + 1}`
                                : `Rule ${index + 1} - ${rule.find}`
                            }
                        </Paragraph>
                    </ExpandableSection>
                )}
                <Button
                    onClick={() => rulesArray.push(makeEmptyRule())}
                    disabled={rulesArray.length > 0 && isEmptyRule(rulesArray[rulesArray.length - 1])}
                >
                    Add Rule
                </Button>
            </Flex>
        </>
    );
}

function TextReplaceTesting() {
    const [value, setValue] = useState("");

    return (
        <div>
            <HeadingSecondary>Rule Tester</HeadingSecondary>
            <Flex flexDirection="column" gap={6}>
                <TextInput placeholder="Type a message to test rules on" onChange={setValue} />
                <TextInput placeholder="Message with rules applied" editable={false} value={applyRules(value)} style={{ opacity: 0.7 }} />
            </Flex>
        </div>
    );
}

function applyRules(content: string): string {
    if (content.length === 0) {
        return content;
    }

    for (const rule of settings.store.stringRules) {
        if (!rule.find) continue;
        if (rule.onlyIfIncludes && !content.includes(rule.onlyIfIncludes)) continue;

        content = ` ${content} `.replaceAll(rule.find, rule.replace.replaceAll("\\n", "\n")).replace(/^\s|\s$/g, "");
    }

    for (const rule of settings.store.regexRules) {
        if (!rule.find) continue;
        if (rule.onlyIfIncludes && !content.includes(rule.onlyIfIncludes)) continue;

        try {
            const regex = stringToRegex(rule.find);
            content = content.replace(regex, rule.replace.replaceAll("\\n", "\n"));
        } catch (e) {
            new Logger("TextReplace").error(`Invalid regex: ${rule.find}`);
        }
    }

    content = content.trim();
    return content;
}

const TEXT_REPLACE_RULES_CHANNEL_ID = "1102784112584040479";

export default definePlugin({
    name: "TextReplace",
    description: "Replace text in your messages. You can find pre-made rules in the #textreplace-rules channel in Vencord's Server",
    authors: [Devs.AutumnVN, Devs.TheKodeToad],

    settings,

    start() {
        settings.store.regexRules.forEach(rule => rule.id ??= crypto.randomUUID());
        settings.store.stringRules.forEach(rule => rule.id ??= crypto.randomUUID());
    },

    onBeforeMessageSend(channelId, msg) {
        // Channel used for sharing rules, applying rules here would be messy
        if (channelId === TEXT_REPLACE_RULES_CHANNEL_ID) return;
        msg.content = applyRules(msg.content);
    }
});
