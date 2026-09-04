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

interface Rule {
    name?: string;
    find: string;
    replace: string;
    onlyIfIncludes: string;
    id: string;
}

interface TextReplaceProps {
    title: string;
    description: string;
    rulesArray: Rule[];
    isRegex?: boolean;
}

interface RuleWithIndex {
    rule: Rule;
    index: number;
}

const makeEmptyRule: () => Rule = () => ({
    name: "",
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
        description: "Rules for replacing text using string matching."
    },
    regexRules: {
        type: OptionType.CUSTOM,
        default: makeEmptyRuleArray(),
        description: "Rules for replacing text using regular expressions."
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

function matchesRuleSearch(rule: Rule, query: string) {
    if (!query) return true;

    const normalizedQuery = query.trim().toLowerCase();
    return [rule.name ?? "", rule.find, rule.replace, rule.onlyIfIncludes]
        .some(value => value.toLowerCase().includes(normalizedQuery));
}

function normalizeRule(rule: Rule) {
    rule.name ??= "";
    rule.id ??= crypto.randomUUID();
}

function TextReplace({ title, description, rulesArray, isRegex = false }: TextReplaceProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    function onClickRemove(index: number) {
        rulesArray.splice(index, 1);
    }

    function onChange(e: string, index: number, key: string) {
        rulesArray[index][key] = e;

        // If a rule is empty after editing and is not the last rule, remove it
        if (rulesArray[index].name === "" && rulesArray[index].find === "" && rulesArray[index].replace === "" && rulesArray[index].onlyIfIncludes === "" && index !== rulesArray.length - 1) {
            rulesArray.splice(index, 1);
        }
    }

    const filteredRules = rulesArray.reduce((acc: RuleWithIndex[], rule, index) => {
        if (matchesRuleSearch(rule, searchQuery)) {
            acc.push({ rule, index });
        }

        return acc;
    }, []);

    const handleDrop = (index: number) => (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index || searchQuery) return;
        const draggedRule = rulesArray.splice(draggedIndex, 1)[0];
        rulesArray.splice(index, 0, draggedRule);
        setDraggedIndex(null);
    };

    return (
        <>
            <div>
                <HeadingSecondary>{title}</HeadingSecondary>
                <Paragraph>{description}</Paragraph>
                <TextInput
                    placeholder="Search for a rule..."
                    value={searchQuery}
                    onChange={setSearchQuery}
                />
            </div>
            <Flex flexDirection="column" style={{ gap: "0.5em", paddingBottom: "1.25em" }}>
                {!filteredRules.length && searchQuery && (
                    <Paragraph>No rules match your search criteria.</Paragraph>
                )}
                {filteredRules.map(({ rule, index }) =>
                    <div
                        key={rule.id}
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleDrop(index)}
                        style={{ opacity: draggedIndex === index ? 0.5 : 1 }}
                    >
                        <ExpandableSection
                            renderContent={() => (
                                <>
                                    <div className={cl("input-grid")}>
                                        <TextRow
                                            label="Name"
                                            description="An optional name to help you identify this rule."
                                            value={rule.name ?? ""}
                                            onChange={e => onChange(e, index, "name")}
                                        />
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
                                            description="Optionally, only apply this rule if the message includes this text."
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
                            <div
                                draggable={!searchQuery}
                                onDragStart={e => {
                                    setDraggedIndex(index);
                                    e.dataTransfer.setData("text/plain", index.toString());
                                }}
                                onDragEnd={() => setDraggedIndex(null)}
                                style={{ cursor: searchQuery ? "default" : "grab", flex: 1 }}
                            >
                                <Paragraph weight="medium" size="md">
                                    {rule.name
                                        ? rule.name
                                        : isEmptyRule(rule)
                                            ? `Empty Rule ${index + 1}`
                                            : `Rule ${index + 1} - ${rule.find}`
                                    }
                                </Paragraph>
                            </div>
                        </ExpandableSection>
                    </div>
                )}
                <Button
                    onClick={() => {
                        setSearchQuery("");
                        rulesArray.push(makeEmptyRule());
                    }}
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
    tags: ["Chat", "Customisation", "Utility"],
    authors: [Devs.AutumnVN, Devs.TheKodeToad],

    settings,

    start() {
        const { stringRules, regexRules } = settings.store;

        stringRules.forEach(normalizeRule);
        regexRules.forEach(normalizeRule);
    },

    onBeforeMessageSend(channelId, msg) {
        // Channel used for sharing rules, applying rules here would be messy
        if (channelId === TEXT_REPLACE_RULES_CHANNEL_ID) return;
        msg.content = applyRules(msg.content);
    }
});
