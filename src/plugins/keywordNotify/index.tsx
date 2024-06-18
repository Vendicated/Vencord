/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, camila314, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType } from "@utils/types";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Flex } from "@components/Flex";
import { TextInput, useState, Forms, Button, UserStore, UserUtils, TabBar, ChannelStore, SelectedChannelStore  } from "@webpack/common";
import { useForceUpdater } from "@utils/react";
import { findByCodeLazy, findByPropsLazy, mapMangledModuleLazy, filters } from "@webpack";
import "./style.css";

let regexes = [];

const MenuHeader = findByCodeLazy(".useInDesktopNotificationCenterExperiment)()?");
const Popout = findByPropsLazy("ItemsPopout");
const recentMentionsPopoutClass = findByPropsLazy("recentMentionsPopout");

const { createMessageRecord } = findByPropsLazy("createMessageRecord", "updateMessageRecord");


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

function safeMatchesRegex(s: string, r: string) {
    try {
        return s.match(new RegExp(r));
    } catch {
        return false;
    }
}

function highlightKeywords(s: string, r: Array<string>) {
    let reg;
    try {
        reg = new RegExp(r.join("|"), "g");
    } catch {
        return [s];
    }

    let matches = s.match(reg);
    if (!matches)
        return [s];

    let parts = [...matches.map((e) => {
        let idx = s.indexOf(e);
        let before = s.substring(0, idx);
        s = s.substring(idx + e.length);
        return before;
    }, s), s];

    return parts.map(e => [
        (<span>{e}</span>),
        matches.length ? (<span class="highlight">{matches.splice(0, 1)[0]}</span>) : []
    ]);
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
        component: () => {
            const update = useForceUpdater();
            const [values, setValues] = useState(regexes);

            const elements = regexes.map((a, i) => {
                const setValue = (v: string) => {
                    let valuesCopy = [...values];
                    valuesCopy[i] = v;
                    setValues(valuesCopy);
                }

                return (
                    <>
                        <Forms.FormTitle tag="h4">Keyword Regex {i + 1}</Forms.FormTitle>

                        <Flex flexDirection="row">
                            <div style={{flexGrow: 1}}>
                                <TextInput
                                    placeholder="example|regex"
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
                )
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
        regexes = await DataStore.get("KeywordNotify_rules") ?? [];
        this.me = await UserUtils.getUser(UserStore.getCurrentUser().id);
        this.onUpdate = ()=>null;
        this.keywordLog = [];

        (await DataStore.get("KeywordNotify_log") ?? []).map((e) => JSON.parse(e)).forEach((e) => {
            this.addToLog(e);
        });
    },

    applyRegexes(m) {
        if (settings.store.ignoreBots && m.author.bot)
            return;

        let matches = false;

        if (regexes.some(r => r != "" && (safeMatchesRegex(m.content, r)))) {
            matches = true;
        }
        for (let embed of m.embeds) {
            if (regexes.some(r => r != "" && (safeMatchesRegex(embed.description, r) || safeMatchesRegex(embed.title, r)))) {
                matches = true;
            }
        }

        if (matches) {
            m.mentions.push(this.me);

            if (m.author.id != this.me.id)
                this.addToLog(m);
        }
    },

    addToLog(m) {
        if (m == null || this.keywordLog.some((e) => e.id == m.id))
            return;

        let thing = createMessageRecord(m);
        this.keywordLog.push(thing);
        this.keywordLog.sort((a, b) => b.timestamp - a.timestamp);

        if (this.keywordLog.length > 50)
            this.keywordLog.pop();

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
        let header = (
            <MenuHeader tab={5} setTab={setTab} closePopout={closePopout} badgeState={{badgeForYou: false}}/>
        );

        let channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());

        let [keywordLog, setKeywordLog] = useState(this.keywordLog);
        this.onUpdate = () => {
            let newLog = [...this.keywordLog];
            setKeywordLog(newLog);

            DataStore.set("KeywordNotify_log", newLog.map((e) => JSON.stringify(e)));
        };

        let onDelete = (m) => {
            this.keywordLog = this.keywordLog.filter((e) => e.id != m.id);
            this.onUpdate();
        };

        let messageRender = (e, t) => {
            let msg = this.renderMsg({
                message: e,
                gotoMessage: t,
                dismissible: true
            });

            if (msg == null)
                return [null];

            msg.props.children[0].props.children.props.onClick = () => onDelete(e);
            msg.props.children[1].props.children[1].props.message.customRenderedContent = {
                content: highlightKeywords(e.content, regexes)
            };

            return [msg];
        };

        return (
            <>
                <Popout.default
                    className={recentMentionsPopoutClass.recentMentionsPopout}
                    renderHeader={() => header}
                    renderMessage={messageRender}
                    channel={channel}
                    onJump={onJump}
                    onFetch={()=>null}
                    onCloseMessage={onDelete}
                    loadMore={()=>null}
                    messages={keywordLog}
                    renderEmptyState={()=>null}
                />
            </>
        );
    },

    modify(e) {
        if (e.type == "MESSAGE_CREATE") {
            this.applyRegexes(e.message);
        } else if (e.type == "LOAD_MESSAGES_SUCCESS") {
            for (let msg = 0; msg < e.messages.length; ++msg) {
                this.applyRegexes(e.messages[msg]);
            }
        }
        return e;
    }
});
