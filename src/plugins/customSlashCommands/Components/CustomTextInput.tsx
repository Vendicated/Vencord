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

import { ApplicationCommandInputType, registerCommand, sendBotMessage, unregisterCommand } from "@api/Commands";
import { PlainSettings,Settings } from "@api/Settings";
import { findByPropsLazy } from "@webpack";
import { Button,FluxDispatcher,Forms, React, Select,Switch,TextInput } from "@webpack/common";

const MessageCreator = findByPropsLazy("getSendMessageOptionsForReply", "sendMessage");
const PendingReplyStore = findByPropsLazy("getPendingReply");

function sendMessage(channelId, message) {
    message = {
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...message
    };
    const reply = PendingReplyStore.getPendingReply(channelId);
    MessageCreator.sendMessage(channelId, message, void 0, MessageCreator.getSendMessageOptionsForReply(reply))
        .then(() => {
            if (reply) {
                FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
            }
        });
}

const spotify = "https://spotify.com/";

function replaceVariablePlaceholders(inputString: string): string {
    return inputString.replace(/&(\w+)/g, (match, variableName) => {
        const variableValue = eval(variableName);
        return variableValue !== undefined ? variableValue.toString() : match;
    });
}

export function regCmd(n: string, d: string, r: string, s: boolean) {
    registerCommand({
        name: n,
        description: d,
        isVencordCommand: true,
        inputType: ApplicationCommandInputType.BUILT_IN,
        plugin: "CustomSlashCommands",
        execute: (_, ctx) => {
            const channelId = ctx.channel.id;
            if (s) {
                sendMessage(channelId, { content: replaceVariablePlaceholders(r) });
            } else {
                sendBotMessage(channelId, { content: replaceVariablePlaceholders(r) });
            }
            return;
        }
    });

    if (!Settings.plugins.CustomSlashCommands.commands.hasOwnProperty(n)) {
        Settings.plugins.CustomSlashCommands.commands = {
            ...Settings.plugins.CustomSlashCommands.commands,
            [n]: {
                name: n,
                description: d,
                returnMessage: r,
                sendToChat: s
            }
        };
    }
}

export function CustomSettingsModal() {
    const [cname, setName] = React.useState("");
    const [cdescription, setDescription] = React.useState("");
    const [cresponse, setResponse] = React.useState();
    const [csend, setSend] = React.useState(false);
    const [selcmd, setSelCmd] = React.useState();

    var settings = Settings.plugins.CustomSlashCommands.commands;

    const c: Array<string> = Object.keys(settings).map(key => settings[key].name);

    return (
        <>
            <Forms.FormSection>
                <Forms.FormTitle>Saved Commands</Forms.FormTitle>
                <Select
                    options={c.map(m => ({
                        label: m,
                        value: m
                    }))}
                    isSelected={v => v === selcmd}
                    select={v => setSelCmd(v)}
                    serialize={v => v}
                    isDisabled={c.length === 0}
                />
            </Forms.FormSection>
            <Forms.FormSection>
                <Button
                    onClick={() => {
                        unregisterCommand(selcmd);
                        const { [selcmd]: v, ...rest } = Settings.plugins.CustomSlashCommands.commands;
                        Settings.plugins.CustomSlashCommands.commands = rest;
                    }}
                    color={Button.Colors.RED}
                    size={Button.Sizes.SMALL}
                >Delete Command</Button>
            </Forms.FormSection>
            <Forms.FormSection>
                <Forms.FormTitle>Command Name</Forms.FormTitle>
                <TextInput
                    onChange={(v: string) => {
                        setName(v);
                    }}
                />
            </Forms.FormSection>
            <Forms.FormSection>
                <Forms.FormTitle>Command Description</Forms.FormTitle>
                <TextInput
                    onChange={(v: string) => {
                        setDescription(v);
                    }}
                />
            </Forms.FormSection>
            <Forms.FormSection>
                <Forms.FormTitle>Command Response</Forms.FormTitle>
                <TextInput
                    onChange={(v: string) => {
                        setResponse(v);
                    }}
                />
            </Forms.FormSection>
            <Forms.FormSection>
                <Forms.FormTitle>Send to the chat</Forms.FormTitle>
                <Switch
                    value={csend}
                    onChange={(v: boolean) => {
                        setSend(v);
                    }}
                />
            </Forms.FormSection>
            <Forms.FormSection>
                <Button onClick={() => regCmd(cname, cdescription, cresponse, csend)}>Save and register command</Button>
            </Forms.FormSection>
        </>
    );
}
