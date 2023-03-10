/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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
import { Button, Forms, TextInput, useState } from "@webpack/common";

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
        replace: ""
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
                                <svg fill="#f04747" width="26px" height="26px" viewBox="2.7 3.2 26.5 27" xmlns="http://www.w3.org/2000/svg" transform="rotate(45)">
                                    <path d="M15.5 29.5c-7.18 0-13-5.82-13-13s5.82-13 13-13 13 5.82 13 13-5.82 13-13 13zM21.938 15.938c0-0.552-0.448-1-1-1h-4v-4c0-0.552-0.447-1-1-1h-1c-0.553 0-1 0.448-1 1v4h-4c-0.553 0-1 0.448-1 1v1c0 0.553 0.447 1 1 1h4v4c0 0.553 0.447 1 1 1h1c0.553 0 1-0.447 1-1v-4h4c0.552 0 1-0.447 1-1v-1z" />
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
                replace: ""
            });
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
                            <Button
                                size={Button.Sizes.MIN}
                                onClick={() => onClickRemoveRegex(index)}
                                style={{
                                    background: "none",
                                    bottom: "-7px"
                                }}
                            >
                                <svg fill="#f04747" width="26px" height="26px" viewBox="2.7 3.2 26.5 27" xmlns="http://www.w3.org/2000/svg" transform="rotate(45)">
                                    <path d="M15.5 29.5c-7.18 0-13-5.82-13-13s5.82-13 13-13 13 5.82 13 13-5.82 13-13 13zM21.938 15.938c0-0.552-0.448-1-1-1h-4v-4c0-0.552-0.447-1-1-1h-1c-0.553 0-1 0.448-1 1v4h-4c-0.553 0-1 0.448-1 1v1c0 0.553 0.447 1 1 1h4v4c0 0.553 0.447 1 1 1h1c0.553 0 1-0.447 1-1v-4h4c0.552 0 1-0.447 1-1v-1z" />
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
                    replace: ""
                }
            ];
            await DataStore.set("TextReplace_rulesRegex", rulesRegex);
        }
        this.preSend = addPreSendListener((_, msg) => {
            for (const rule of rulesString) {
                if (!rule.find || !rule.replace) continue;
                if (rule.onlyIfIncludes && !msg.content.includes(rule.onlyIfIncludes)) continue;
                msg.content = msg.content.replace(new RegExp(this.escapeRegex(rule.find), "g"), rule.replace);
            }
            for (const rule of rulesRegex) {
                if (!rule.find || !rule.replace) continue;
                try {
                    const regex = this.stringToRegex(rule.find);
                    msg.content = msg.content.replace(regex, rule.replace);
                } catch (e) {
                    console.error(e);
                }
            }
        });
    },

    async stop() {
        removePreSendListener(this.preSend);
    }
});
