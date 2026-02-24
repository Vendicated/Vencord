/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { Message } from "@vencord/discord-types";

import { PRIVACY_TARGETS } from "./constants";

function updateBodyClasses() {

    if (settings.store.blurFriends) document.body.classList.add(PRIVACY_TARGETS.CHANNELS);
    else document.body.classList.remove(PRIVACY_TARGETS.CHANNELS);

    if (settings.store.blurUsernames) document.body.classList.add(PRIVACY_TARGETS.USERNAMES);
    else document.body.classList.remove(PRIVACY_TARGETS.USERNAMES);

    if (settings.store.blurChannels) {
        document.body.classList.add(PRIVACY_TARGETS.MESSAGES);
    } else {
        document.body.classList.remove(PRIVACY_TARGETS.MESSAGES);
    }
}

const settings = definePluginSettings({
    blurFriends: {
        type: OptionType.BOOLEAN,
        description: "Blur friends list and recent messages in DM sidebar",
        default: true,
        onChange: updateBodyClasses
    },
    blurChannels: {
        type: OptionType.BOOLEAN,
        description: "Blur entire message blocks in channels (text, attachments, links, and files)",
        default: true,
        onChange: updateBodyClasses
    },
    blurUsernames: {
        type: OptionType.BOOLEAN,
        description: "Blur usernames in messages and sidebars",
        default: true,
        onChange: updateBodyClasses
    }
});

export default definePlugin({
    name: "PrivacyBlur",
    description: "Blur sensitive chat information (usernames, messages, links, and more) until you hover over them",
    authors: [{ name: "rakietapi", id: 1457911543919415327n }],

    settings,

    start() {
        updateBodyClasses();
    },

    stop() {
        document.body.classList.remove(
            PRIVACY_TARGETS.CHANNELS,
            PRIVACY_TARGETS.USERNAMES,
            PRIVACY_TARGETS.MESSAGES
        );
    },

    patches: [
        {
            find: "Message must not be a thread starter message",
            replacement: {
                match: /"aria-setsize":-1,(?=.{0,150}?#{intl::MESSAGE_A11Y_ROLE_DESCRIPTION})/,
                replace: "...$self.getMessageProps(arguments[0]),$&"
            }
        }
    ],

    getMessageProps(msg: Message) {
        const props: any = {};

        if (settings.store.blurChannels) {
            props["data-privacy-blur-message"] = "true";
        }

        return props;
    }
});
