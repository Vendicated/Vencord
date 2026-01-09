/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import NoReplyMentionPlugin from "@plugins/noReplyMention";
import { Devs, EquicordDevs } from "@utils/constants";
import { copyWithToast, insertTextIntoChatInputBox } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Channel, Message } from "@vencord/discord-types";
import { ApplicationIntegrationType, MessageFlags } from "@vencord/discord-types/enums";
import { AuthenticationStore, Constants, EditMessageStore, FluxDispatcher, MessageActions, MessageTypeSets, PermissionsBits, PermissionStore, PinActions, RestAPI, Toasts, WindowStore } from "@webpack/common";

let isKeyPressed = false;
const keydown = (e: KeyboardEvent) => {
    const key = settings.store.keySelection === "backspace" ? "Backspace" : "Delete";
    if (e.key === key) {
        isKeyPressed = true;
    }
};
const keyup = (e: KeyboardEvent) => {
    const key = settings.store.keySelection === "backspace" ? "Backspace" : "Delete";
    if (e.key === key) {
        isKeyPressed = false;
    }
};
const focusChanged = () => !WindowStore.isFocused() && (isKeyPressed = false);

let doubleClickTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingDoubleClickAction: (() => void) | null = null;

enum ClickAction {
    NONE = "none",
    DELETE = "delete",
    EDIT = "edit",
    REPLY = "reply",
    COPY_CONTENT = "copy_content",
    COPY_LINK = "copy_link",
    COPY_MESSAGE_ID = "copy_message_id",
    COPY_USER_ID = "copy_user_id",
    QUOTE = "quote",
    REACT = "react",
    PIN = "pin"
}

const settings = definePluginSettings({
    backspaceClickAction: {
        type: OptionType.SELECT,
        description: "Action when holding Backspace and clicking a message",
        options: [
            { label: "Delete Message", value: ClickAction.DELETE, default: true },
            { label: "Copy Content", value: ClickAction.COPY_CONTENT },
            { label: "Copy Link", value: ClickAction.COPY_LINK },
            { label: "Copy Message ID", value: ClickAction.COPY_MESSAGE_ID },
            { label: "Copy User ID", value: ClickAction.COPY_USER_ID },
            { label: "None (Disabled)", value: ClickAction.NONE }
        ]
    },
    keySelection: {
        type: OptionType.SELECT,
        description: "Key to use for click actions (Backspace or Delete)",
        options: [
            { label: "Backspace", value: "backspace", default: true },
            { label: "Delete", value: "delete" }
        ]
    },
    doubleClickAction: {
        type: OptionType.SELECT,
        description: "Action on double-click (on your messages)",
        options: [
            { label: "Edit Message", value: ClickAction.EDIT, default: true },
            { label: "Quote", value: ClickAction.QUOTE },
            { label: "Copy Content", value: ClickAction.COPY_CONTENT },
            { label: "Copy Link", value: ClickAction.COPY_LINK },
            { label: "Copy Message ID", value: ClickAction.COPY_MESSAGE_ID },
            { label: "Copy User ID", value: ClickAction.COPY_USER_ID },
            { label: "React", value: ClickAction.REACT },
            { label: "Pin Message", value: ClickAction.PIN },
            { label: "None (Disabled)", value: ClickAction.NONE }
        ]
    },
    doubleClickOthersAction: {
        type: OptionType.SELECT,
        description: "Action on double-click (on others' messages)",
        options: [
            { label: "Reply", value: ClickAction.REPLY, default: true },
            { label: "Quote", value: ClickAction.QUOTE },
            { label: "Copy Content", value: ClickAction.COPY_CONTENT },
            { label: "Copy Link", value: ClickAction.COPY_LINK },
            { label: "Copy Message ID", value: ClickAction.COPY_MESSAGE_ID },
            { label: "Copy User ID", value: ClickAction.COPY_USER_ID },
            { label: "React", value: ClickAction.REACT },
            { label: "Pin Message", value: ClickAction.PIN },
            { label: "None (Disabled)", value: ClickAction.NONE }
        ]
    },
    tripleClickAction: {
        type: OptionType.SELECT,
        description: "Action on triple-click",
        options: [
            { label: "React", value: ClickAction.REACT, default: true },
            { label: "Edit Message", value: ClickAction.EDIT },
            { label: "Reply", value: ClickAction.REPLY },
            { label: "Quote", value: ClickAction.QUOTE },
            { label: "Copy Content", value: ClickAction.COPY_CONTENT },
            { label: "Copy Link", value: ClickAction.COPY_LINK },
            { label: "Copy Message ID", value: ClickAction.COPY_MESSAGE_ID },
            { label: "Copy User ID", value: ClickAction.COPY_USER_ID },
            { label: "Pin Message", value: ClickAction.PIN },
            { label: "None (Disabled)", value: ClickAction.NONE }
        ]
    },
    reactEmoji: {
        type: OptionType.STRING,
        description: "Emoji to use for react actions (e.g. 💀 or pepe:123456789)",
        default: "💀"
    },
    requireModifier: {
        type: OptionType.BOOLEAN,
        description: "Only perform click actions when shift or ctrl is held",
        default: false
    },
    disableInDms: {
        type: OptionType.BOOLEAN,
        description: "Disable all click actions in direct messages",
        default: false
    },
    disableInSystemDms: {
        type: OptionType.BOOLEAN,
        description: "Disable all click actions in system DMs (e.g. Clyde, Discord)",
        default: true
    },
    clickTimeout: {
        type: OptionType.NUMBER,
        description: "Timeout in milliseconds to distinguish double/triple clicks",
        default: 300
    },
    quoteWithReply: {
        type: OptionType.BOOLEAN,
        description: "When quoting, also reply to the message",
        default: true
    },
    useSelectionForQuote: {
        type: OptionType.BOOLEAN,
        description: "When quoting, use selected text if available (otherwise quotes full message)",
        default: false
    }
});

