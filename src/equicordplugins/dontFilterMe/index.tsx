/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Alerts, ChannelStore, PermissionsBits, PermissionStore } from "@webpack/common";

import filterList from "./constants";

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function warningEmbedNotice(trigger) {
    return new Promise<boolean>(resolve => {
        Alerts.show({
            title: "Hold on!",
            body: <div>
                <Paragraph>
                    Your message contains a term on the automod preset list. (Term "{trigger}")
                </Paragraph>
                <Paragraph>
                    There is a high chance your message will be blocked and potentially moderated by a server moderator.
                </Paragraph>
            </div>,
            confirmText: "Send Anyway",
            cancelText: "Cancel",
            onConfirm: () => resolve(true),
            onCloseCallback: () => setImmediate(() => resolve(false)),
        });
    });
}

const handleMessage = async (channelId, messageObj) => {
    const channel = ChannelStore.getChannel(channelId);
    if (channel.isDM()) return { cancel: false };
    if (PermissionStore.can(PermissionsBits.ADMINISTRATOR, channel) || PermissionStore.can(PermissionsBits.MANAGE_GUILD, channel)) return { cancel: false };

    const escapedStrings = filterList.map(escapeRegex);
    const regexString = escapedStrings.join("|");
    const regex = new RegExp(`(${regexString})`, "i");

    const matches = regex.exec(messageObj.content);
    console.log(matches);
    if (matches) {
        if (!await warningEmbedNotice(matches[0])) {
            return { cancel: true };
        }
    }

    return { cancel: false };
};

export default definePlugin({
    name: "DontFilterMe",
    description: "Warns you if your message contains a term in the automod preset list",
    authors: [Devs.Samwich],
    dependencies: ["MessageEventsAPI"],
    start() {
        addMessagePreSendListener(handleMessage);
    },
    stop() {
        removeMessagePreSendListener(handleMessage);
    }
});
