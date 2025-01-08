/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { NavigationRouter } from "@webpack/common";
import { Channel } from "discord-types/general";

interface QuickNavKeybind {
    id: number;
    name: string;
    keys: string[];
    guildId?: string;
    channelId: string;
    category?: string;
    description?: string;
    createdAt: number;
    lastUsed?: number;
}

const DATA_KEY = "QuickNav_KEYBINDS";
let nextId = 1;


const VALID_KEYS = {
    modifiers: ["ctrl", "alt", "shift"],
    letters: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
        "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"],
    numbers: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    function: ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12"],
    navigation: ["tab", "capslock", "space", "backspace", "delete", "enter", "escape",
        "home", "end", "pageup", "pagedown", "arrowup", "arrowdown", "arrowleft", "arrowright"]
};

const ALL_VALID_KEYS = [
    ...VALID_KEYS.modifiers,
    ...VALID_KEYS.letters,
    ...VALID_KEYS.numbers,
    ...VALID_KEYS.function,
    ...VALID_KEYS.navigation
];


const getKeybinds = () => DataStore.get(DATA_KEY).then<QuickNavKeybind[]>(k => k ?? []);
const addKeybind = async (keybind: QuickNavKeybind) => {
    const keybinds = await getKeybinds();
    keybinds.push(keybind);
    await DataStore.set(DATA_KEY, keybinds);
    return keybinds;
};
const removeKeybind = async (id: number) => {
    let keybinds = await getKeybinds();
    keybinds = keybinds.filter(k => k.id !== id);
    await DataStore.set(DATA_KEY, keybinds);
    return keybinds;
};
const updateKeybind = async (id: number, update: Partial<QuickNavKeybind>) => {
    const keybinds = await getKeybinds();
    const index = keybinds.findIndex(k => k.id === id);
    if (index !== -1) {
        keybinds[index] = { ...keybinds[index], ...update };
        await DataStore.set(DATA_KEY, keybinds);
    }
    return keybinds;
};


async function validateKeybind(keys: string[], name: string, category?: string): Promise<{ valid: boolean; error?: string; warning?: string; }> {

    const invalidKeys = keys.filter(k => !ALL_VALID_KEYS.includes(k.toLowerCase()));
    if (invalidKeys.length > 0) {
        const validKeysByCategory = Object.entries(VALID_KEYS)
            .map(([cat, keys]) => `\n**${cat}**: ${keys.join(", ")}`)
            .join("");
        return {
            valid: false,
            error: `Invalid keys: \`${invalidKeys.join(", ")}\`\nValid keys:${validKeysByCategory}`
        };
    }


    if (!keys.some(k => VALID_KEYS.modifiers.includes(k.toLowerCase()))) {
        return {
            valid: false,
            error: "Keybind must include at least one modifier key (ctrl, alt, or shift)"
        };
    }


    if (name.length < 1 || name.length > 32) {
        return {
            valid: false,
            error: "Name must be between 1 and 32 characters"
        };
    }


    if (category && category.length > 32) {
        return {
            valid: false,
            error: "Category name must be 32 characters or less"
        };
    }


    const keybinds = await getKeybinds();
    const existingKeybind = keybinds.find(kb =>
        kb.keys.length === keys.length &&
        kb.keys.every(k => keys.includes(k.toLowerCase()))
    );
    if (existingKeybind) {
        return {
            valid: false,
            error: `This keybind combination is already used by "${existingKeybind.name}" (ID: ${existingKeybind.id})`
        };
    }


    const existingName = keybinds.find(kb => kb.name.toLowerCase() === name.toLowerCase());
    if (existingName) {
        return {
            valid: false,
            error: `A keybind with the name "${name}" already exists (ID: ${existingName.id})`
        };
    }


    const riskyModifiers = ["ctrl", "alt"];
    const riskyKeys = ["w", "q", "r", "t", "f4"];
    if (riskyModifiers.some(m => keys.includes(m)) && riskyKeys.some(k => keys.includes(k))) {
        return {
            valid: true,
            warning: "⚠️ Warning: This keybind combination might conflict with browser or system shortcuts"
        };
    }

    return { valid: true };
}


