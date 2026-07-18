/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./messageLogger.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, SUPPORT_CATEGORY_ID, VENBOT_USER_ID } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Message, MessageAttachment } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { AuthenticationStore, ChannelStore, FluxDispatcher, Menu, MessageStore, Parser, SelectedChannelStore, Timestamp, UserStore, useStateFromStores } from "@webpack/common";

import overlayStyle from "./deleteStyleOverlay.css?managed";
import textStyle from "./deleteStyleText.css?managed";
import { openHistoryModal } from "./HistoryModal";

interface MLMessage extends Message {
    deleted?: boolean;
    editHistory?: { timestamp: Date; content: string; }[];
    firstEditTimestamp?: Date;
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

const settings = definePluginSettings({
    deleteStyle: {
        type: OptionType.SELECT,
        description: "The style of deleted messages",
        default: "text",
        options: [
            { label: "Red text", value: "text", default: true },
            { label: "Red overlay", value: "overlay" }
        ],
        onChange: () => addDeleteStyle()
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
        default: true
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by bots",
        default: false
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by yourself",
        default: false
    },
    ignoreUsers: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs to ignore",
        default: "",
        multiline: true
    },
    ignoreChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs to ignore",
        default: "",
        multiline: true
    },
    ignoreGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of guild IDs to ignore",
        default: "",
        multiline: true
    },
});

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
const patchMessageContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const { message } = props;
    const { deleted, editHistory, id, channel_id } = message;

    if (!deleted && !editHistory?.length) return;

    toggle: {
        if (!deleted) break toggle;

        const domElement = document.getElementById(`chat-messages-${channel_id}-${id}`);
        if (!domElement) break toggle;

        children.push((
            <Menu.MenuItem
                id={TOGGLE_DELETE_STYLE_ID}
                key={TOGGLE_DELETE_STYLE_ID}
                label="Toggle Deleted Highlight"
                action={() => domElement.classList.toggle("messagelogger-deleted")}
            />
        ));
    }

    children.push((
        <Menu.MenuItem
            id={REMOVE_HISTORY_ID}
            key={REMOVE_HISTORY_ID}
            label="Remove Message History"
            color="danger"
            action={() => {
                if (deleted) {
                    FluxDispatcher.dispatch({
                        type: "MESSAGE_DELETE",
                        channelId: channel_id,
                        id,
                        mlDeleted: true
                    });
                } else {
                    updateMessage(channel_id, id, { editHistory: [] });
                }
            }}
        />
    ));
};

const patchChannelContextMenu: NavContextMenuPatchCallback = (children, { channel }) => {
    const messages = MessageStore.getMessages(channel?.id) as MLMessage[];
    if (!messages?.some(msg => msg.deleted || msg.editHistory?.length)) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
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
                            mlDeleted: true
                        });
                    else
                        updateMessage(channel.id, msg.id, {
                            editHistory: []
                        });
                });
            }}
        />
    );
};

