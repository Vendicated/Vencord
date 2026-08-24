/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import definePlugin, { OptionType } from "@utils/types";

const StatusSettings = getUserSettingLazy<string>("status", "status")!;
const CustomStatusSettings = getUserSettingLazy<{ text: string, emojiId: string | undefined, expiresAtMs: undefined | bigint; }>("status", "customStatus")!;

const statusMap: string[] = [];
let currentPosition: number = 0;
let thread: NodeJS.Timeout | undefined;

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Should this plugin be active?",
        restartNeeded: true
    },
    statusesToRotate: {
        type: OptionType.STRING,
        multiline: true,
        description: "Allows you to setup a string of custom statuses. (seperate using a semi-colon (;)).",
        restartNeeded: true
    },
    status: {
        type: OptionType.SELECT,
        options: [
            {
                label: "Online",
                value: "online",
                default: true
            },
            {
                label: "Do Not Disturb",
                value: "dnd",
            },
            {
                label: "Idle",
                value: "idle",
            },
        ],
        description: "Which presence should be selected when rotating your statuses?",
        restartNeeded: true
    },
    statusDuration: {
        type: OptionType.NUMBER,
        description: "How long should each status be displayed for? (in seconds)",
        default: 60,
        restartNeeded: true
    }
});

function evaluateSelectedStatuses(): [boolean, any] {
    const strings = settings.store.statusesToRotate;
    if (!strings) return [false, "No statuses were set, skipping."];
    const split = strings.split(";");

    for (const string of split) {
        if (string.length < 1) continue;
        statusMap.push(string);
    }

    return [true, undefined];
}

function setPresence() {
    const [success, message] = evaluateSelectedStatuses();
    if (!success) return showNotification({
        title: "Presence Rotator Error",
        body: message,
        dismissOnClick: true,
    });

    if (thread) { // in-case a thread exists for some reason
        clearTimeout(thread);
        thread = undefined;
    }

    const statusString = statusMap[currentPosition];

    const selectedPresenceStatus = settings.store.status;
    const statusRotaDuration = settings.store.statusDuration;

    if (StatusSettings.getSetting() !== selectedPresenceStatus) {
        StatusSettings.updateSetting(selectedPresenceStatus);
    }

    CustomStatusSettings.updateSetting({
        text: statusString,
        emojiId: undefined,
        expiresAtMs: undefined
    });


    thread = setTimeout(() => {
        currentPosition += 1;
        setPresence();
        thread = undefined;
    }, statusRotaDuration * 1000);
}

export default definePlugin({
    name: "CustomStatusRotator",
    description: "Allows you to set a different rotation of statuses.",
    dependencies: ["UserSettingsAPI"],
    tags: ["Customisation", "Activity"],
    requiresRestart: true,
    authors: [
        {
            name: "xslbrst",
            id: 1136216090725339206n,
        }
    ],

    settings,

    start() {
        if (!settings.store.enabled) return;
        setPresence();
    },
    stop() {
        if (!settings.store.enabled) return;
        if (thread) {
            clearTimeout(thread);
            thread = undefined;
        }
    },
});
