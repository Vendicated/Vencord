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
import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, VC_SUPPORT_CATEGORY_ID, VENBOT_USER_ID } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, Menu, MessageStore, Parser, React, SelectedChannelStore, Timestamp, UserStore, useStateFromStores } from "@webpack/common";

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

const styles = findByPropsLazy("edited", "communicationDisabled", "isSystemMessage");

// track messages where the user disabled diffs for this session
const disabledDiffMessages = new Set<string>();

function addDeleteStyle() {
    if (settings.store.deleteStyle === "text") {
        enableStyle(textStyle);
        disableStyle(overlayStyle);
    } else {
        disableStyle(textStyle);
        enableStyle(overlayStyle);
    }
}

const REMOVE_HISTORY_ID = "ml-remove-history";
const TOGGLE_DELETE_STYLE_ID = "ml-toggle-style";
const TOGGLE_DIFF_VIEW_ID = "ml-toggle-diff";
const patchMessageContextMenu: NavContextMenuPatchCallback = (
    children,
    props,
) => {
    const { message } = props;
    const { deleted, editHistory, id, channel_id } = message;

    if (!deleted && !editHistory?.length) return;

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
                action={() => domElement.classList.toggle("messagelogger-deleted")}
            />,
        );
    }

    // toggle per-message diff rendering when the message
    // has an edit history and the setting is enabled
    if (editHistory?.length && settings.store.showEditDiffs) {
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

    if (!Vencord.Plugins.isPluginEnabled("MessageLoggerEnhanced")) {
        label = "Remove Message History";
    } else {
        label = "Remove Message (Temporary)";
    }

    children.push(
        <Menu.MenuItem
            id={REMOVE_HISTORY_ID}
            key={REMOVE_HISTORY_ID}
            label={label}
            color="danger"
            action={() => {
                if (deleted) {
                    FluxDispatcher.dispatch({
                        type: "MESSAGE_DELETE",
                        channelId: channel_id,
                        id,
                        mlDeleted: true,
                    });
                } else {
                    message.editHistory = [];
                }
            }}
        />,
    );
};

const patchChannelContextMenu: NavContextMenuPatchCallback = (
    children,
    { channel },
) => {
    const messages = MessageStore.getMessages(channel?.id) as MLMessage[];
    if (!messages?.some(msg => msg.deleted || msg.editHistory?.length)) return;

    const group =
        findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="vc-ml-clear-channel"
            label="Clear Message Log"
            color="danger"
            action={() => {
                messages.forEach(msg => {
                    if (msg.deleted)
                        FluxDispatcher.dispatch({
                            type: "MESSAGE_DELETE",
                            channelId: channel.id,
                            id: msg.id,
                            mlDeleted: true,
                        });
                    else
                        updateMessage(channel.id, msg.id, {
                            editHistory: [],
                        });
                });
            }}
        />,
    );
};

function renderDiffParts(diffParts: DiffPart[], message: Message) {
    return diffParts.map((part, index) => {
        const parsedContent = Parser.parse(part.text, true, {
            channelId: message.channel_id,
            messageId: message.id,
            allowLinks: true,
            allowHeading: true,
            allowList: true,
            allowEmojiLinks: true,
            viewingChannelId: SelectedChannelStore.getChannelId(),
        });

        if (part.type === "unchanged") {
            return React.createElement("span", { key: index }, parsedContent);
        } else if (part.type === "added") {
            return React.createElement("span", {
                key: index,
                className: "messagelogger-diff-added"
            }, parsedContent);
        } else if (part.type === "removed") {
            return React.createElement("span", {
                key: index,
                className: "messagelogger-diff-removed"
            }, parsedContent);
        }
        return React.createElement("span", { key: index }, parsedContent);
    });
}

