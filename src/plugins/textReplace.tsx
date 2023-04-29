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

import { DataStore } from "@api/index";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import { useForceUpdater } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, TextInput } from "@webpack/common";

const STRING_RULES_KEY = "TextReplace_rulesString";
const REGEX_RULES_KEY = "TextReplace_rulesRegex";

type Rule = Record<"find" | "replace" | "onlyIfIncludes", string>;

interface TextReplaceProps {
    title: string;
    rulesArray: Rule[];
    rulesKey: string;
}

const makeEmptyRule: () => Rule = () => ({
    find: "",
    replace: "",
    onlyIfIncludes: ""
});
const makeEmptyRuleArray = () => [makeEmptyRule()];

let stringRules = makeEmptyRuleArray();
let regexRules = makeEmptyRuleArray();

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () =>
            <>
                <TextReplace
                    title="Using String"
                    rulesArray={stringRules}
                    rulesKey={STRING_RULES_KEY}
                />
                <TextReplace
                    title="Using Regex"
                    rulesArray={regexRules}
                    rulesKey={REGEX_RULES_KEY}
                />
            </>
    },
});

function stringToRegex(str: string) {
    const match = str.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/); // Regex to match regex
    return match
        ? new RegExp(
            match[2], // Pattern
            match[3] // Flags
                .split("") // Remove duplicate flags
                .filter((char, pos, flagArr) => flagArr.indexOf(char) === pos)
                .join(""))
        : new RegExp(str); // Not a regex, return string
}

function renderFindError(find: string) {
    try {
        stringToRegex(find);
        return null;
    } catch (e) {
        return (
            <span style={{ color: "var(--text-danger)" }}>
                {String(e)}
            </span>
        );
    }
}

function TextReplace({ title, rulesArray, rulesKey }: TextReplaceProps) {
    const isRegexRules = title === "Using Regex";

    const update = useForceUpdater();

    async function onClickRemove(index: number) {
        rulesArray.splice(index, 1);

        await DataStore.set(rulesKey, rulesArray);
        update();
    }

    async function onChange(e: string, index: number, key: string) {
        if (index === rulesArray.length - 1)
            rulesArray.push(makeEmptyRule());

        rulesArray[index][key] = e;

        if (rulesArray[index].find === "" && rulesArray[index].replace === "" && rulesArray[index].onlyIfIncludes === "" && index !== rulesArray.length - 1)
            rulesArray.splice(index, 1);

        await DataStore.set(rulesKey, rulesArray);
        update();
    }

    return (
        <>
            <Forms.FormTitle tag="h4">{title}</Forms.FormTitle>
            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {
                    rulesArray.map((rule, index) =>
                        <>
                            <Flex flexDirection="row" style={{ gap: 0 }}>
                                <Flex flexDirection="row" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <TextInput
                                        placeholder="Find"
                                        value={rule.find}
                                        onChange={e => onChange(e, index, "find")}
                                        spellCheck={false}
                                    />
                                    <TextInput
                                        placeholder="Replace"
                                        value={rule.replace}
                                        onChange={e => onChange(e, index, "replace")}
                                        spellCheck={false}
                                    />
                                    <TextInput
                                        placeholder="Only if includes"
                                        value={rule.onlyIfIncludes}
                                        onChange={e => onChange(e, index, "onlyIfIncludes")}
                                        spellCheck={false}
                                    />
                                </Flex>

                                {
                                    <Button
                                        size={Button.Sizes.MIN}
                                        onClick={() => onClickRemove(index)}
                                        style={{
                                            background: "none",
                                            ...(index === rulesArray.length - 1
                                                ? {
                                                    visibility: "hidden",
                                                    pointerEvents: "none"
                                                }
                                                : {}
                                            )
                                        }}
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24">
                                            <title>Delete Rule</title>
                                            <path fill="var(--status-danger)" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z" />
                                            <path fill="var(--status-danger)" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z" />
                                        </svg>
                                    </Button>

                                }
                            </Flex>
                            {isRegexRules && renderFindError(rule.find)}
                        </>
                    )
                }
            </Flex>
        </>
    );
}

export default definePlugin({
    name: "TextReplace",
    description: "Replace text in your messages",
    authors: [Devs.Samu, Devs.AutumnVN],
    dependencies: ["MessageEventsAPI"],

    settings,

    async start() {
        stringRules = await DataStore.get(STRING_RULES_KEY) ?? makeEmptyRuleArray();
        regexRules = await DataStore.get(REGEX_RULES_KEY) ?? makeEmptyRuleArray();

        this.preSend = addPreSendListener((_, msg) => {
            // pad so that rules can use " word " to only match whole "word"
            msg.content = " " + msg.content + " ";

            if (stringRules) {
                for (const rule of stringRules) {
                    if (!rule.find || !rule.replace) continue;
                    if (rule.onlyIfIncludes && !msg.content.includes(rule.onlyIfIncludes)) continue;

                    msg.content = msg.content.replaceAll(rule.find, rule.replace);
                }
            }

            if (regexRules) {
                for (const rule of regexRules) {
                    if (!rule.find || !rule.replace) continue;
                    if (rule.onlyIfIncludes && !msg.content.includes(rule.onlyIfIncludes)) continue;

                    try {
                        const regex = stringToRegex(rule.find);
                        msg.content = msg.content.replace(regex, rule.replace);
                    } catch (e) {
                        new Logger("TextReplace").error(`Invalid regex: ${rule.find}`);
                    }
                }
            }
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
