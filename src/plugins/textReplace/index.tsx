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
import { Logger } from "@utils/Logger";
import { ModalSize } from "@utils/modal";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import { Button, ChannelStore, Forms, NavigationRouter, React, TextInput, Toasts, useMemo, useState } from "@webpack/common";

const STRING_RULES_KEY = "TextReplace_rulesString";
const REGEX_RULES_KEY = "TextReplace_rulesRegex";
const TEXT_REPLACE_KEY = "TextReplace";

type Rule = Record<"find" | "replace" | "onlyIfIncludes", string> & Record<"isRegex" | "isEnabled", boolean>;

const makeEmptyRule: () => Rule = () => ({
    isEnabled: true,
    find: "",
    replace: "",
    onlyIfIncludes: "",
    isRegex: false
});
const makeEmptyRuleArray = () => [makeEmptyRule()];

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

function stringToRegex(str: string) {
    const match = str.match(/^(\/)?(.+?)(?:\/([gimsuy]*))?$/); // Regex to match regex
    return match
        ? new RegExp(
            match[2], // Pattern
            match[3]
                ?.split("") // Remove duplicate flags
                .filter((char, pos, flagArr) => flagArr.indexOf(char) === pos)
                .join("")
            ?? "g"
        )
        : new RegExp(str); // Not a regex, return string
}

function renderFindError(find: string) {
    try {
        stringToRegex(find);
        return null;
    } catch (e) {
        return (
            <span style={{ color: "var(--text-danger)" }}>
                {String(e)}
            </span>
        );
    }
}

function Input({ initialValue, onChange, placeholder, enabled }: {
    placeholder: string;
    initialValue: string;
    enabled: boolean;
    onChange(value: string): void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            disabled={!enabled}
            onChange={e => {
                setValue(e);
                onChange(e);
            }}
            spellCheck={false}
            maxLength={2000}
        />
    );
}

