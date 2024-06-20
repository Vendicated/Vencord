/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

export const VERSION = "3.0.0";

export const Native = getNative();

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings, Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Alerts, Button, FluxDispatcher, Menu, MessageActions, MessageStore, React, Toasts, UserStore } from "@webpack/common";

import { ImageCacheDir, LogsDir } from "./components/FolderSelectInput";
import { OpenLogsButton } from "./components/LogsButton";
import { openLogModal } from "./components/LogsModal";
import { addMessage, loggedMessages, MessageLoggerStore, removeLog } from "./LoggedMessageManager";
import * as LoggedMessageManager from "./LoggedMessageManager";
import { LoadMessagePayload, LoggedAttachment, LoggedMessage, LoggedMessageJSON, MessageCreatePayload, MessageDeleteBulkPayload, MessageDeletePayload, MessageUpdatePayload } from "./types";
import { addToXAndRemoveFromOpposite, cleanUpCachedMessage, cleanupUserObject, doesBlobUrlExist, getNative, isGhostPinged, ListType, mapEditHistory, messageJsonToMessageClass, reAddDeletedMessages, removeFromX } from "./utils";
import { DEFAULT_IMAGE_CACHE_DIR } from "./utils/constants";
import { shouldIgnore } from "./utils/index";
import { LimitedMap } from "./utils/LimitedMap";
import { doesMatch } from "./utils/parseQuery";
import * as imageUtils from "./utils/saveImage";
import * as ImageManager from "./utils/saveImage/ImageManager";
import { downloadLoggedMessages } from "./utils/settingsUtils";


export const Flogger = new Logger("MessageLoggerEnhanced", "#f26c6c");

export const cacheSentMessages = new LimitedMap<string, LoggedMessageJSON>();

const cacheThing = findByPropsLazy("commit", "getOrCreate");


const handledMessageIds = new Set();
async function messageDeleteHandler(payload: MessageDeletePayload & { isBulk: boolean; }) {
    if (payload.mlDeleted) {
        if (settings.store.permanentlyRemoveLogByDefault)
            await removeLog(payload.id);

        return;
    }

    if (handledMessageIds.has(payload.id)) {
        // Flogger.warn("skipping duplicate message", payload.id);
        return;
    }

    try {
        handledMessageIds.add(payload.id);

        let message: LoggedMessage | LoggedMessageJSON | null =
            MessageStore.getMessage(payload.channelId, payload.id);
        if (message == null) {
            // most likely an edited message
            const cachedMessage = cacheSentMessages.get(`${payload.channelId},${payload.id}`);
            if (!cachedMessage) return; // Flogger.log("no message to save");

            message = { ...cacheSentMessages.get(`${payload.channelId},${payload.id}`), deleted: true } as LoggedMessageJSON;
        }

        if (
            shouldIgnore({
                channelId: message?.channel_id ?? payload.channelId,
                guildId: payload.guildId ?? (message as any).guildId ?? (message as any).guild_id,
                authorId: message?.author?.id,
                bot: message?.bot || message?.author?.bot,
                flags: message?.flags,
                ghostPinged: isGhostPinged(message as any),
                isCachedByUs: (message as LoggedMessageJSON).ourCache
            })
        ) {
            // Flogger.log("IGNORING", message, payload);
            return FluxDispatcher.dispatch({
                type: "MESSAGE_DELETE",
                channelId: payload.channelId,
                id: payload.id,
                mlDeleted: true
            });
        }


        if (message == null || message.channel_id == null || !message.deleted) return;
        // Flogger.log("ADDING MESSAGE (DELETED)", message);
        await addMessage(message, "deletedMessages", payload.isBulk ?? false);
    }
    finally {
        handledMessageIds.delete(payload.id);
    }
}

async function messageDeleteBulkHandler({ channelId, guildId, ids }: MessageDeleteBulkPayload) {
    // is this bad? idk man
    for (const id of ids) {
        await messageDeleteHandler({ type: "MESSAGE_DELETE", channelId, guildId, id, isBulk: true });
    }
    await LoggedMessageManager.saveLoggedMessages();
}

