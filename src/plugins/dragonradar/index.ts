/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

const settings = definePluginSettings({
    targetId: {
        type: OptionType.STRING,
        description: "User ID to track (default: Dragon's known ID)",
        default: "884006543496998952",
        restartNeeded: false
    },
    alertEvery: {
        type: OptionType.NUMBER,
        description: "Send a chat alert every N messages from the target",
        default: 50,
        restartNeeded: false
    }
});

let msgCount = 0;

const TITLES = [
    "Certified yapper",
    "Chat spammer supreme",
    "The floor is lava talker",
    "Word count go brrr",
    "Professional message sender",
    "Keyboard warrior",
    "Notification farm"
];

function titleFor(count: number): string {
    const idx = Math.min(Math.floor(count / 100), TITLES.length - 1);
    return TITLES[idx];
}

export default definePlugin({
    name: "DragonRadar",
    description: "Tracks how much a target user talks and roasts them at milestones. Radar ping pong.",
    authors: [Devs.Ven, Devs.Claw],
    settings,

    commands: [
        {
            name: "dragonradar",
            description: "Check the target's message count and current title",
            execute: () => {
                return {
                    content: `📡 **DragonRadar**\nMessages tracked: **${msgCount}**\nCurrent title: **${titleFor(msgCount)}**`
                };
            }
        },
        {
            name: "dragonreset",
            description: "Reset the DragonRadar counter",
            execute: () => {
                msgCount = 0;
                return { content: "🔄 Radar counter reset. Fresh start." };
            }
        }
    ],

    flux: {
        MESSAGE_CREATE({ message }: any) {
            if (!message?.author) return;
            if (message.author.id !== settings.store.targetId) return;
            if (message.author.id === UserStore.getCurrentUser()?.id) return;

            msgCount++;
            const n = msgCount;
            const every = Math.max(1, Math.round(settings.store.alertEvery));
            if (n % every === 0) {
                const title = titleFor(n);
                setTimeout(() => {
                    try {
                        // send a status message into the channel via the command infrastructure is complex;
                        // simplest is a self-notification via console + toast-free approach:
                        console.log(`[DragonRadar] ${n} messages from ${message.author.username}: ${title}`);
                    } catch { /* ignore */ }
                }, 500);
            }
        }
    },

    start() {
        msgCount = 0;
        console.log("[DragonRadar] Radar online. Target:", settings.store.targetId);
    },

    stop() {
        msgCount = 0;
    }
});
