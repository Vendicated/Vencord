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
import { EquicordDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Button, ChannelStore, Forms, SearchableSelect, SelectedChannelStore, TabBar, TextInput, UserStore, UserUtils, useState } from "@webpack/common";
import { Message, User } from "discord-types/general/index.js";

let keywordEntries: Array<{ regex: string, listIds: Array<string>, listType: ListType; }> = [];
let currentUser: User;
let keywordLog: Array<any> = [];

const MenuHeader = findByCodeLazy(".useInDesktopNotificationCenterExperiment)()?");
const Popout = findByCodeLazy("let{analyticsName:");
const recentMentionsPopoutClass = findByPropsLazy("recentMentionsPopout");
const KEYWORD_ENTRIES_KEY = "KeywordNotify_keywordEntries";
const KEYWORD_LOG_KEY = "KeywordNotify_log";

const { createMessageRecord } = findByPropsLazy("createMessageRecord", "updateMessageRecord");

async function addKeywordEntry(updater: () => void) {
    keywordEntries.push({ regex: "", listIds: [], listType: ListType.BlackList });
    await DataStore.set(KEYWORD_ENTRIES_KEY, keywordEntries);
    updater();
}

async function removeKeywordEntry(idx: number, updater: () => void) {
    keywordEntries.splice(idx, 1);
    await DataStore.set(KEYWORD_ENTRIES_KEY, keywordEntries);
    updater();
}

function safeMatchesRegex(s: string, r: string) {
    try {
        return s.match(new RegExp(r));
    } catch {
        return false;
    }
}


enum ListType {
    BlackList = "BlackList",
    Whitelist = "Whitelist"
}

function highlightKeywords(s: string, r: Array<string>) {
    let regex: RegExp;
    try {
        regex = new RegExp(r.join("|"), "g");
    } catch {
        return [s];
    }

    const matches = s.match(regex);
    if (!matches)
        return [s];

    const parts = [...matches.map(e => {
        const idx = s.indexOf(e);
        const before = s.substring(0, idx);
        s = s.substring(idx + e.length);
        return before;
    }, s), s];

    return parts.map(e => [
        (<span>{e}</span>),
        matches!.length ? (<span className="highlight">{matches!.splice(0, 1)[0]}</span>) : []
    ]);
}

function Collapsible({ title, children }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                look={Button.Looks.BLANK}
                size={Button.Sizes.ICON}
                className="keywordnotify-collapsible">
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
                    className="keywordnotify-delete">
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
        <SearchableSelect
            options={[
                { label: "Whitelist", value: ListType.Whitelist },
                { label: "Blacklist", value: ListType.BlackList }
            ]}
            placeholder={"Select a list type"}
            maxVisibleItems={2}
            closeOnSelect={true}
            value={listType}
            onChange={setListType}
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
                            className="keywordnotify-delete">
                            <DeleteIcon />
                        </Button>
                    </Flex>
                    <Forms.FormDivider className={Margins.top8 + " " + Margins.bottom8} />
                    <Forms.FormTitle tag="h5">Whitelist/Blacklist</Forms.FormTitle>
                    <Flex flexDirection="row">
                        <div style={{ flexGrow: 1 }}>
                            <ListedIds listIds={values[i].listIds} setListIds={e => setListIds(i, e)} />
                        </div>
                    </Flex>
                    <div className={Margins.top8 + " " + Margins.bottom8} />
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
        description: "",
        component: () => <KeywordEntries />
    }
});

export default definePlugin({
    name: "KeywordNotify",
    authors: [EquicordDevs.camila314],
    description: "Sends a notification if a given message matches certain keywords or regexes",
    settings,
    patches: [
        {
            find: "}_dispatch(",
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
            find: "InboxTab.TODOS?(",
            replacement: {
                match: /:\i&&(\i)===\i\.InboxTab\.TODOS.{1,50}setTab:(\i),onJump:(\i),closePopout:(\i)/,
                replace: ": $1 === 5 ? $self.tryKeywordMenu($2, $3, $4) $&"
            }
        },
        {
            find: ".guildFilter:null",
            replacement: {
                match: /function (\i)\(\i\){let{message:\i,gotoMessage/,
                replace: "$self.renderMsg = $1; $&"
            }
        }
    ],

    async start() {
        keywordEntries = await DataStore.get(KEYWORD_ENTRIES_KEY) ?? [];
        currentUser = await UserUtils.getUser(UserStore.getCurrentUser().id);
        this.onUpdate = () => null;

        (await DataStore.get(KEYWORD_LOG_KEY) ?? []).map(e => JSON.parse(e)).forEach(e => {
            this.addToLog(e);
        });
    },

    applyKeywordEntries(m: Message) {
        let matches = false;

        keywordEntries.forEach(entry => {
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

            if (settings.store.ignoreBots && m.author.bot) {
                if (!whitelistMode || !entry.listIds.includes(m.author.id)) {
                    return;
                }
            }

            if (safeMatchesRegex(m.content, entry.regex)) {
                matches = true;
            }

            for (const embed of m.embeds as any) {
                if (safeMatchesRegex(embed.description, entry.regex) || safeMatchesRegex(embed.title, entry.regex)) {
                    matches = true;
                } else if (embed.fields != null) {
                    for (const field of embed.fields as Array<{ name: string, value: string; }>) {
                        if (safeMatchesRegex(field.value, entry.regex) || safeMatchesRegex(field.name, entry.regex)) {
                            matches = true;
                        }
                    }
                }
            }
        });

        if (matches) {
            // @ts-ignore
            m.mentions.push(currentUser);

            if (m.author.id !== currentUser.id)
                this.addToLog(m);
        }
    },

    addToLog(m: Message) {
        if (m == null || keywordLog.some(e => e.id === m.id))
            return;

        const thing = createMessageRecord(m);
        keywordLog.push(thing);
        keywordLog.sort((a, b) => b.timestamp - a.timestamp);

        if (keywordLog.length > 50)
            keywordLog.pop();

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
            <MenuHeader tab={5} setTab={setTab} closePopout={closePopout} badgeState={{ badgeForYou: false }} />
        );

        const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());

        const [tempLogs, setKeywordLog] = useState(keywordLog);
        this.onUpdate = () => {
            const newLog = [...keywordLog];
            setKeywordLog(newLog);

            DataStore.set(KEYWORD_LOG_KEY, newLog.map(e => JSON.stringify(e)));
        };

        const onDelete = m => {
            keywordLog = keywordLog.filter(e => e.id !== m.id);
            this.onUpdate();
        };

        const messageRender = (e, t) => {
            console.log(this);
            const msg = this.renderMsg({
                message: e,
                gotoMessage: t,
                dismissible: true
            });

            if (msg == null)
                return [null];

            msg.props.children[0].props.children.props.onClick = () => onDelete(e);
            msg.props.children[1].props.children[1].props.message.customRenderedContent = {
                content: highlightKeywords(e.content, keywordEntries.map(e => e.regex))
            };

            return [msg];
        };

        /* return (
            <>
                <p>hi uwu</p>
            </>
        );*/

        return (
            <>
                <Popout
                    className={recentMentionsPopoutClass.recentMentionsPopout}
                    renderHeader={() => header}
                    renderMessage={messageRender}
                    channel={channel}
                    onJump={onJump}
                    onFetch={() => null}
                    onCloseMessage={onDelete}
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
