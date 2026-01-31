/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { RestAPI, UserStore } from "@webpack/common";

interface DeleteState {
    delCount: number;
    grandTotal: number;
    running: boolean;
    startTime: Date | null;
}

const settings = definePluginSettings({
    searchDelay: {
        type: OptionType.NUMBER,
        description: "Search delay in milliseconds",
        default: 150,
    },
    deleteDelay: {
        type: OptionType.NUMBER,
        description: "Delete delay in milliseconds",
        default: 120,
    },
});

let deleteState: DeleteState = {
    delCount: 0,
    grandTotal: 0,
    running: false,
    startTime: null,
};

function resetState() {
    deleteState = {
        delCount: 0,
        grandTotal: 0,
        running: false,
        startTime: null,
    };
}

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchMessages(channelId: string, authorId?: string, offset?: number) {
    const params: any = {
        author_id: authorId,
        include_nsfw: true,
    };

    if (offset) {
        params.offset = offset;
    }

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/channels/${channelId}/messages/search?${queryString}`;

    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await RestAPI.get({ url: endpoint });
            return response.body;
        } catch (err: any) {
            console.error(`Search failed (attempt ${attempt + 1}):`, err);
            if (attempt === maxRetries - 1) {
                return null;
            }
            await wait(300 * Math.pow(2, attempt));
        }
    }
    return null;
}

async function deleteMessage(channelId: string, messageId: string) {
    const maxRetries = 5;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await RestAPI.del({
                url: `/channels/${channelId}/messages/${messageId}`,
            });
            deleteState.delCount++;
            return true;
        } catch (err: any) {
            if (attempt === maxRetries - 1) {
                console.error("Delete failed after retries:", err);
                return false;
            }
            await wait(200 * Math.pow(2, attempt));
        }
    }
    return false;
}

async function deleteMessagesInChannel(channelId: string, authorId: string) {
    if (deleteState.running) {
        sendBotMessage(channelId, {
            content: "A deletion process is already running.",
        });
        return;
    }

    deleteState.running = true;
    deleteState.startTime = new Date();
    let offset = 0;
    let consecutiveFailures = 0;
    let emptySearchCount = 0;

    sendBotMessage(channelId, {
        content: "Starting message deletion...",
    });

    try {
        while (deleteState.running) {
            await wait(settings.store.searchDelay);

            const searchResult = await searchMessages(channelId, authorId, offset);

            if (!searchResult || !searchResult.messages || searchResult.messages.length === 0) {
                emptySearchCount++;
                
                if (emptySearchCount < 5) {
                    offset = 0;
                    await wait(2000);
                    continue;
                }
                
                break;
            }

            emptySearchCount = 0;
            consecutiveFailures = 0;
            const messages = searchResult.messages.flat();
            deleteState.grandTotal = searchResult.total_results || messages.length;

            let deletedInBatch = 0;
            for (const message of messages) {
                if (!deleteState.running) break;

                await wait(settings.store.deleteDelay);
                const success = await deleteMessage(channelId, message.id);
                
                if (success) {
                    deletedInBatch++;
                } else {
                    await wait(1000);
                }

                if (deleteState.delCount % 50 === 0 && deleteState.delCount > 0) {
                    const progress = deleteState.grandTotal > 0 
                        ? Math.round((deleteState.delCount / deleteState.grandTotal) * 100)
                        : 0;
                    sendBotMessage(channelId, {
                        content: `Progress: ${progress}% (${deleteState.delCount} deleted)`,
                    });
                }
            }

            if (deletedInBatch === 0) {
                consecutiveFailures++;
                if (consecutiveFailures >= 3) {
                    await wait(5000);
                    consecutiveFailures = 0;
                }
            }

            if (messages.length < 25) {
                offset = 0;
                await wait(2000);
            } else {
                offset += 25;
            }
        }

        const elapsed = deleteState.startTime
            ? Math.round((Date.now() - deleteState.startTime.getTime()) / 1000)
            : 0;

        sendBotMessage(channelId, {
            content: `Deletion completed.\nDeleted: ${deleteState.delCount} messages\nTime: ${elapsed}s`,
        });
    } catch (err) {
        sendBotMessage(channelId, {
            content: `Error occurred: ${err}`,
        });
    } finally {
        resetState();
    }
}

export default definePlugin({
    name: "ClearMessages",
    description: "Delete your messages, if u want to delete ur message type to dm this command /delete ",
    authors: [Devs.pluckerpilple],
    settings,

    commands: [
        {
            name: "delete",
            description: "Delete your messages",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (args, ctx) => {
                const currentUserId = UserStore.getCurrentUser().id;
                await deleteMessagesInChannel(ctx.channel.id, currentUserId);
            },
        },
        {
            name: "stop-delete",
            description: "Stop the delete message",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: async (_, ctx) => {
                if (deleteState.running) {
                    deleteState.running = false;
                    sendBotMessage(ctx.channel.id, {
                        content: "Deletion process stopped.",
                    });
                } else {
                    sendBotMessage(ctx.channel.id, {
                        content: "No deletion process is running.",
                    });
                }
            },
        },
    ],
});