function showWarning(message: string) {
    Toasts.show({
        message,
        type: Toasts.Type.FAILURE,
        id: Toasts.genId(),
        options: {
            duration: 3000
        }
    });
}

function executeCommonAction(action: ClickAction, channel: Channel, msg: Message): boolean {
    switch (action) {
        case ClickAction.COPY_CONTENT:
            copyWithToast(msg.content || "", "Message content copied!");
            return true;
        case ClickAction.COPY_LINK:
            copyWithToast(`https://discord.com/channels/${channel.guild_id ?? "@me"}/${channel.id}/${msg.id}`, "Message link copied!");
            return true;
        case ClickAction.COPY_MESSAGE_ID:
            copyWithToast(msg.id, "Message ID copied!");
            return true;
        case ClickAction.COPY_USER_ID:
            copyWithToast(msg.author.id, "User ID copied!");
            return true;
    }
    return false;
}

function isMessageReplyable(msg: Message) {
    return MessageTypeSets.REPLYABLE.has(msg.type) && !msg.hasFlag(MessageFlags.EPHEMERAL);
}

async function toggleReaction(channelId: string, messageId: string, emoji: string, channel: Channel, msg: Message) {
    const trimmed = emoji.trim();
    if (!trimmed) return;

    if (!PermissionStore.can(PermissionsBits.ADD_REACTIONS, channel) || !PermissionStore.can(PermissionsBits.READ_MESSAGE_HISTORY, channel)) {
        showWarning("Cannot react: Missing permissions");
        return;
    }

    const customMatch = trimmed.match(/^:?([\w-]+):(\d+)$/);
    const emojiParam = customMatch
        ? `${customMatch[1]}:${customMatch[2]}`
        : trimmed;

    const hasReacted = msg.reactions?.some(r => {
        const reactionEmoji = r.emoji.id
            ? `${r.emoji.name}:${r.emoji.id}`
            : r.emoji.name;
        return r.me && reactionEmoji === emojiParam;
    });

    try {
        if (hasReacted) {
            await RestAPI.del({
                url: Constants.Endpoints.REACTION(channelId, messageId, emojiParam, "@me")
            });
        } else {
            await RestAPI.put({
                url: Constants.Endpoints.REACTION(channelId, messageId, emojiParam, "@me")
            });
        }
    } catch (e) {
        new Logger("MessageClickActions").error("Failed to toggle reaction:", e);
    }
}

function togglePin(channel: Channel, msg: Message) {
    if (!PermissionStore.can(PermissionsBits.MANAGE_MESSAGES, channel)) {
        showWarning("Cannot pin: Missing permissions");
        return;
    }

    if (msg.pinned) {
        PinActions.unpinMessage(channel, msg.id);
    } else {
        PinActions.pinMessage(channel, msg.id);
    }
}

function quoteMessage(channel: Channel, msg: Message) {
    if (!isMessageReplyable(msg)) {
        showWarning("Cannot quote this message type");
        return;
    }

    let { content } = msg;
    if (settings.store.useSelectionForQuote) {
        const selection = window.getSelection()?.toString().trim();
        if (selection && msg.content?.includes(selection)) {
            content = selection;
        }
    }
    if (!content) return;

    const quoteText = content.split("\n").map(line => `> ${line}`).join("\n") + "\n";

    insertTextIntoChatInputBox(quoteText);

    if (settings.store.quoteWithReply) {
        FluxDispatcher.dispatch({
            type: "CREATE_PENDING_REPLY",
            channel,
            message: msg,
            shouldMention: false,
            showMentionToggle: !channel.isPrivate()
        });
    }
}

