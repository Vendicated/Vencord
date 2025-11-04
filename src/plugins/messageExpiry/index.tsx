/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, UserStore } from "@webpack/common";
import moment, { Moment } from "moment";

const MessageActions = findByPropsLazy("deleteMessage", "editMessage");
const settings = definePluginSettings({
    pauseExpiry: {
        type: OptionType.BOOLEAN,
        description: "/toggle_expiry. Temporarily pause message expiration. Messages sent while this is enabled won't expire, but the ones before will continue to expire.",
        default: false,
    },
    expiryNotification: {
        type: OptionType.BOOLEAN,
        description: "Get a notification for each deleted message. Might be a bit annoying at times.",
        default: false,
    },
    willExpireNotification: {
        type: OptionType.BOOLEAN,
        description: "Get a notification when you send a message that will expire. Might be a bit annoying at times.",
        default: false,
    },
    expirySeconds: {
        type: OptionType.NUMBER,
        description: "How many seconds to wait before deleting a message.",
        default: 600,
    },
    editMessageBeforeDeleting: {
        type: OptionType.BOOLEAN,
        description: "Replace the message content with a random number before deleting.",
        default: true,
    },
    excludeDirectMessages: {
        type: OptionType.BOOLEAN,
        description: "DMs do not expire.",
        default: true,
    },
    excludedChannels: {
        type: OptionType.STRING,
        description: "Use /add_channel_to_expiry_exclusion, /remove_channel_from_expiry_exclusion. Messages in these channels do not expire. Use developer tools to get the id. (example value: 1232,6324534,12353)",
        default: "",
    },
    excludedGuilds: {
        type: OptionType.STRING,
        description: "Use /add_guild_to_expiry_exclusion, /remove_guild_from_expiry_exclusion. Messages in these servers do not expire. Use developer tools to get the id. (example value: 122312,63234534,123523123)",
        default: "",
    }
});

const logger = new Logger("MessageExpiry");

interface StoredMessageIdentifier {
    channelId: string;
    id: string;
    timestamp: Moment;
    expirySeconds: number;
}

class MessageStore {
    private db: StoredMessageIdentifier[] = [];
    private pruneIntervalId: NodeJS.Timeout | null = null;

    addMessage(msg: StoredMessageIdentifier): void {
        const exists = this.db.some(
            existingMsg => existingMsg.id === msg.id && existingMsg.channelId === msg.channelId
        );

        if (exists) {
            return;
        }

        this.db.push(msg);

        if (settings.store.willExpireNotification) {
            showNotification({
                title: "Message wil expire.",
                body: `Expires in ${msg.expirySeconds} seconds.`,
                color: "var(--green-360)",
            });
        }
        logger.info(`Added message: ${msg.id}-${msg.channelId}`);
    }

    removeMessage(id: string, channelId: string): void {
        this.db = this.db.filter(existingMsg => {
            if (existingMsg.id === id && existingMsg.channelId === channelId) {
                logger.info(`Preemptively removed ${id}-${channelId}`);
                return false;
            }
            return true;
        });
    }

    pruneMessages(): void {
        const now = moment();
        let deleted: number = 0;
        this.db = this.db.filter(msg => {
            const timeDiffSeconds = now.diff(msg.timestamp, "seconds");
            if (timeDiffSeconds > msg.expirySeconds) {
                logger.info(`Deleting expired message ${msg.id}-${msg.channelId}`);

                if (settings.store.editMessageBeforeDeleting) {
                    MessageActions.editMessage(msg.channelId, msg.id, { content: "." });
                }
                MessageActions.deleteMessage(msg.channelId, msg.id);
                deleted += 1;
                return false;
            }
            return true;
        });

        if (settings.store.expiryNotification && deleted > 0) {
            showNotification({
                title: `Deleted ${deleted} messages.`,
                body: `There are ${this.db.length} messages left to expire.`,
                color: "var(--green-360)",
            });
        }
    }

    flushMessages(): void {
        this.db.forEach(msg => {
            MessageActions.deleteMessage(msg.channelId, msg.id);
        });

        showNotification({
            title: "All messages expired",
            body: `${this.db.length} messages have been deleted.`,
            color: "var(--green-360)",
        });

        this.db = [];
    }

    startPruning(intervalMs: number = 2000): void {
        if (this.pruneIntervalId) {
            clearInterval(this.pruneIntervalId);
        }
        this.pruneIntervalId = setInterval(() => {
            this.pruneMessages();
        }, intervalMs);
    }

    stopPruning(): void {
        if (this.pruneIntervalId) {
            clearInterval(this.pruneIntervalId);
            this.pruneIntervalId = null;
        }
    }
}

function addToExclusion(exclusionString: string, id: string): string {
    const list = exclusionString.split(",");
    list.push(id);
    const deduplicatedList = [...new Set(list)];
    return deduplicatedList.join(",");
}

function removeFromExclusion(exclusionString: string, id: string): string {
    const list = exclusionString.split(",");
    const filteredList = list.filter(item => item !== id);
    const deduplicatedList = [...new Set(filteredList)];
    return deduplicatedList.join(",");
}

