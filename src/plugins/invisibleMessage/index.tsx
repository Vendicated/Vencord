/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessageAccessory, removeMessageAccessory } from "@api/MessageAccessories";
import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { Divider } from "@components/Divider";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Forms } from "@webpack/common";

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

function SettingsComponent() {
    return (
        <section>
            <Forms.FormTitle tag="h3">Usage</Forms.FormTitle>
            <Forms.FormText>
                Wrap text with <code>&gt;</code> and <code>&lt;</code> to make it invisible.
            </Forms.FormText>
            <Forms.FormText className={Margins.top8}>
                <strong>Example:</strong>
                <ul>
                    <li>You type: <code>hello &gt;secret&lt; world</code></li>
                    <li>Others see: <code>hello  world</code> (invisible gap)</li>
                    <li>Plugin users see: <code>hello Encrypted message: secret world</code></li>
                </ul>
            </Forms.FormText>
            <Divider className={classes(Margins.top8, Margins.bottom8)} />
            <Forms.FormTitle tag="h3">Note</Forms.FormTitle>
            <Forms.FormText>
                This is <strong>NOT</strong> real encryption! Anyone with this plugin can decode messages.
                Perfect for fun secrets with friends.
            </Forms.FormText>
        </section>
    );
}

export default definePlugin({
    name: "InvisibleMessage",
    description: "Send invisible messages using zero-width characters. Wrap text with >< to hide it.",
    authors: [Devs.nyankoiscat],
    dependencies: ["MessageAccessoriesAPI"],

    options: {
        usage: {
            type: OptionType.COMPONENT,
            description: "",
            component: SettingsComponent
        }
    },

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
