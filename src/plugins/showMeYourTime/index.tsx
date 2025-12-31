/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Message, User } from "discord-types/general";

interface UsernameProps {
    author: { nick: string; };
    message: Message;
    withMentionPrefix?: boolean;
    isRepliedMessage: boolean;
    userOverride?: User;
}

const settings = definePluginSettings({
    timezones: {
        type: OptionType.STRING,
        description: "User timezones in JSON format (e.g. {\"123456789\": \"-08:00\", \"1234567890\": \"+05:30\"})",
        default: "{}",
        onChange: (newValue: string) => {
            try {
                JSON.parse(newValue);
            } catch (e) {
                console.error("Invalid JSON format for timezones");
            }
        }
    },
    format: {
        type: OptionType.SELECT,
        description: "Time display format",
        options: [
            { label: "12-hour (e.g. 2:30 PM)", value: "12h", default: true },
            { label: "24-hour (e.g. 14:30)", value: "24h" }
        ]
    },
    showSeconds: {
        type: OptionType.BOOLEAN,
        description: "Show seconds in time display",
        default: false
    }
});

function formatTime(date: Date, format: string, showSeconds: boolean): string {
    const hours = format === "12h"
        ? date.getHours() % 12 || 12
        : date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = showSeconds ? `:${date.getSeconds().toString().padStart(2, "0")}` : "";
    const ampm = format === "12h" ? ` ${date.getHours() >= 12 ? "PM" : "AM"}` : "";

    return `${hours}:${minutes}${seconds}${ampm}`;
}

function getLocalTimeForUser(userId: string): string {
    try {
        const timezones = JSON.parse(settings.store.timezones);
        const timezone = timezones[userId];

        if (!timezone) return "";

        const now = new Date();
        const [hours, minutes] = timezone.split(":").map(Number);
        const offset = hours * 60 + minutes;

        // Get the current UTC time
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        // Apply the target timezone offset
        const localTime = new Date(utc + (offset * 60000));

        return formatTime(localTime, settings.store.format, settings.store.showSeconds);
    } catch (e) {
        console.error("Error getting local time:", e);
        return "";
    }
}

export default definePlugin({
    name: "10 ShowMeYourTime",
    description: "Display users' local times based on their timezone settings",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }],
    patches: [
        {
            find: '"BaseUsername"',
            replacement: {
                match: /(?<=onContextMenu:\i,children:)(?:\i\+\i|\i)/,
                replace: "$self.renderUsername(arguments[0])"
            }
        },
    ],
    settings,

    renderUsername: ErrorBoundary.wrap(({ author, message, isRepliedMessage, withMentionPrefix, userOverride }: UsernameProps) => {
        try {
            const user = userOverride ?? message.author;
            const { nick } = author;
            const prefix = withMentionPrefix ? "@" : "";

            const localTime = getLocalTimeForUser(user.id);
            const timeDisplay = localTime ? ` (${localTime})` : "";

            return <>{prefix}{nick}{timeDisplay}</>;
        } catch {
            return <>{author?.nick}</>;
        }
    }, { noop: true }),
});