async function messageUpdateHandler(payload: MessageUpdatePayload) {
    const cachedMessage = cacheSentMessages.get(`${payload.message.channel_id},${payload.message.id}`);
    if (
        shouldIgnore({
            channelId: payload.message?.channel_id,
            guildId: payload.guildId ?? (payload as any).guild_id,
            authorId: payload.message?.author?.id,
            bot: (payload.message?.author as any)?.bot,
            flags: payload.message?.flags,
            ghostPinged: isGhostPinged(payload.message as any),
            isCachedByUs: cachedMessage?.ourCache ?? false
        })
    ) {
        const cache = cacheThing.getOrCreate(payload.message.channel_id);
        const message = cache.get(payload.message.id);
        if (message) {
            message.editHistory = [];
            cacheThing.commit(cache);
        }
        return;//  Flogger.log("this message has been ignored", payload);
    }

    let message = MessageStore
        .getMessage(payload.message.channel_id, payload.message.id) as LoggedMessage | LoggedMessageJSON | null;

    if (message == null) {
        // MESSAGE_UPDATE gets dispatched when emebeds change too and content becomes null
        if (cachedMessage != null && payload.message.content != null && cachedMessage.content !== payload.message.content) {
            message = {
                ...cachedMessage,
                content: payload.message.content,
                editHistory: [
                    ...(cachedMessage.editHistory ?? []),
                    {
                        content: cachedMessage.content,
                        timestamp: new Date().toISOString()
                    }
                ]
            };

            cacheSentMessages.set(`${payload.message.channel_id},${payload.message.id}`, message);
        }
    }

    if (message == null || message.channel_id == null || message.editHistory == null || message.editHistory.length === 0) return;

    // Flogger.log("ADDING MESSAGE (EDITED)", message, payload);
    await addMessage(message, "editedMessages");
}

function messageCreateHandler(payload: MessageCreatePayload) {
    // we do this here because cache is limited and to save memory
    if (!settings.store.cacheMessagesFromServers && payload.guildId != null) {
        const ids = [payload.channelId, payload.message?.author?.id, payload.guildId];
        const isWhitelisted =
            settings.store.whitelistedIds
                .split(",")
                .some(e => ids.includes(e));
        if (!isWhitelisted) {
            return; // dont cache messages from servers when cacheMessagesFromServers is disabled and not whitelisted.
        }
    }

    cacheSentMessages.set(`${payload.message.channel_id},${payload.message.id}`, cleanUpCachedMessage(payload.message));
    // Flogger.log(`cached\nkey:${payload.message.channel_id},${payload.message.id}\nvalue:`, payload.message);
}

// also stolen from mlv2
function messageLoadSuccess(payload: LoadMessagePayload) {
    const deletedMessages = loggedMessages.deletedMessages[payload.channelId];
    const editedMessages = loggedMessages.editedMessages[payload.channelId];
    const recordIDs: string[] = [...(deletedMessages || []), ...(editedMessages || [])];


    for (let i = 0; i < payload.messages.length; ++i) {
        const recievedMessage = payload.messages[i];
        const record = loggedMessages[recievedMessage.id];

        if (record == null || record.message == null) continue;

        if (record.message.editHistory!.length !== 0) {
            payload.messages[i].editHistory = record.message.editHistory;
        }

    }

    const fetchUser = (id: string) => UserStore.getUser(id) || payload.messages.find(e => e.author.id === id);

    for (let i = 0, len = recordIDs.length; i < len; i++) {
        const id = recordIDs[i];
        if (!loggedMessages[id]) continue;
        const { message } = loggedMessages[id] as { message: LoggedMessageJSON; };

        for (let j = 0, len2 = message.mentions.length; j < len2; j++) {
            const user = message.mentions[j];
            const cachedUser = fetchUser((user as any).id || user);
            if (cachedUser) (message.mentions[j] as any) = cleanupUserObject(cachedUser);
        }

        const author = fetchUser(message.author.id);
        if (!author) continue;
        (message.author as any) = cleanupUserObject(author);
    }

    reAddDeletedMessages(payload.messages, deletedMessages, !payload.hasMoreAfter && !payload.isBefore, !payload.hasMoreBefore && !payload.isAfter);
}

