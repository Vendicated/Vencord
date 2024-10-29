/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, Button, EmojiStore, GuildStore, Menu, Toasts, useEffect, useState } from "@webpack/common";
import { CustomEmoji, UnicodeEmoji } from "@webpack/types";

interface ContextMenuEmoji {
    type: string;
    id: string;
    name: string;
    surrogates?: string;
}

interface Target {
    dataset: ContextMenuEmoji;
    firstChild: HTMLImageElement;
}

interface customSaveEmoji {
    type: string;
    id: string;
    guildId?: string;
    name: string;
    surrogates?: string;
    url?: string;
    animated?: boolean;
}

const DATA_COLLECTION_NAME = "whitelisted-emojis";

let cache_allowedList: ContextMenuEmoji[] = [];
const getAllowedList = async (): Promise<ContextMenuEmoji[]> => (await DataStore.get<ContextMenuEmoji[]>(DATA_COLLECTION_NAME)) ?? [];

function isItemAllowed(item: (CustomEmoji | UnicodeEmoji)) {
    if ("uniqueName" in item) {
        return cache_allowedList.some(emoji => emoji.name === item.uniqueName);
    }
    return cache_allowedList.some(emoji => emoji.name === item.name);
}


function itemAlreadyInList(item: ContextMenuEmoji) {
    return cache_allowedList.some(emoji => emoji.name === item.name);
}

async function addBulkToAllowedList(items: ContextMenuEmoji[]) {
    const itemsToAdd = await Promise.all(items.map(async item => {
        if (!itemAlreadyInList(item)) {
            let emojiData: CustomEmoji | null = null;

            if (!item.surrogates) {
                emojiData = EmojiStore.getCustomEmojiById(item.id);
            }

            const saveData: customSaveEmoji = {
                type: "emoji",
                id: item.id,
                name: item.name,
                surrogates: item.surrogates,
            };

            if (emojiData && emojiData.guildId) {
                saveData.url = `https://cdn.discordapp.com/emojis/${emojiData.id}.${emojiData.animated ? "gif" : "png"}`;
                saveData.guildId = emojiData.guildId;
                saveData.animated = emojiData.animated;
            }

            return saveData;
        }
        return null;
    }));

    const validItemsToAdd = itemsToAdd.filter(item => item !== null);
    await DataStore.set(DATA_COLLECTION_NAME, [...cache_allowedList, ...validItemsToAdd]);

    if (!settings.store.disableToasts) {
        Toasts.show({
            message: `Added ${validItemsToAdd.length} emojis to the list, ${items.length - validItemsToAdd.length} already in the list`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });
    }

    cache_allowedList = await getAllowedList();
}

async function removeBulkFromAllowedList(items: ContextMenuEmoji[]) {
    const itemsToRemove = items.filter(item => itemAlreadyInList(item));
    await DataStore.set(DATA_COLLECTION_NAME, cache_allowedList.filter(emoji => {
        return !itemsToRemove.some(item => item.name === emoji.name);
    }));

    if (!settings.store.disableToasts) {
        Toasts.show({
            message: `Removed ${itemsToRemove.length} emojis from the list`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });
    }

    cache_allowedList = await getAllowedList();
}

async function addToAllowedList(item: ContextMenuEmoji) {
    if (!itemAlreadyInList(item)) {
        let emojiData: CustomEmoji | null = null;

        if (!item.surrogates) {
            emojiData = EmojiStore.getCustomEmojiById(item.id);
        }

        const saveData: customSaveEmoji = {
            type: "emoji",
            id: item.id,
            name: item.name,
            surrogates: item.surrogates,
        };

        if (emojiData && emojiData.guildId) {
            saveData.url = `https://cdn.discordapp.com/emojis/${emojiData.id}.${emojiData.animated ? "gif" : "png"}`;
            saveData.guildId = emojiData.guildId;
            saveData.animated = emojiData.animated;
        }

        await DataStore.set(DATA_COLLECTION_NAME, [...cache_allowedList, { ...saveData }]);

        if (!settings.store.disableToasts) {
            Toasts.show({
                message: `Added "${item.name}" to the list`,
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
                options: {
                    duration: 3000,
                    position: Toasts.Position.BOTTOM
                }
            });
        }
    } else {
        if (!settings.store.disableToasts) {
            Toasts.show({
                message: `"${item.name}" is already in the list`,
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
                options: {
                    duration: 3000,
                    position: Toasts.Position.BOTTOM
                }
            });
        }
    }

    cache_allowedList = await getAllowedList();
}

