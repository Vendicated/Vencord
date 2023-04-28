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
import { Button, TextInput } from "@webpack/common";

let rulesString = [
    {
        find: "",
        replace: "",
        onlyIfIncludes: ""
    }
] as any;

let rulesRegex = [
    {
        find: "",
        replace: "",
        onlyIfIncludes: ""
    }
] as any;

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () =>
            <>
                <TextReplaceString />
                <TextReplaceRegex />
            </>
    },
});

const TextReplaceString = () => {
    const update = useForceUpdater();

    async function onClickRemoveString(index: number) {
        if (index === rulesString.length - 1) return;
        rulesString.splice(index, 1);
        await DataStore.set("TextReplace_rulesString", rulesString);
        update();
    }

    async function onChangeString(e: string, index: number, key: string) {
        if (index === rulesString.length - 1) {
            rulesString.push({
                find: "",
                replace: "",
                onlyIfIncludes: ""
            });
        } else if (key === "find" && e === "") {
            rulesString.splice(index, 1);
            await DataStore.set("TextReplace_rulesString", rulesString);
            update();
            return;
        }
        rulesString[index][key] = e;
        await DataStore.set("TextReplace_rulesString", rulesString);
        update();
    }

    return (
        <>
            <h2 style={{
                color: "#fff"
            }}>Using string</h2>
            <table>
                {
                    rulesString?.map((rule: any, index: number) =>
                        <tr>
                            <td>
                                <TextInput
                                    placeholder="Find"
                                    value={rule.find}
                                    onChange={e => onChangeString(e, index, "find")}
                                    spellCheck={false}
                                />
                            </td>
                            <td>
                                <TextInput
                                    placeholder="Replace"
                                    value={rule.replace}
                                    onChange={e => onChangeString(e, index, "replace")}
                                    spellCheck={false}
                                />
                            </td>
                            <td>
                                <TextInput
                                    placeholder="Only if includes"
                                    value={rule.onlyIfIncludes}
                                    onChange={e => onChangeString(e, index, "onlyIfIncludes")}
                                    spellCheck={false}
                                />
                            </td>
                            <Button
                                size={Button.Sizes.MIN}
                                onClick={() => onClickRemoveString(index)}
                                style={{
                                    background: "none",
                                    bottom: "-7px"
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path fill="#f04747" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
                                    <path fill="#f04747" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
                                </svg>
                            </Button>
                        </tr>
                    )
                }
            </table>
        </>
    );
};

const TextReplaceRegex = () => {
    const update = useForceUpdater();

    async function onClickRemoveRegex(index: number) {
        if (index === rulesRegex.length - 1) return;
        rulesRegex.splice(index, 1);
        await DataStore.set("TextReplace_rulesRegex", rulesRegex);
        update();
    }

    async function onChangeRegex(e: string, index: number, key: string) {
        if (index === rulesRegex.length - 1) {
            rulesRegex.push({
                find: "",
                replace: "",
                onlyIfIncludes: ""
            });
        } else if (key === "find" && e === "") {
            rulesRegex.splice(index, 1);
            await DataStore.set("TextReplace_rulesRegex", rulesRegex);
            update();
            return;
        }
        rulesRegex[index][key] = e;
        await DataStore.set("TextReplace_rulesRegex", rulesRegex);
        update();
    }

    return (
        <>
            <h2 style={{
                color: "#fff"
            }}>Using regex</h2>
            <table>
                {
                    rulesRegex?.map((rule: any, index: number) =>
                        <tr>
                            <td>
                                <TextInput
                                    placeholder="Find"
                                    value={rule.find}
                                    onChange={e => onChangeRegex(e, index, "find")}
                                    spellCheck={false}
                                />
                            </td>
                            <td>
                                <TextInput
                                    placeholder="Replace"
                                    value={rule.replace}
                                    onChange={e => onChangeRegex(e, index, "replace")}
                                    spellCheck={false}
                                />
                            </td>
                            <td>
                                <TextInput
                                    placeholder="Only if includes"
                                    value={rule.onlyIfIncludes}
                                    onChange={e => onChangeRegex(e, index, "onlyIfIncludes")}
                                    spellCheck={false}
                                />
                            </td>
                            <Button
                                size={Button.Sizes.MIN}
                                onClick={() => onClickRemoveRegex(index)}
                                style={{
                                    background: "none",
                                    bottom: "-7px"
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <path fill="#f04747" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path>
                                    <path fill="#f04747" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path>
                                </svg>
                            </Button>
                        </tr>
                    )
                }
            </table>
        </>
    );
};

export default definePlugin({
    name: "TextReplace",
    description: "Replace text in your messages",
    authors: [Devs.Samu, Devs.AutumnVN],
    dependencies: ["MessageEventsAPI"],

    settings,

    escapeRegex(str: string) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    stringToRegex(str: string) {
        const m = str.match(/^([/~@;%#'])(.*?)\1([gimsuy]*)$/);
        return m ? new RegExp(m[2], m[3]) : new RegExp(str);
    },

    async start() {
        rulesString = await DataStore.get("TextReplace_rulesString");
        if (!rulesString) {
            rulesString = [
                {
                    find: "",
                    replace: "",
                    onlyIfIncludes: ""
                }
            ];
            await DataStore.set("TextReplace_rulesString", rulesString);
        }
        rulesRegex = await DataStore.get("TextReplace_rulesRegex");
        if (!rulesRegex) {
            rulesRegex = [
                {
                    find: "",
                    replace: "",
                    onlyIfIncludes: ""
                }
            ];
            await DataStore.set("TextReplace_rulesRegex", rulesRegex);
        }
        this.preSend = addPreSendListener((_, msg) => {
            msg.content = " " + msg.content + " ";
            for (const rule of rulesString) {
                if (!rule.find || !rule.replace) continue;
                if (rule.onlyIfIncludes && !msg.content.includes(rule.onlyIfIncludes)) continue;
                msg.content = msg.content.replace(new RegExp(this.escapeRegex(rule.find), "g"), rule.replace);
            }
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
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