getKeybinds().then(keybinds => {
    nextId = Math.max(...keybinds.map(k => k.id), 0) + 1;
});

function handleKeyDown(e: KeyboardEvent) {

    if (document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement) return;


    const pressedKeys: string[] = [];
    if (e.ctrlKey) pressedKeys.push("ctrl");
    if (e.altKey) pressedKeys.push("alt");
    if (e.shiftKey) pressedKeys.push("shift");


    if (e.key.toLowerCase() !== "control" &&
        e.key.toLowerCase() !== "alt" &&
        e.key.toLowerCase() !== "shift") {
        pressedKeys.push(e.key.toLowerCase());
    }


    getKeybinds().then(keybinds => {
        const matchingKeybind = keybinds.find(kb =>
            kb.keys.length === pressedKeys.length &&
            kb.keys.every(k => pressedKeys.includes(k.toLowerCase()))
        );

        if (matchingKeybind) {
            e.preventDefault();
            e.stopPropagation();


            updateKeybind(matchingKeybind.id, { lastUsed: Date.now() });


            if (matchingKeybind.guildId) {
                NavigationRouter.transitionTo(`/channels/${matchingKeybind.guildId}/${matchingKeybind.channelId}`);
            } else {
                NavigationRouter.transitionTo(`/channels/@me/${matchingKeybind.channelId}`);
            }
        }
    });
}


const EMBED_COLOR = "#5865F2";

function getLocationString(channelId: string): string {
    return `<#${channelId}>`;
}

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

function formatKeybindDetails(keybind: QuickNavKeybind): string {
    const parts = [
        `**Name**: ${keybind.name}`,
        `**Keys**: \`${keybind.keys.join("+")}\``,
        `**Target**: ${getLocationString(keybind.channelId)}`,
        `**Created**: ${formatTimestamp(keybind.createdAt)}`
    ];

    if (keybind.category) parts.push(`**Category**: ${keybind.category}`);
    if (keybind.description) parts.push(`**Description**: ${keybind.description}`);
    if (keybind.lastUsed) parts.push(`**Last Used**: ${formatTimestamp(keybind.lastUsed)}`);

    return parts.join("\n");
}

