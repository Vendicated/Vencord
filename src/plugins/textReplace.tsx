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

import { addPreSendListener, MessageObject, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, TextInput } from "@webpack/common";

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () =>
            <>
                <table>
                    <tr>
                        <td>
                            <TextInput
                                placeholder="Find"
                                value={settings.store.find}
                                onChange={e => {
                                    settings.store.find = e;
                                    settings.store.showError = false;
                                }}
                                spellCheck={false}
                            />
                        </td>
                        <td>
                            <TextInput
                                placeholder="Replace to"
                                value={settings.store.replace}
                                onChange={e => {
                                    settings.store.replace = e;
                                    settings.store.showError = false;
                                }}
                                spellCheck={false}
                            />
                        </td>
                        <td>
                            <TextInput
                                placeholder="Only if includes"
                                value={settings.store.onlyIfIncludes}
                                onChange={e => {
                                    settings.store.onlyIfIncludes = e;
                                    settings.store.showError = false;
                                }}
                                spellCheck={false}
                            />
                        </td>
                        <Button
                            color={Button.Colors.GREEN}
                            size={Button.Sizes.MIN}
                            onClick={() => {
                                if (!settings.store.rules) settings.store.rules = [];
                                if (settings.store.find && settings.store.replace) {
                                    settings.store.rules.push({
                                        find: settings.store.find,
                                        replace: settings.store.replace,
                                        onlyIfIncludes: settings.store.onlyIfIncludes
                                    });
                                    settings.store.find = "";
                                    settings.store.replace = "";
                                    settings.store.onlyIfIncludes = "";
                                } else {
                                    settings.store.showError = true;
                                }
                            }}
                            style={{
                                borderRadius: "50%",
                                padding: "9px 7px 9px",
                                marginLeft: "4px"
                            }}
                        >
                            ➕
                        </Button>
                    </tr>
                </table>
                {
                    (settings.store.showError) && (
                        <Forms.FormText type={Forms.FormText.Types.ERROR}>
                            "Find" and "Replace to" must not be empty
                        </Forms.FormText>
                    )
                }
                <table>
                    {settings.store.rules && settings.store.rules.map((rule, index) => (
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
                            <td>
                                <Button
                                    color={Button.Colors.RED}
                                    size={Button.Sizes.MIN}
                                    onClick={() => {
                                        settings.store.rules.splice(index, 1);
                                        // This is to force update the table after deleting a rule
                                        settings.store.owo = "owo";
                                        settings.store.owo = "uwu";
                                    }}
                                    style={{
                                        borderRadius: "50%",
                                        padding: "9px 7px 9px",
                                        marginLeft: "4px"
                                    }}
                                >
                                    ❌
                                </Button>
                            </td>
                        </tr>
                    ))}
                </table>
            </>
    },
});

export default definePlugin({
    name: "TextReplace",
    description: "Replace text in your messages",
    authors: [Devs.Samu, Devs.AutumnVN],
    dependencies: ["MessageEventsAPI"],

    settings,

    escapeRegExp(str: string) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },

    replaceText(msg: MessageObject) {
        if (settings.store.rules) {
            for (const rule of settings.store.rules) {
                if (rule.onlyIfIncludes && !msg.content.includes(rule.onlyIfIncludes) && rule.onlyIfIncludes !== "regex") continue;
                if (rule.onlyIfIncludes === "regex") {
                    const regex = new RegExp(rule.find, "g");
                    if (!regex.test(msg.content)) continue;
                    msg.content = msg.content.replace(regex, rule.replace);
                    continue;
                }
                msg.content = msg.content.replace(new RegExp(this.escapeRegExp(rule.find), "g"), rule.replace);
            }
        }
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.replaceText(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
