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
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, TextInput } from "@webpack/common";

const STRING_RULES_KEY = "TextReplace_rulesString";
const REGEX_RULES_KEY = "TextReplace_rulesRegex";

type Rules = Record<"find" | "replace" | "onlyIfIncludes", string>[];

interface TextReplaceProps {
    title: string;
    rulesArray: Rules;
    rulesKey: string;
}

function TextReplace({ title, rulesArray, rulesKey }: TextReplaceProps) {
    const update = useForceUpdater();

    async function onClickRemove(index: number) {
        rulesArray.splice(index, 1);
        await DataStore.set(rulesKey, rulesArray);
        update();
    }

    async function onChange(e: string, index: number, key: string) {
        if (index === rulesArray.length - 1) {
            rulesArray.push({
                find: "",
                replace: "",
                onlyIfIncludes: ""
            });
        }
        rulesArray[index][key] = e;
        if (rulesArray[index].find === "" && rulesArray[index].replace === "" && rulesArray[index].onlyIfIncludes === "" && index !== rulesArray.length - 1) {
            rulesArray.splice(index, 1);
        }
        await DataStore.set(rulesKey, rulesArray);
        update();
    }

    return (
        <>
            <Forms.FormTitle tag="h4">{title}</Forms.FormTitle>
            <table>
                {
                    rulesArray.map((rule: any, index: number) =>
                        <tr>
                            <td>
                                <TextInput
                                    placeholder="Find"
                                    value={rule.find}
                                    onChange={e => onChange(e, index, "find")}
                                    spellCheck={false}
                                />
                            </td>
                            <td>
                                <TextInput
                                    placeholder="Replace"
                                    value={rule.replace}
                                    onChange={e => onChange(e, index, "replace")}
                                    spellCheck={false}
                                />
                            </td>
                            <td>
                                <TextInput
                                    placeholder="Only if includes"
                                    value={rule.onlyIfIncludes}
                                    onChange={e => onChange(e, index, "onlyIfIncludes")}
                                    spellCheck={false}
                                />
                            </td>
                            {
                                index !== rulesArray.length - 1 &&
                                <Button
                                    size={Button.Sizes.MIN}
                                    onClick={() => onClickRemove(index)}
                                    style={{
                                        background: "none",
                                        bottom: "-7px"
                                    }}
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24">
                                        <title>Delete Rule</title>
                                        <path fill="var(--status-danger)" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
                                        <path fill="var(--status-danger)" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
                                    </svg>
                                </Button>
                            }
                        </tr>
                    )
                }
            </table>
        </>
    );
}

let rulesString = [
    {
        find: "",
        replace: "",
        onlyIfIncludes: ""
    }
] as Rules;

let rulesRegex = [
    {
        find: "",
        replace: "",
        onlyIfIncludes: ""
    }
] as Rules;

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () =>
            <>
                <TextReplace title="Using String" rulesArray={rulesString} rulesKey={STRING_RULES_KEY} />
                <TextReplace title="Using Regex" rulesArray={rulesRegex} rulesKey={REGEX_RULES_KEY} />
            </>
    },
});

export default definePlugin({
    name: "TextReplace",
    description: "Replace text in your messages",
    authors: [Devs.Samu, Devs.AutumnVN],
    dependencies: ["MessageEventsAPI"],

    settings,

    stringToRegex(str: string) { // Convert string to regex
        const match = str.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/); // Regex to match regex
        return match ?
            new RegExp(
                match[2], // Pattern
                match[3] // Flags
                    .split("") // Remove duplicate flags
                    .filter((char, pos, flagArr) => flagArr.indexOf(char) === pos)
                    .join("")) :
            new RegExp(str); // Not a regex, return string
    },

    async start() {
        rulesString = await DataStore.get(STRING_RULES_KEY) ?? [
            {
                find: "",
                replace: "",
                onlyIfIncludes: ""
            }
        ];
        rulesRegex = await DataStore.get(REGEX_RULES_KEY) ?? [
            {
                find: "",
                replace: "",
                onlyIfIncludes: ""
            }
        ];
        this.preSend = addPreSendListener((_, msg) => {
            msg.content = " " + msg.content + " ";
            if (rulesString) {
                for (const rule of rulesString) {
                    if (!rule.find || !rule.replace) continue;
                    if (rule.onlyIfIncludes && !msg.content.includes(rule.onlyIfIncludes)) continue;
                    msg.content = msg.content.replaceAll(rule.find, rule.replace);
                }
            }
            if (rulesRegex) {
                for (const rule of rulesRegex) {
                    if (!rule.find || !rule.replace) continue;
                    if (rule.onlyIfIncludes && !msg.content.includes(rule.onlyIfIncludes)) continue;
                    try {
                        const regex = this.stringToRegex(rule.find);
                        msg.content = msg.content.replace(regex, rule.replace);
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