function inExclusionList(exclusionString: string, id: string): boolean {
    const list = exclusionString.split(",");
    return list.some(item => item === id);
}

const msgStore = new MessageStore();

export default definePlugin({
    name: "MessageExpiry",
    description: `Set your messages to expire automatically after a certain amount of time.
    This only handles messages that you send on this specific client. If you suddenly close the client, message deletion is not guaranteed.
    To delete the remaining messages, please use /flush_expired_messages and wait for the notification confirming they have
    been deleted. Use /pause_expiry to temporarily put expiration on hold. It has the same effects as toggling the Pause option below.
    When disabling this plugin, all messages waiting to expire will be expired. Consult the whole documentation by clicking on the buttons in the right.`,

    authors: [Devs.extremq],

    settings,

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean; }) {
            if (settings.store.pauseExpiry) return; // First check if paused expiry
            if (optimistic) return;
            const isMe = message.author.id === UserStore.getCurrentUser().id;
            if (!isMe) return; // Be sure its the actual user not somebody else

            const channel = ChannelStore.getChannel(message.channel_id);
            const isDM = channel.isDM() || channel.isMultiUserDM();

            // If this channel is excluded, then we let it pass through
            if (inExclusionList(settings.store.excludedChannels, message.channel_id)) {
                return;
            }

            switch (isDM) {
                case true:
                    // If DMs are excluded, we let the message pass through
                    if (settings.store.excludeDirectMessages) return;
                    break;
                case false:
                    // If the guild is excluded, let it go through
                    if (inExclusionList(settings.store.excludedGuilds, channel.guild_id)) return;
                    break;
            }

            console.dir(message);

            msgStore.addMessage({
                id: message.id,
                channelId: message.channel_id,
                timestamp: message.timestamp,
                expirySeconds: settings.store.expirySeconds,
            });
        },
        MESSAGE_DELETE({ id, channelId }: { id: string; channelId: string; }) {
            msgStore.removeMessage(id, channelId);
        },
    },

    start() {
        msgStore.startPruning();
    },

    stop() {
        msgStore.stopPruning();
        msgStore.flushMessages();
    },

    commands: [
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "toggle_expiry",
            description: "Pause/unpause message expiration.",
            options: [],
            execute: () => {
                settings.store.pauseExpiry = !settings.store.pauseExpiry;
                showNotification({
                    title: "Pause toggled.",
                    body: `Expiry is paused: ${settings.store.pauseExpiry}`,
                    color: "var(--green-360)",
                });
            },
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "flush_expiry",
            description: "Forcefully deletes all messages. Please wait for a notification response.",
            options: [],
            execute: () => {
                msgStore.flushMessages();
            },
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "add_channel_to_expiry_exclusion",
            description: "Adds channel to the excluded list of channels.",
            options: [],
            execute: async (opts, cmdCtx) => {
                const new_rules: string = addToExclusion(settings.store.excludedChannels, cmdCtx.channel.id);
                settings.store.excludedChannels = new_rules;

                showNotification({
                    title: "New channel exclusion list.",
                    body: `Ids: ${settings.store.excludedChannels}`,
                    color: "var(--green-360)",
                });
            },
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "add_guild_to_expiry_exclusion",
            description: "Adds guild to the excluded list of guild.",
            options: [],
            execute: async (opts, cmdCtx) => {
                if (!cmdCtx.guild?.id) {
                    showNotification({
                        title: "Not a guild",
                        body: "You are not in a guild.",
                        color: "var(--red-360)",
                    });
                    return;
                }

                const new_rules: string = addToExclusion(settings.store.excludedGuilds, cmdCtx.guild?.id);
                settings.store.excludedGuilds = new_rules;

                showNotification({
                    title: "New guild exclusion list.",
                    body: `Ids: ${settings.store.excludedGuilds}`,
                    color: "var(--green-360)",
                });
            },
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "remove_channel_from_expiry_exclusion",
            description: "Removes channel from the excluded list of channels.",
            options: [],
            execute: async (opts, cmdCtx) => {
                const new_rules: string = removeFromExclusion(settings.store.excludedChannels, cmdCtx.channel.id);
                settings.store.excludedChannels = new_rules;

                showNotification({
                    title: "New channel exclusion list.",
                    body: `Ids: ${settings.store.excludedChannels}`,
                    color: "var(--green-360)",
                });
            },
        },
        {
            inputType: ApplicationCommandInputType.BUILT_IN,
            name: "remove_guild_from_expiry_exclusion",
            description: "Removes guild to the excluded list of guilds.",
            options: [],
            execute: async (opts, cmdCtx) => {
                if (!cmdCtx.guild?.id) {
                    showNotification({
                        title: "Not a guild",
                        body: "You are not in a guild.",
                        color: "var(--red-360)",
                    });
                    return;
                }

                const new_rules: string = removeFromExclusion(settings.store.excludedGuilds, cmdCtx.guild?.id);
                settings.store.excludedGuilds = new_rules;

                showNotification({
                    title: "New guild exclusion list.",
                    body: `Ids: ${settings.store.excludedGuilds}`,
                    color: "var(--green-360)",
                });
            },
        },
    ]
});