export const settings = definePluginSettings({
    saveMessages: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Wether to save the deleted and edited messages.",
    },

    saveImages: {
        type: OptionType.BOOLEAN,
        description: "Save deleted messages",
        default: false
    },

    sortNewest: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Sort logs by newest.",
    },

    cacheMessagesFromServers: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Usually message logger only logs from whitelisted ids and dms, enabling this would mean it would log messages from all servers as well. Note that this may cause the cache to exceed its limit, resulting in some messages being missed. If you are in a lot of servers, this may significantly increase the chances of messages being logged, which can result in a large message record and the inclusion of irrelevant messages.",
    },

    autoCheckForUpdates: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Automatically check for updates on startup.",
    },

    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by bots",
        default: false,
        onChange() {
            // we will be handling the ignoreBots now (enabled or not) so the original messageLogger shouldnt
            Settings.plugins.MessageLogger.ignoreBots = false;
        }
    },

    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by yourself",
        default: false,
        onChange() {
            Settings.plugins.MessageLogger.ignoreSelf = false;
        }
    },

    ignoreMutedGuilds: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Messages in muted guilds will not be logged. Whitelisted users/channels in muted guilds will still be logged."
    },

    ignoreMutedCategories: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Messages in channels belonging to muted categories will not be logged. Whitelisted users/channels in muted guilds will still be logged."
    },

    ignoreMutedChannels: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Messages in muted channels will not be logged. Whitelisted users/channels in muted guilds will still be logged."
    },

    alwaysLogDirectMessages: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Always log DMs",
    },

    alwaysLogCurrentChannel: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Always log current selected channel. Blacklisted channels/users will still be ignored.",
    },

    permanentlyRemoveLogByDefault: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Vencord's base MessageLogger remove log button wiil delete logs permanently",
    },

    hideMessageFromMessageLoggers: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "When enabled, a context menu button will be added to messages to allow you to delete messages without them being logged by other loggers. Might not be safe, use at your own risk."
    },

    ShowLogsButton: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Toggle to whenever show the toolbox or not",
        restartNeeded: true,
    },

    hideMessageFromMessageLoggersDeletedMessage: {
        default: "redacted eh",
        type: OptionType.STRING,
        description: "The message content to replace the message with when using the hide message from message loggers feature.",
    },

    messageLimit: {
        default: 200,
        type: OptionType.NUMBER,
        description: "Maximum number of messages to save. Older messages are deleted when the limit is reached. 0 means there is no limit"
    },

    imagesLimit: {
        default: 100,
        type: OptionType.NUMBER,
        description: "Maximum number of images to save. Older images are deleted when the limit is reached. 0 means there is no limit"
    },

    cacheLimit: {
        default: 1000,
        type: OptionType.NUMBER,
        description: "Maximum number of messages to store in the cache. Older messages are deleted when the limit is reached. This helps reduce memory usage and improve performance. 0 means there is no limit",
    },

    whitelistedIds: {
        default: "",
        type: OptionType.STRING,
        description: "Whitelisted server, channel, or user IDs."
    },

    blacklistedIds: {
        default: "",
        type: OptionType.STRING,
        description: "Blacklisted server, channel, or user IDs."
    },

    imageCacheDir: {
        type: OptionType.COMPONENT,
        description: "Select saved images directory",
        component: ErrorBoundary.wrap(ImageCacheDir) as any
    },

    logsDir: {
        type: OptionType.COMPONENT,
        description: "Select logs directory",
        component: ErrorBoundary.wrap(LogsDir) as any
    },

    exportLogs: {
        type: OptionType.COMPONENT,
        description: "Export Logs From IndexedDB",
        component: () =>
            <Button onClick={downloadLoggedMessages}>
                Export Logs
            </Button>
    },
    openLogs: {
        type: OptionType.COMPONENT,
        description: "Open Logs",
        component: () =>
            <Button onClick={() => openLogModal()}>
                Open Logs
            </Button>
    },
    openImageCacheFolder: {
        type: OptionType.COMPONENT,
        description: "Opens the image cache directory",
        component: () =>
            <Button
                disabled={
                    IS_WEB
                    || settings.store.imageCacheDir == null
                    || settings.store.imageCacheDir === DEFAULT_IMAGE_CACHE_DIR
                }
                onClick={() => Native.showItemInFolder(settings.store.imageCacheDir)}
            >
                Open Image Cache Folder
            </Button>
    },

    clearLogs: {
        type: OptionType.COMPONENT,
        description: "Clear Logs",
        component: () =>
            <Button
                color={Button.Colors.RED}
                onClick={() => Alerts.show({
                    title: "Clear Logs",
                    body: "Are you sure you want to clear all logs?",
                    confirmColor: Button.Colors.RED,
                    confirmText: "Clear",
                    cancelText: "Cancel",
                    onConfirm: () => {
                        LoggedMessageManager.clearLogs();
                    },
                })}
            >
                Clear Logs
            </Button>
    },

});

