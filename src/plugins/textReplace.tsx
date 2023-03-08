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

let rules = [] as any;

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () =>
            <>
                <TextReplace />
            </>
    },
});

const TextReplace = () => {
    const [find, setFind] = useState("");
    const [replace, setReplace] = useState("");
    const [onlyIfIncludes, setOnlyIfIncludes] = useState("");
    const [error, setError] = useState("");
    const update = useForceUpdater();

    async function onClickAdd() {
        if (!find || !replace) return setError("Find and Replace must not be empty");
        rules.push({
            find,
            replace,
            onlyIfIncludes
        });
        await DataStore.set("TextReplace_rules", rules);
        setFind("");
        setReplace("");
        setOnlyIfIncludes("");
    }

    async function onClickRemove(index: number) {
        rules.splice(index, 1);
        await DataStore.set("TextReplace_rules", rules);
        update();
    }

    return (
        <>
            <table>
                <tr>
                    <td>
                        <TextInput
                            value={find}
                            onChange={
                                e => {
                                    setFind(e);
                                    setError("");
                                }
                            }
                            placeholder="Find"
                            spellCheck={false}
                        />
                    </td>
                    <td>
                        <TextInput
                            value={replace}
                            onChange={
                                e => {
                                    setReplace(e);
                                    setError("");
                                }
                            }
                            placeholder="Replace"
                            spellCheck={false}
                        />
                    </td>
                    <td>
                        <TextInput
                            value={onlyIfIncludes}
                            onChange={setOnlyIfIncludes}
                            placeholder="Only if includes"
                            spellCheck={false}
                        />
                    </td>
                    <Button
                        size={Button.Sizes.MIN}
                        onClick={onClickAdd}
                        style={{
                            background: "none",
                            bottom: "-7px",
                            marginLeft: "3px"
                        }}
                    >
                        <svg fill="#43b581" width="26px" height="26px" viewBox="2.7 3.2 26.5 27" xmlns="http://www.w3.org/2000/svg" transform="rotate(0)">
                            <path d="M15.5 29.5c-7.18 0-13-5.82-13-13s5.82-13 13-13 13 5.82 13 13-5.82 13-13 13zM21.938 15.938c0-0.552-0.448-1-1-1h-4v-4c0-0.552-0.447-1-1-1h-1c-0.553 0-1 0.448-1 1v4h-4c-0.553 0-1 0.448-1 1v1c0 0.553 0.447 1 1 1h4v4c0 0.553 0.447 1 1 1h1c0.553 0 1-0.447 1-1v-4h4c0.552 0 1-0.447 1-1v-1z" />
                        </svg>
                    </Button>
                </tr>
            </table>
            <Forms.FormText type={Forms.FormText.Types.ERROR}>{error}</Forms.FormText>
            <table>
                {
                    rules.map((rule: any, index: number) =>
                        <tr>
                            <td>
                                <TextInput
                                    value={rule.find}
                                    disabled={true}
                                    spellCheck={false}
                                />
                            </td>
                            <td>
                                <TextInput
                                    value={rule.replace}
                                    disabled={true}
                                    spellCheck={false}
                                />
                            </td>
                            <td>
                                <TextInput
                                    value={rule.onlyIfIncludes}
                                    disabled={true}
                                    spellCheck={false}
                                />
                            </td>
                            <Button
                                size={Button.Sizes.MIN}
                                onClick={() => onClickRemove(index)}
                                style={{
                                    background: "none",
                                    bottom: "-7px",
                                    marginLeft: "3px"
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

    escapeRegExp(str: string) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    async start() {
        rules = await DataStore.get("TextReplace_rules");
        this.preSend = addPreSendListener((_, msg) => {
            if (!rules) return;
            for (const rule of rules) {
                if (rule.onlyIfIncludes && !msg.content.includes(rule.onlyIfIncludes) && rule.onlyIfIncludes !== "regex") continue;
                if (rule.onlyIfIncludes === "regex") {
                    const regex = new RegExp(rule.find, "g");
                    if (!regex.test(msg.content)) continue;
                    msg.content = msg.content.replace(regex, rule.replace);
                    continue;
                }
                msg.content = msg.content.replace(new RegExp(this.escapeRegExp(rule.find), "g"), rule.replace);
            }
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
