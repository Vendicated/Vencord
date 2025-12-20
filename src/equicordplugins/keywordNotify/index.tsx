/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, camila314, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading, HeadingTertiary } from "@components/Heading";
import { DeleteIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Button, ChannelStore, FluxDispatcher, Select, SelectedChannelStore, TabBar, TextInput, Tooltip, UserStore, useState } from "@webpack/common";
import type { JSX, PropsWithChildren } from "react";

type IconProps = JSX.IntrinsicElements["svg"];
type KeywordEntry = { regex: string, listIds: Array<string>, listType: ListType, ignoreCase: boolean; };

let keywordEntries: Array<KeywordEntry> = [];
let keywordLog: Array<any> = [];
let interceptor: (e: any) => void;

const recentMentionsPopoutClass = findByPropsLazy("recentMentionsPopout");
const tabClass = findByPropsLazy("inboxTitle", "tab");
const buttonClass = findByPropsLazy("size36");
const Popout = findByCodeLazy("getProTip", "canCloseAllMessages:");
const createMessageRecord = findByCodeLazy(".createFromServer(", ".isBlockedForMessage", "messageReference:");
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

interface BaseIconProps extends IconProps {
    viewBox: string;
}

function highlightKeywords(str: string, entries: Array<KeywordEntry>) {
    let regexes: Array<RegExp>;
    try {
        regexes = entries.map(e => new RegExp(e.regex, "g" + (e.ignoreCase ? "i" : "")));
    } catch (err) {
        return [str];
    }

    const matches = regexes.map(r => str.match(r)).flat().filter(e => e != null) as Array<string>;
    if (matches.length === 0) {
        return [str];
    }

    const idx = str.indexOf(matches[0]);

    return [
        <>
            <span>{str.substring(0, idx)}</span>,
            <span className="highlight">{matches[0]}</span>,
            <span>{str.substring(idx + matches[0].length)}</span>
        </>
    ];
}

function Collapsible({ title, children }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <Button
                onClick={() => setIsOpen(!isOpen)}
                look={Button.Looks.FILLED}
                size={Button.Sizes.SMALL}
                className={cl("collapsible")}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <div style={{
                        marginLeft: "auto",
                        color: "var(--text-muted)",
                        paddingRight: "5px"
                    }}>{isOpen ? "▼" : "▶"}</div>
                    <HeadingTertiary>{title}</HeadingTertiary>
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
        values[index] = e.trim();
        setListIds(values);
        update();
    }

    const elements = values.map((currentValue: string, index: number) => {
        return (
            <>
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
                        look={Button.Looks.FILLED}
                        size={Button.Sizes.SMALL}
                        className={cl("delete")}>
                        <DeleteIcon />
                    </Button>
                </Flex>
            </>
        );
    });

    return (
        <>
            {elements}
        </>
    );
}