const idFunctions = {
    Server: props => props?.guild?.id,
    User: props => props?.message?.author?.id || props?.user?.id,
    Channel: props => props.message?.channel_id || props.channel?.id
} as const;

type idKeys = keyof typeof idFunctions;

function renderListOption(listType: ListType, IdType: idKeys, props: any) {
    const id = idFunctions[IdType](props);
    if (!id) return null;

    const isBlocked = settings.store[listType].includes(id);
    const oppositeListType = listType === "blacklistedIds" ? "whitelistedIds" : "blacklistedIds";
    const isOppositeBlocked = settings.store[oppositeListType].includes(id);
    const list = listType === "blacklistedIds" ? "Blacklist" : "Whitelist";

    const addToList = () => addToXAndRemoveFromOpposite(listType, id);
    const removeFromList = () => removeFromX(listType, id);

    return (
        <Menu.MenuItem
            id={`${listType}-${IdType}-${id}`}
            label={
                isOppositeBlocked
                    ? `Move ${IdType} to ${list}`
                    : isBlocked ? `Remove ${IdType} From ${list}` : `${list} ${IdType}`
            }
            action={isBlocked ? removeFromList : addToList}
        />
    );
}

function renderOpenLogs(idType: idKeys, props: any) {
    const id = idFunctions[idType](props);
    if (!id) return null;

    return (
        <Menu.MenuItem
            id={`open-logs-for-${idType.toLowerCase()}`}
            label={`Open Logs For ${idType}`}
            action={() => openLogModal(`${idType.toLowerCase()}:${id}`)}
        />
    );
}

