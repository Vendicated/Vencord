/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, camila314, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Forms, Select, Switch, SelectedChannelStore, TabBar, TextInput, UserStore, UserUtils, useState } from "@webpack/common";
import { classNameFactory } from "@api/Styles";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { Message, User } from "discord-types/general/index.js";
import { useForceUpdater } from "@utils/react";

type KeywordEntry = { regex: string, listIds: Array<string>, listType: ListType, ignoreCase: boolean };

let keywordEntries: Array<KeywordEntry> = [];
let currentUser: User;
let keywordLog: Array<any> = [];

const MenuHeader = findByCodeLazy(".sv)()?(0,");
const Popout = findByCodeLazy(".loadingMore&&null==");
const recentMentionsPopoutClass = findByPropsLazy("recentMentionsPopout");
const createMessageRecord = findByCodeLazy("THREAD_CREATED?[]:(0,");
const KEYWORD_ENTRIES_KEY = "KeywordNotify_keywordEntries";
const KEYWORD_LOG_KEY = "KeywordNotify_log";

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

function highlightKeywords(str: string, entries: Array<KeywordEntry>) {
    let regexes: Array<RegExp>;
    try {
        regexes = entries.map(e => new RegExp(e.regex, "g" + (e.ignoreCase ? "i" : "")));
    } catch (err) {
        return [str];
    }

    const matches = regexes.map(r => str.match(r)).flat().filter(e => e != null);
    if (matches.length == 0) {
        return [str];
    }

    const idx = str.indexOf(matches[0]);

    return [
        <span>{str.substring(0, idx)}</span>,
        <span className="highlight">{matches[0]}</span>,
        <span>{str.substring(idx + matches[0].length)}</span>
    ];
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
                    <DeleteIcon/>
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
            value={listType}
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
                            <DeleteIcon/>
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
                    <Forms.FormDivider className={[Margins.top8, Margins.bottom8].join(" ") }/>
                    <Forms.FormTitle tag="h5">Whitelist/Blacklist</Forms.FormTitle>
                    <Flex flexDirection="row">
                        <div style={{ flexGrow: 1 }}>
                            <ListedIds listIds={values[i].listIds} setListIds={e => setListIds(i, e)}/>
                        </div>
                    </Flex>
                    <div className={[Margins.top8, Margins.bottom8].join(" ") }/>
                    <Flex flexDirection="row">
                        <Button onClick={() => {
                            values[i].listIds.push("");
                            update();
                        }}>Add ID</Button>
                        <div style={{ flexGrow: 1 }}>
                            <ListTypeSelector listType={values[i].listType} setListType={e => setListType(i, e)}/>
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
        component: () => <KeywordEntries/>
    }
});

export default definePlugin({
    name: "KeywordNotify",
    authors: [Devs.camila314],
    description: "Sends a notification if a given message matches certain keywords or regexes",
    settings,
    patches: [
        {
            find: "Dispatch.dispatch(...) called without an action type",
            replacement: {
                match: /}_dispatch\((\i),\i\){/,
                replace: "$&$1=$self.modify($1);"
            }
        },
        {
            find: "Messages.UNREADS_TAB_LABEL}",
            replacement: {
                match: /\i\?\(0,\i\.jsxs\)\(\i\.TabBar\.Item/,
                replace: "$self.keywordTabBar(),$&"
            }
        },
        {
            find: "location:\"RecentsPopout\"",
            replacement: {
                match: /:(\i)===\i\.\i\.MENTIONS\?\(0,.+?setTab:(\i),onJump:(\i),badgeState:\i,closePopout:(\i)/,
                replace: ": $1 === 5 ? $self.tryKeywordMenu($2, $3, $4) $&"
            }
        },
        {
            find: ".guildFilter:null",
            replacement: {
                match: /function (\i)\(\i\){let{message:\i,gotoMessage/,
                replace: "$self.renderMsg = $1; $&"
            }
        },
        {
            find: ".guildFilter:null",
            replacement: {
                match: /onClick:\(\)=>(\i\.\i\.deleteRecentMention\((\i)\.id\))/,
                replace: "onClick: () => $2._keyword ? $self.deleteKeyword($2.id) : $1"
            }
        }
    ],

    async start() {
        keywordEntries = await DataStore.get(KEYWORD_ENTRIES_KEY) ?? [];
        currentUser = UserStore.getCurrentUser();
        this.onUpdate = () => null;

        (await DataStore.get(KEYWORD_LOG_KEY) ?? []).map(e => JSON.parse(e)).forEach(e => {
            this.addToLog(e);
        });
    },

    applyKeywordEntries(m: Message) {
        let matches = false;

        for (let entry of keywordEntries) {
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
            }

            for (const embed of m.embeds as any) {
                if (safeMatchesRegex(embed.description, entry.regex, flags) || safeMatchesRegex(embed.title, entry.regex, flags)) {
                    matches = true;
                } else if (embed.fields != null) {
                    for (const field of embed.fields as Array<{ name: string, value: string }>) {
                        if (safeMatchesRegex(field.value, entry.regex, flags) || safeMatchesRegex(field.name, entry.regex, flags)) {
                            matches = true;
                        }
                    }
                }
            }
        }

        if (matches) {
            m.mentions.push(currentUser);

            if (m.author.id !== currentUser.id)
                this.addToLog(m);
        }
    },

    addToLog(m: Message) {
        if (m == null || keywordLog.some(e => e.id === m.id))
            return;

        DataStore.get(KEYWORD_LOG_KEY).then(log => {
            DataStore.set(KEYWORD_LOG_KEY, [...log, JSON.stringify(m)]);
        });

        const thing = createMessageRecord(m);
        keywordLog.push(thing);
        keywordLog.sort((a, b) => b.timestamp - a.timestamp);

        if (keywordLog.length > 50)
            keywordLog.pop();

        this.onUpdate();
    },

    deleteKeyword(id) {
        keywordLog = keywordLog.filter(e => e.id !== id);
        this.onUpdate();
    },

    keywordTabBar() {
        return (
            <TabBar.Item className="vc-settings-tab-bar-item" id={5}>
                Keywords
            </TabBar.Item>
        );
    },

    tryKeywordMenu(setTab, onJump, closePopout) {
        const header = (
            <MenuHeader tab={5} setTab={setTab} closePopout={closePopout} badgeState={{ badgeForYou: false }}/>
        );

        const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());

        const [tempLogs, setKeywordLog] = useState(keywordLog);
        this.onUpdate = () => {
            const newLog = Array.from(keywordLog);
            setKeywordLog(newLog);
        };

        const messageRender = (e, t) => {
            e._keyword = true;

            e.customRenderedContent = {
                content: highlightKeywords(e.content, keywordEntries)
            };

            const msg = this.renderMsg({
                message: e,
                gotoMessage: t,
                dismissible: true
            });

            return [msg];
        };

        return (
            <>
                <Popout
                    className={recentMentionsPopoutClass.recentMentionsPopout}
                    renderHeader={() => header}
                    renderMessage={messageRender}
                    channel={channel}
                    onJump={onJump}
                    onFetch={() => null}
                    onCloseMessage={this.deleteKeyword}
                    loadMore={() => null}
                    messages={tempLogs}
                    renderEmptyState={() => null}
                />
            </>
        );
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