export default definePlugin({
    name: "MessageClickActions",
    description: "Customize message click actions - choose what happens when you click, double-click, or hold backspace",
    authors: [Devs.Ven, EquicordDevs.keyages, EquicordDevs.ZcraftElite],
    isModified: true,

    settings,

    start() {
        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);
        WindowStore.addChangeListener(focusChanged);
    },

    stop() {
        document.removeEventListener("keydown", keydown);
        document.removeEventListener("keyup", keyup);
        WindowStore.removeChangeListener(focusChanged);

        if (doubleClickTimeout) {
            clearTimeout(doubleClickTimeout);
            doubleClickTimeout = null;
        }
        pendingDoubleClickAction = null;
    },

    onMessageClick(msg, channel, event) {
        const myId = AuthenticationStore.getId();
        const isMe = msg.author.id === myId;
        const isSelfInvokedUserApp = msg.interactionMetadata?.authorizing_integration_owners[ApplicationIntegrationType.USER_INSTALL] === myId;
        const isDM = channel.isDM();
        const isSystemDM = channel.isSystemDM();

        if ((settings.store.disableInDms && isDM) || (settings.store.disableInSystemDms && isSystemDM)) return;

        if (isKeyPressed) {
            const action = settings.store.backspaceClickAction;
            if (action === ClickAction.NONE) return;

            if (action === ClickAction.DELETE) {
                if (!(isMe || PermissionStore.can(PermissionsBits.MANAGE_MESSAGES, channel) || isSelfInvokedUserApp)) {
                    showWarning("Cannot delete: Missing permissions");
                    return;
                }

                if (msg.deleted) {
                    FluxDispatcher.dispatch({
                        type: "MESSAGE_DELETE",
                        channelId: channel.id,
                        id: msg.id,
                        mlDeleted: true
                    });
                } else {
                    MessageActions.deleteMessage(channel.id, msg.id);
                }
            } else if (executeCommonAction(action, channel, msg)) {
                event.preventDefault();
                return;
            }
        }

        if (event.detail === 3) {
            if (doubleClickTimeout) {
                clearTimeout(doubleClickTimeout);
                doubleClickTimeout = null;
                pendingDoubleClickAction = null;
            }

            const action = settings.store.tripleClickAction;
            if (action === ClickAction.NONE) return;

            if (action === ClickAction.REACT) {
                toggleReaction(channel.id, msg.id, settings.store.reactEmoji, channel, msg);
            } else if (action === ClickAction.EDIT) {
                if (!isMe) return;
                if (EditMessageStore.isEditing(channel.id, msg.id) || msg.state !== "SENT") return;
                MessageActions.startEditMessage(channel.id, msg.id, msg.content);
            } else if (action === ClickAction.REPLY) {
                if (channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel)) {
                    showWarning("Cannot reply: Missing permissions");
                    return;
                }
                if (!isMessageReplyable(msg)) {
                    showWarning("Cannot reply to this message type");
                    return;
                }

                FluxDispatcher.dispatch({
                    type: "CREATE_PENDING_REPLY",
                    channel,
                    message: msg,
                    shouldMention: !isMe,
                    showMentionToggle: !channel.isPrivate()
                });
            } else if (executeCommonAction(action, channel, msg)) {
                event.preventDefault();
                return;
            } else if (action === ClickAction.QUOTE) {
                quoteMessage(channel, msg);
            } else if (action === ClickAction.PIN) {
                togglePin(channel, msg);
            }
            event.preventDefault();
            return;
        }

        if (event.detail !== 2) return;
        if (settings.store.requireModifier && !event.ctrlKey && !event.shiftKey) return;
        if (msg.deleted === true) return;

        const executeDoubleClick = () => {
            const action = isMe ? settings.store.doubleClickAction : settings.store.doubleClickOthersAction;
            if (action === ClickAction.NONE) return;

            if (action === ClickAction.EDIT) {
                if (!isMe) return;
                if (EditMessageStore.isEditing(channel.id, msg.id) || msg.state !== "SENT") return;
                MessageActions.startEditMessage(channel.id, msg.id, msg.content);
            } else if (action === ClickAction.REPLY) {
                if (isMe) return;
                if (channel.guild_id && !PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel)) {
                    showWarning("Cannot reply: Missing permissions");
                    return;
                }
                if (!isMessageReplyable(msg)) {
                    showWarning("Cannot reply to this message type");
                    return;
                }

                const isShiftPress = event.shiftKey && !settings.store.requireModifier;
                const shouldMention = isPluginEnabled(NoReplyMentionPlugin.name)
                    ? NoReplyMentionPlugin.shouldMention(msg, isShiftPress)
                    : !isShiftPress;

                FluxDispatcher.dispatch({
                    type: "CREATE_PENDING_REPLY",
                    channel,
                    message: msg,
                    shouldMention,
                    showMentionToggle: !channel.isPrivate()
                });
            } else if (executeCommonAction(action, channel, msg)) {
                event.preventDefault();
                return;
            } else if (action === ClickAction.QUOTE) {
                quoteMessage(channel, msg);
            } else if (action === ClickAction.REACT) {
                toggleReaction(channel.id, msg.id, settings.store.reactEmoji, channel, msg);
            } else if (action === ClickAction.PIN) {
                togglePin(channel, msg);
            }
        };

        if (settings.store.tripleClickAction !== ClickAction.NONE) {
            if (doubleClickTimeout) {
                clearTimeout(doubleClickTimeout);
            }
            pendingDoubleClickAction = executeDoubleClick;
            doubleClickTimeout = setTimeout(() => {
                pendingDoubleClickAction?.();
                pendingDoubleClickAction = null;
                doubleClickTimeout = null;
            }, settings.store.clickTimeout);
            event.preventDefault();
        } else {
            executeDoubleClick();
            event.preventDefault();
        }
    },
});