const contextMenuPath: NavContextMenuPatchCallback = (children, props) => {
    if (!props) return;

    if (!children.some(child => child?.props?.id === "message-logger")) {
        children.push(
            <Menu.MenuSeparator />,
            <Menu.MenuItem
                id="message-logger"
                label="Message Logger"
            >

                <Menu.MenuItem
                    id="open-logs"
                    label="Open Logs"
                    action={() => openLogModal()}
                />

                {Object.keys(idFunctions).map(IdType => renderOpenLogs(IdType as idKeys, props))}

                <Menu.MenuSeparator />

                {Object.keys(idFunctions).map(IdType => (
                    <React.Fragment key={IdType}>
                        {renderListOption("blacklistedIds", IdType as idKeys, props)}
                        {renderListOption("whitelistedIds", IdType as idKeys, props)}
                    </React.Fragment>
                ))}

                {
                    props.navId === "message"
                    && (props.message?.deleted || props.message?.editHistory?.length > 0)
                    && (
                        <>
                            <Menu.MenuSeparator />
                            <Menu.MenuItem
                                id="remove-message"
                                label={props.message?.deleted ? "Remove Message (Permanent)" : "Remove Message History (Permanent)"}
                                color="danger"
                                action={() =>
                                    removeLog(props.message.id)
                                        .then(() => {
                                            if (props.message.deleted) {
                                                FluxDispatcher.dispatch({
                                                    type: "MESSAGE_DELETE",
                                                    channelId: props.message.channel_id,
                                                    id: props.message.id,
                                                    mlDeleted: true
                                                });
                                            } else {
                                                props.message.editHistory = [];
                                            }
                                        }).catch(() => Toasts.show({
                                            type: Toasts.Type.FAILURE,
                                            message: "Failed to remove message",
                                            id: Toasts.genId()
                                        }))

                                }
                            />
                        </>
                    )
                }

                {
                    settings.store.hideMessageFromMessageLoggers
                    && props.navId === "message"
                    && props.message?.author?.id === UserStore.getCurrentUser().id
                    && props.message?.deleted === false
                    && (
                        <>
                            <Menu.MenuSeparator />
                            <Menu.MenuItem
                                id="hide-from-message-loggers"
                                label="Delete Message (Hide From Message Loggers)"
                                color="danger"

                                action={async () => {
                                    await MessageActions.deleteMessage(props.message.channel_id, props.message.id);
                                    MessageActions._sendMessage(props.message.channel_id, {
                                        "content": settings.store.hideMessageFromMessageLoggersDeletedMessage,
                                        "tts": false,
                                        "invalidEmojis": [],
                                        "validNonShortcutEmojis": []
                                    }, { nonce: props.message.id });
                                }}

                            />
                        </>
                    )
                }

            </Menu.MenuItem>
        );
    }
};