export function parseEditContent(content: string, message: Message) {
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

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages.",
    tags: ["Chat", "Utility"],
    authors: [Devs.rushii, Devs.Ven, Devs.AutumnVN, Devs.Nickyux, Devs.Kyuuhachi, Devs.sadan],
    dependencies: ["MessageUpdaterAPI"],
    settings,
    contextMenus: {
        "message": patchMessageContextMenu,
        "channel-context": patchChannelContextMenu,
        "thread-context": patchChannelContextMenu,
        "user-context": patchChannelContextMenu,
        "gdm-context": patchChannelContextMenu
    },

    start() {
        addDeleteStyle();
    },

    renderEdits: ErrorBoundary.wrap(({ message: { id: messageId, channel_id: channelId } }: { message: Message; }) => {
        const message = useStateFromStores(
            [MessageStore],
            () => MessageStore.getMessage(channelId, messageId) as MLMessage,
            null,
            (oldMsg, newMsg) => oldMsg?.editHistory === newMsg?.editHistory
        );

        return settings.store.inlineEdits && (
            <>
                {message.editHistory?.map((edit, idx) => (
                    <div key={idx} className="messagelogger-edited">
                        {parseEditContent(edit.content, message)}
                        <Timestamp
                            timestamp={edit.timestamp}
                            isEdited={true}
                            isInline={false}
                        >
                            <span className={MessageClasses.edited}>{" "}({getIntlMessage("MESSAGE_EDITED")})</span>
                        </Timestamp>
                    </div>
                ))}
            </>
        );
    }, { noop: true }),

    makeEdit(newMessage: any, oldMessage: any): any {
        return {
            timestamp: new Date(newMessage.edited_timestamp),
            content: oldMessage.content
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
        const attachments: MLAttachment[] = [];
        for (const oldAttachment of oldMessage.attachments) {
            const wasDeleted = newMessage.attachments.every(a => a.id !== oldAttachment.id);
            if (wasDeleted) {
                attachments.push({ ...oldAttachment, deleted: true });
            } else {
                attachments.push(oldAttachment);
            }
        }
        return attachments;
    },

    handleDelete(cache: any, data: { ids: string[], id: string; mlDeleted?: boolean; }, isBulk: boolean) {
        try {
            if (cache == null || (!isBulk && !cache.has(data.id))) return cache;

            const mutate = (id: string) => {
                const msg = cache.get(id);
                if (!msg) return;

                const EPHEMERAL = 64;
                const shouldIgnore = data.mlDeleted ||
                    (msg.flags & EPHEMERAL) === EPHEMERAL ||
                    this.shouldIgnore(msg);

                if (shouldIgnore) {
                    cache = cache.remove(id);
                } else {
                    cache = cache.update(id, m => m
                        .set("deleted", true)
                        .set("attachments", m.attachments.map(a => (a.deleted = true, a))));
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
            const { ignoreBots, ignoreSelf, ignoreUsers, ignoreChannels, ignoreGuilds, logEdits, logDeletes } = settings.store;
            const myId = UserStore.getCurrentUser().id;

            return ignoreBots && message.author?.bot ||
                ignoreSelf && message.author?.id === myId ||
                ignoreUsers.includes(message.author?.id) ||
                ignoreChannels.includes(message.channel_id) ||
                ignoreChannels.includes(ChannelStore.getChannel(message.channel_id)?.parent_id) ||
                (isEdit ? !logEdits : !logDeletes) ||
                ignoreGuilds.includes(ChannelStore.getChannel(message.channel_id)?.guild_id) ||
                // Ignore Venbot in the support channels
                (message.author?.id === VENBOT_USER_ID && ChannelStore.getChannel(message.channel_id)?.parent_id === SUPPORT_CATEGORY_ID);
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
                    replace: "!$1.deleted &&"
                }
            ]
        },

        {
            // Message domain model
            find: "}addReaction(",
            replacement: [
                {
                    match: /this\.customRenderedContent=(\i)\.customRenderedContent,/,
                    replace: "this.customRenderedContent = $1.customRenderedContent," +
                        "this.deleted = $1.deleted || false," +
                        "this.editHistory = $1.editHistory || []," +
                        "this.firstEditTimestamp = $1.firstEditTimestamp || this.editedTimestamp || this.timestamp,"
                }
            ]
        },

        {
            // Updated message transformer
            find: ".PREMIUM_REFERRAL&&(",
            replacement: [
                {
                    // Pass through editHistory & deleted to the "edited message" transformer
                    match: /(?<=null!=\i\.edited_timestamp\)return )\i\(\i,\{reactions:(\i)\.reactions.{0,50}\}\)/,
                    replace:
                        "Object.assign($&,{ deleted:$1.deleted, editHistory:$1.editHistory, firstEditTimestamp:$1.firstEditTimestamp })"
                },
                // just mark deleted attachments as deleted on MESSAGE_UPDATE
                {
                    match: /attachments:(\i)\.attachments\?\?\[\],/,
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
                    replace: ")(\"li\",{$1,className:(arguments[0].message.deleted ? \"messagelogger-deleted \" : \"\")+"
                }
            ]
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
                    replace: "children:arguments[0].message.deleted?[]:$1"
                }
            ]
        },
        {
            // Message grouping
            find: "NON_COLLAPSIBLE.has(",
            replacement: {
                match: /if\((\i)\.blocked\)return \i\.\i\.MESSAGE_GROUP_BLOCKED;/,
                replace: '$&else if($1.deleted) return"MESSAGE_GROUP_DELETED";',
            },
            predicate: () => settings.store.collapseDeleted
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