function ListTypeSelector({ listType, setListType }: { listType: ListType, setListType: (v: ListType) => void; }) {
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

    async function setIgnoreCase(index: number, value: boolean) {
        keywordEntries[index].ignoreCase = value;
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
                            look={Button.Looks.FILLED}
                            size={Button.Sizes.SMALL}
                            className={cl("delete")}>
                            <DeleteIcon />
                        </Button>
                    </Flex>
                    <FormSwitch
                        title="Ignore Case"
                        className={cl("switch")}
                        value={values[i].ignoreCase}
                        onChange={() => {
                            setIgnoreCase(i, !values[i].ignoreCase);
                        }}
                    />
                    <Heading>Whitelist/Blacklist</Heading>
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

function Icon({ height = 24, width = 24, className, children, viewBox, ...svgProps }: PropsWithChildren<BaseIconProps>) {
    return (
        <svg
            className={classes(className, "vc-icon")}
            role="img"
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
        >
            {children}
        </svg>
    );
}

// Ideally I would just add this to Icons.tsx, but I cannot as this is a user-plugin :/
function DoubleCheckmarkIcon(props: IconProps) {
    // noinspection TypeScriptValidateTypes
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-double-checkmark-icon")}
            viewBox="0 0 24 24"
            width={16}
            height={16}
        >
            <path fill="currentColor"
                d="M16.7 8.7a1 1 0 0 0-1.4-1.4l-3.26 3.24a1 1 0 0 0 1.42 1.42L16.7 8.7ZM3.7 11.3a1 1 0 0 0-1.4 1.4l4.5 4.5a1 1 0 0 0 1.4-1.4l-4.5-4.5Z"
            />
            <path fill="currentColor"
                d="M21.7 9.7a1 1 0 0 0-1.4-1.4L13 15.58l-3.3-3.3a1 1 0 0 0-1.4 1.42l4 4a1 1 0 0 0 1.4 0l8-8Z"
            />
        </Icon>
    );
}

const settings = definePluginSettings({
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Ignore messages from bots",
        default: true
    },
    amountToKeep: {
        type: OptionType.NUMBER,
        description: "Amount of messages to keep in the log",
        default: 50
    },
    keywords: {
        type: OptionType.COMPONENT,
        description: "Manage keywords",
        component: () => <KeywordEntries />
    }
});

