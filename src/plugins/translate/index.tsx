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

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, MessageStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { settings } from "./settings";
import { setShouldShowTranslateEnabledTooltip, TranslateChatBarIcon, TranslateIcon } from "./TranslateIcon";
import { handleTranslate, TranslationAccessory, translationCache } from "./TranslationAccessory";
import { translate } from "./utils";

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const content = getMessageContent(message);
    if (!content) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-trans"
            label="Translate"
            icon={TranslateIcon}
            action={async () => {
                const trans = await translate("received", content);
                handleTranslate(message.id, trans);
            }}
        />
    ));
};


function getMessageContent(message: Message) {
    // Message snapshots is an array, which allows for nested snapshots, which Discord does not do yet.
    // no point collecting content or rewriting this to render in a certain way that makes sense
    // for something currently impossible.
    return message.content
        || message.messageSnapshots?.[0]?.message.content
        || message.embeds?.find(embed => embed.type === "auto_moderation_message")?.rawDescription || "";
}

const inFlightTranslations = new Map<string, string>();

function autoTranslateMessage(message: Message) {
    if ((message as any).vencordEmbeddedBy) return;

    const me = UserStore.getCurrentUser();
    if (me && message.author?.id === me.id) return;

    if (message.channel_id !== SelectedChannelStore.getChannelId()) return;
    const content = getMessageContent(message);
    if (!content) return;

    if (inFlightTranslations.get(message.id) === content) return;

    const cached = translationCache.get(message.id);
    if (cached) {
        handleTranslate(message.id, cached);
        return;
    }

    inFlightTranslations.set(message.id, content);

    translate("received", content)
        .then(trans => {
            if (inFlightTranslations.get(message.id) !== content) return;

            handleTranslate(message.id, trans);
        })
        .finally(() => {
            if (inFlightTranslations.get(message.id) === content)
                inFlightTranslations.delete(message.id);
        });
}

function queueRecentMessages(channelId: string) {
    if (!channelId) return;
    if (channelId !== SelectedChannelStore.getChannelId()) return;

    const limit = settings.store.autoTranslateReceivedLimit ?? 0;
    if (limit <= 0) return;

    const messages = MessageStore.getMessages(channelId)?._array as Message[];
    for (const message of messages.slice(-limit)) {
        autoTranslateMessage(message);
    }
}


let tooltipTimeout: any;

export default definePlugin({
    name: "Translate",
    description: "Translate messages with Google Translate or DeepL",
    authors: [Devs.Ven, Devs.AshtonMemer, Devs.RumBugen],
    settings,
    contextMenus: {
        "message": messageCtxPatch
    },
    // not used, just here in case some other plugin wants it or w/e
    translate,

    renderMessageAccessory: props => <TranslationAccessory message={props.message} />,

    chatBarButton: {
        icon: TranslateIcon,
        render: TranslateChatBarIcon
    },

    messagePopoverButton: {
        icon: TranslateIcon,
        render(message: Message) {
            const content = getMessageContent(message);
            if (!content) return null;

            return {
                label: "Translate",
                icon: TranslateIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: async () => {
                    const trans = await translate("received", content);
                    handleTranslate(message.id, trans);
                }
            };
        }
    },

    flux: {
        MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean; }) {
            if (optimistic) return;
            if (!settings.store.autoTranslateReceived) return;
            if (message.channel_id !== SelectedChannelStore.getChannelId()) return;

            autoTranslateMessage(message);
        },
        MESSAGE_UPDATE({ message }: { message: Message; }) {
            if (!message?.id) return;
            if (message.channel_id !== SelectedChannelStore.getChannelId()) return;
            const limit = settings.store.autoTranslateReceivedLimit ?? 0;
            if (!settings.store.autoTranslateReceived && limit <= 0) return;

            translationCache.delete(message.id);
            autoTranslateMessage(message);
        },
        async CHANNEL_SELECT({ channelId }: { channelId?: string; }) {
            if (!channelId) return;
            const limit = settings.store.autoTranslateReceivedLimit ?? 0;
            if (limit <= 0) return;
            if (!MessageStore.isReady(channelId)) {
                await new Promise<void>(resolve => MessageStore.whenReady(channelId, resolve));
            }
            if (channelId !== SelectedChannelStore.getChannelId()) return;

            queueRecentMessages(channelId);
        }
    },

    async onBeforeMessageSend(_, message) {
        if (!settings.store.autoTranslate) return;
        if (!message.content) return;

        setShouldShowTranslateEnabledTooltip?.(true);
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => setShouldShowTranslateEnabledTooltip?.(false), 2000);

        const trans = await translate("sent", message.content);
        message.content = trans.text;
    }
});
