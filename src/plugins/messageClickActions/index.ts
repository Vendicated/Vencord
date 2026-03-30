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
import definePlugin, { makeRange, OptionType } from "@utils/types";
import type { Channel, Message } from "@vencord/discord-types";
import { ApplicationIntegrationType, MessageFlags } from "@vencord/discord-types/enums";
import { AuthenticationStore, Constants, EditMessageStore, FluxDispatcher, MessageActions, MessageTypeSets, PermissionsBits, PermissionStore, PinActions, RestAPI, Toasts, WindowStore } from "@webpack/common";

import { AdditionalReactEmojisSetting, MAX_ADDITIONAL_REACT_EMOJIS, ReactEmojiSetting } from "./ReactEmojiSetting";

type Modifier = "NONE" | "SHIFT" | "CTRL" | "ALT" | "BACKSPACE" | "DELETE";
type ClickAction = "NONE" | "DELETE" | "COPY_LINK" | "COPY_ID" | "COPY_CONTENT" | "COPY_USER_ID" | "EDIT" | "REPLY" | "REACT" | "OPEN_THREAD" | "OPEN_TAB" | "EDIT_REPLY" | "QUOTE" | "PIN";

const logger = new Logger("MessageClickActions");
const ADDITIONAL_REACTION_DELAY_MS = 300; // discord seems to rate limit this for 300ms but that might not be constant

const actions: { label: string; value: ClickAction; }[] = [
    { label: "None", value: "NONE" },
    { label: "Delete", value: "DELETE" },
    { label: "Copy Link", value: "COPY_LINK" },
    { label: "Copy ID", value: "COPY_ID" },
    { label: "Copy Content", value: "COPY_CONTENT" },
    { label: "Copy User ID", value: "COPY_USER_ID" },
    { label: "Edit", value: "EDIT" },
    { label: "Reply", value: "REPLY" },
    { label: "React", value: "REACT" },
    { label: "Open Thread", value: "OPEN_THREAD" },
    { label: "Open Tab", value: "OPEN_TAB" }
];

const doubleClickOwnActions: { label: string; value: ClickAction; }[] = [
    { label: "None", value: "NONE" },
    { label: "Delete", value: "DELETE" },
    { label: "Reply", value: "REPLY" },
    { label: "Edit", value: "EDIT" },
    { label: "Quote", value: "QUOTE" },
    { label: "Copy Content", value: "COPY_CONTENT" },
    { label: "Copy Link", value: "COPY_LINK" },
    { label: "Copy ID", value: "COPY_ID" },
    { label: "Copy User ID", value: "COPY_USER_ID" },
    { label: "React", value: "REACT" },
    { label: "Pin", value: "PIN" }
];

const doubleClickOthersActions: { label: string; value: ClickAction; }[] = [
    { label: "None", value: "NONE" },
    { label: "Delete", value: "DELETE" },
    { label: "Reply", value: "REPLY" },
    { label: "Quote", value: "QUOTE" },
    { label: "Copy Content", value: "COPY_CONTENT" },
    { label: "Copy Link", value: "COPY_LINK" },
    { label: "Copy ID", value: "COPY_ID" },
    { label: "Copy User ID", value: "COPY_USER_ID" },
    { label: "React", value: "REACT" },
    { label: "Pin", value: "PIN" }
];

const modifiers: { label: string; value: Modifier; }[] = [
    { label: "None", value: "NONE" },
    { label: "Shift", value: "SHIFT" },
    { label: "Ctrl", value: "CTRL" },
    { label: "Alt", value: "ALT" }
];

const singleClickModifiers: { label: string; value: Modifier; }[] = [
    { label: "Backspace", value: "BACKSPACE" },
    { label: "Delete", value: "DELETE" },
    ...modifiers
];

const pressedModifiers = new Set<Modifier>();
const keydown = (e: KeyboardEvent) => {
    const mod = modifierFromKey(e);
    if (mod) pressedModifiers.add(mod);
    if (e.key === "Backspace") pressedModifiers.add("BACKSPACE");
    if (e.key === "Delete") pressedModifiers.add("DELETE");
};
const keyup = (e: KeyboardEvent) => {
    const mod = modifierFromKey(e);
    if (mod) pressedModifiers.delete(mod);
    if (e.key === "Backspace") pressedModifiers.delete("BACKSPACE");
    if (e.key === "Delete") pressedModifiers.delete("DELETE");
};
const focusChanged = () => {
    if (!WindowStore.isFocused()) {
        pressedModifiers.clear();
    }
};

