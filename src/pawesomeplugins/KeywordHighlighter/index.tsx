/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, TextInput, Tooltip, useEffect, useState } from "@webpack/common";
import { FunctionComponent } from "react";

import { CustomKeywords, GenericKeywords, ToneKeywords, setKeywords } from "./keywords";

let combinedKeywords = { ...CustomKeywords }

// Credit to the makers of the plugin "TextReplace" for the following code. - This is a modified version of the original code.

export const KEYWORD_KEY_STRING = "KeywordHighlighter_customKeywords";

type Rule = Record<"abbreviation" | "tooltip", string>;

interface KeywordHighligherProps {
    title: string;
    keywordsMap: Map<number, Rule>;
    keywordsKey: string;
    update: () => void;
}

const makeEmptyKeyword: () => Rule = () => ({
    abbreviation: "",
    tooltip: "",
});

const makeEmptyKeywordsMap = () => new Map<number, Rule>().set(0, makeEmptyKeyword());

const keywordsMap = makeEmptyKeywordsMap();

export const setKeywordsList = () => {
    let keywords = { ...CustomKeywords }
    if(settings.store.toneKeywords) keywords = { ...keywords, ...ToneKeywords }
    if(settings.store.genericKeywords) keywords =  {...keywords, ...GenericKeywords }

    combinedKeywords = keywords
}

const settings = definePluginSettings({
    genericKeywords: {
        type: OptionType.BOOLEAN,
        description: "Highlight keywords  like brb, gtg, lol, etc.",
        onChange: setKeywordsList
    },
    toneKeywords: {
        type: OptionType.BOOLEAN,
        description: "Highlight keywords for tones like /j, /srs, etc.",
        onChange: setKeywordsList
    },
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const update = useForceUpdater();
            return (
                <>
                    <KeywordHighligher
                        title="Add Custom Keyword Indicators"
                        keywordsMap={keywordsMap}
                        keywordsKey={KEYWORD_KEY_STRING}
                        update={update}
                    />
                </>
            );
        }
    }
});

enum Placeholders {
    ABBREVIATION = "Abbreviation",
    TOOLTIP = "Tooltip",
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
            onChange={e => { setValue(e); }}
            spellCheck={false}
            onBlur={() => value !== initialValue && onChange(value)}
        />
    );
}


