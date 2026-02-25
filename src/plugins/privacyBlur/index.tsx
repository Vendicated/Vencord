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

let currentHoverGroup: string | null = null;
let isScrolling = false;
let scrollTimeout: number | null = null;

function handleScroll() {
    isScrolling = true;

    if (currentHoverGroup) {
        clearGroupHover(currentHoverGroup);
        currentHoverGroup = null;
    }

    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(() => {
        isScrolling = false;
    }, 150);
}

function handleMessageHover(event: MouseEvent) {
    if (isScrolling) return;

    const target = event.target as HTMLElement;
    const messageElement = target.closest('[data-privacy-blur-message="true"]');

    if (!messageElement) {
        if (currentHoverGroup) {
            clearGroupHover(currentHoverGroup);
            currentHoverGroup = null;
        }
        return;
    }

    const labelledElement = messageElement.querySelector("[aria-labelledby]");
    if (!labelledElement) return;

    const labelledBy = labelledElement.getAttribute("aria-labelledby");
    if (!labelledBy) return;

    const usernameMatch = labelledBy.match(/message-username-(\d+)/);
    if (!usernameMatch) return;

    const usernameId = usernameMatch[1];

    if (currentHoverGroup === usernameId) return;

    if (currentHoverGroup) {
        clearGroupHover(currentHoverGroup);
    }

    currentHoverGroup = usernameId;
    applyGroupHover(usernameId);
}

function applyGroupHover(usernameId: string) {
    const allMessages = document.querySelectorAll(`[aria-labelledby*="message-username-${usernameId}"]`);
    allMessages.forEach(msg => {
        const listItem = msg.closest('[data-privacy-blur-message="true"]');
        if (listItem && !listItem.classList.contains("privacy-blur-group-hover")) {
            listItem.classList.add("privacy-blur-group-hover");
        }
    });
}

function clearGroupHover(usernameId: string) {
    const allMessages = document.querySelectorAll(`[aria-labelledby*="message-username-${usernameId}"]`);
    allMessages.forEach(msg => {
        const listItem = msg.closest('[data-privacy-blur-message="true"]');
        if (listItem && listItem.classList.contains("privacy-blur-group-hover")) {
            listItem.classList.remove("privacy-blur-group-hover");
        }
    });
}

export default definePlugin({
    name: "PrivacyBlur",
    description: "Blur sensitive chat information (usernames, messages, links, and more) until you hover over them",
    authors: [{ name: "rakietapi", id: 1457911543919415327n }],

    settings,

    start() {
        updateBodyClasses();
        document.addEventListener("mouseover", handleMessageHover);
        document.addEventListener("scroll", handleScroll, true);
    },

    stop() {
        document.body.classList.remove(
            PRIVACY_TARGETS.CHANNELS,
            PRIVACY_TARGETS.USERNAMES,
            PRIVACY_TARGETS.MESSAGES
        );
        document.removeEventListener("mouseover", handleMessageHover);
        document.removeEventListener("scroll", handleScroll, true);

        if (scrollTimeout) clearTimeout(scrollTimeout);

        if (currentHoverGroup) {
            clearGroupHover(currentHoverGroup);
            currentHoverGroup = null;
        }
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