export default definePlugin({
    name: "QuickNav",
    description: "Quickly navigate to servers and channels using keybinds",
    authors: [Devs.RedlineDev],

    start() {
        document.addEventListener("keydown", handleKeyDown);
    },

    stop() {
        document.removeEventListener("keydown", handleKeyDown);
    },

    commands: [
        {
            name: "qn-set-kb",
            description: "Set a keybind for quick navigation",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "name",
                    description: "Name for this keybind",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "keys",
                    description: "Comma-separated list of keys (e.g. ctrl,shift,l)",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "channel",
                    description: "Channel to navigate to (defaults to current channel)",
                    type: ApplicationCommandOptionType.CHANNEL,
                    required: false
                },
                {
                    name: "category",
                    description: "Category for organizing keybinds",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "description",
                    description: "Description of what this keybind does",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                }
            ],
            async execute(args, ctx) {
                const name = findOption(args, "name", "");
                const keysStr = findOption(args, "keys", "");
                const keys = keysStr.split(",").map(k => k.trim().toLowerCase());
                const targetChannel = (findOption(args, "channel", null) as Channel | null) ?? ctx.channel;
                const category = findOption(args, "category", undefined);
                const description = findOption(args, "description", undefined);


                const validation = await validateKeybind(keys, name, category);
                if (!validation.valid) {
                    sendBotMessage(ctx.channel.id, {
                        embeds: [{
                            // @ts-ignore
                            title: "Error",
                            description: validation.error,
                            // @ts-ignore
                            color: EMBED_COLOR,
                            type: "rich"
                        }]
                    });
                    return;
                }

                const keybind: QuickNavKeybind = {
                    id: nextId++,
                    name,
                    keys,
                    channelId: targetChannel.id,
                    category,
                    description,
                    createdAt: Date.now()
                };


                if (ctx.guild?.id) {
                    keybind.guildId = ctx.guild.id;
                }

                await addKeybind(keybind);

                const embed: any = {
                    title: "Keybind Set",
                    description: formatKeybindDetails(keybind),
                    color: EMBED_COLOR,
                    type: "rich"
                };

                if (validation.warning) {
                    embed.footer = { text: validation.warning };
                }

                sendBotMessage(ctx.channel.id, { embeds: [embed] });
            }
        },
        {
            name: "qn-list-kb",
            description: "List all keybinds",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "category",
                    description: "Filter keybinds by category",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                },
                {
                    name: "sort",
                    description: "Sort keybinds by: name, created, lastused",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                }
            ],
            async execute(args, ctx) {
                const category = findOption(args, "category", undefined);
                const sort = findOption(args, "sort", "name");

                let keybinds = await getKeybinds();


                if (category) {
                    keybinds = keybinds.filter(kb => kb.category?.toLowerCase() === (category as string).toLowerCase());
                }

                if (keybinds.length === 0) {
                    const message = category
                        ? `No keybinds found in category "${category}"`
                        : "No keybinds set. Use `/qn-set-kb` to create one.";

                    sendBotMessage(ctx.channel.id, {
                        embeds: [{
                            // @ts-ignore
                            title: "No Keybinds",
                            description: message,
                            // @ts-ignore
                            color: EMBED_COLOR,
                            type: "rich"
                        }]
                    });
                    return;
                }


                switch (sort.toLowerCase()) {
                    case "created":
                        keybinds.sort((a, b) => b.createdAt - a.createdAt);
                        break;
                    case "lastused":
                        keybinds.sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0));
                        break;
                    default:
                        keybinds.sort((a, b) => a.name.localeCompare(b.name));
                }


                let description: string;
                if (!category) {
                    const categories = new Map<string, QuickNavKeybind[]>();
                    categories.set("Uncategorized", []);

                    for (const kb of keybinds) {
                        const cat = kb.category ?? "Uncategorized";
                        if (!categories.has(cat)) categories.set(cat, []);
                        categories.get(cat)!.push(kb);
                    }

                    description = Array.from(categories.entries())
                        .map(([cat, kbs]) => `## ${cat}\n${kbs.map(kb => formatKeybindDetails(kb)).join("\n\n")}`)
                        .join("\n\n");
                } else {
                    description = keybinds.map(kb => formatKeybindDetails(kb)).join("\n\n");
                }

                sendBotMessage(ctx.channel.id, {
                    embeds: [{
                        // @ts-ignore
                        title: "Quick Navigation Keybinds",
                        description,
                        // @ts-ignore
                        color: EMBED_COLOR,
                        type: "rich",
                        // @ts-ignore
                        footer: {
                            text: "Use /qn-remove-kb <id> to remove a keybind"
                        }
                    }]
                });
            }
        },
        {
            name: "qn-remove-kb",
            description: "Remove a keybind by ID",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "id",
                    description: "ID of the keybind to remove (use /qn-list-kb to see IDs)",
                    type: ApplicationCommandOptionType.INTEGER,
                    required: true
                }
            ],
            async execute(args, ctx) {
                const id = findOption(args, "id", 0);
                const keybinds = await getKeybinds();
                const keybind = keybinds.find(kb => kb.id === id);

                if (!keybind) {
                    sendBotMessage(ctx.channel.id, {
                        embeds: [{
                            // @ts-ignore
                            title: "Error",
                            description: `No keybind found with ID ${id}`,
                            // @ts-ignore
                            color: EMBED_COLOR,
                            type: "rich"
                        }]
                    });
                    return;
                }

                await removeKeybind(id);

                sendBotMessage(ctx.channel.id, {
                    embeds: [{
                        // @ts-ignore
                        title: "Keybind Removed",
                        description: formatKeybindDetails(keybind),
                        // @ts-ignore
                        color: EMBED_COLOR,
                        type: "rich"
                    }]
                });
            }
        }
    ]
});
