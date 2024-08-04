/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, camila314, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { DataStore } from "@api/index";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Forms, NavigationRouter, Select, Switch, TextInput, useState } from "@webpack/common";
import { Message } from "discord-types/general/index.js";

type KeywordEntry = { regex: string, listIds: Array<string>, listType: ListType, ignoreCase: boolean; };

let keywordEntries: Array<KeywordEntry> = [];

const KEYWORD_ENTRIES_KEY = "KeywordNotify_keywordEntries";

const cl = classNameFactory("vc-keywordnotify-");

async function addKeywordEntry(forceUpdate: () => void) {
    keywordEntries.push({ regex: "", listIds: [], listType: ListType.BlackList, ignoreCase: false });
    await DataStore.set(KEYWORD_ENTRIES_KEY, keywordEntries);
    forceUpdate();
}

async function removeKeywordEntry(idx: number, forceUpdate: () => void) {
    keywordEntries.splice(idx, 1);
    await DataStore.set(KEYWORD_ENTRIES_KEY, keywordEntries);
    forceUpdate();
}

function safeMatchesRegex(str: string, regex: string, flags: string) {
    try {
        return str.match(new RegExp(regex, flags));
    } catch {
        return false;
    }
}

enum ListType {
    BlackList = "BlackList",
    Whitelist = "Whitelist"
}

function Collapsible({ title, children }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                look={Button.Looks.BLANK}
                size={Button.Sizes.ICON}
                className={cl("collapsible")}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ marginLeft: "auto", color: "var(--text-muted)", paddingRight: "5px" }}>{isOpen ? "▼" : "▶"}</div>
                    <Forms.FormTitle tag="h4">{title}</Forms.FormTitle>
                </div>
            </Button>
            {isOpen && children}
        </div>
    );
}

function ListedIds({ listIds, setListIds }) {
    const update = useForceUpdater();
    const [values] = useState(listIds);

    async function onChange(e: string, index: number) {
        values[index] = e;
        setListIds(values);
        update();
    }

    const elements = values.map((currentValue: string, index: number) => {
        return (
            <Flex flexDirection="row" style={{ marginBottom: "5px" }}>
                <div style={{ flexGrow: 1 }}>
                    <TextInput
                        placeholder="ID"
                        spellCheck={false}
                        value={currentValue}
                        onChange={e => onChange(e, index)}
                    />
                </div>
                <Button
                    onClick={() => {
                        values.splice(index, 1);
                        setListIds(values);
                        update();
                    }}
                    look={Button.Looks.BLANK}
                    size={Button.Sizes.ICON}
                    className={cl("delete")}>
                    <DeleteIcon />
                </Button>
            </Flex>
        );
    });

    return (
        <>
            {elements}
        </>
    );
}

function ListTypeSelector({ listType, setListType }) {
    return (
        <Select
            options={[
                { label: "Whitelist", value: ListType.Whitelist },
                { label: "Blacklist", value: ListType.BlackList }
            ]}
            placeholder={"Select a list type"}
            isSelected={v => v === listType}
            closeOnSelect={true}
            select={setListType}
            serialize={v => v}
        />
    );
}


