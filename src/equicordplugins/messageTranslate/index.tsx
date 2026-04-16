/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin from "@utils/types";
import { ChannelStore, FluxDispatcher, MessageStore, UserStore } from "@webpack/common";

import { getIgnoredChannels, getIgnoredGuilds, getIgnoredUsers, settings } from "./settings";
import { MessageWithContent } from "./types";
import { clearCache, getCached, hasFailed, isInProgress, translate } from "./utils/translate";

const cl = classNameFactory("mt-");
const translatedMessages = new Map<string, string>();

function shouldTranslate(message: MessageWithContent): boolean {
    if (!message.content || typeof message.content !== "string") return false;
    if (hasFailed(message.id, message.content)) return false;

    if (settings.store.skipOwnMessages) {
        const currentUserId = UserStore.getCurrentUser()?.id;
        if (currentUserId && message.author?.id === currentUserId) return false;
    }

    if (settings.store.skipBotMessages && message.author?.bot) return false;

    if (message.author && getIgnoredUsers().has(message.author.id)) return false;
    if (message.channel_id && getIgnoredChannels().has(message.channel_id)) return false;

    const guildId = message.channel_id ? ChannelStore.getChannel(message.channel_id)?.guild_id : null;
    if (guildId && getIgnoredGuilds().has(guildId)) return false;

    return true;
}

function triggerReRender(message: MessageWithContent) {
    const current = MessageStore.getMessage(message.channel_id, message.id);
    if (!current) return;

    FluxDispatcher.dispatch({
        type: "MESSAGE_UPDATE",
        message: current,
    });
}

export default definePlugin({
    name: "MessageTranslate",
    description: "Auto translate messages to your language with caching, per-channel toggles, and more options.",
    tags: ["Chat", "Utility"],
    authors: [EquicordDevs.creations],
    settings,

    patches: [
        {
            find: '.CUSTOM_GIFT?""',
            replacement: [
                {
                    match: /message:(\i),message:\{id:\i\}.{0,200}renderContentOnly:\i\}=\i;/,
                    replace: "$&$1=$self.transformMessage($1);",
                },
                {
                    match: /childrenMessageContent:(\i),/g,
                    replace: "childrenMessageContent:$self.wrapContent($1,arguments[0].message.id),",
                },
            ],
        },
    ],

    transformMessage(message: MessageWithContent): MessageWithContent {
        if (!settings.store.autoTranslate || !shouldTranslate(message)) {
            translatedMessages.delete(message.id);
            return message;
        }

        const cached = getCached(message.id);
        if (cached) {
            if (cached.original !== message.content) {
                clearCache(message.id);
                translatedMessages.delete(message.id);
                return message;
            }
            translatedMessages.set(message.id, cached.sourceLang);
            return Object.assign(Object.create(Object.getPrototypeOf(message)), message, {
                content: cached.translated,
            }) as MessageWithContent;
        }

        translatedMessages.delete(message.id);
        if (!isInProgress(message.id)) {
            translate(message.id, message.content).then(result => {
                if (result) triggerReRender(message);
            });
        }

        return message;
    },

    wrapContent(content: any, messageId: string) {
        const sourceLang = translatedMessages.get(messageId);
        if (!sourceLang) return content;
        return (
            <>
                {content}
                {settings.store.showIndicator && (
                    <div className={cl("indicator")}>translated from {sourceLang}</div>
                )}
            </>
        );
    },
});
