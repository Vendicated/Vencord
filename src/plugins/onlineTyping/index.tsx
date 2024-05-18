/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode } from "@webpack";
import { FluxDispatcher } from "@webpack/common";

// Delay before appearing online when typing
let statusChangeDelay: NodeJS.Timeout | null = null;

// Delay before status switches back to invisible
let statusResetDelay: NodeJS.Timeout | null = null;

let previousStatus: string | undefined = undefined;
const MS_PER_SECOND: number = 1000;

const OnlineTypingToggleButton: ChatBarButton = ({ isMainChat }) => {
    const { isEnabled, showIcon } = settings.use(["isEnabled", "switchStatusAfterPluginDisabled", "showIcon"]);
    const toggle = () => {
        settings.store.isEnabled = !settings.store.isEnabled;
        if (settings.store.isEnabled === false && settings.store.switchStatusAfterPluginDisabled) {
            handleStatus(settings.store.chosenStatus);
        }
    };

    if (!isMainChat || !showIcon) return null;

    return (
        <ChatBarButton
            tooltip={isEnabled ? "Disable Online Typing" : "Enable Online Typing"}
            onClick={toggle}>
            <svg height="24" width="24" viewBox="0 0 24 24">
                <path fill="currentColor" mask="url(#online-typing-toggle-mask)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93Zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39Z" />
                {isEnabled && <>
                    <mask id="online-typing-toggle-mask">
                        <path fill="#fff" d="M0 0h24v24H0Z" />
                        <path stroke="#000" stroke-width="6" d="M0 24 24 0" />
                    </mask>
                    <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z" />
                </>}
            </svg>
        </ChatBarButton>
    );
};

function handleStatus(status: string | undefined) {
    if (status !== previousStatus) {
        const setStatus = findByCode(".USER_STATUS_UPDATED");
        setStatus(status, null, { location: { section: "Account Panel", object: "Avatar" } });
        previousStatus = status;
    }
}

function clearExistingTimeout(timeout: NodeJS.Timeout | null) {
    if (timeout) {
        clearTimeout(timeout);
    }
    return null;
}

const settings = definePluginSettings({
    chosenStatus: {
        type: OptionType.SELECT,
        description: "Status to appear as when typing",
        options: [{
            label: "Online",
            value: "online",
        },
        {
            label: "Idle",
            value: "idle",
        },
        {
            label: "Do Not Disturb",
            value: "dnd",
        },
        ],
    },
    statusChangeDelay: {
        type: OptionType.SLIDER,
        description: "Delay in seconds before status switches to chosen status, handy against mistyping",
        markers: makeRange(0, 10, 1),
        default: 2,
        stickToMarkers: false,
    },
    statusResetDelay: {
        type: OptionType.SLIDER,
        description: "Delay in seconds before status switches back to invisible, use any value below 5 at your own discretion",
        markers: makeRange(1, 20, 1),
        default: 9,
        stickToMarkers: false,
    },
    isEnabled: {
        type: OptionType.BOOLEAN,
        description: "Toggle plugin on/off",
        default: true,
    },
    switchStatusAfterPluginDisabled: {
        type: OptionType.BOOLEAN,
        description: "Switch back to chosen status after toggling plugin off in chat bar",
        default: true,
    },
    showIcon: {
        type: OptionType.BOOLEAN,
        description: "Show icon in chat bar",
        default: true,
    },
});

export default definePlugin({
    name: "OnlineTyping",
    description: "Automatically appear online when you are typing, most effective when current status is invisible",
    settings,
    authors: [Devs.vegard],
    dependencies: ["ChatInputButtonAPI"],
    patches: [
        {
            find: 'this,"handleTextareaChange",',
            replacement: {
                match: /\((\w+),(\w+),(\w+)\)=>\{let{keyboardModeEnabled:(\w+),channel:{id:(\w+)}}=([^;]+);/,
                replace: "($1,$2,$3)=>{let{keyboardModeEnabled:$4,channel:{id:$5}}=$6;$self.changeStatus($5,$2);",
            }
        },
    ],
    async changeStatus(channelId: string, message: string) {
        if (!settings.store.isEnabled) return;

        // Resets timeout for every keystroke
        statusResetDelay = clearExistingTimeout(statusResetDelay);

        // Ensures user status turns invisible, and does not reappear online
        if (message.length === 0) {
            statusChangeDelay = clearExistingTimeout(statusChangeDelay);
            handleStatus("invisible");
            return;
        }

        FluxDispatcher.dispatch({ type: "TYPING_START_LOCAL", channelId });

        // Indicates that the user starts typing, setting a statusChangeDelay in case of mistyping
        if (message.length === 1) {
            if (!statusChangeDelay) {
                statusChangeDelay = setTimeout(() => {
                    handleStatus(settings.store.chosenStatus);
                    statusChangeDelay = clearExistingTimeout(statusChangeDelay);

                    statusResetDelay = setTimeout(() => {
                        handleStatus("invisible");
                    }, settings.store.statusResetDelay * MS_PER_SECOND);

                }, settings.store.statusChangeDelay * MS_PER_SECOND);
            }
        }
        // Certain that the user is typing, no need for 'mistyping' delay
        if (message.length > 1) {
            if (!statusChangeDelay) {
                handleStatus(settings.store.chosenStatus);

                statusResetDelay = setTimeout(() => {
                    handleStatus("invisible");
                }, settings.store.statusResetDelay * MS_PER_SECOND);
            }
        }
    },
    start: () => addChatBarButton("OnlineTyping", OnlineTypingToggleButton),
    stop: () => removeChatBarButton("OnlineTyping"),
});
