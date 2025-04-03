/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const VERSION = "4.0.0";

export const Native = getNative();

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, MessageStore, React, UserStore } from "@webpack/common";

import { OpenLogsButton } from "./components/LogsButton";
import { openLogModal } from "./components/LogsModal";
import * as idb from "./db";
import { addMessage } from "./LoggedMessageManager";
import * as LoggedMessageManager from "./LoggedMessageManager";
import { settings } from "./settings";
import { FetchMessagesResponse, LoadMessagePayload, LoggedMessage, LoggedMessageJSON, MessageCreatePayload, MessageDeleteBulkPayload, MessageDeletePayload, MessageUpdatePayload } from "./types";
import { cleanUpCachedMessage, cleanupUserObject, getNative, isGhostPinged, mapTimestamp, messageJsonToMessageClass, reAddDeletedMessages } from "./utils";
import { removeContextMenuBindings, setupContextMenuPatches } from "./utils/contextMenu";
import { shouldIgnore } from "./utils/index";
import { LimitedMap } from "./utils/LimitedMap";
import { doesMatch } from "./utils/parseQuery";
import * as imageUtils from "./utils/saveImage";
import * as ImageManager from "./utils/saveImage/ImageManager";
export { settings };

export const Flogger = new Logger("MessageLoggerEnhanced", "#f26c6c");

export const cacheSentMessages = new LimitedMap<string, LoggedMessageJSON>();

const cacheThing = findByPropsLazy("commit", "getOrCreate");

let oldGetMessage: typeof MessageStore.getMessage;

const handledMessageIds = new Set();
async function messageDeleteHandler(payload: MessageDeletePayload & { isBulk: boolean; }) {
    if (payload.mlDeleted) {
        if (settings.store.permanentlyRemoveLogByDefault)
            await idb.deleteMessageIDB(payload.id);

        return;
    }

    if (handledMessageIds.has(payload.id)) {
        // Flogger.warn("skipping duplicate message", payload.id);
        return;
    }

    try {
        handledMessageIds.add(payload.id);

        let message: LoggedMessage | LoggedMessageJSON | null =
            oldGetMessage?.(payload.channelId, payload.id);
        if (message == null) {
            // most likely an edited message
            const cachedMessage = cacheSentMessages.get(`${payload.channelId},${payload.id}`);
            if (!cachedMessage) return; // Flogger.log("no message to save");

            message = { ...cacheSentMessages.get(`${payload.channelId},${payload.id}`), deleted: true } as LoggedMessageJSON;
        }

        const ghostPinged = isGhostPinged(message as any);

        if (
            shouldIgnore({
                channelId: message?.channel_id ?? payload.channelId,
                guildId: payload.guildId ?? (message as any).guildId ?? (message as any).guild_id,
                authorId: message?.author?.id,
                bot: message?.bot || message?.author?.bot,
                flags: message?.flags,
                ghostPinged,
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
        if (payload.isBulk)
            return message;

        await addMessage(message, ghostPinged ? idb.DBMessageStatus.GHOST_PINGED : idb.DBMessageStatus.DELETED);
    }
    finally {
        handledMessageIds.delete(payload.id);
    }
}

async function messageDeleteBulkHandler({ channelId, guildId, ids }: MessageDeleteBulkPayload) {
    // is this bad? idk man
    const messages = [] as LoggedMessageJSON[];
    for (const id of ids) {
        const msg = await messageDeleteHandler({ type: "MESSAGE_DELETE", channelId, guildId, id, isBulk: true });
        if (msg) messages.push(msg as LoggedMessageJSON);
    }

    await idb.addMessagesBulkIDB(messages);
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

    let message = oldGetMessage?.(payload.message.channel_id, payload.message.id) as LoggedMessage | LoggedMessageJSON | null;

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
                        timestamp: (new Date()).toISOString()
                    }
                ]
            };

            cacheSentMessages.set(`${payload.message.channel_id},${payload.message.id}`, message);
        }
    }

    if (message == null || message.channel_id == null || message.editHistory == null || message.editHistory.length === 0) return;

    // Flogger.log("ADDING MESSAGE (EDITED)", message, payload);
    await addMessage(message, idb.DBMessageStatus.EDITED);
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