function KeywordHighligher({ title, keywordsMap, keywordsKey, update }: KeywordHighligherProps) { // why is it buggin
    const [rulesArray, setRulesArray] = useState<Array<Rule>>([]);

    // Fetch data from DataStore and initialize rulesArray when the component mounts
    useEffect(() => {
        const fetchData = async () => {
            const storedData = await DataStore.get(keywordsKey);
            if (storedData) {
                setRulesArray(storedData);
            } else {
                setRulesArray(Array.from(keywordsMap.values()));
            }
        };
        fetchData();
    }, [keywordsKey, keywordsMap]);

    async function onClickRemove(index: number) {
        if (index === rulesArray.length - 1) return;
        const updatedRulesArray = [...rulesArray];
        updatedRulesArray.splice(index, 1);

        await DataStore.set(keywordsKey, updatedRulesArray);
        setKeywords();

        setRulesArray(updatedRulesArray);
        update();
    }

    async function onChange(e: string, index: number, key: keyof Rule) {
        const updatedRulesArray = [...rulesArray];

        if (index === updatedRulesArray.length - 1)
            updatedRulesArray.push(makeEmptyKeyword());

        updatedRulesArray[index][key] = e;

        if (updatedRulesArray[index].abbreviation === "" && updatedRulesArray[index].tooltip === "" && index !== updatedRulesArray.length - 1)
            updatedRulesArray.splice(index, 1);

        await DataStore.set(keywordsKey, updatedRulesArray);
        setKeywords();

        setRulesArray(updatedRulesArray);
        update();
    }

    return (
        <>
            <Forms.FormTitle tag="h4">{title}</Forms.FormTitle>
            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {
                    rulesArray.map((rule, index) =>
                        <React.Fragment key={`${rule.abbreviation}-${index}`}>
                            <Flex flexDirection="row" style={{ gap: 0 }}>
                                <Flex flexDirection="row" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <Input
                                        placeholder={Placeholders.ABBREVIATION}
                                        initialValue={rule.abbreviation.replace(/^\//, "")}
                                        onChange={e => {
                                            const value = e.replace(/^\//, "");
                                            onChange(value, index, "abbreviation");
                                        }}
                                    />
                                    <Input
                                        placeholder={Placeholders.TOOLTIP}
                                        initialValue={rule.tooltip}
                                        onChange={e => onChange(e, index, "tooltip")}
                                    />
                                </Flex>
                                <Button
                                    size={Button.Sizes.MIN}
                                    onClick={() => onClickRemove(index)}
                                    style={{
                                        background: "none",
                                        color: "var(--status-danger)",
                                        ...(index === rulesArray.length - 1
                                            ? {
                                                visibility: "hidden",
                                                pointerEvents: "none"
                                            }
                                            : {}
                                        )
                                    }}
                                >
                                    <DeleteIcon />
                                </Button>
                            </Flex>
                        </React.Fragment>
                    )
                }
            </Flex>
        </>
    );
}


interface Context {
    inline: boolean;
    allowLinks: boolean;
    allowEmojiLinks: boolean;
    channelId: string;
    messageId: string;
    mentionChannels: string[];
    isInteracting: boolean;
    formatInline: boolean;
    noStyleAndInteraction: boolean;
    allowHeading: boolean;
    allowList: boolean;
    previewLinkTarget: boolean;
    disableAnimatedEmoji: boolean;
    disableAutoBlockNewlines: boolean;
    muted: boolean;
    prevCapture: string[];
}

interface MarkdownRule {
    order: number,
    match: (str: string) => RegExpExecArray | null,
    parse: (match: RegExpExecArray, nestedParse: this["parse"], context: Context) => any,
    react?: FunctionComponent, // (props, Function, Context)
    requiredFirstCharacters?: string[],
}

type Rules = { [key: string]: MarkdownRule; };


function getKeywordDescription(indicator: string) {
    return combinedKeywords[indicator];
}

const customRules: Rules = {
    keywordHighlight: {
        order: 25,
        match: e => (/^[\S]+\s|^[\S]+/.exec(e)),
        parse: (match, nestedParse, context) => {
            const trimmed = match[0].trim();
            if (Object.keys(combinedKeywords).some(keyword => keyword === trimmed)) {
                return [
                    {
                        type: "keywordHighlight",
                        content: trimmed,
                    },
                    ...(trimmed[trimmed.length - 1] !== match[match.length - 1] ? [{
                        type: "text",
                        content: " ",
                        originalMatch: match,
                    }] : []),
                ];
            }

            return {
                type: "text",
                content: match[0],
                originalMatch: match,
            };
        },
        react: function (props: any) {
            const { content } = props;
            return (
                <Tooltip text={getKeywordDescription(content)}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <span
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            style={{
                                backgroundColor: "var(--background-modifier-selected)",
                                borderRadius: 3,
                                padding: "0 2px",
                            }}>
                            {content}
                        </span>
                    )}
                </Tooltip>
            );
        }
    }
};

export default definePlugin({
    name: "KeywordHighlighter",
    description: "Adds tooltips for keywords",
    authors: [
        Devs.Moxxie,
        Devs.Ethan,
        Devs.Fres
    ],

    settings,

    patches: [
        {
            find: "{RULES:",
            replacement: {
                match: /{RULES:(.{1,5}),/,
                replace: "{RULES:$self.patchRules($1),"
            }
        },
        {
            find: 'type:"verbatim"',
            replacement: {
                match: /type:"skip"},/,
                replace: "$&...$self.getSlateRules(),",
            }
        }
    ],

    start: () => {
        setKeywords()
        setKeywordsList()
    },

    // Slate is the Chat Input, we give all of our custom rules a "skip" type because we don't want to parse our custom rules in the chat input
    getSlateRules: () => {
        return Object.fromEntries(Object.keys(customRules).map(k => [k, { type: "skip" }]));
    },
    patchRules: (rules: Rules) => {
        for (const rule in customRules) {
            rules[rule] = customRules[rule];
        }
        return rules;
    }

});
