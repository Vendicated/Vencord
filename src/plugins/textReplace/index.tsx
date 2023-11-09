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
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { InviteLink } from "@components/InviteLink";
import { Link } from "@components/Link";
import { Switch } from "@components/Switch";
import { Devs } from "@utils/constants";
import { ModalSize } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import { Button, ChannelStore, Forms, NavigationRouter, React, TextInput, useState } from "@webpack/common";

import { Input, Preview, renderFindError } from "./components";
import { applyRule, makeEmptyRule, makeEmptyRuleArray, random, tryImport } from "./utils";

const STRING_RULES_KEY = "TextReplace_rulesString";
const REGEX_RULES_KEY = "TextReplace_rulesRegex";
const TEXT_REPLACE_KEY = "TextReplace";

let textReplaceRules = makeEmptyRuleArray();

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const update = useForceUpdater();
            return (
                <>
                    <TextReplace update={update} />
                </>
            );
        }
    },
});

function TextReplace({ update }: { update: () => void; }) {

    async function setAndUpdate() {
        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update();
    }

    function newRule() {
        textReplaceRules.push(makeEmptyRule());
        setAndUpdate();
    }

    async function importRules() {
        if (IS_DISCORD_DESKTOP) {
            const [file] = await DiscordNative.fileManager.openFiles({
                filters: [
                    { name: "Text Replace Rules", extensions: ["json"] },
                    { name: "all", extensions: ["*"] }
                ]
            });

            if (file) {
                tryImport(textReplaceRules, TEXT_REPLACE_KEY, new TextDecoder().decode(file.data), update);
            }
        } else {
            const file = await chooseFile("application/json");
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async () => {
                tryImport(textReplaceRules, TEXT_REPLACE_KEY, reader.result as string, update);
            };
            reader.readAsText(file);
        }
    }

    async function exportRules() {
        const filename = "text-replace-rules.json";
        const rules = await DataStore.get(TEXT_REPLACE_KEY);
        if (!rules) return;
        const data = new TextEncoder().encode(JSON.stringify(rules));

        if (IS_DISCORD_DESKTOP) {
            DiscordNative.fileManager.saveWithDialog(data, filename);
        } else {
            saveFile(new File([data], filename, { type: "application/json" }));
        }
    }

    function onClickRemove(index: number) {
        textReplaceRules.splice(index, 1);
        setAndUpdate();
    }
    function onClickMoveUp(index: number) {
        if (index === 0) return;
        [textReplaceRules[index], textReplaceRules[index - 1]] = [textReplaceRules[index - 1], textReplaceRules[index]];
        setAndUpdate();
    }
    function onClickMoveDown(index: number) {
        if (index === textReplaceRules.length - 1) return;
        [textReplaceRules[index], textReplaceRules[index + 1]] = [textReplaceRules[index + 1], textReplaceRules[index]];
        setAndUpdate();
    }

    function onChange(e: string, index: number, key: string) {
        textReplaceRules[index][key] = e;
        setAndUpdate();
    }

    function onCheck(checked: boolean, index: number) {
        textReplaceRules[index].isRegex = checked;
        setAndUpdate();
    }

    function onToggle(checked: boolean, index: number) {
        textReplaceRules[index].isEnabled = checked;
        setAndUpdate();
    }

    const [value, setValue] = useState("");

    return (
        <>
            <Flex style={{ justifyContent: "space-between" }}>
                <Flex>
                    <Button
                        onClick={importRules}
                    >
                        Import & Merge Rules
                    </Button>
                    <Button
                        onClick={exportRules}
                    >
                        Export Rules
                    </Button>
                    <Button
                        onClick={newRule}
                        color={Button.Colors.GREEN}
                    >
                        Create New Rule
                    </Button>
                </Flex>
                <TextInput placeholder="Test your rules!" onChange={setValue} />
            </Flex>

            <Forms.FormDivider></Forms.FormDivider>

            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {
                    textReplaceRules.map((rule, i) => {
                        return (
                            <React.Fragment key={`${i}-${textReplaceRules.length}-${rule.id}`}>
                                <Flex flexDirection="row" style={{ gap: "0.5em", alignItems: "center" }}>
                                    <div style={{
                                        backgroundColor: "var(--background-secondary)",
                                        borderRadius: "3px",
                                        padding: "10px",
                                        gap: "0.5em",
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr 1fr auto",
                                        gridTemplateRows: "1fr 1fr",
                                    }}>
                                        <Flex flexDirection="row" style={{ gap: "0.5em", alignItems: "center", justifyContent: "flex-start" }}>
                                            <Forms.FormText>Enabled:</Forms.FormText>
                                            <Switch
                                                checked={rule.isEnabled}
                                                onChange={e => onToggle(e, i)}
                                            />
                                        </Flex>
                                        <div></div>
                                        <Flex flexDirection="row" style={{ gap: "0.5em", alignItems: "center", justifyContent: "flex-end" }}>
                                            <Forms.FormText style={{
                                                opacity: rule.isEnabled ? 1 : 0.5
                                            }}>Is Regex:</Forms.FormText>
                                            <Switch
                                                checked={rule.isRegex}
                                                disabled={!rule.isEnabled}
                                                onChange={e => onCheck(e, i)}
                                            />
                                            <Button
                                                size={Button.Sizes.MIN}
                                                onClick={() => onClickRemove(i)}
                                                style={{
                                                    background: "none",
                                                    color: "var(--status-danger)"
                                                }}
                                            >
                                                <DeleteIcon />
                                            </Button>
                                        </Flex>
                                        <Button
                                            size={Button.Sizes.MIN}
                                            onClick={() => onClickMoveUp(i)}
                                            style={{
                                                background: "var(--background-modifier-hover)",
                                                color: "var(--brand-experiment)"
                                            }}
                                        >
                                            <svg width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 16.0001L12 11.4201L16.59 16.0001L18 14.5901L12 8.59006L6 14.5901L7.41 16.0001Z"></path></svg>
                                        </Button>
                                        <Input
                                            placeholder="Find"
                                            initialValue={rule.find}
                                            enabled={rule.isEnabled}
                                            onChange={e => onChange(e, i, "find")}
                                        />
                                        <Input
                                            placeholder="Replace"
                                            initialValue={rule.replace}
                                            enabled={rule.isEnabled}
                                            onChange={e => onChange(e, i, "replace")}
                                        />
                                        <Input
                                            placeholder="Only if includes"
                                            initialValue={rule.onlyIfIncludes}
                                            enabled={rule.isEnabled}
                                            onChange={e => onChange(e, i, "onlyIfIncludes")}
                                        />
                                        <Button
                                            size={Button.Sizes.MIN}
                                            onClick={() => onClickMoveDown(i)}
                                            style={{
                                                background: "var(--background-modifier-hover)",
                                                color: "var(--brand-experiment)"
                                            }}
                                        >
                                            <svg width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M16.59 8.59003L12 13.17L7.41 8.59003L6 10L12 16L18 10L16.59 8.59003Z"></path></svg>
                                        </Button>
                                    </div>
                                    <Preview textReplaceRules={textReplaceRules} value={value} index={i} enabled={rule.isEnabled} />
                                </Flex>
                                {rule.isRegex && renderFindError(rule.find)}
                            </React.Fragment>
                        );
                    })
                }
            </Flex>
        </>
    );
}

