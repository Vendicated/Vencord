/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./messageLogger.css";

import {
    findGroupChildrenByChildId,
    NavContextMenuPatchCallback,
} from "@api/ContextMenu";
import { updateMessage } from "@api/MessageUpdater";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { EyeIcon } from "@components/Icons";
import { Devs, EQUIBOT_USER_ID, EquicordDevs, SUPPORT_CHANNEL_ID, VC_SUPPORT_CATEGORY_ID, VENBOT_USER_ID } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Message, MessageAttachment } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { AuthenticationStore, ChannelStore, FluxDispatcher, Menu, MessageStore, Parser, SelectedChannelStore, Timestamp, UserStore, useStateFromStores } from "@webpack/common";

import overlayStyle from "./deleteStyleOverlay.css?managed";
import textStyle from "./deleteStyleText.css?managed";
import { createMessageDiff, DiffPart } from "./diffUtils";
import { openHistoryModal } from "./HistoryModal";

interface MLMessage extends Message {
    deleted?: boolean;
    editHistory?: { timestamp: Date; content: string; }[];
    firstEditTimestamp?: Date;
    diffViewDisabled?: boolean;
}

interface MLAttachment extends MessageAttachment {
    /**
     * if the attachment was deleted
     *
     * a non-deleted {@link MLMessage|Message} can have deleted attachments
     */
    deleted?: boolean;
}

const MessageClasses = findCssClassesLazy("edited", "communicationDisabled", "isSystemMessage");

function ClearHistoryIcon({ height = 24, width = 24, className }: { height?: number | string; width?: number | string; className?: string; }) {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M5.63606 18.3639C9.15077 21.8786 14.8493 21.8786 18.364 18.3639C21.8787 14.8492 21.8787 9.1507 18.364 5.63598C14.8493 2.12126 9.15077 2.12126 5.63606 5.63598C3.87757 7.39447 2.99889 9.6996 3.00002 12.0044L3 13.9999"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ fill: "none" }}
            />
            <path
                d="M1 11.9999L3 13.9999L5 11.9999"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ fill: "none" }}
            />
            <path
                d="M11 7.99994L11 12.9999L16 12.9999"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ fill: "none" }}
            />
        </svg>
    );
}

// track messages where the user disabled diffs for this session
const disabledDiffMessages = new Set<string>();

function scheduleMicrotask(fn: () => void) {
    if (typeof queueMicrotask === "function") queueMicrotask(fn);
    else setTimeout(fn, 0);
}

function addDeleteStyle() {
    if (settings.store.deleteStyle === "text") {
        enableStyle(textStyle);
        disableStyle(overlayStyle);
    } else {
        disableStyle(textStyle);
        enableStyle(overlayStyle);
    }
}

/**
 * Clears a message's history (edit + attachments)
 *
 * if the message was deleted, it will be completely removed from the UI and MessageStore
 */
function clearMessageHistory(msg: MLMessage) {
    if (msg.deleted) {
        FluxDispatcher.dispatch({
            type: "MESSAGE_DELETE",
            channelId: msg.channel_id,
            id: msg.id,
            mlDeleted: true
        });
    } else {
        const attachments = msg.attachments?.filter((a: MLAttachment) => !a.deleted);

        updateMessage(msg.channel_id, msg.id, { editHistory: [], attachments });
    }
}

/**
 * checks if a message has any history (deleted or edited)
 * @param message the message to check
 *
 * @returns true if the message has any history, false otherwise
 */
function doesMessageHaveHistory(message: MLMessage): boolean {
    return message.deleted || !!message.editHistory?.length || message.attachments?.some((a: MLAttachment) => a.deleted);

}