function KeywordEntries() {
    const update = useForceUpdater();
    const [values] = useState(keywordEntries);

    async function setRegex(index: number, value: string) {
        keywordEntries[index].regex = value;
        await DataStore.set(KEYWORD_ENTRIES_KEY, keywordEntries);
        update();
    }

    async function setListType(index: number, value: ListType) {
        keywordEntries[index].listType = value;
        await DataStore.set(KEYWORD_ENTRIES_KEY, keywordEntries);
        update();
    }

    async function setListIds(index: number, value: Array<string>) {
        keywordEntries[index].listIds = value ?? [];
        await DataStore.set(KEYWORD_ENTRIES_KEY, keywordEntries);
        update();
    }

    const elements = keywordEntries.map((entry, i) => {
        return (
            <>
                <Collapsible title={`Keyword Entry ${i + 1}`}>
                    <Flex flexDirection="row">
                        <div style={{ flexGrow: 1 }}>
                            <TextInput
                                placeholder="example|regex"
                                spellCheck={false}
                                value={values[i].regex}
                                onChange={e => setRegex(i, e)}
                            />
                        </div>
                        <Button
                            onClick={() => removeKeywordEntry(i, update)}
                            look={Button.Looks.BLANK}
                            size={Button.Sizes.ICON}
                            className={cl("delete")}>
                            <DeleteIcon />
                        </Button>
                    </Flex>
                    <Switch
                        value={values[i].ignoreCase}
                        onChange={() => {
                            values[i].ignoreCase = !values[i].ignoreCase;
                            update();
                        }}
                        style={{ marginTop: "0.5em", marginRight: "40px" }}
                    >
                        Ignore Case
                    </Switch>
                    <Forms.FormDivider className={[Margins.top8, Margins.bottom8].join(" ")} />
                    <Forms.FormTitle tag="h5">Whitelist/Blacklist</Forms.FormTitle>
                    <Flex flexDirection="row">
                        <div style={{ flexGrow: 1 }}>
                            <ListedIds listIds={values[i].listIds} setListIds={e => setListIds(i, e)} />
                        </div>
                    </Flex>
                    <div className={[Margins.top8, Margins.bottom8].join(" ")} />
                    <Flex flexDirection="row">
                        <Button onClick={() => {
                            values[i].listIds.push("");
                            update();
                        }}>Add ID</Button>
                        <div style={{ flexGrow: 1 }}>
                            <ListTypeSelector listType={values[i].listType} setListType={e => setListType(i, e)} />
                        </div>
                    </Flex>
                </Collapsible>
            </>
        );
    });

    return (
        <>
            {elements}
            <div><Button onClick={() => addKeywordEntry(update)}>Add Keyword Entry</Button></div>
        </>
    );
}

const settings = definePluginSettings({
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Ignore messages from bots",
        default: true
    },
    keywords: {
        type: OptionType.COMPONENT,
        description: "Keywords to detect",
        component: () => <KeywordEntries />
    }
});

export default definePlugin({
    name: "KeywordNotify",
    authors: [EquicordDevs.camila314, EquicordDevs.thororen],
    description: "Sends a notification if a given message matches certain keywords or regexes",
    settings,
    patches: [
        {
            find: "Dispatch.dispatch(...) called without an action type",
            replacement: {
                match: /}_dispatch\((\i),\i\){/,
                replace: "$&$1=$self.modify($1);"
            }
        }
    ],

    async start() {
        keywordEntries = await DataStore.get(KEYWORD_ENTRIES_KEY) ?? [];
    },

    applyKeywordEntries(m: Message) {
        let matches = false;
        let match = "";

        for (const entry of keywordEntries) {
            if (entry.regex === "") {
                return;
            }

            let listed = entry.listIds.some(id => id === m.channel_id || id === m.author.id);
            if (!listed) {
                const channel = ChannelStore.getChannel(m.channel_id);
                if (channel != null) {
                    listed = entry.listIds.some(id => id === channel.guild_id);
                }
            }

            const whitelistMode = entry.listType === ListType.Whitelist;

            if (!whitelistMode && listed) {
                return;
            }
            if (whitelistMode && !listed) {
                return;
            }

            if (settings.store.ignoreBots && m.author.bot && (!whitelistMode || !entry.listIds.includes(m.author.id))) {
                return;
            }

            const flags = entry.ignoreCase ? "i" : "";
            if (safeMatchesRegex(m.content, entry.regex, flags)) {
                matches = true;
                match = m.content;
            }

            for (const embed of m.embeds as any) {
                if (safeMatchesRegex(embed.description, entry.regex, flags) || safeMatchesRegex(embed.title, entry.regex, flags)) {
                    matches = true;
                    match = m.content;
                } else if (embed.fields != null) {
                    for (const field of embed.fields as Array<{ name: string, value: string; }>) {
                        if (safeMatchesRegex(field.value, entry.regex, flags) || safeMatchesRegex(field.name, entry.regex, flags)) {
                            matches = true;
                            match = m.content;
                        }
                    }
                }
            }
        }

        if (matches) {
            showNotification({
                title: "Keyword Notify",
                body: `${m.author.username} matched the keyword ${match}`,
                onClick: () => NavigationRouter.transitionTo(`/channels/${ChannelStore.getChannel(m.channel_id)?.guild_id ?? "@me"}/${m.channel_id}${m.id ? "/" + m.id : ""}`)
            });
        }
    },

    modify(e) {
        if (e.type === "MESSAGE_CREATE") {
            this.applyKeywordEntries(e.message);
        } else if (e.type === "LOAD_MESSAGES_SUCCESS") {
            for (let msg = 0; msg < e.messages.length; ++msg) {
                this.applyKeywordEntries(e.messages[msg]);
            }
        }
        return e;
    }
});