async function processMessageFetch(response: FetchMessagesResponse) {
    try {
        if (!response.ok || response.body.length === 0) {
            Flogger.error("Failed to fetch messages", response);
            return;
        }

        const firstMessage = response.body[response.body.length - 1];
        // console.time("fetching messages from idb");
        const messages = await idb.getMessagesByChannelAndAfterTimestampIDB(firstMessage.channel_id, firstMessage.timestamp);
        // console.timeEnd("fetching messages from idb");

        if (!messages.length) return;

        const deletedMessages = messages.filter(m => m.status === idb.DBMessageStatus.DELETED);

        for (const recivedMessage of response.body) {
            const record = messages.find(m => m.message_id === recivedMessage.id);

            if (record == null) continue;

            if (record.message.editHistory && record.message.editHistory.length > 0) {
                recivedMessage.editHistory = record.message.editHistory;
            }
        }

        const fetchUser = (id: string) => UserStore.getUser(id) || response.body.find(e => e.author.id === id);

        for (let i = 0, len = messages.length; i < len; i++) {
            const record = messages[i];
            if (!record) continue;

            const { message } = record;

            for (let j = 0, len2 = message.mentions.length; j < len2; j++) {
                const user = message.mentions[j];
                const cachedUser = fetchUser((user as any).id || user);
                if (cachedUser) (message.mentions[j] as any) = cleanupUserObject(cachedUser);
            }

            const author = fetchUser(message.author.id);
            if (!author) continue;
            (message.author as any) = cleanupUserObject(author);
        }

        response.body.extra = deletedMessages.map(m => m.message);

    } catch (e) {
        Flogger.error("Failed to fetch messages", e);
    }
}

export default definePlugin({
    name: "MessageLoggerEnhanced",
    authors: [Devs.Aria],
    description: "G'day",
    dependencies: ["MessageLogger"],

    patches: [
        {
            find: "_tryFetchMessagesCached",
            replacement: [
                {
                    match: /(?<=\.get\({url.+?then\()(\i)=>\(/,
                    replace: "async $1=>(await $self.processMessageFetch($1),"
                },
                {
                    match: /(?<=type:"LOAD_MESSAGES_SUCCESS",.{1,100})messages:(\i)/,
                    replace: "get messages() {return $self.coolReAddDeletedMessages($1, this);}"
                }

            ]
        },
        {
            find: "THREAD_STARTER_MESSAGE?null==",
            replacement: {
                match: /deleted:\i\.deleted, editHistory:\i\.editHistory,/,
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
            find: "childrenMessageContent:null",
            replacement: {
                match: /(cozyMessage.{1,50},)childrenHeader:/,
                replace: "$1childrenAccessories:arguments[0].childrenAccessories || null,childrenHeader:"
            }
        },

        // https://regex101.com/r/S3IVGm/1
        // fix vidoes failing because there are no thumbnails
        {
            find: ".handleImageLoad)",
            replacement: {
                match: /(componentDidMount\(\){)(.{1,150}===(.+?)\.LOADING)/,
                replace:
                    "$1if(this.props?.src?.startsWith('blob:') && this.props?.item?.type === 'VIDEO')" +
                    "return this.setState({readyState: $3.READY});$2"
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
            <ErrorBoundary noop={true} key={"MessageLoggerEnhanced"} >
                <OpenLogsButton />
            </ErrorBoundary>,
            e.toolbar,
        ];
    },

    processMessageFetch,
    openLogModal,
    doesMatch,
    reAddDeletedMessages,
    LoggedMessageManager,
    ImageManager,
    imageUtils,
    idb,

    coolReAddDeletedMessages: (messages: LoggedMessageJSON[] & { extra: LoggedMessageJSON[]; }, payload: LoadMessagePayload) => {
        try {
            if (messages.extra)
                reAddDeletedMessages(messages, messages.extra, !payload.hasMoreAfter && !payload.isBefore, !payload.hasMoreBefore && !payload.isAfter);
        }
        catch (e) {
            Flogger.error("Failed to re-add deleted messages", e);
        }
        finally {
            return messages;
        }
    },

    isDeletedMessage: (id: string) => cacheSentMessages.get(id)?.deleted ?? false,

    getDeleted(m1, m2) {
        const deleted = m2?.deleted;
        if (deleted == null && m1?.deleted != null) return m1.deleted;
        return deleted;
    },

    getEdited(m1, m2) {
        const editHistory = m2?.editHistory;
        if (editHistory == null && m1?.editHistory != null && m1.editHistory.length > 0)
            return m1.editHistory.map(mapTimestamp);
        return editHistory;
    },

    flux: {
        "MESSAGE_DELETE": messageDeleteHandler as any,
        "MESSAGE_DELETE_BULK": messageDeleteBulkHandler,
        "MESSAGE_UPDATE": messageUpdateHandler,
        "MESSAGE_CREATE": messageCreateHandler
    },

    async start() {
        this.oldGetMessage = oldGetMessage = MessageStore.getMessage;

        // we have to do this because the original message logger fetches the message from the store now
        MessageStore.getMessage = (channelId: string, messageId: string) => {
            const MLMessage = idb.cachedMessages.get(messageId);
            if (MLMessage) return messageJsonToMessageClass({ message: MLMessage });

            return this.oldGetMessage(channelId, messageId);
        };

        Native.init();

        const { imageCacheDir, logsDir } = await Native.getSettings();
        settings.store.imageCacheDir = imageCacheDir;
        settings.store.logsDir = logsDir;

        setupContextMenuPatches();
    },

    stop() {
        removeContextMenuBindings();
        MessageStore.getMessage = this.oldGetMessage;
    }
});
