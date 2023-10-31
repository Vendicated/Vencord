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
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { ModalSize } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, TextInput, useState } from "@webpack/common";

const STRING_RULES_KEY = "TextReplace_rulesString";
const REGEX_RULES_KEY = "TextReplace_rulesRegex";
const TEXT_REPLACE_KEY = "TextReplace";

type Rule = Record<"find" | "replace" | "onlyIfIncludes", string> & Record<"isRegex", boolean>;

const makeEmptyRule: () => Rule = () => ({
    find: "",
    replace: "",
    onlyIfIncludes: "",
    isRegex: false
});
const makeEmptyRuleArray = () => [makeEmptyRule()];

let textReplaceRules = makeEmptyRuleArray();

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const update = useForceUpdater();
            return (
                <>
                    <TextReplace update={update} />
                    <TextReplaceTesting />
                </>
            );
        }
    },
});

function stringToRegex(str: string) {
    const match = str.match(/^(\/)?(.+?)(?:\/([gimsuy]*))?$/); // Regex to match regex
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
            <span style={{ color: "var(--text-danger)" }}>
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
            maxLength={2000}
            onBlur={() => value !== initialValue && onChange(value)}
        />
    );
}

function TextReplace({ update }: { update: () => void; }) {

    async function onClickRemove(index: number) {
        if (index === textReplaceRules.length - 1) return;
        textReplaceRules.splice(index, 1);

        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update();
    }

    async function onChange(e: string, index: number, key: string) {
        if (index === textReplaceRules.length - 1)
            textReplaceRules.push(makeEmptyRule());

        textReplaceRules[index][key] = e;

        if (textReplaceRules[index].find === "" && textReplaceRules[index].replace === "" && textReplaceRules[index].onlyIfIncludes === "" && index !== textReplaceRules.length - 1)
            textReplaceRules.splice(index, 1);

        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update();
    }

    async function onCheck(checked: boolean, index: number) {
        textReplaceRules[index].isRegex = checked;
        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update();
    }

    return (
        <>
            <Forms.FormTitle tag="h5" style={{ position: "absolute", right: "30px", marginTop: "-20px" }}>IS REGEX</Forms.FormTitle >
            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {
                    textReplaceRules.map((rule, i) => {
                        return (
                            <React.Fragment key={i}>
                                <Flex flexDirection="row" style={{ gap: 0 }}>
                                    <Flex flexDirection="row" style={{ flexGrow: 1, gap: "0.5em" }}>
                                        <Input
                                            placeholder="Find"
                                            initialValue={rule.find}
                                            onChange={e => onChange(e, i, "find")}
                                        />
                                        <Input
                                            placeholder="Replace"
                                            initialValue={rule.replace}
                                            onChange={e => onChange(e, i, "replace")}
                                        />
                                        <Input
                                            placeholder="Only if includes"
                                            initialValue={rule.onlyIfIncludes}
                                            onChange={e => onChange(e, i, "onlyIfIncludes")}
                                        />
                                    </Flex>
                                    <input
                                        type="checkbox"
                                        style={{ height: "32px", width: "32px" }}
                                        checked={rule.isRegex}
                                        onChange={e => onCheck(e.target.checked, i)}
                                    />
                                    <Button
                                        size={Button.Sizes.MIN}
                                        onClick={() => onClickRemove(i)}
                                        style={{
                                            background: "none",
                                            color: "var(--status-danger)",
                                            ...(i === textReplaceRules.length - 1
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
                                {rule.isRegex && renderFindError(rule.find)}
                            </React.Fragment>
                        );
                    })
                }
            </Flex>
        </>
    );
}

function TextReplaceTesting() {
    const [value, setValue] = useState("");
    return (
        <>
            <Forms.FormTitle tag="h4">Test Rules</Forms.FormTitle>
            <TextInput placeholder="Type a message" onChange={setValue} />
            <TextInput placeholder="Message with rules applied" editable={false} value={applyRules(value)} />
        </>
    );
}

function applyRules(content: string): string {
    if (content.length === 0)
        return content;

    for (const rule of textReplaceRules) {
        if (!rule.find) continue;
        if (rule.onlyIfIncludes && !content.includes(rule.onlyIfIncludes)) continue;

        if (rule.isRegex) {
            try {
                const regex = stringToRegex(rule.find);
                content = content.replace(regex, rule.replace.replaceAll("\\n", "\n"));
            } catch (e) {
                new Logger("TextReplace").error(`Invalid regex: ${rule.find}`);
            }
        } else {
            content = ` ${content} `.replaceAll(rule.find, rule.replace.replaceAll("\\n", "\n")).replace(/^\s|\s$/g, "");
        }
    }

    return content;
}

const TEXT_REPLACE_RULES_CHANNEL_ID = "1102784112584040479";

export default definePlugin({
    name: "TextReplace",
    description: "Replace text in your messages. You can find pre-made rules in the #textreplace-rules channel in Vencord's Server",
    authors: [Devs.AutumnVN, Devs.TheKodeToad],
    dependencies: ["MessageEventsAPI"],
    modalSize: ModalSize.DYNAMIC,

    settings,

    async start() {
        textReplaceRules = await DataStore.get(TEXT_REPLACE_KEY) ?? makeEmptyRuleArray();

        // Move old rules to mew rules
        const oldStringRules = await DataStore.get(STRING_RULES_KEY);
        const oldRegexRules = await DataStore.get(REGEX_RULES_KEY);

        if (oldStringRules) {
            for (const rule of oldStringRules) {
                textReplaceRules.push({
                    find: rule.find,
                    replace: rule.replace,
                    onlyIfIncludes: rule.onlyIfIncludes,
                    isRegex: false
                });
            }
            await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
            await DataStore.del(STRING_RULES_KEY);
        }

        if (oldRegexRules) {
            for (const rule of oldRegexRules) {
                textReplaceRules.push({
                    find: rule.find,
                    replace: rule.replace,
                    onlyIfIncludes: rule.onlyIfIncludes,
                    isRegex: true
                });
            }
            await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
            await DataStore.del(REGEX_RULES_KEY);
        }

        this.preSend = addPreSendListener((channelId, msg) => {
            // Channel used for sharing rules, applying rules here would be messy
            if (channelId === TEXT_REPLACE_RULES_CHANNEL_ID) return;
            msg.content = applyRules(msg.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
