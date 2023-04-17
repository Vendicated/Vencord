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

import { ApplicationCommandInputType, ApplicationCommandOptionType, ChoicesOption, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { SelectedChannelStore } from "@webpack/common";

const dataKey = "MessageHotkeys_Data";

interface Hotkey {
    name: string;
    key: string;
    message: string;
}

const getHotkeys = () => DataStore.get(dataKey).then<Hotkey[]>(t => t ?? []);
const getHotkey = (name: string) => DataStore.get(dataKey).then<Hotkey | null>((t: Hotkey[]) => (t ?? []).find((tt: Hotkey) => tt.name === name) ?? null);
const getHotkeyByKey = (key: string) => DataStore.get(dataKey).then<Hotkey | null>((t: Hotkey[]) => (t ?? []).find((tt: Hotkey) => tt.key === key) ?? null);
const addHotkey = async (hotkey: Hotkey) => {
    const hotkeys = (await getHotkeys()).push(hotkey);
    DataStore.set(dataKey, hotkeys);
};
const removeHotkey = async (name: string) => {
    const hotkeys = (await getHotkeys()).filter((t: Hotkey) => t.name !== name);
    DataStore.set(dataKey, hotkeys);
};

const MessageActions = findByPropsLazy("sendGreetMessage");

const keys: ChoicesOption[] = [];

export default definePlugin({
    name: "MessageHotkeys",
    description: "Adds keyboard hotkeys to quickly send messages",
    authors: [Devs.Mufaro],
    commands: [
        {
            name: "hotkeys",
            description: "Manage your hotkeys",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "add",
                    description: "Add a hotkey",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "name",
                            description: "The name of the hotkey",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        },
                        {
                            name: "key",
                            description: "The key to press",
                            type: ApplicationCommandOptionType.STRING,
                            required: true,
                            choices: keys
                        },
                        {
                            name: "message",
                            description: "The message to send",
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                },
                {
                    name: "list",
                    description: "List all hotkeys",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: []
                },
                {
                    name: "purge",
                    description: "Purge all hotkeys",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: []
                },
                {
                    name: "remove",
                    description: "Remove a hotkey",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "name",
                            description: "The name of the hotkey",
                            type: ApplicationCommandOptionType.STRING,
                            required: true,
                        }
                    ]
                }
            ],

            async execute(args, ctx) {
                switch (args[0].name) {
                    case "add": {
                        const name = findOption(args[0].options, "name", "");
                        const key = findOption(args[0].options, "key", "");
                        const message = findOption(args[0].options, "message", "");

                        await getHotkey(name).then(async h => { if (h) await removeHotkey(name); });

                        await addHotkey({
                            name,
                            key,
                            message
                        });

                        sendBotMessage(ctx.channel.id, {
                            author: {
                                username: "Hotkeys",
                            },
                            embeds: [{
                                // @ts-ignore
                                title: "Hotkey Created!",
                                description: `\`${key}\` - **${name}**\n\`\`\`${message}\`\`\``,
                                color: "0xeb459e",
                                type: "rich"
                            }]
                        });

                        break;
                    }
                    case "list": {
                        const hotkeys = await getHotkeys();
                        sendBotMessage(ctx.channel.id, {
                            author: {
                                username: "Hotkeys",
                            },
                            embeds: [{
                                // @ts-ignore
                                title: "Hotkeys List",
                                color: "0xeb459e",
                                description: hotkeys.map(h => `\`[${h.key}]\` **${h.name}** - ${h.message}`).join("\n") || "No hotkeys yet! Use `/hotkeys add` to add one",
                                type: "rich",
                            }]
                        });

                        break;
                    }

                    case "remove": {
                        const name = findOption(args[0].options, "name", "");
                        await removeHotkey(name);
                        sendBotMessage(ctx.channel.id, { content: `Removed hotkey \`${name}\`` });

                        break;
                    }

                    case "purge": {
                        DataStore.set(dataKey, []);
                        sendBotMessage(ctx.channel.id, {
                            content: "Purged all hotkeys",
                        });

                        break;
                    }
                }
            }
        }
    ],

    start() {
        createKeys();
        document.addEventListener("keydown", this.event);
    },

    stop() {
        document.removeEventListener("keydown", this.event);
    },

    async event(e: KeyboardEvent) {
        const hotkey = await getHotkeyByKey(e.code);
        if (hotkey) {
            const message = {
                content: hotkey.message,
                validNonShortcutEmojis: []
            };
            MessageActions.sendMessage(SelectedChannelStore.getChannelId(), message, void 0);
        }
    }

});

const availableKeys = [
    "Backspace",
    "Tab",
    "ShiftRight",
    "ControlRight",
    "AltRight",
    "CapsLock",
    "Escape",
    "End",
    "Home",
    "ArrowLeft",
    "ArrowUp",
    "ArrowRight",
    "ArrowDown",
    "Insert",
    "Delete",
    "ScrollLock",
    "NumLock",
    "Pause",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
    "Numpad0",
    "Numpad1",
    "Numpad2",
    "Numpad3",
    "Numpad4",
    "Numpad5",
    "Numpad6",
    "Numpad7",
    "Numpad8",
    "Numpad9",
    "NumpadAdd",
    "NumpadSubtract",
    "NumpadMultiply",
    "NumpadDivide",
    "NumpadDecimal",
];

function createKeys() {
    for (let i = 0; i < availableKeys.length; i++) {
        const key = availableKeys[i];
        keys.push({
            name: key,
            value: key,
            label: key
        });
    }
}