const REMOVE_HISTORY_ID = "ml-remove-history";
const TOGGLE_DELETE_STYLE_ID = "ml-toggle-style";
const TOGGLE_DIFF_VIEW_ID = "ml-toggle-diff";
const patchMessageContextMenu: NavContextMenuPatchCallback = (
    children,
    props,
) => {
    const { message } = props;
    const { deleted, id, channel_id } = message;
    if (!doesMessageHaveHistory(message)) return;

    toggle: {
        if (!deleted) break toggle;

        const domElement = document.getElementById(
            `chat-messages-${channel_id}-${id}`,
        );
        if (!domElement) break toggle;

        children.push(
            <Menu.MenuItem
                id={TOGGLE_DELETE_STYLE_ID}
                key={TOGGLE_DELETE_STYLE_ID}
                label="Toggle Deleted Highlight"
                leadingAccessory={{ type: "icon", icon: EyeIcon }}
                action={() => domElement.classList.toggle("messagelogger-deleted")}
            />,
        );
    }

    // toggle per-message diff rendering when the message
    // has an edit history and the setting is enabled
    if (doesMessageHaveHistory(message) && settings.store.showEditDiffs) {
        const isDisabled = disabledDiffMessages.has(id);
        children.push(
            <Menu.MenuItem
                id={TOGGLE_DIFF_VIEW_ID}
                key={TOGGLE_DIFF_VIEW_ID}
                label={isDisabled ? "Enable Diff View" : "Disable Diff View"}
                color="danger"
                action={() => {
                    if (isDisabled) disabledDiffMessages.delete(id);
                    else disabledDiffMessages.add(id);
                    // Also toggle a CSS class on the message element for immediate visual effect
                    const domElement = document.getElementById(`chat-messages-${channel_id}-${id}`);
                    domElement?.classList.toggle("messagelogger-diff-disabled", disabledDiffMessages.has(id));
                    // Force a re-render without mutating message fields
                    updateMessage(channel_id, id);
                }}
            />,
        );
    }

    let label;

    if (!isPluginEnabled("MessageLoggerEnhanced")) {
        label = "Clear Message History";
    } else {
        label = "Remove Message (Temporary)";
    }

    children.push(
        <Menu.MenuItem
            id={REMOVE_HISTORY_ID}
            key={REMOVE_HISTORY_ID}
            label={label}
            leadingAccessory={{ type: "icon", icon: ClearHistoryIcon }}
            color="danger"
            action={() => {
                clearMessageHistory(message);
            }}
        />,
    );
};

const patchChannelContextMenu: NavContextMenuPatchCallback = (
    children,
    { channel },
) => {
    const messages = MessageStore.getMessages(channel?.id);
    if (!messages?.some(msg => doesMessageHaveHistory(msg))) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="vc-ml-clear-channel"
            label="Clear Message Log"
            color="danger"
            action={() => {
                messages.forEach(msg => {
                    clearMessageHistory(msg);
                });
            }}
        />,
    );
};

function applyAggregatedCustomContent(message: Message, key: string, nodes: React.ReactNode) {
    const payload = {
        __messageloggerDiff: true,
        __messageloggerDiffKey: key,
        content: <div key={key}>
            {nodes}
        </div>
    };

    const existingKey = (message as any).customRenderedContent?.__messageloggerDiffKey;
    const shouldCommit = existingKey !== key;

    (message as any).__messageloggerLastAppliedKey = key;
    (message as any).customRenderedContent = payload;

    scheduleMicrotask(() => {
        if ((message as any).__messageloggerLastAppliedKey !== key) return;
        (message as any).customRenderedContent = payload;
        if (shouldCommit) {
            updateMessage(message.channel_id, message.id, { customRenderedContent: payload });
        }
    });
}

function clearCustomRenderedContent(message: Message) {
    const existing = (message as any).customRenderedContent;
    if (!existing?.__messageloggerDiff) return;

    const lastKey = (message as any).__messageloggerLastAppliedKey;
    delete (message as any).__messageloggerLastAppliedKey;
    delete (message as any).customRenderedContent;

    scheduleMicrotask(() => {
        const current = (message as any).customRenderedContent;
        if (current?.__messageloggerDiff) return;
        const currentKey = (message as any).__messageloggerLastAppliedKey;
        if (typeof currentKey === "string" && currentKey !== lastKey) return;
        updateMessage(message.channel_id, message.id, { customRenderedContent: null });
    });
}

