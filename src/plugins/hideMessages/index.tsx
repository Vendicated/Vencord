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

import "./styles.css";

import { get, set } from "@api/DataStore";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings } from "@api/Settings";
import { EyeIcon, EyeSlashIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, MessageStore, SelectedChannelStore, UserStore } from "@webpack/common";

const KEY = "HideMessages_HiddenIds";
const logger = new Logger("HideMessages");

const settings = definePluginSettings({
    scope: {
        type: OptionType.SELECT,
        description: "Where messages can be hidden",
        options: [
            { label: "Direct messages only", value: "dms", default: true },
            { label: "All channels", value: "global" }
        ],
        onChange: refreshCurrentChannel
    },
    showHiddenMessageText: {
        type: OptionType.BOOLEAN,
        description: "Show a 'Message Hidden' label below hidden messages. If you disable this, you can only restore hidden messages by reenabling this option.",
        default: true,
        onChange: refreshCurrentChannel
    }
});

let hiddenMessages = new Set<string>();

async function getHiddenMessages() {
    hiddenMessages = await get(KEY) ?? new Set();
    return hiddenMessages;
}

const saveHiddenMessages = (ids: Set<string>) => set(KEY, ids);

function ReplyHidden({ referencedMessage }: { referencedMessage?: { state: number; message?: Message; }; }) {
    const message = referencedMessage?.message;
    if (referencedMessage?.state !== 0 || message == null || !hiddenMessages.has(message.id) || !isAllowedChannel(message.channel_id)) return null;

    return <span className="vc-hideMessages-reply">{settings.store.showHiddenMessageText ? "Message not found" : ""}</span>;
}

function refreshCurrentChannel() {
    const channelId = SelectedChannelStore.getChannelId();
    if (channelId == null) return;

    MessageStore.getMessages(channelId).forEach(message => updateMessage(channelId, message.id));
}

function isAllowedChannel(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);

    return settings.store.scope === "global"
        || (channel != null && (channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM()));
}

function canHide(message: Message) {
    const channel = ChannelStore.getChannel(message.channel_id);
    const currentUser = UserStore.getCurrentUser();

    return channel != null
        && currentUser != null
        && message.author?.id != null
        && isAllowedChannel(message.channel_id)
        && message.author.id !== currentUser.id;
}

async function toggleHide(channelId: string, messageId: string) {
    const ids = await getHiddenMessages();
    if (!ids.delete(messageId))
        ids.add(messageId);

    await saveHiddenMessages(ids);

    const messages = MessageStore.getMessages(channelId);
    updateMessage(channelId, messageId);

    messages.forEach(message => {
        const reference = message.messageReference;
        if (reference?.message_id === messageId)
            updateMessage(channelId, message.id);
    });
}

export default definePlugin({
    name: "HideMessages",
    description: `Hide messages from other users in DMs via a hover button`,
    tags: ["Chat", "Privacy"],
    authors: [Devs.konne],
    dependencies: ["MessageUpdaterAPI"],
    settings,

    patches: [{
        find: "Message must not be a thread starter message",
        replacement: {
            match: /\)\("li",\{(.+?),className:/,
            replace: ")(\"li\",{$1,className:($self.shouldHide(arguments[0]?.message?.id,arguments[0]?.message?.channel_id)?(\"vc-hideMessages-hidden \"+($self.shouldShowLabel()?\"\":\"vc-hideMessages-no-label \")):\"\")+"
        }
    }, {
        find: "#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}",
        replacement: {
            match: /\.onClickReply,.+?}\),(?=\i,\i,\i\])/,
            replace: "$&$self.ReplyHidden(arguments[0]),"
        }
    }],

    messagePopoverButton: {
        icon: EyeSlashIcon,
        render(message) {
            if (!canHide(message)) return null;

            const isHidden = hiddenMessages.has(message.id);

            return {
                label: isHidden ? "Show Message" : "Hide Message",
                icon: isHidden ? EyeIcon : EyeSlashIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => toggleHide(message.channel_id, message.id)
            };
        }
    },

    renderMessageAccessory({ message }) {
        if (!this.shouldHide(message.id, message.channel_id)) return null;
        if (!settings.store.showHiddenMessageText) return null;

        return <span className="vc-hideMessages-accessory">Message Hidden</span>;
    },

    ReplyHidden,

    shouldShowLabel() {
        return settings.store.showHiddenMessageText;
    },

    async start() {
        logger.info(`Starting HideMessages`);
        await getHiddenMessages();
    },

    stop() {
        hiddenMessages.clear();
    },

    shouldHide(messageId: string, channelId?: string) {
        return hiddenMessages.has(messageId)
            && channelId != null
            && isAllowedChannel(channelId);
    }
});
