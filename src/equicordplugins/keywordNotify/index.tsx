/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, camila314, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, TextInput, UserStore, UserUtils, useState } from "@webpack/common";
import { User } from "discord-types/general";

let regexes: string[] = [];
let me: User | null = null;

async function setRegexes(idx: number, reg: string) {
    regexes[idx] = reg;
    await DataStore.set("KeywordNotify_rules", regexes);
}

async function removeRegex(idx: number, updater: () => void) {
    regexes.splice(idx, 1);
    await DataStore.set("KeywordNotify_rules", regexes);
    updater();
}

async function addRegex(updater: () => void) {
    regexes.push("");
    await DataStore.set("KeywordNotify_rules", regexes);
    updater();
}

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const update = useForceUpdater();
            const [values, setValues] = useState(regexes);

            const elements = regexes.map((a, i) => {
                const setValue = (v: string) => {
                    const valuesCopy = [...values];
                    valuesCopy[i] = v;
                    setValues(valuesCopy);
                };

                return (
                    <>
                        <Forms.FormTitle tag="h4">Keyword Regex {i + 1}</Forms.FormTitle>

                        <Flex flexDirection="row">
                            <div style={{ flexGrow: 1 }}>
                                <TextInput
                                    placeholder={"example|regex"}
                                    spellCheck={false}
                                    value={values[i]}
                                    onChange={setValue}
                                    onBlur={() => setRegexes(i, values[i])}
                                />
                            </div>

                            <Button
                                onClick={() => removeRegex(i, update)}
                                look={Button.Looks.BLANK}
                                size={Button.Sizes.ICON}
                                className="keywordnotify-delete">
                                <DeleteIcon />
                            </Button>
                        </Flex>
                    </>
                );
            });

            return (
                <>
                    {elements}
                    <div><Button onClick={() => addRegex(update)}>Add Regex</Button></div>
                </>
            );
        }
    },
});

export default definePlugin({
    name: "KeywordNotify",
    authors: [Devs.camila314],
    description: "Sends a notification if a given message matches certain keywords or regexes",
    settings,
    patches: [
        {
            find: "}_dispatch(",
            replacement: {
                match: /}_dispatch\((.{1,2}),.{1,2}\){/,
                replace: "$&$1=$self.modify($1);"
            }
        }
    ],

    async start() {
        regexes = await DataStore.get("KeywordNotify_rules") ?? [];
        me = await UserUtils.getUser(UserStore.getCurrentUser().id);
    },

    applyRegexes(m) {
        if (regexes.some(r => m.content.match(new RegExp(r)))) {
            m.mentions.push(me);
        }
    },

    modify(e) {
        if (e.type === "MESSAGE_CREATE") {
            this.applyRegexes(e.message);
        } else if (e.type === "LOAD_MESSAGES_SUCCESS") {
            for (let msg = 0; msg < e.messages.length; ++msg) {
                this.applyRegexes(e.messages[msg]);
            }
        }
        return e;
    }
});
