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
import { Message } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Button, ChannelStore, FluxDispatcher, Forms, Menu, MessageStore, Parser, SelectedChannelStore, Timestamp, UserStore, useStateFromStores } from "@webpack/common";

import overlayStyle from "./deleteStyleOverlay.css?managed";
import textStyle from "./deleteStyleText.css?managed";
import { openHistoryModal } from "./HistoryModal";
import * as persistence from "./persistence";
import * as restore from "./restore";
import { openLogViewerModal } from "./viewer/LogViewerModal";

interface MLMessage extends Message {
    deleted?: boolean;
    editHistory?: { timestamp: Date; content: string; }[];
    firstEditTimestamp?: Date;
}

const MessageClasses = findCssClassesLazy("edited", "communicationDisabled", "isSystemMessage");

function shouldIgnoreMessage(message: any, isEdit = false): boolean {
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
            (message.author?.id === VENBOT_USER_ID && ChannelStore.getChannel(message.channel_id)?.parent_id === SUPPORT_CATEGORY_ID);
    } catch (e) {
        return false;
    }
}

function scheduleRetroactivePurge() {
    const cb = () => {
        void persistence.purgeMatching(entry => {
            try {
                return shouldIgnoreMessage(persistence.deserialize(entry.message));
            } catch {
                return false;
            }
        });
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(cb, { timeout: 5_000 });
    else setTimeout(cb, 0);
}

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
        multiline: true,
        onChange: scheduleRetroactivePurge,
    },
    ignoreChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs to ignore",
        default: "",
        multiline: true,
        onChange: scheduleRetroactivePurge,
    },
    ignoreGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of guild IDs to ignore",
        default: "",
        multiline: true,
        onChange: scheduleRetroactivePurge,
    },
    persistEnabled: {
        type: OptionType.BOOLEAN,
        description: "Persist deleted/edited messages to disk so they survive client reloads",
        default: true,
    },
    persistRetentionDays: {
        type: OptionType.NUMBER,
        description: "Auto-purge persisted entries older than N days (0 = disabled)",
        default: 30,
    },
    persistRetentionCount: {
        type: OptionType.NUMBER,
        description: "Cap total persisted entries; oldest get purged when exceeded (0 = disabled)",
        default: 10_000,
    },
    restoreInline: {
        type: OptionType.BOOLEAN,
        description: "On reload, restore deleted messages and edit history inline in their original channels (otherwise persistence is invisible until the viewer is added)",
        default: true,
    },
    viewerRowDensity: {
        type: OptionType.SELECT,
        description: "Row density in the message-log viewer modal",
        default: "compact",
        options: [
            { label: "Compact", value: "compact", default: true },
            { label: "Comfortable", value: "comfortable" },
        ],
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

const patchGuildContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const guildId: string | undefined = props?.guild?.id;
    if (!guildId) return;
    children.push(
        <Menu.MenuItem
            id="vc-ml-show-log-guild"
            label="Show Message Log"
            action={() => openLogViewerModal({
                scope: "guild",
                guildId,
                rowDensity: settings.store.viewerRowDensity as "compact" | "comfortable",
            })}
        />
    );
};

const patchChannelContextMenu: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel?.id) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;

    group.push(
        <Menu.MenuItem
            id="vc-ml-show-log-channel"
            label="Show Message Log"
            action={() => openLogViewerModal({
                scope: "channel",
                channelId: channel.id,
                guildId: channel.guild_id ?? undefined,
                rowDensity: settings.store.viewerRowDensity as "compact" | "comfortable",
            })}
        />
    );

    const messages = MessageStore.getMessages(channel.id) as MLMessage[];
    if (messages?.some(msg => msg.deleted || msg.editHistory?.length)) {
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
    }
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
    description: "Logs deleted and edited messages, with optional persistence across client reloads.",
    tags: ["Chat", "Utility"],
    authors: [Devs.rushii, Devs.Ven, Devs.AutumnVN, Devs.Nickyux, Devs.Kyuuhachi],
    dependencies: ["MessageUpdaterAPI"],
    settings,
    settingsAboutComponent: () => (
        <>
            <Forms.FormText style={{ marginBottom: 8 }}>
                Browse, search, and clear your captured deletes and edits.
            </Forms.FormText>
            <Button
                size={Button.Sizes.SMALL}
                onClick={() => openLogViewerModal({
                    scope: "global",
                    rowDensity: settings.store.viewerRowDensity as "compact" | "comfortable",
                })}
            >
                Open Message Log
            </Button>
        </>
    ),
    contextMenus: {
        "message": patchMessageContextMenu,
        "channel-context": patchChannelContextMenu,
        "thread-context": patchChannelContextMenu,
        "user-context": patchChannelContextMenu,
        "gdm-context": patchChannelContextMenu,
        "guild-context": patchGuildContextMenu,
    },

    flux: {
        async LOAD_MESSAGES_SUCCESS(e: any) {
            if (!settings.store.persistEnabled || !settings.store.restoreInline) return;
            await restore.onLoadMessagesSuccess(e);
        },
        async CHANNEL_SELECT(e: any) {
            if (!settings.store.persistEnabled || !settings.store.restoreInline) return;
            await restore.onChannelSelect(e);
        },
    },

    async start() {
        addDeleteStyle();
        await persistence.init();
        window.addEventListener("beforeunload", persistence.flushSync);
        setTimeout(() => {
            void persistence.runRetentionPurge({
                days: settings.store.persistRetentionDays,
                count: settings.store.persistRetentionCount,
            });
        }, 5_000);
    },

    stop() {
        window.removeEventListener("beforeunload", persistence.flushSync);
        persistence.flushSync();
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
        if (settings.store.persistEnabled) {
            persistence.enqueueEdit(newMessage, oldMessage);
        }
        return {
            timestamp: new Date(newMessage.edited_timestamp),
            content: oldMessage.content
        };
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
                    if (settings.store.persistEnabled) {
                        persistence.enqueueDelete(msg);
                    }
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
        return shouldIgnoreMessage(message, isEdit);
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
            // Updated message transformer(?)
            find: ".PREMIUM_REFERRAL&&(",
            replacement: [
                {
                    // Pass through editHistory & deleted & original attachments to the "edited message" transformer
                    match: /(?<=null!=\i\.edited_timestamp\)return )\i\(\i,\{reactions:(\i)\.reactions.{0,50}\}\)/,
                    replace:
                        "Object.assign($&,{ deleted:$1.deleted, editHistory:$1.editHistory, firstEditTimestamp:$1.firstEditTimestamp })"
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
                        "firstEditTimestamp: new Date(arguments[1]?.firstEditTimestamp ?? $2.editedTimestamp ?? $2.timestamp)"
                },
                {
                    // Preserve deleted attribute on attachments
                    match: /(\((\i)\){return null==\2\.attachments.+?)spoiler:/,
                    replace:
                        "$1deleted: arguments[0]?.deleted," +
                        "spoiler:"
                }
            ]
        },

        {
            // Attachment renderer
            find: "#{intl::REMOVE_ATTACHMENT_TOOLTIP_TEXT}",
            replacement: [
                {
                    match: /\.SPOILER,(?=\[\i\.\i\]:)/,
                    replace: '$&"messagelogger-deleted-attachment":arguments[0]?.item?.originalItem?.deleted,'
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
        }
    ]
});