async function removeFromAllowedList(item: ContextMenuEmoji) {
    if (itemAlreadyInList(item)) {
        await DataStore.set(DATA_COLLECTION_NAME, cache_allowedList.filter(emoji => {
            return emoji.name !== item.name;
        }));

        if (!settings.store.disableToasts) {
            Toasts.show({
                message: `Removed "${item.name}" from the list`,
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
                options: {
                    duration: 3000,
                    position: Toasts.Position.BOTTOM
                }
            });
        }
    } else {
        if (!settings.store.disableToasts) {
            Toasts.show({
                message: `"${item.name}" is not in the list`,
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
                options: {
                    duration: 3000,
                    position: Toasts.Position.BOTTOM
                }
            });
        }
    }

    cache_allowedList = await getAllowedList();
}

const expressionPickerPatch: NavContextMenuPatchCallback = (children, { target }: { target: Target; }) => {
    const { dataset } = target;

    if (!dataset) return;
    if (dataset.type !== "emoji") return;

    const emoji = dataset as ContextMenuEmoji;

    if ("name" in emoji) {
        children.push(buildMenuItems(emoji));
    }
};

const guildContextPatch: NavContextMenuPatchCallback = (children, { guild }: { guild: { id: string; name: string; }; }) => {
    children.push(buildGuildContextPatch(guild));
};

const buildGuildContextPatch = (guild: { id: string; name: string; }) => {
    return (
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="add-white-list-guild-emojis"
                key="add-white-list-guild-emojis"
                label="Add All Guild Emojis"
                action={() => {
                    const { id, name } = guild;
                    const emojis = EmojiStore.getGuildEmoji(id);
                    addBulkToAllowedList(emojis.map(emoji => ({
                        type: "emoji",
                        id: emoji.id,
                        name: emoji.name
                    })));
                }}
            />
            <Menu.MenuItem
                id="remove-white-list-guild-emojis"
                key="remove-white-list-guild-emojis"
                label="Remove All Guild Emojis"
                action={() => {
                    const { id, name } = guild;
                    const emojis = EmojiStore.getGuildEmoji(id);
                    removeBulkFromAllowedList(emojis.map(emoji => ({
                        type: "emoji",
                        id: emoji.id,
                        name: emoji.name
                    })));
                }}
            />
        </Menu.MenuGroup>
    );
};

function buildMenuItems(emoji: ContextMenuEmoji) {
    const typeString = itemAlreadyInList(emoji) ? "Remove" : "Add";
    return (
        <>
            <Menu.MenuSeparator />
            <Menu.MenuItem
                id={`white-list-emoji-${typeString}`}
                key={`white-list-emoji-${typeString}`}
                label={`${typeString} to Whitelist`}
                action={() => {
                    if (typeString === "Add") {
                        addToAllowedList(emoji);
                    } else {
                        removeFromAllowedList(emoji);
                    }
                }}
            />
        </>
    );
}