function createDiffSegment(part: DiffPart, message: Message, key: React.Key, highlightType?: "removed" | "added") {
    const parsedContent = Parser.parse(part.text, true, {
        channelId: message.channel_id,
        messageId: message.id,
        allowLinks: true,
        allowHeading: true,
        allowList: true,
        allowEmojiLinks: true,
        viewingChannelId: SelectedChannelStore.getChannelId(),
    });

    let className: string | undefined;
    if (part.type === "added" || part.type === "removed") {
        if (!highlightType || highlightType === part.type) {
            className = `messagelogger-diff-${part.type}`;
        }
    }

    return (
        <span key={key} className={className}>
            {parsedContent}
        </span>
    );
}

function renderDiffParts(diffParts: DiffPart[], message: Message) {
    return diffParts.map((part, index) => createDiffSegment(part, message, index));
}

function buildViewSegments(diffParts: DiffPart[], view: "original" | "updated"): DiffPart[] {
    const segments: DiffPart[] = [];

    for (const part of diffParts) {
        if (view === "original") {
            if (part.type === "added") continue;
            segments.push(part);
        } else {
            if (part.type === "removed") continue;
            segments.push(part);
        }
    }

    return segments;
}

export function parseEditContent(content: string, message: Message, previousContent?: string) {
    const perMessageDiffEnabled = !disabledDiffMessages.has(message.id);
    const aggregatedState = (message as any).__messageloggerAggregated as undefined | {
        key: string;
        aggregatedNodes: React.ReactNode;
    };
    if (previousContent && content !== previousContent && settings.store.showEditDiffs && perMessageDiffEnabled) {
        const diffParts = createMessageDiff(content, previousContent);
        const originalSegments = buildViewSegments(diffParts, "original");
        const updatedSegments = buildViewSegments(diffParts, "updated");
        const useSeparatedDiffs = settings.store.separatedDiffs;

        if (useSeparatedDiffs) {
            const highlightCurrent = previousContent === message.content;

            if (highlightCurrent) {
                if (aggregatedState) {
                    applyAggregatedCustomContent(message, aggregatedState.key, aggregatedState.aggregatedNodes);
                } else {
                    const diffKey = `${message.id}:current:${message.content}:${message.editedTimestamp?.valueOf?.() ?? 0}`;
                    applyAggregatedCustomContent(message, diffKey, renderDiffParts(updatedSegments, message));
                }
            } else if (!aggregatedState && (message as any).customRenderedContent?.__messageloggerDiff) {
                clearCustomRenderedContent(message);
            }

            return (
                <div className="messagelogger-diff-view" >
                    {originalSegments.length ? (
                        <div className="messagelogger-diff-original">
                            {renderDiffParts(originalSegments, message)}
                        </div>
                    ) : null}
                    {!highlightCurrent && updatedSegments.length ? (
                        <div className="messagelogger-diff-updated">
                            {renderDiffParts(updatedSegments, message)}
                        </div>
                    ) : null}
                </div>
            );
        }

        if (!aggregatedState && (message as any).customRenderedContent?.__messageloggerDiff) {
            clearCustomRenderedContent(message);
        }

        return renderDiffParts(diffParts, message);
    }

    if (!aggregatedState && (message as any).customRenderedContent?.__messageloggerDiff) {
        clearCustomRenderedContent(message);
    }

    return Parser.parse(content, true, {
        channelId: message.channel_id,
        messageId: message.id,
        allowLinks: true,
        allowHeading: true,
        allowList: true,
        allowEmojiLinks: true,
        viewingChannelId: SelectedChannelStore.getChannelId(),
    });
}