export default definePlugin({
    name: "KeywordNotify",
    authors: [EquicordDevs.camila314, EquicordDevs.x3rt],
    description: "Sends a notification if a given message matches certain keywords or regexes",
    settings,
    patches: [
        {
            find: "#{intl::UNREADS_TAB_LABEL})}",
            replacement: [
                {
                    match: /,(\i\?\(0,\i\.jsxs?\)\(\i\.\i\i\.Item)/,
                    replace: ",$self.keywordTabBar()$&"
                },
                {
                    match: /:(\i)===\i\.\i\.MENTIONS\?/,
                    replace: ": $1 === 8 ? $self.keywordClearButton() $&"
                }
            ]
        },
        {
            find: ".MENTIONS)});",
            replacement: {
                match: /:(\i)===\i\.\i\.MENTIONS\?\(0,.+?onJump:(\i)}\)/,
                replace: ": $1 === 8 ? $self.tryKeywordMenu($2) $&"
            }
        },
        {
            find: ".guildFilter:null",
            replacement: [
                {
                    match: /function (\i)\(\i\){let{message:\i,gotoMessage/,
                    replace: "$self.renderMsg = $1; $&"
                },
                {
                    match: /onClick:\(\)=>(\i\.\i\.deleteRecentMention\((\i)\.id\))/,
                    replace: "onClick: () => $2._keyword ? $self.deleteKeyword($2.id) : $1"
                }
            ]
        },
    ],

    async start() {
        this.onUpdate = () => null;
        keywordEntries = await DataStore.get(KEYWORD_ENTRIES_KEY) ?? [];
        await DataStore.set(KEYWORD_ENTRIES_KEY, keywordEntries);
        (await DataStore.get(KEYWORD_LOG_KEY) ?? []).map(e => JSON.parse(e)).forEach(e => {
            try {
                this.addToLog(e);
            } catch (err) {
                console.error(err);
            }
        });

        interceptor = (e: any) => {
            return this.modify(e);
        };
        FluxDispatcher.addInterceptor(interceptor);
    },

    stop() {
        const index = FluxDispatcher._interceptors.indexOf(interceptor);
        if (index > -1) {
            FluxDispatcher._interceptors.splice(index, 1);
        }
    },

    applyKeywordEntries(m: Message) {
        let matches = false;

        for (const entry of keywordEntries) {
            if (entry.regex === "") {
                continue;
            }

            let listed = entry.listIds.some(id => id.trim() === m.channel_id || id === m.author.id);
            if (!listed) {
                const channel = ChannelStore.getChannel(m.channel_id);
                if (channel != null) {
                    listed = entry.listIds.some(id => id.trim() === channel.guild_id);
                }
            }

            const whitelistMode = entry.listType === ListType.Whitelist;

            if (!whitelistMode && listed) {
                continue;
            }
            if (whitelistMode && !listed) {
                continue;
            }

            if (settings.store.ignoreBots && m.author.bot && (!whitelistMode || !entry.listIds.includes(m.author.id))) {
                continue;
            }

            const flags = entry.ignoreCase ? "i" : "";
            if (safeMatchesRegex(m.content, entry.regex, flags)) {
                matches = true;
            } else {
                for (const embed of m.embeds as any) {
                    if (safeMatchesRegex(embed.description, entry.regex, flags) || safeMatchesRegex(embed.title, entry.regex, flags)) {
                        matches = true;
                        break;
                    } else if (embed.fields != null) {
                        for (const field of embed.fields as Array<{ name: string, value: string; }>) {
                            if (safeMatchesRegex(field.value, entry.regex, flags) || safeMatchesRegex(field.name, entry.regex, flags)) {
                                matches = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (matches) {
            const id = UserStore.getCurrentUser()?.id;
            if (id !== null) {
                // @ts-ignore
                m.mentions.push({ id: id });
            }

            if (m.author.id !== id) {
                this.storeMessage(m);
                this.addToLog(m);
            }
        }
    },
    storeMessage(m: Message) {
        if (m == null)
            return;

        DataStore.get(KEYWORD_LOG_KEY).then(log => {
            log = log ? log.map((e: string) => JSON.parse(e)) : [];

            log.push(m);
            if (log.length > settings.store.amountToKeep) {
                log = log.slice(-settings.store.amountToKeep);
            }

            DataStore.set(KEYWORD_LOG_KEY, log.map(e => JSON.stringify(e)));
        });
    },
    addToLog(m: Message) {
        if (m == null || keywordLog.some(e => e.id === m.id))
            return;

        let messageRecord: any;
        try {
            messageRecord = createMessageRecord(m);
        } catch (err) {
            return;
        }

        keywordLog.push(messageRecord);
        keywordLog.sort((a, b) => b.timestamp - a.timestamp);

        while (keywordLog.length > settings.store.amountToKeep) {
            keywordLog.pop();
        }

        this.onUpdate();
    },

    deleteKeyword(id) {
        keywordLog = keywordLog.filter(e => e.id !== id);
        this.onUpdate();
    },

    keywordTabBar() {
        return (
            <TabBar.Item className={classes(tabClass.tab, tabClass.expanded)} id={8}>
                Keywords
            </TabBar.Item>
        );
    },

    keywordClearButton() {
        return (
            <Tooltip text="Clear All">
                {({ onMouseLeave, onMouseEnter }) => (
                    <div
                        className={classes(tabClass.controlButton, buttonClass.button, buttonClass.tertiary, buttonClass.size32)}
                        onMouseLeave={onMouseLeave}
                        onMouseEnter={onMouseEnter}
                        onClick={() => {
                            keywordLog = [];
                            DataStore.set(KEYWORD_LOG_KEY, []);
                            this.onUpdate();
                        }}>
                        <DoubleCheckmarkIcon />
                    </div>
                )}
            </Tooltip>
        );
    },

    tryKeywordMenu(onJump) {
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
                    className={classes(recentMentionsPopoutClass.recentMentionsPopout)}
                    renderHeader={() => null}
                    renderMessage={messageRender}
                    channel={channel}
                    onJump={onJump}
                    onFetch={() => null}
                    onCloseMessage={this.deleteKeyword}
                    loadMore={() => null}
                    messages={tempLogs}
                    renderEmptyState={() => null}
                    canCloseAllMessages={true}
                />
            </>
        );
    },

    modify(e) {
        if (e.type === "MESSAGE_CREATE" || e.type === "MESSAGE_UPDATE") {
            this.applyKeywordEntries(e.message);
        } else if (e.type === "LOAD_MESSAGES_SUCCESS") {
            for (let msg = 0; msg < e.messages.length; ++msg) {
                this.applyKeywordEntries(e.messages[msg]);
            }
        }
    }
});