let lastMouseDownTime = 0;
const onMouseDown = () => {
    const now = Date.now();

    // TODO: this logic is messy but it works so eh
    if (mouseDownCount >= 1 && now - lastMouseDownTime < settings.store.clickTimeout) {
        if (singleClickTimeout) {
            clearTimeout(singleClickTimeout);
            singleClickTimeout = null;
        }
        doubleClickDetected = true;
        secondMouseDownTime = now;
    }

    mouseDownCount++;
    lastMouseDownTime = now;
};

function modifierFromKey(e: KeyboardEvent): Modifier | null {
    if (e.key === "Shift") return "SHIFT";
    if (e.key === "Control") return "CTRL";
    if (e.key === "Alt") return "ALT";
    return null;
}

function isModifierPressed(modifier: Modifier): boolean {
    if (modifier === "NONE") return pressedModifiers.size === 0;
    return pressedModifiers.has(modifier);
}

let doubleClickTimeout: ReturnType<typeof setTimeout> | null = null;
let singleClickTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingDoubleClickAction: (() => void) | null = null;
let doubleClickFired = false;

let mouseDownCount = 0;
let doubleClickDetected = false;
let secondMouseDownTime = 0;

export const settings = definePluginSettings({
    singleClickAction: {
        type: OptionType.SELECT,
        description: "Action on single click (your messages)",
        options: actions,
        default: "DELETE"
    },
    singleClickModifier: {
        type: OptionType.SELECT,
        description: "Modifier required for single click action (your messages)",
        options: singleClickModifiers,
        default: "BACKSPACE"
    },
    singleClickOthersAction: {
        type: OptionType.SELECT,
        description: "Action on single click (others' messages)",
        options: actions,
        default: "DELETE"
    },
    singleClickOthersModifier: {
        type: OptionType.SELECT,
        description: "Modifier required for single click action (others' messages)",
        options: singleClickModifiers,
        default: "BACKSPACE"
    },
    doubleClickAction: {
        type: OptionType.SELECT,
        description: "Action on double-click (your messages)",
        options: doubleClickOwnActions,
        default: "EDIT"
    },
    doubleClickOthersAction: {
        type: OptionType.SELECT,
        description: "Action on double-click (others' messages)",
        options: doubleClickOthersActions,
        default: "REPLY"
    },
    doubleClickModifier: {
        type: OptionType.SELECT,
        description: "Modifier required for double-click action",
        options: modifiers,
        default: "NONE"
    },
    tripleClickAction: {
        type: OptionType.SELECT,
        description: "Action on triple-click",
        options: actions,
        default: "REACT"
    },
    tripleClickModifier: {
        type: OptionType.SELECT,
        description: "Modifier required for triple-click action",
        options: modifiers,
        default: "NONE"
    },
    reactEmoji: {
        type: OptionType.COMPONENT,
        description: "Emoji to use for react actions.",
        component: ReactEmojiSetting,
        default: "💀"
    },
    addAdditionalReacts: {
        type: OptionType.BOOLEAN,
        description: "Also add additional configured reaction emojis",
        default: false
    },
    additionalReactEmojis: {
        type: OptionType.COMPONENT,
        description: `Additional emojis to add when using React action (comma/newline separated, max ${MAX_ADDITIONAL_REACT_EMOJIS})`,
        component: AdditionalReactEmojisSetting,
        get hidden() {
            return !settings.store.addAdditionalReacts;
        },
        default: ""
    },
    disableInDms: {
        type: OptionType.BOOLEAN,
        description: "Disable all click actions in direct messages",
        default: false
    },
    disableInSystemDms: {
        type: OptionType.BOOLEAN,
        description: "Disable all click actions in system DMs",
        default: true
    },
    clickTimeout: {
        type: OptionType.NUMBER,
        description: "Timeout to distinguish double/triple clicks (ms)",
        markers: makeRange(100, 500, 50),
        default: 300
    },
    doubleClickHoldThreshold: {
        type: OptionType.NUMBER,
        description: "Max hold time for double-click actions (ms). Holding longer allows text selection",
        markers: makeRange(50, 500, 50),
        default: 150
    },
    deferDoubleClickForTriple: {
        type: OptionType.BOOLEAN,
        description: "Delay double-click to allow triple-click actions (disables triple-click when off)",
        default: false
    },
    selectionHoldTimeout: {
        type: OptionType.NUMBER,
        description: "Timeout to allow text selection (ms)",
        markers: makeRange(100, 1000, 100),
        default: 300
    },
    quoteWithReply: {
        type: OptionType.BOOLEAN,
        description: "When quoting, also reply to the message",
        default: true
    },
    useSelectionForQuote: {
        type: OptionType.BOOLEAN,
        description: "When quoting, use selected text if available",
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

function clearClickTimeouts() {
    if (doubleClickTimeout) {
        clearTimeout(doubleClickTimeout);
        doubleClickTimeout = null;
    }
    if (singleClickTimeout) {
        clearTimeout(singleClickTimeout);
        singleClickTimeout = null;
    }
}

function resetClickState() {
    mouseDownCount = 0;
    doubleClickDetected = false;
    secondMouseDownTime = 0;
}

function normalizeEmoji(emoji: string): string | null {
    const trimmed = emoji.trim();
    if (!trimmed) return null;

    const customMatch = trimmed.match(/^(?:<(?:(a):)?|:)?([\w-]+?)(?:~\d+)?:([0-9]+)>?$/);
    if (customMatch) {
        return `${customMatch[2]}:${customMatch[3]}`;
    }

    return trimmed;
}

function getConfiguredReactionEmojis() {
    const baseEmoji = normalizeEmoji(settings.store.reactEmoji);
    const configured = [baseEmoji];

    if (settings.store.addAdditionalReacts) {
        const extra = settings.store.additionalReactEmojis
            .split(/[\n,]/g)
            .map(normalizeEmoji)
            .filter((emoji): emoji is string => Boolean(emoji))
            .slice(0, MAX_ADDITIONAL_REACT_EMOJIS);
        configured.push(...extra);
    }

    return Array.from(new Set(configured.filter((emoji): emoji is string => Boolean(emoji))));
}

const canSend = (channel: Channel) =>
    !channel.guild_id || PermissionStore.can(PermissionsBits.SEND_MESSAGES, channel);

const canDelete = (msg: Message, channel: Channel) => {
    const myId = AuthenticationStore.getId();
    return msg.author.id === myId ||
        PermissionStore.can(PermissionsBits.MANAGE_MESSAGES, channel) ||
        msg.interactionMetadata?.authorizing_integration_owners?.[ApplicationIntegrationType.USER_INSTALL] === myId;
};

const canReply = (msg: Message) =>
    MessageTypeSets.REPLYABLE.has(msg.type) && !msg.hasFlag(MessageFlags.EPHEMERAL);

async function toggleReaction(channelId: string, messageId: string, emoji: string, channel: Channel, msg: Message) {
    const emojiParam = normalizeEmoji(emoji);
    if (!emojiParam) return;

    if (channel.guild_id && (!PermissionStore.can(PermissionsBits.ADD_REACTIONS, channel) || !PermissionStore.can(PermissionsBits.READ_MESSAGE_HISTORY, channel))) {
        showWarning("Cannot react: Missing permissions");
        return;
    }

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
        logger.error("Failed to toggle reaction:", e);
    }
}

async function addReaction(channelId: string, messageId: string, emoji: string, channel: Channel) {
    const emojiParam = normalizeEmoji(emoji);
    if (!emojiParam) return;

    if (channel.guild_id && (!PermissionStore.can(PermissionsBits.ADD_REACTIONS, channel) || !PermissionStore.can(PermissionsBits.READ_MESSAGE_HISTORY, channel))) {
        showWarning("Cannot react: Missing permissions");
        return;
    }

    try {
        await RestAPI.put({
            url: Constants.Endpoints.REACTION(channelId, messageId, emojiParam, "@me")
        });
    } catch (e) {
        logger.error("Failed to add reaction:", e);
    }
}

async function reactWithConfiguredEmojis(channel: Channel, msg: Message) {
    const [primaryEmoji, ...additionalEmojis] = getConfiguredReactionEmojis();
    if (!primaryEmoji) return;

    await toggleReaction(channel.id, msg.id, primaryEmoji, channel, msg);

    for (const emoji of additionalEmojis) {
        await new Promise<void>(resolve => setTimeout(resolve, ADDITIONAL_REACTION_DELAY_MS));
        await addReaction(channel.id, msg.id, emoji, channel);
    }
}

function getMessageLink(msg: Message, channel: Channel) {
    const guildId = channel.guild_id ?? "@me";
    return `${window.location.origin}/channels/${guildId}/${channel.id}/${msg.id}`;
}

function copyLink(msg: Message, channel: Channel) {
    copyWithToast(getMessageLink(msg, channel), "Link copied!");
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
    if (!canReply(msg)) {
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
            showMentionToggle: !channel.isPrivate?.()
        });
    }
}

