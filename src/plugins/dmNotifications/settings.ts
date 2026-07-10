/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange, OptionType } from "@utils/types";

export const settings = definePluginSettings({
    position: {
        type: OptionType.SELECT,
        description: "Where notifications appear on screen",
        options: [
            { label: "Top Right", value: "top-right", default: true },
            { label: "Top Left", value: "top-left" },
            { label: "Bottom Right", value: "bottom-right" },
            { label: "Bottom Left", value: "bottom-left" }
        ]
    },
    duration: {
        type: OptionType.SLIDER,
        description: "How long a notification stays on screen (seconds)",
        default: 7,
        markers: makeRange(2, 20, 1)
    },
    maxToasts: {
        type: OptionType.SLIDER,
        description: "Max notifications stacked at once",
        default: 3,
        markers: makeRange(1, 6, 1)
    },
    notifyDms: {
        type: OptionType.BOOLEAN,
        description: "Show notifications for Direct Messages",
        default: true
    },
    notifyGroupDms: {
        type: OptionType.BOOLEAN,
        description: "Show notifications for Group DMs",
        default: true
    },
    notifyMentionsInServers: {
        type: OptionType.BOOLEAN,
        description: "Show notifications when mentioned in a server",
        default: true
    },
    notifyAllServerMessages: {
        type: OptionType.BOOLEAN,
        description: "Show notifications for every server message, not just mentions",
        default: false
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Don't show notifications from bot accounts",
        default: false
    },
    showReplyBar: {
        type: OptionType.BOOLEAN,
        description: "Show a quick reply bar on notifications",
        default: true
    },
    closeOnReply: {
        type: OptionType.BOOLEAN,
        description: "Close the notification after sending a reply",
        default: true
    },
    backgroundColor: {
        type: OptionType.STRING,
        description: "Notification background color",
        default: "#232428"
    },
    usernameColor: {
        type: OptionType.STRING,
        description: "Username text color",
        default: "#ffffff"
    },
    textColor: {
        type: OptionType.STRING,
        description: "Message text color",
        default: "#dbdee1"
    },
    accentColor: {
        type: OptionType.STRING,
        description: "Accent color (send button, progress bar)",
        default: "#5865f2"
    }
});