export const settings = definePluginSettings({
    deleteStyle: {
        type: OptionType.SELECT,
        description: "The style of deleted messages",
        default: "text",
        options: [
            { label: "Red text", value: "text", default: true },
            { label: "Red overlay", value: "overlay" },
        ],
        onChange: () => addDeleteStyle(),
    },
    logDeletes: {
        type: OptionType.BOOLEAN,
        description: "Whether to log deleted messages",
        default: true,
    },
    collapseDeleted: {
        type: OptionType.BOOLEAN,
        description: "Whether to collapse deleted messages, similar to blocked messages",
        default: false,
        restartNeeded: true,
    },
    logEdits: {
        type: OptionType.BOOLEAN,
        description: "Whether to log edited messages",
        default: true,
    },
    logDeletedAttachments: {
        type: OptionType.BOOLEAN,
        description: "Whether to log deleted attachments",
        default: true,
        restartNeeded: true,
    },
    inlineEdits: {
        type: OptionType.BOOLEAN,
        description: "Whether to display edit history as part of message content",
        default: true,
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by bots",
        default: true,
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by yourself",
        default: false,
    },
    ignoreSelfEdits: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore edits by yourself",
        default: false,
    },
    ignoreUsers: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs to ignore",
        default: "",
        multiline: true,
    },
    ignoreChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs to ignore",
        default: "",
        multiline: true,
    },
    ignoreGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of guild IDs to ignore",
        default: "",
        multiline: true,
    },
    showEditDiffs: {
        type: OptionType.BOOLEAN,
        description: "Show visual differences between edited message versions",
        default: false,
        onChange: value => {
            if (!value && settings.store.separatedDiffs) {
                settings.store.separatedDiffs = false;
            }
        },
    },
    separatedDiffs: {
        type: OptionType.BOOLEAN,
        description: "Separate addition and removals in diffs for a more readable differential",
        default: false,
    },
}, {
    separatedDiffs: {
        disabled() {
            return !this.store.showEditDiffs;
        },
    },
    ignoreSelfEdits: {
        disabled() {
            return this.store.ignoreSelf;
        },
    },
});

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages.",
    tags: ["Chat", "Utility"],
    authors: [Devs.rushii, Devs.Ven, Devs.AutumnVN, Devs.Nickyux, Devs.Kyuuhachi, Devs.sadan, EquicordDevs.justjxke, Devs.f3tch],
    dependencies: ["MessageUpdaterAPI"],
    isModified: true,
    settings,

    contextMenus: {
        message: patchMessageContextMenu,
        "channel-context": patchChannelContextMenu,
        "thread-context": patchChannelContextMenu,
        "user-context": patchChannelContextMenu,
        "gdm-context": patchChannelContextMenu,
    },

    start() {
        addDeleteStyle();
    },

    messagePopoverButton: {
        icon: ClearHistoryIcon,
        render(message) {
            const current = MessageStore.getMessage(message.channel_id, message.id) as MLMessage | undefined;

            if (!current || !doesMessageHaveHistory(current))
                return null;

            return {
                label: "Clear history",
                icon: ClearHistoryIcon,
                onClick: () => {
                    const latest = MessageStore.getMessage(message.channel_id, message.id) as MLMessage | undefined;
                    if (!latest) return;

                    clearMessageHistory(latest);
                }
            };
        }
    },

    renderEdits: ErrorBoundary.wrap(
        ({
            message: { id: messageId, channel_id: channelId },
        }: {
            message: Message;
        }) => {
            const message = useStateFromStores(
                [MessageStore],
                () => MessageStore.getMessage(channelId, messageId) as MLMessage,
                null,
                (oldMsg, newMsg) =>
                    oldMsg?.editHistory === newMsg?.editHistory &&
                    oldMsg?.diffViewDisabled === newMsg?.diffViewDisabled &&
                    oldMsg?.content === newMsg?.content &&
                    (oldMsg?.editedTimestamp?.valueOf?.() ?? 0) === (newMsg?.editedTimestamp?.valueOf?.() ?? 0),
            );

            const { showEditDiffs, inlineEdits, separatedDiffs } = settings.use(["showEditDiffs", "inlineEdits", "separatedDiffs"]);
            const history = message.editHistory ?? [];
            const useAggregatedDiff = inlineEdits && showEditDiffs && separatedDiffs && history.length > 0;

            if (useAggregatedDiff) {
                const original = history[0];
                const diffKey = `${message.id}:${history.length}:${message.content}:${message.editedTimestamp?.valueOf?.() ?? 0}`;
                let aggregatedState = (message as any).__messageloggerAggregated as undefined | {
                    key: string;
                    originalNodes: React.ReactNode;
                    aggregatedNodes: React.ReactNode;
                    originalTimestamp: Date;
                };

                if (!aggregatedState || aggregatedState.key !== diffKey) {
                    const aggregatedDiff = createMessageDiff(original.content, message.content);
                    const originalSegments = buildViewSegments(aggregatedDiff, "original");
                    const aggregatedSegments = buildViewSegments(aggregatedDiff, "updated");
                    const originalNodes = originalSegments.length
                        ? renderDiffParts(originalSegments, message)
                        : Parser.parse(original.content, true, {
                            channelId: message.channel_id,
                            messageId: message.id,
                            allowLinks: true,
                            allowHeading: true,
                            allowList: true,
                            allowEmojiLinks: true,
                            viewingChannelId: SelectedChannelStore.getChannelId(),
                        });
                    const aggregatedNodes = renderDiffParts(aggregatedSegments, message);

                    aggregatedState = {
                        key: diffKey,
                        originalNodes,
                        aggregatedNodes,
                        originalTimestamp: original.timestamp,
                    };

                    (message as any).__messageloggerAggregated = aggregatedState;
                }

                applyAggregatedCustomContent(message, aggregatedState.key, aggregatedState.aggregatedNodes);

                return (
                    <div key={`diff-aggregated-${messageId}`}>
                        <div className="messagelogger-edited" key="ml-aggregated-original">
                            {aggregatedState.originalNodes}
                            <Timestamp
                                timestamp={aggregatedState.originalTimestamp}
                                isEdited={true}
                                isInline={false}
                            >
                                <span className={MessageClasses.edited}>{" "}({getIntlMessage("MESSAGE_EDITED")})</span>
                            </Timestamp>
                        </div>
                    </div>
                );
            }

            if ((message as any).__messageloggerAggregated) {
                delete (message as any).__messageloggerAggregated;
            }

            if ((message as any).customRenderedContent?.__messageloggerDiff) {
                clearCustomRenderedContent(message);
            }

            return inlineEdits && (
                <div key={disabledDiffMessages.has(messageId) ? `diff-off-${messageId}` : `diff-on-${messageId}`}>
                    {history.map((edit, idx) => {
                        const nextContent = idx === history.length - 1
                            ? message.content
                            : history[idx + 1]?.content;

                        return (
                            <div key={idx} className="messagelogger-edited">
                                {parseEditContent(edit.content, message, nextContent)}
                                <Timestamp
                                    timestamp={edit.timestamp}
                                    isEdited={true}
                                    isInline={false}
                                >
                                    <span className={MessageClasses.edited}>{" "}({getIntlMessage("MESSAGE_EDITED")})</span>
                                </Timestamp>
                            </div>
                        );
                    })}
                </div>
            );
        }, { noop: true }),

    makeEdit(newMessage: any, oldMessage: any): any {
        return {
            timestamp: new Date(newMessage.edited_timestamp),
            content: oldMessage.content,
        };
    },

    handleUpdateAttachments(newMessage: MLMessage): MLAttachment[] {
        const oldMessage = MessageStore.getMessage(newMessage.channel_id, newMessage.id) as MLMessage | undefined;
        // if oldMessage is undefined, this is a new message and we shouldn't touch the attachments
        if (!oldMessage || this.shouldIgnore(newMessage, true)) {
            return newMessage.attachments;
        }
        // not sure if it's ever actually null after an edit but discord does a null check here
        if (!newMessage.attachments?.length) {
            return oldMessage.attachments.map((a): MLAttachment => ({ ...a, deleted: true }));
        }
        return oldMessage.attachments
            .map((oldAttachment): MLAttachment =>
                newMessage.attachments.find(a => a.id === oldAttachment.id)
                ?? { ...oldAttachment, deleted: true }
            )
            .concat(newMessage.attachments.filter(a => !oldMessage.attachments.some(o => o.id === a.id)));
    },

    handleDelete(cache: any, data: { ids: string[], id: string; mlDeleted?: boolean; }, isBulk: boolean) {
        try {
            if (cache == null || (!isBulk && !cache.has(data.id))) return cache;

            const mutate = (id: string) => {
                const msg = cache.get(id);
                if (!msg) return;

                const EPHEMERAL = 64;
                const shouldIgnore =
                    data.mlDeleted ||
                    (msg.flags & EPHEMERAL) === EPHEMERAL ||
                    this.shouldIgnore(msg);

                if (shouldIgnore) {
                    cache = cache.remove(id);
                } else {
                    cache = cache.update(id, m =>
                        m.set("deleted", true).set(
                            "attachments",
                            m.attachments.map(a => ((a.deleted = true), a)),
                        ),
                    );
                }
            };

            if (isBulk) {
                data.ids.forEach(mutate);
            } else {
                mutate(data.id);
            }
        } catch (e) {
            new Logger("MessageLogger").error("Error during handleDelete", e);
        }
        return cache;
    },

    shouldIgnore(message: any, isEdit = false) {
        try {
            const {
                ignoreBots,
                ignoreSelf,
                ignoreSelfEdits,
                ignoreUsers,
                ignoreChannels,
                ignoreGuilds,
                logEdits,
                logDeletes,
            } = settings.store;
            const myId = UserStore.getCurrentUser().id;

            return (
                (ignoreBots && message.author?.bot) ||
                (ignoreSelf && message.author?.id === myId) ||
                (ignoreSelfEdits && isEdit && message.author?.id === myId) ||
                ignoreUsers.includes(message.author?.id) ||
                ignoreChannels.includes(message.channel_id) ||
                ignoreChannels.includes(
                    ChannelStore.getChannel(message.channel_id)?.parent_id,
                ) ||
                (isEdit ? !logEdits : !logDeletes) ||
                ignoreGuilds.includes(ChannelStore.getChannel(message.channel_id)?.guild_id) ||
                // Ignore Venbot in the support channels (love you venbot!!!)
                (message.author?.id === VENBOT_USER_ID && ChannelStore.getChannel(message.channel_id)?.parent_id === VC_SUPPORT_CATEGORY_ID) ||
                (message.author?.id === EQUIBOT_USER_ID && ChannelStore.getChannel(message.channel_id)?.id === SUPPORT_CHANNEL_ID));
        } catch (e) {
            return false;
        }
    },

    // It is possible to replace a message in place by creating a new message with the same nonce as an existing one.
    // This is not considered an edit since it's a new message. Thus it bypasses our edit logging and can be used to "delete" a message by replacing it with an empty one.
    // This fixes that bypass
    normalizeNonce(msg: Message) {
        try {
            if (!msg.nonce || msg.author.id === AuthenticationStore.getId()) return;

            const prevMsg = MessageStore.getMessage(msg.channel_id, msg.nonce);
            if (!prevMsg || prevMsg.state !== "SENT") return;

            if (prevMsg.id !== msg.id) {
                delete msg.nonce;
            }
        } catch (e) {
            console.error("[MessageLogger] Error normalizing nonce");
        }
    },

    EditMarker({ message, className, children, ...props }: any) {
        return (
            <span
                {...props}
                className={classes("messagelogger-edit-marker", className)}
                onClick={() => openHistoryModal(message)}
                role="button"
            >
                {children}
            </span>
        );
    },

    // DELETED_MESSAGE_COUNT: getMessage("{count, plural, =0 {No deleted messages} one {{count} deleted message} other {{count} deleted messages}}")
    // TODO: Find a better way to generate intl messages
    DELETED_MESSAGE_COUNT: () => ({
        ast: [[
            6,
            "count",
            {
                "=0": ["No deleted messages"],
                one: [
                    [
                        1,
                        "count"
                    ],
                    " deleted message"
                ],
                other: [
                    [
                        1,
                        "count"
                    ],
                    " deleted messages"
                ]
            },
            0,
            "cardinal"
        ]]
    }),

    patches: [
        {
            find: '"MessageStore"',
            replacement: [
                {
                    // Add deleted=true to all target messages in the MESSAGE_DELETE event
                    match: /(?<=MESSAGE_DELETE:function\((\i)\)\{)(?=let.{0,100}(\i\.\i)\.getOrCreate)/,
                    replace: `
                        let cache = $2.getOrCreate($1.channelId);
                        cache = $self.handleDelete(cache, $1, false);
                        $2.commit(cache);
                        return;
                    `
                },
                {
                    // Add deleted=true to all target messages in the MESSAGE_DELETE_BULK event
                    match: /(?<=MESSAGE_DELETE_BULK:function\((\i)\){)(?=let.{0,100}(\i\.\i)\.getOrCreate)/,
                    replace: `
                        let cache = $2.getOrCreate($1.channelId);
                        cache = $self.handleDelete(cache, $1, true);
                        $2.commit(cache);
                        return;
                    `
                },
                {
                    // Add current cached content + new edit time to cached message's editHistory
                    match: /(MESSAGE_UPDATE:function\((\i)\).+?)\.update\((\i)/,
                    replace: `
                        $1
                        .update($3, m =>
                            (($2.message.flags & 64) === 64 || $self.shouldIgnore($2.message, true)) ? m :
                            $2.message.edited_timestamp && $2.message.content !== m.content ?
                                m.set('editHistory',[...(m.editHistory || []), $self.makeEdit($2.message, m)]) :
                                m
                        )
                        .update($3
                    `
                },
                {
                    // fix up key (edit last message) attempting to edit a deleted message
                    match: /(?<=getLastEditableMessage\(\i\)\{.{0,200}\.find\((\i)=>)/,
                    replace: "!$1.deleted &&",
                },
            ],
        },

        {
            // Message domain model
            find: "}addReaction(",
            replacement: [
                {
                    match: /this\.customRenderedContent=(\i)\.customRenderedContent,/,
                    replace:
                        "this.customRenderedContent = $1.customRenderedContent," +
                        "this.deleted = $1.deleted || false," +
                        "this.editHistory = $1.editHistory || []," +
                        "this.firstEditTimestamp = $1.firstEditTimestamp || this.editedTimestamp || this.timestamp," +
                        "this.diffViewDisabled = $1.diffViewDisabled || false,",
                },
            ],
        },

        {
            // Updated message transformer
            find: ".PREMIUM_REFERRAL&&(",
            replacement: [
                {
                    // Pass through editHistory & deleted to the "edited message" transformer
                    match: /(?<=null!=\i\.edited_timestamp\)return )\i\(\i,\{reactions:(\i)\.reactions.{0,50}\}\)/,
                    replace:
                        "Object.assign($&,{ deleted:$1.deleted, editHistory:$1.editHistory, firstEditTimestamp:$1.firstEditTimestamp, diffViewDisabled:$1.diffViewDisabled })",
                },
                // just mark deleted attachments as deleted on MESSAGE_UPDATE
                {
                    match: /attachments:(\i)\.attachments\?\?\[\],/,
                    predicate: () => settings.store.logDeletedAttachments,
                    replace: "attachments: $self.handleUpdateAttachments($1),"
                }
            ]
        },

        {
            // Attachment renderer
            find: "#{intl::REMOVE_ATTACHMENT_TOOLTIP_TEXT}",
            replacement: [
                // add deleted class to deleted attachments
                {
                    // we can't use arguments[0] because we patch a nested **non-arrow** function
                    match: /\.SPOILER,(?=\[\i\.\i\]:)(?<=item:(\i),.{0,200}?)/,
                    replace: '$&"messagelogger-deleted-attachment": $1?.originalItem?.deleted,'
                },
                // dont allow deleting attachments from deleted messages
                {
                    match: /(?<=\{let\{[^}]*?item:(\i),autoPlayGif:\i,)canRemoveItem:(\i)(?=,onRemoveItem:)/,
                    replace: "_canRemoveItem:$2 = arguments[0].canRemoveItem && !$1?.originalItem?.deleted",
                }
            ]
        },

        {
            // Base message component renderer
            find: "Message must not be a thread starter message",
            replacement: [
                {
                    // Append messagelogger-deleted to classNames if deleted
                    match: /\)\("li",\{(.+?),className:/,
                    replace:
                        ')("li",{$1,className:(arguments[0].message.deleted ? "messagelogger-deleted " : "")+',
                },
            ],
        },

        {
            // Message content renderer
            find: ".SEND_FAILED,",
            replacement: {
                // Render editHistory behind the message content
                match: /\]:\i.isUnsupported.{0,20}?,children:\[/,
                replace: "$&arguments[0]?.message?.editHistory?.length>0&&$self.renderEdits(arguments[0]),"
            }
        },

        {
            find: "#{intl::MESSAGE_EDITED}",
            replacement: {
                // Make edit marker clickable
                match: /(isInline:!1,children:.{0,50}?)"span",\{(?=className:)/,
                replace: "$1$self.EditMarker,{message:arguments[0].message,"
            }
        },

        {
            // ReferencedMessageStore
            find: '"ReferencedMessageStore"',
            replacement: [
                {
                    match: /(?<=MESSAGE_DELETE:function\(\i\)\{)/,
                    replace: "return;"
                },
                {
                    match: /(?<=MESSAGE_DELETE_BULK:function\(\i\)\{)/,
                    replace: "return;"
                }
            ]
        },

        {
            // Message context base menu
            find: ".MESSAGE,commandTargetId:",
            replacement: [
                {
                    // Remove the first section if message is deleted
                    match: /children:(\[""===.+?\])/,
                    replace: "children:arguments[0].message.deleted?[]:$1",
                },
            ],
        },
        {
            // Message grouping
            find: "NON_COLLAPSIBLE.has(",
            replacement: {
                match: /if\((\i)\.blocked\)return \i\.\i\.MESSAGE_GROUP_BLOCKED;/,
                replace: '$&else if($1.deleted) return"MESSAGE_GROUP_DELETED";',
            },
            predicate: () => settings.store.collapseDeleted,
        },
        {
            // Message group rendering
            find: "#{intl::NEW_MESSAGES_ESTIMATED_WITH_DATE}",
            replacement: [
                {
                    match: /(\i).type===\i\.\i\.MESSAGE_GROUP_BLOCKED\|\|/,
                    replace: '$&$1.type==="MESSAGE_GROUP_DELETED"||',
                },
                {
                    match: /(\i).type===\i\.\i\.MESSAGE_GROUP_BLOCKED\?(\i)=.*?:/,
                    replace: '$&$1.type==="MESSAGE_GROUP_DELETED"?$2=$self.DELETED_MESSAGE_COUNT:',
                },
            ],
            predicate: () => settings.store.collapseDeleted
        },

        {
            find: "this.truncateTop",
            replacement: {
                match: /receiveMessage\((\i)\)\{/,
                replace: "$& $self.normalizeNonce($1);"
            }
        }
    ]
});