function openInNewTab(msg: Message, channel: Channel) {
    VencordNative.native.openExternal(getMessageLink(msg, channel));
}

function openInThread(msg: Message, channel: Channel) {
    FluxDispatcher.dispatch({
        type: "OPEN_THREAD_FLOW_MODAL",
        channelId: channel.id,
        messageId: msg.id
    });
}

async function executeAction(
    action: ClickAction,
    msg: Message,
    channel: Channel,
    event: MouseEvent
) {
    const myId = AuthenticationStore.getId();
    const isMe = msg.author.id === myId;

    switch (action) {
        case "DELETE":
            if (!canDelete(msg, channel)) return;

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
            event.preventDefault();
            break;

        case "COPY_LINK":
            copyLink(msg, channel);
            event.preventDefault();
            break;

        case "COPY_ID":
            copyWithToast(msg.id, "Message ID copied!");
            event.preventDefault();
            break;

        case "COPY_CONTENT":
            copyWithToast(msg.content || "", "Message content copied!");
            event.preventDefault();
            break;

        case "COPY_USER_ID":
            copyWithToast(msg.author.id, "User ID copied!");
            event.preventDefault();
            break;

        case "EDIT":
            if (!isMe) return;
            if (EditMessageStore.isEditing(channel.id, msg.id) || msg.state !== "SENT") return;
            MessageActions.startEditMessage(channel.id, msg.id, msg.content);
            event.preventDefault();
            break;

        case "REPLY":
            if (!canReply(msg)) return;
            if (!canSend(channel)) return;

            const isShiftPress = event.shiftKey;
            const shouldMention = isPluginEnabled(NoReplyMentionPlugin.name)
                ? NoReplyMentionPlugin.shouldMention(msg, isShiftPress)
                : !isShiftPress;

            FluxDispatcher.dispatch({
                type: "CREATE_PENDING_REPLY",
                channel,
                message: msg,
                shouldMention,
                showMentionToggle: channel.guild_id !== null
            });
            event.preventDefault();
            break;

        case "EDIT_REPLY":
            if (isMe) {
                if (EditMessageStore.isEditing(channel.id, msg.id) || msg.state !== "SENT") return;
                MessageActions.startEditMessage(channel.id, msg.id, msg.content);
            } else {
                if (!canReply(msg)) return;
                if (!canSend(channel)) return;

                const shouldMentionReply = isPluginEnabled(NoReplyMentionPlugin.name)
                    ? NoReplyMentionPlugin.shouldMention(msg, false)
                    : true;

                FluxDispatcher.dispatch({
                    type: "CREATE_PENDING_REPLY",
                    channel,
                    message: msg,
                    shouldMention: shouldMentionReply,
                    showMentionToggle: channel.guild_id !== null
                });
            }
            event.preventDefault();
            break;

        case "QUOTE":
            quoteMessage(channel, msg);
            event.preventDefault();
            break;

        case "PIN":
            togglePin(channel, msg);
            event.preventDefault();
            break;

        case "REACT":
            await reactWithConfiguredEmojis(channel, msg);
            event.preventDefault();
            break;

        case "OPEN_THREAD":
            openInThread(msg, channel);
            event.preventDefault();
            break;

        case "OPEN_TAB":
            openInNewTab(msg, channel);
            event.preventDefault();
            break;

        case "NONE":
            break;
    }
}