const TEXT_REPLACE_RULES_CHANNEL_ID = "1102784112584040479";

export default definePlugin({
    name: "TextReplace",
    description: "Replace text in your messages.",
    authors: [Devs.AutumnVN, Devs.TheKodeToad, Devs.skykittenpuppy],

    settingsAboutComponent: () => {
        return (
            <>
                <Forms.FormTitle tag="h3">More Information</Forms.FormTitle>
                <Forms.FormText>
                    You can find pre-made rules in the{" "}
                    <Link
                        href={`https://discord.com/channels/1015060230222131221/${TEXT_REPLACE_RULES_CHANNEL_ID}`}
                        onClick={async e => {
                            e.preventDefault();
                            if (!ChannelStore.hasChannel(TEXT_REPLACE_RULES_CHANNEL_ID)) return;
                            NavigationRouter.transitionTo(`/channels/1015060230222131221/${TEXT_REPLACE_RULES_CHANNEL_ID}`);
                        }}>#textreplace-rules</Link>
                    {" "}channel in{" "}
                    <InviteLink target="D9uwnFnqmd">Vencord's Server</InviteLink>
                    .
                </Forms.FormText>
            </>
        );
    },

    dependencies: ["MessageEventsAPI"],
    settingsModalSize: ModalSize.DYNAMIC,

    settings,

    async start() {
        textReplaceRules = await DataStore.get(TEXT_REPLACE_KEY) ?? makeEmptyRuleArray();

        // Move old rules to mew rules
        const oldStringRules = await DataStore.get(STRING_RULES_KEY);
        const oldRegexRules = await DataStore.get(REGEX_RULES_KEY);

        if (oldStringRules) {
            for (const rule of oldStringRules) {
                textReplaceRules.push({
                    isEnabled: true,
                    find: rule.find,
                    replace: rule.replace,
                    onlyIfIncludes: rule.onlyIfIncludes,
                    isRegex: false,
                    id: random()
                });
            }
            await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
            await DataStore.del(STRING_RULES_KEY);
        }

        if (oldRegexRules) {
            for (const rule of oldRegexRules) {
                textReplaceRules.push({
                    isEnabled: true,
                    find: rule.find,
                    replace: rule.replace,
                    onlyIfIncludes: rule.onlyIfIncludes,
                    isRegex: true,
                    id: random()
                });
            }
            await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
            await DataStore.del(REGEX_RULES_KEY);
        }

        this.preSend = addPreSendListener((channelId, msg) => {
            // Channel used for sharing rules, applying rules here would be messy
            if (channelId === TEXT_REPLACE_RULES_CHANNEL_ID) return;

            for (const rule of textReplaceRules) {
                msg.content = applyRule(rule, msg.content);
            }
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
