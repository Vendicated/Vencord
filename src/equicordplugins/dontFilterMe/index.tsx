/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Alerts, ChannelStore, Forms } from "@webpack/common";

import filterList from "./constants";

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function warningEmbedNotice(trigger) {
    return new Promise<boolean>(resolve => {
        Alerts.show({
            title: "Hold on!",
            body: <div>
                <Forms.FormText>
                    Your message contains a term on the automod preset list. (Term "{trigger}")
                </Forms.FormText>
                <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>
                    There is a high chance your message will be blocked and potentially moderated by a server moderator.
                </Forms.FormText>
            </div>,
            confirmText: "Send Anyway",
            cancelText: "Cancel",
            onConfirm: () => resolve(true),
            onCloseCallback: () => setImmediate(() => resolve(false)),
        });
    });
}

export default definePlugin({
    name: "DontFilterMe",
    description: "Warns you if your message contains a term in the automod preset list",
    authors: [Devs.Samwich],
    dependencies: ["MessageEventsAPI"],
    start() {
        this.preSend = addMessagePreSendListener(async (channelId, messageObj, extra) => {

            if (ChannelStore.getChannel(channelId.toString()).isDM()) return { cancel: false };

            const escapedStrings = filterList.map(escapeRegex);
            const regexString = escapedStrings.join("|");
            const regex = new RegExp(`(${regexString})`, "i");

            console.log(channelId);

            const matches = regex.exec(messageObj.content);
            if (matches) {
                if (!await warningEmbedNotice(matches[0])) {
                    return { cancel: true };
                }
            }
            return { cancel: false };
        });
    }
});