export default definePlugin({
    name: "MessageClickActions",
    description: "Customize click actions on messages.",
    authors: [Devs.Ven, EquicordDevs.keircn, EquicordDevs.ZcraftElite, EquicordDevs.omaw],
    isModified: true,

    settings,

    start() {
        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);
        document.addEventListener("mousedown", onMouseDown);
        WindowStore.addChangeListener(focusChanged);
    },

    stop() {
        document.removeEventListener("keydown", keydown);
        document.removeEventListener("keyup", keyup);
        document.removeEventListener("mousedown", onMouseDown);
        WindowStore.removeChangeListener(focusChanged);

        clearClickTimeouts();
        pendingDoubleClickAction = null;
        resetClickState();
    },

    onMessageClick(msg, channel, event) {
        let target = event.target as HTMLElement;
        if (target.nodeType === Node.TEXT_NODE) target = target.parentElement as HTMLElement;

        const myId = AuthenticationStore.getId();
        const isMe = msg.author.id === myId;
        const isDM = channel.isDM();
        const isSystemDM = channel.isSystemDM();

        if ((settings.store.disableInDms && isDM) || (settings.store.disableInSystemDms && isSystemDM)) return;

        const singleClickAction = isMe
            ? (settings.store.singleClickAction as ClickAction)
            : (settings.store.singleClickOthersAction as ClickAction);
        const doubleClickAction = isMe
            ? (settings.store.doubleClickAction as ClickAction)
            : (settings.store.doubleClickOthersAction as ClickAction);
        const tripleClickAction = settings.store.tripleClickAction as ClickAction;

        const singleClickModifier = isMe
            ? (settings.store.singleClickModifier as Modifier)
            : (settings.store.singleClickOthersModifier as Modifier);
        const doubleClickModifier = settings.store.doubleClickModifier as Modifier;
        const tripleClickModifier = settings.store.tripleClickModifier as Modifier;

        const isSingleClick = event.detail === 1 && event.button === 0;
        const isDoubleClick = event.detail === 2;
        const isTripleClick = event.detail === 3;

        if (Date.now() - lastMouseDownTime > settings.store.selectionHoldTimeout) {
            pressedModifiers.clear();
            resetClickState();
            return;
        }

        if (singleClickTimeout) {
            clearTimeout(singleClickTimeout);
            singleClickTimeout = null;
        }

        if (isTripleClick) {
            if (!settings.store.deferDoubleClickForTriple) {
                resetClickState();
                return;
            }
            if (doubleClickTimeout) {
                clearTimeout(doubleClickTimeout);
                doubleClickTimeout = null;
                pendingDoubleClickAction = null;
            }

            if (isModifierPressed(tripleClickModifier) && tripleClickAction !== "NONE") {
                executeAction(tripleClickAction, msg, channel, event);
                pressedModifiers.clear();
            }
            doubleClickFired = false;
            resetClickState();
            return;
        }

        const canDoubleClick = (isModifierPressed(doubleClickModifier) || doubleClickModifier === "NONE") && doubleClickAction !== "NONE";
        const canTripleClick =
            settings.store.deferDoubleClickForTriple &&
            isModifierPressed(tripleClickModifier) &&
            tripleClickAction !== "NONE";
        const shouldDeferDoubleClick =
            canDoubleClick &&
            canTripleClick &&
            doubleClickModifier === tripleClickModifier;

        if (isDoubleClick) {
            doubleClickFired = true;

            if (singleClickTimeout) {
                clearTimeout(singleClickTimeout);
                singleClickTimeout = null;
            }

            const isQuickDoubleClick = !doubleClickDetected || (Date.now() - secondMouseDownTime < settings.store.doubleClickHoldThreshold);
            const executeDoubleClick = () => {
                if (!canSend(channel)) return;
                if (msg.deleted === true) return;
                if (canDoubleClick && isQuickDoubleClick) {
                    executeAction(doubleClickAction, msg, channel, event);
                    pressedModifiers.clear();
                }
            };

            if (shouldDeferDoubleClick) {
                if (doubleClickTimeout) {
                    clearTimeout(doubleClickTimeout);
                }
                pendingDoubleClickAction = executeDoubleClick;
                doubleClickTimeout = setTimeout(() => {
                    pendingDoubleClickAction?.();
                    pendingDoubleClickAction = null;
                    doubleClickTimeout = null;
                }, settings.store.clickTimeout);
            } else {
                executeDoubleClick();
            }

            if (isQuickDoubleClick) {
                event.preventDefault();
            }

            resetClickState();
            return;
        }

        if (isSingleClick) {
            doubleClickFired = false;

            const executeSingleClick = () => {
                if (!doubleClickFired && !doubleClickDetected && isModifierPressed(singleClickModifier) && singleClickAction !== "NONE") {
                    executeAction(singleClickAction, msg, channel, event);
                    pressedModifiers.clear();
                }
                resetClickState();
            };

            const canDoubleClickWithCurrentModifier =
                doubleClickAction !== "NONE" &&
                (doubleClickModifier === "NONE" || isModifierPressed(doubleClickModifier));
            if (canDoubleClickWithCurrentModifier && singleClickModifier === "NONE") {
                singleClickTimeout = setTimeout(() => {
                    executeSingleClick();
                    singleClickTimeout = null;
                }, settings.store.clickTimeout);
            } else {
                executeSingleClick();
            }
        }
    },
});