const WhiteListedEmojisComponent = (): JSX.Element => {
    const [whitelistedEmojis, setWhitelistedEmojis] = useState<customSaveEmoji[]>([]);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchAllowedList = async () => {
            const allowedList = await getAllowedList() as customSaveEmoji[];
            setWhitelistedEmojis(allowedList);
        };
        fetchAllowedList();
    }, []);

    const handleRemoveEmoji = async (emoji: customSaveEmoji) => {
        await removeFromAllowedList(emoji);
        setWhitelistedEmojis(await getAllowedList() as customSaveEmoji[]);
    };

    const handleRemoveAllEmojis = async (guildId: string) => {
        const emojisToRemove = whitelistedEmojis.filter(emoji => emoji.guildId === guildId || (guildId === "default" && !emoji.guildId));
        for (const emoji of emojisToRemove) {
            await removeFromAllowedList(emoji);
        }
        setWhitelistedEmojis(await getAllowedList() as customSaveEmoji[]);
    };

    const toggleGroupCollapse = (guildId: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [guildId]: !prev[guildId]
        }));
    };

    const groupedEmojis = whitelistedEmojis.reduce((groups, emoji) => {
        const groupKey = emoji.guildId || "default";
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(emoji);
        return groups;
    }, {} as Record<string, customSaveEmoji[]>);

    return (
        <div className="emoji-container">
            {Object.entries(groupedEmojis).map(([guildId, emojis]) => (
                <div key={guildId} className="guild-section">
                    <div className="guild-header">
                        <h3 className="guild-name" onClick={() => toggleGroupCollapse(guildId)}>
                            {guildId === "default" ? "Default Emojis" : `${GuildStore.getGuild(guildId)?.name || `Guild ${guildId}`} Emojis`}
                        </h3>
                        <Button
                            className="remove-all-button"
                            size="small"
                            look="outlined"
                            color="red"
                            onClick={() => handleRemoveAllEmojis(guildId)}
                        >
                            Remove All
                        </Button>
                    </div>
                    {!collapsedGroups[guildId] && (
                        <div className="guild-emojis">
                            {emojis.map(emoji => (
                                <div key={emoji.id || emoji.name} className="emoji-item">
                                    <span className="emoji-name">{emoji.name}</span>
                                    {emoji.surrogates ? (
                                        <span className="emoji-surrogate">{emoji.surrogates}</span>
                                    ) : (
                                        <img
                                            className="emoji-image"
                                            src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}`}
                                            alt={emoji.name}
                                        />
                                    )}
                                    <Button
                                        className="remove-button"
                                        size="small"
                                        look="outlined"
                                        color="red"
                                        onClick={() => handleRemoveEmoji(emoji)}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {whitelistedEmojis.length === 0 && (
                <span className="no-emoji-message">No emojis in the whitelist.</span>
            )}
        </div>
    );
};

const exportEmojis = async () => {
    const fileName = "whitelisted-emojis.json";
    const exportData = await exportEmojisToJson();
    const data = new TextEncoder().encode(exportData);

    if (IS_WEB || IS_EQUIBOP || IS_VESKTOP) {
        const file = new File([data], fileName, { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = fileName;

        document.body.appendChild(a);
        a.click();
        setImmediate(() => {
            URL.revokeObjectURL(a.href);
            document.body.removeChild(a);
        });
    } else {
        DiscordNative.fileManager.saveWithDialog(data, fileName);
    }

    if (!settings.store.disableToasts) {
        Toasts.show({
            message: "Successfully exported emojis",
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });
    }
};

async function exportEmojisToJson() {
    const emojis = await getAllowedList();
    return JSON.stringify({ emojis }, null, 4);
}

const uploadEmojis = async () => {
    if (IS_WEB || IS_EQUIBOP || IS_VESKTOP) {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        input.accept = "application/json";
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async () => {
                const data = reader.result as string;
                await importEmojis(data);
            };

            reader.readAsText(file);
        };

        document.body.appendChild(input);
        input.click();
        setImmediate(() => {
            document.body.removeChild(input);
        });
    } else {
        const [file] = await DiscordNative.fileManager.openFiles({
            filters: [
                { name: "Whitelisted Emojis", extensions: ["json"] },
                { name: "all", extensions: ["*"] }
            ]
        });

        if (file) {
            try {
                await importEmojis(new TextDecoder().decode(file.data));
            } catch (err) {
                console.error(err);
                if (!settings.store.disableToasts) {
                    Toasts.show({
                        message: `Failed to import emojis: ${err}`,
                        type: Toasts.Type.FAILURE,
                        id: Toasts.genId(),
                        options: {
                            duration: 3000,
                            position: Toasts.Position.BOTTOM
                        }
                    });
                }
            }
        }
    }
};

const importEmojis = async (data: string) => {
    try {
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.emojis)) {
            await DataStore.set(DATA_COLLECTION_NAME, parsed.emojis);
            cache_allowedList = await getAllowedList();

            if (!settings.store.disableToasts) {
                Toasts.show({
                    message: "Successfully imported emojis",
                    type: Toasts.Type.SUCCESS,
                    id: Toasts.genId(),
                    options: {
                        duration: 3000,
                        position: Toasts.Position.BOTTOM
                    }
                });
            }
        } else {
            if (!settings.store.disableToasts) {
                Toasts.show({
                    message: "Invalid JSON data",
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                    options: {
                        duration: 3000,
                        position: Toasts.Position.BOTTOM
                    }
                });
            }
        }
    } catch (err) {
        if (!settings.store.disableToasts) {
            Toasts.show({
                message: `Failed to import emojis: ${err}`,
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
                options: {
                    duration: 3000,
                    position: Toasts.Position.BOTTOM
                }
            });
        }
    }
};

const resetEmojis = async () => {
    await DataStore.set(DATA_COLLECTION_NAME, []);
    cache_allowedList = await getAllowedList();

    if (!settings.store.disableToasts) {
        Toasts.show({
            message: "Reset emojis",
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
            options: {
                duration: 3000,
                position: Toasts.Position.BOTTOM
            }
        });
    }
};

const settings = definePluginSettings({
    defaultEmojis: {
        type: OptionType.BOOLEAN,
        description: "Hide default emojis",
        default: true
    },
    serverEmojis: {
        type: OptionType.BOOLEAN,
        description: "Hide server emojis",
        default: true
    },
    disableToasts: {
        type: OptionType.BOOLEAN,
        description: "Disable toasts",
        default: false
    },
    whiteListedEmojis: {
        type: OptionType.COMPONENT,
        description: "Whitelisted Emojis",
        component: WhiteListedEmojisComponent
    },
    exportEmojis: {
        type: OptionType.COMPONENT,
        description: "Export Emojis",
        component: () => (
            <Button onClick={exportEmojis}>Export Emojis</Button>
        )
    },
    importEmojis: {
        type: OptionType.COMPONENT,
        description: "Import Emojis",
        component: () => (
            <Button onClick={() =>
                Alerts.show({
                    title: "Are you sure?",
                    body: "This will overwrite your current whitelist.",
                    confirmText: "Import",
                    confirmColor: Button.Colors.RED,
                    cancelText: "Cancel",
                    onConfirm: async () => {
                        await DataStore.set(DATA_COLLECTION_NAME, []);
                        await uploadEmojis();
                    }
                })}>
                Import Emojis
            </Button>
        )
    },
    resetEmojis: {
        type: OptionType.COMPONENT,
        description: "Reset Emojis",
        component: () => (
            <Button onClick={() =>
                Alerts.show({
                    title: "Are you sure?",
                    body: "This will remove all emojis from your whitelist.",
                    confirmText: "Reset",
                    confirmColor: Button.Colors.RED,
                    cancelText: "Cancel",
                    onConfirm: resetEmojis
                })}>
                Reset Emojis
            </Button>
        )
    }
});

migratePluginSettings("WhitelistedEmojis", "NoDefaultEmojis");
export default definePlugin({
    name: "WhitelistedEmojis",
    description: "Adds the ability to disable all message emojis except for a whitelisted set.",
    authors: [EquicordDevs.creations],
    patches: [
        {
            find: ".Messages.EMOJI_MATCHING",
            replacement: {
                match: /renderResults\((\i)\){/,
                replace: "$&$1.results.emojis=$self.filterEmojis($1);if($1.results.emojis.length===0)return;"
            }
        }
    ],
    settings: settings,
    async start() {
        cache_allowedList = await getAllowedList();
        addContextMenuPatch("expression-picker", expressionPickerPatch);
        addContextMenuPatch("guild-context", guildContextPatch);
    },
    stop() {
        removeContextMenuPatch("expression-picker", expressionPickerPatch);
        removeContextMenuPatch("guild-context", guildContextPatch);
    },
    filterEmojis: (data: { results: { emojis: (CustomEmoji | UnicodeEmoji)[]; }; }) => {
        const { emojis } = data.results;
        let modifiedEmojis = emojis;

        if (settings.store.defaultEmojis) {
            modifiedEmojis = modifiedEmojis.filter(emoji => !("uniqueName" in emoji) || isItemAllowed(emoji));
        }

        if (settings.store.serverEmojis) {
            modifiedEmojis = modifiedEmojis.filter(emoji => "uniqueName" in emoji || isItemAllowed(emoji));
        }

        return modifiedEmojis;
    }
});