export default definePlugin({
    name: "MLEnhanced",
    authors: [Devs.Aria],
    description: "G'day",
    dependencies: ["MessageLogger"],
    contextMenus: {
        "message": contextMenuPath,
        "channel-context": contextMenuPath,
        "user-context": contextMenuPath,
        "guild-context": contextMenuPath,
        "gdm-context": contextMenuPath
    },
    patches: [
        {
            find: '"MessageStore"',
            replacement: {
                match: /LOAD_MESSAGES_SUCCESS:function\(\i\){/,
                replace: "$&$self.messageLoadSuccess(arguments[0]);"
            }
        },

        {
            find: "THREAD_STARTER_MESSAGE?null===",
            replacement: {
                match: / deleted:\i\.deleted, editHistory:\i\.editHistory,/,
                replace: "deleted:$self.getDeleted(...arguments), editHistory:$self.getEdited(...arguments),"
            }
        },

        {
            find: "toolbar:function",
            predicate: () => settings.store.ShowLogsButton,
            replacement: {
                match: /(function \i\(\i\){)(.{1,200}toolbar.{1,100}mobileToolbar)/,
                replace: "$1$self.addIconToToolBar(arguments[0]);$2"
            }
        },

        {
            find: ",guildId:void 0}),childrenMessageContent",
            replacement: {
                match: /(cozyMessage.{1,50},)childrenHeader:/,
                replace: "$1childrenAccessories:arguments[0].childrenAccessories || null,childrenHeader:"
            }
        },

        // https://regex101.com/r/TMV1vY/1
        {
            find: ".removeMosaicItemHoverButton",
            replacement: {
                match: /(\i=(\i)=>{)(.+?isSingleMosaicItem)/,
                replace: "$1 let forceUpdate=Vencord.Util.useForceUpdater();$self.patchAttachments($2,forceUpdate);$3"
            }
        },

        {
            find: "handleImageLoad)",
            replacement: {
                match: /(render\(\){)(.{1,100}zoomThumbnailPlaceholder)/,
                replace: "$1$self.checkImage(this);$2"
            }
        },

        // dont fetch messages for channels in modal
        {
            find: "Using PollReferenceMessageContext without",
            replacement: {
                match: /(?:\i\.)?\i\.(?:default\.)?focusMessage\(/,
                replace: "!(arguments[0]?.message?.deleted || arguments[0]?.message?.editHistory?.length > 0) && $&"
            }
        },

        // only check for expired attachments if the message is not deleted
        {
            find: "\"/ephemeral-attachments/\"",
            replacement: {
                match: /\i\.attachments\.some\(\i\)\|\|\i\.embeds\.some/,
                replace: "!arguments[0].deleted && $&"
            }
        }
    ],
    settings,

    toolboxActions: {
        "Message Logger"() {
            openLogModal();
        }
    },

    addIconToToolBar(e: { toolbar: React.ReactNode[] | React.ReactNode; }) {
        if (Array.isArray(e.toolbar))
            return e.toolbar.push(
                <ErrorBoundary noop={true}>
                    <OpenLogsButton />
                </ErrorBoundary>
            );

        e.toolbar = [
            <ErrorBoundary noop={true}>
                <OpenLogsButton />
            </ErrorBoundary>,
            e.toolbar,
        ];
    },

    messageLoadSuccess,
    store: MessageLoggerStore,
    openLogModal,
    doesMatch,
    LoggedMessageManager,
    ImageManager,
    imageUtils,

    isDeletedMessage: (id: string) => loggedMessages.deletedMessages[id] != null,

    getDeleted(m1, m2) {
        const deleted = m2?.deleted;
        if (deleted == null && m1?.deleted != null) return m1.deleted;
        return deleted;
    },

    getEdited(m1, m2) {
        const editHistory = m2?.editHistory;
        if (editHistory == null && m1?.editHistory != null && m1.editHistory.length > 0)
            return m1.editHistory.map(mapEditHistory);
        return editHistory;
    },

    attachments: new Map<string, LoggedAttachment>(),
    patchAttachments(props: { attachment: LoggedAttachment, message: LoggedMessage; }, forceUpdate: () => void) {
        const { attachment, message } = props;
        if (!message?.deleted || !LoggedMessageManager.hasMessageInLogs(message.id))
            return; // Flogger.log("ignoring", message.id);

        if (this.attachments.has(attachment.id))
            return props.attachment = this.attachments.get(attachment.id)!; // Flogger.log("blobUrl already exists");

        imageUtils.getAttachmentBlobUrl(attachment).then((blobUrl: string | null) => {
            if (blobUrl == null) {
                Flogger.error("image not found. for message.id =", message.id, blobUrl);
                return;
            }
            Flogger.log("Got blob url for message.id =", message.id, blobUrl);
            // we need to copy because changing this will change the attachment for the message in the logs
            const attachmentCopy = { ...attachment };

            attachmentCopy.oldUrl = attachment.url;

            const finalBlobUrl = blobUrl + "#";
            attachmentCopy.blobUrl = finalBlobUrl;
            attachmentCopy.url = finalBlobUrl;
            attachmentCopy.proxy_url = finalBlobUrl;
            this.attachments.set(attachment.id, attachmentCopy);
            forceUpdate();
        });

    },

    async checkImage(instance: any) {
        if (!instance.props.isBad && instance.state?.readyState !== "READY" && instance.props?.src?.startsWith("blob:")) {
            if (await doesBlobUrlExist(instance.props.src)) {
                Flogger.log("image exists", instance.props.src);
                return instance.setState(e => ({ ...e, readyState: "READY" }));
            }

            instance.props.isBad = true;
        }
    },

    flux: {
        "MESSAGE_DELETE": messageDeleteHandler,
        "MESSAGE_DELETE_BULK": messageDeleteBulkHandler,
        "MESSAGE_UPDATE": messageUpdateHandler,
        "MESSAGE_CREATE": messageCreateHandler
    },

    async start() {
        this.oldGetMessage = MessageStore.getMessage;
        // we have to do this because the original message logger fetches the message from the store now
        MessageStore.getMessage = (channelId: string, messageId: string) => {
            const MLMessage = LoggedMessageManager.getMessage(channelId, messageId);
            if (MLMessage?.message) return messageJsonToMessageClass(MLMessage);

            return this.oldGetMessage(channelId, messageId);
        };

        Native.init();

        const { imageCacheDir, logsDir } = await Native.getSettings();
        settings.store.imageCacheDir = imageCacheDir;
        settings.store.logsDir = logsDir;
    },

    stop() {
        MessageStore.getMessage = this.oldGetMessage;
    }
});