function TextReplace({ update }: { update: () => void; }) {

    async function newRule() {
        textReplaceRules.push(makeEmptyRule());
        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update();
    }

    async function importRules() {
        rulesFromFile(false);
    }
    async function mergeRules() {
        rulesFromFile(true);
    }

    async function rulesFromFile(merge: boolean) {
        if (IS_DISCORD_DESKTOP) {
            const [file] = await DiscordNative.fileManager.openFiles({
                filters: [
                    { name: "Text Replace Rules", extensions: ["json"] },
                    { name: "all", extensions: ["*"] }
                ]
            });

            if (file) {
                tryImport(new TextDecoder().decode(file.data), update, merge);
            }
        } else {
            const file = await chooseFile("application/json");
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async () => {
                tryImport(reader.result as string, update, merge);
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

    async function onClickRemove(index: number) {
        textReplaceRules.splice(index, 1);

        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update();
    }
    async function onClickMoveUp(index: number) {
        if (index === 0) return;
        [textReplaceRules[index], textReplaceRules[index - 1]] = [textReplaceRules[index - 1], textReplaceRules[index]];

        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update(); // BIG PROBLEM: doesn't update the textboxes, but it does work
    }
    async function onClickMoveDown(index: number) {
        if (index === textReplaceRules.length - 1) return;
        [textReplaceRules[index], textReplaceRules[index + 1]] = [textReplaceRules[index + 1], textReplaceRules[index]];

        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update(); // BIG PROBLEM: doesn't update the textboxes, but it does work
    }

    async function onChange(e: string, index: number, key: string) {
        textReplaceRules[index][key] = e;

        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update();
    }

    async function onCheck(checked: boolean, index: number) {
        textReplaceRules[index].isRegex = checked;

        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update();
    }

    async function onToggle(checked: boolean, index: number) {
        textReplaceRules[index].isEnabled = checked;

        await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
        update();
    }

    const [value, setValue] = useState("");

    const previews = useMemo(() => {
        const previews: JSX.Element[] = [];

        let inputText = value;

        for (const rule of textReplaceRules) {
            inputText = applyRule(rule, inputText);
            previews.push(<TextInput editable={false} value={inputText} disabled={!rule.isEnabled} />);
        }

        return previews;
    }, [value, textReplaceRules]);

    return (
        <>
            <Flex style={{ justifyContent: "space-between" }}>
                <Flex>
                    <Button
                        onClick={() => rulesFromFile(false)}
                    >
                        Import Rules
                    </Button>
                    <Button
                        onClick={() => rulesFromFile(true)}
                    >
                        Merge Rules
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
                            <React.Fragment key={`${i}-${textReplaceRules.length}`}>
                                <Flex flexDirection="row" style={{ gap: "0.5em", alignItems: "center" }}>
                                    <div style={{
                                        backgroundColor: "var(--background-secondary)",
                                        borderRadius: "3px",
                                        padding: "10px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.5em",
                                    }}>
                                        <Flex flexDirection="row" style={{ gap: "0.5em" }}>
                                            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                                                <Flex flexDirection="row" style={{ justifyContent: "space-between", gap: "0.5em" }}>
                                                    <Flex flexDirection="row" style={{ gap: "0.5em", alignItems: "center" }}>
                                                        <Forms.FormText>Enabled:</Forms.FormText>
                                                        <Switch
                                                            checked={rule.isEnabled}
                                                            onChange={e => onToggle(e, i)}
                                                        />
                                                    </Flex>
                                                    <Flex flexDirection="row" style={{ gap: "0.5em", alignItems: "center" }}>
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
                                                </Flex>
                                                <Flex flexDirection="row" style={{ flexGrow: 1, gap: "0.5em" }}>
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
                                                </Flex>
                                            </Flex>
                                            <Flex flexDirection="column" style={{ gap: "0.5em", justifyContent: "space-evenly" }}>
                                                <Button
                                                    size={Button.Sizes.MIN}
                                                    onClick={() => onClickMoveUp(i)}
                                                    style={{
                                                        background: "var(--background-modifier-hover)",
                                                        color: "var(--brand-experiment)"
                                                    }}
                                                >
                                                    <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 16.0001L12 11.4201L16.59 16.0001L18 14.5901L12 8.59006L6 14.5901L7.41 16.0001Z"></path></svg>
                                                </Button>
                                                <Button
                                                    size={Button.Sizes.MIN}
                                                    onClick={() => onClickMoveDown(i)}
                                                    style={{
                                                        background: "var(--background-modifier-hover)",
                                                        color: "var(--brand-experiment)"
                                                    }}
                                                >
                                                    <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M16.59 8.59003L12 13.17L7.41 8.59003L6 10L12 16L18 10L16.59 8.59003Z"></path></svg>
                                                </Button>
                                            </Flex>
                                        </Flex>
                                    </div>
                                    {previews[i]}
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

async function tryImport(str: string, update: () => void, merge: boolean) {
    try {
        const data = JSON.parse(str);
        for (const rule of data) {
            if (typeof rule.isEnabled !== "boolean") throw new Error("A rule is missing isEnabled.");
            if (typeof rule.find !== "string") throw new Error("A rule is missing find.");
            if (typeof rule.replace !== "string") throw new Error("A rule is missing replace.");
            if (typeof rule.onlyIfIncludes !== "string") throw new Error("A rule is missing onlyIfIncludes.");
            if (typeof rule.isRegex !== "boolean") throw new Error("A rule is missing isRegex.");
            textReplaceRules.push(rule);
            if (!merge) { // Wow this is gross! sucks that it works
                merge = true;
                textReplaceRules = [rule];
            }
            await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
            update();
        }
        Toasts.show({
            type: Toasts.Type.SUCCESS,
            message: "Successfully " + merge ? "merged" : "imported" + " text replace rules.",
            id: Toasts.genId()
        });
    } catch (err) {
        new Logger("TextReplace").error(err);
        Toasts.show({
            type: Toasts.Type.FAILURE,
            message: "Failed to " + merge ? "merge" : "import" + " text replace rules: " + String(err),
            id: Toasts.genId()
        });
    }
}

function applyRule(rule: Rule, content: string): string {
    if (!rule.isEnabled || !rule.find) return content;
    if (rule.isRegex && !rule.onlyIfIncludes || /* MAKE THIS A REGEX CHECK */ content.includes(rule.onlyIfIncludes) /* REGEX CHECK */) {
        try {
            const regex = stringToRegex(rule.find);
            content = content.replace(regex, rule.replace.replaceAll("\\n", "\n"));
        } catch (e) {
            new Logger("TextReplace").error(`Invalid regex: ${rule.find}`);
        }
    } else if (!rule.onlyIfIncludes || content.includes(rule.onlyIfIncludes)) {
        content = ` ${content} `.replaceAll(rule.find, rule.replace.replaceAll("\\n", "\n")).replace(/^\s|\s$/g, "");
    }
    return content;
}

function applyRules(content: string): string {
    if (content.length === 0)
        return content;

    for (const rule of textReplaceRules) {
        content = applyRule(rule, content);
    }

    return content;
}

const TEXT_REPLACE_RULES_CHANNEL_ID = "1102784112584040479";

export default definePlugin({
    name: "TextReplace",
    description: "Replace text in your messages.",
    authors: [Devs.AutumnVN, Devs.TheKodeToad, Devs.skykittenpuppy],

    settingsAboutComponent: () => {
        return (
            <React.Fragment>
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
            </React.Fragment >
        );
    },

    dependencies: ["MessageEventsAPI"],
    modalSize: ModalSize.DYNAMIC,

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
                    isRegex: false
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
                    isRegex: true
                });
            }
            await DataStore.set(TEXT_REPLACE_KEY, textReplaceRules);
            await DataStore.del(REGEX_RULES_KEY);
        }

        this.preSend = addPreSendListener((channelId, msg) => {
            // Channel used for sharing rules, applying rules here would be messy
            if (channelId === TEXT_REPLACE_RULES_CHANNEL_ID) return;
            msg.content = applyRules(msg.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