export function parseEditContent(content: string, message: Message, previousContent?: string) {
    const perMessageDiffEnabled = !disabledDiffMessages.has(message.id);
    if (previousContent && content !== previousContent && settings.store.showEditDiffs && perMessageDiffEnabled) {
        const diffParts = createMessageDiff(content, previousContent);
        return renderDiffParts(diffParts, message);
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

const settings = definePluginSettings({
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
    inlineEdits: {
        type: OptionType.BOOLEAN,
        description: "Whether to display edit history as part of message content",
        default: true,
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by bots",
        default: false,
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by yourself",
        default: false,
    },
    ignoreUsers: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs to ignore",
        default: "",
    },
    ignoreChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs to ignore",
        default: "",
    },
    ignoreGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of guild IDs to ignore",
        default: "",
    },
    showEditDiffs: {
        type: OptionType.BOOLEAN,
        description: "Show visual differences between edited message versions",
        default: false,
    },
});

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages.",
    authors: [Devs.rushii, Devs.Ven, Devs.AutumnVN, Devs.Nickyux, Devs.Kyuuhachi],
    dependencies: ["MessageUpdaterAPI"],
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
                    oldMsg === newMsg,
            );

            const { showEditDiffs, inlineEdits } = settings.use(["showEditDiffs", "inlineEdits"]);

            return inlineEdits && (
                <React.Fragment key={disabledDiffMessages.has(messageId) ? `diff-off-${messageId}` : `diff-on-${messageId}`}>
                    {message.editHistory?.map((edit, idx) => {
                        const nextContent = idx === (message.editHistory?.length ?? 0) - 1
                            ? message.content
                            : message.editHistory?.[idx + 1]?.content;

                        return (
                            <div key={idx} className="messagelogger-edited">
                                {parseEditContent(edit.content, message, nextContent)}
                                <Timestamp
                                    timestamp={edit.timestamp}
                                    isEdited={true}
                                    isInline={false}
                                >
                                    <span className={styles.edited}>{" "}({getIntlMessage("MESSAGE_EDITED")})</span>
                                </Timestamp>
                            </div>
                        );
                    })}
                </React.Fragment>
            );
        }, { noop: true }),

    makeEdit(newMessage: any, oldMessage: any): any {
        return {
            timestamp: new Date(newMessage.edited_timestamp),
            content: oldMessage.content,
        };
    },

    handleDelete(
        cache: any,
        data: { ids: string[]; id: string; mlDeleted?: boolean; },
        isBulk: boolean,
    ) {
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
        const {
            ignoreBots,
            ignoreSelf,
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
            ignoreUsers.includes(message.author?.id) ||
            ignoreChannels.includes(message.channel_id) ||
            ignoreChannels.includes(
                ChannelStore.getChannel(message.channel_id)?.parent_id,
            ) ||
            (isEdit ? !logEdits : !logDeletes) ||
            ignoreGuilds.includes(ChannelStore.getChannel(message.channel_id)?.guild_id) ||
            // Ignore Venbot in the support channels (love you venbot!!!)
            (message.author?.id === VENBOT_USER_ID && ChannelStore.getChannel(message.channel_id)?.parent_id === VC_SUPPORT_CATEGORY_ID));
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
            // MessageStore
            find: '"MessageStore"',
            replacement: [
                {
                    // Add deleted=true to all target messages in the MESSAGE_DELETE event
                    match: /function (?=.+?MESSAGE_DELETE:(\i))\1\((\i)\){let.+?((?:\i\.){2})getOrCreate.+?}(?=function)/,
                    replace:
                        "function $1($2){" +
                        "   var cache = $3getOrCreate($2.channelId);" +
                        "   cache = $self.handleDelete(cache, $2, false);" +
                        "   $3commit(cache);" +
                        "}"
                },
                {
                    // Add deleted=true to all target messages in the MESSAGE_DELETE_BULK event
                    match: /function (?=.+?MESSAGE_DELETE_BULK:(\i))\1\((\i)\){let.+?((?:\i\.){2})getOrCreate.+?}(?=function)/,
                    replace:
                        "function $1($2){" +
                        "   var cache = $3getOrCreate($2.channelId);" +
                        "   cache = $self.handleDelete(cache, $2, true);" +
                        "   $3commit(cache);" +
                        "}"
                },
                {
                    // Add current cached content + new edit time to cached message's editHistory
                    match: /(function (\i)\((\i)\).+?)\.update\((\i)(?=.*MESSAGE_UPDATE:\2)/,
                    replace: "$1" +
                        ".update($4,m =>" +
                        "   (($3.message.flags & 64) === 64 || $self.shouldIgnore($3.message, true)) ? m :" +
                        "   $3.message.edited_timestamp && $3.message.content !== m.content ?" +
                        "       m.set('editHistory',[...(m.editHistory || []), $self.makeEdit($3.message, m)]) :" +
                        "       m" +
                        ")" +
                        ".update($4"
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
            // Updated message transformer(?)
            find: "THREAD_STARTER_MESSAGE?null==",
            replacement: [
                {
                    // Pass through editHistory & deleted & original attachments to the "edited message" transformer
                    match:
                        /(?<=null!=\i\.edited_timestamp\)return )\i\(\i,\{reactions:(\i)\.reactions.{0,50}\}\)/,
                    replace:
                        "Object.assign($&,{ deleted:$1.deleted, editHistory:$1.editHistory, firstEditTimestamp:$1.firstEditTimestamp, diffViewDisabled:$1.diffViewDisabled })",
                },

                {
                    // Construct new edited message and add editHistory & deleted (ref above)
                    // Pass in custom data to attachment parser to mark attachments deleted as well
                    match: /attachments:(\i)\((\i)\)/,
                    replace:
                        "attachments: $1((() => {" +
                        "   if ($self.shouldIgnore($2)) return $2;" +
                        "   let old = arguments[1]?.attachments;" +
                        "   if (!old) return $2;" +
                        "   let new_ = $2.attachments?.map(a => a.id) ?? [];" +
                        "   let diff = old.filter(a => !new_.includes(a.id));" +
                        "   old.forEach(a => a.deleted = true);" +
                        "   $2.attachments = [...diff, ...$2.attachments];" +
                        "   return $2;" +
                        "})())," +
                        "deleted: arguments[1]?.deleted," +
                        "editHistory: arguments[1]?.editHistory," +
                        "firstEditTimestamp: new Date(arguments[1]?.firstEditTimestamp ?? $2.editedTimestamp ?? $2.timestamp)," +
                        "diffViewDisabled: arguments[1]?.diffViewDisabled",
                },
                {
                    // Preserve deleted attribute on attachments
                    match: /(\((\i)\){return null==\2\.attachments.+?)spoiler:/,
                    replace: "$1deleted: arguments[0]?.deleted," + "spoiler:",
                },
            ],
        },

        {
            // Attachment renderer
            find: ".removeMosaicItemHoverButton",
            replacement: [
                {
                    match: /\[\i\.obscured\]:.+?,(?<=item:(\i).+?)/,
                    replace: '$&"messagelogger-deleted-attachment":$1.originalItem?.deleted,'
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
                match: /\.isFailed]:.+?children:\[/,
                replace: "$&arguments[0]?.message?.editHistory?.length>0&&$self.renderEdits(arguments[0]),"
            }
        },

        {
            find: "#{intl::MESSAGE_EDITED}",
            replacement: {
                // Make edit marker clickable
                match: /"span",\{(?=className:\i\.edited,)/,
                replace: "$self.EditMarker,{message:arguments[0].message,"
            }
        },

        {
            // ReferencedMessageStore
            find: '"ReferencedMessageStore"',
            replacement: [
                {
                    match: /MESSAGE_DELETE:\i,/,
                    replace: "MESSAGE_DELETE:()=>{},"
                },
                {
                    match: /MESSAGE_DELETE_BULK:\i,/,
                    replace: "MESSAGE_DELETE_BULK:()=>{},"
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
                    match: /(\i).type===\i\.\i\.MESSAGE_GROUP_BLOCKED\?.*?:/,
                    replace: '$&$1.type==="MESSAGE_GROUP_DELETED"?$self.DELETED_MESSAGE_COUNT:',
                },
            ],
            predicate: () => settings.store.collapseDeleted,
        },
    ],
});
