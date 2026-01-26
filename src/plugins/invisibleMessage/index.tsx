/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessageAccessory, removeMessageAccessory } from "@api/MessageAccessories";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { encode, decode, checkEncode, SHOULD_ENCODE_PATTERN } from "./encoding";

const ACCESSORY_KEY = "invisible-message-accessory";

// Pre-send listener to encode messages
const preSendListener = (channelId: string, msg: any) => {
    try {
        const matches = SHOULD_ENCODE_PATTERN.exec(msg.content);

        if (matches) {
            const encoded = encode(matches[1]);
            msg.content = msg.content.replace(SHOULD_ENCODE_PATTERN, ` ${encoded}`);
        }
    } catch (err) {
        console.error("[InvisibleMessage] Encode error:", err);
    }
};

export default definePlugin({
    name: "InvisibleMessage",
    description: "Hide secret messages in plain sight! Wrap text with >< to make it invisible. Example: 'hello >secret< world' - only users with this plugin can see the hidden text.",
    authors: [Devs.nyankoiscat],
    dependencies: ["MessageAccessoriesAPI"],

    start() {
        addMessagePreSendListener(preSendListener);

        addMessageAccessory(ACCESSORY_KEY, (props: any) => {
            const { message } = props;

            if (!message?.content || typeof message.content !== "string") {
                return null;
            }

            if (!checkEncode(message.content)) {
                return null;
            }

            try {
                const decoded = decode(message.content);

                if (!decoded) return null;

                return (
                    <span style={{ color: "#b5bac1" }}>
                        Encrypted message: {decoded}
                    </span>
                );
            } catch (err) {
                console.error("[InvisibleMessage] Decode error:", err);
                return null;
            }
        });
    },

    stop() {
        removeMessagePreSendListener(preSendListener);
        removeMessageAccessory(ACCESSORY_KEY);
    }
});
