/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { PermissionsBits } from "@webpack/common";
import { PermissionStore, UserStore } from "webpack/common/stores";
import {
    ApplicationCommandInputType,
    ApplicationCommandOptionType,
    sendBotMessage,
} from "@api/Commands";

import settings from "./settings";
import { VoiceState, VoiceStateUpdateEvent } from "./types/events";

declare global {
    interface Window {
        DiscordNative?: {
            app?: {
                disconnect?: () => void;
            };
        };
    }
}

const { selectVoiceChannel }: {
    selectVoiceChannel(channelId: string): void;
} = findByPropsLazy("selectVoiceChannel", "selectChannel");

const { setServerMute, setServerDeaf }: {
    setServerMute(guildId: string, userId: string, mute: boolean): void;
    setServerDeaf(guildId: string, userId: string, deaf: boolean): void;
} = findByPropsLazy("setServerMute", "setServerDeaf");

export default definePlugin({
    name: "rzAutoProtect",
    description: "Automatically protect users in voice channels from being kicked or muted.",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }],
    dependencies: ["CommandsAPI"],
    settings,
    flux: {
        TRACK: track,
        VOICE_STATE_UPDATES: protect
    },
    commands: [
        {
            name: "protect",
            description: "Control protection settings",
            options: [
                {
                    name: "reverse",
                    description: "Toggle reverse protection mode",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "mode",
                            description: "Enable or disable reverse protection",
                            type: ApplicationCommandOptionType.STRING,
                            required: true,
                            choices: [
                                { name: "Enable", value: "on" },
                                { name: "Disable", value: "off" }
                            ]
                        }
                    ]
                },
                {
                    name: "status",
                    description: "View current protection status",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                },
                {
                    name: "clear-state",
                    description: "Clear saved voice state",
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                }
            ],
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (opts, ctx) => {
                switch (opts[0].name) {
                    case "reverse":
                        const mode = opts[0].options?.[0]?.value;
                        if (mode === "on") {
                            settings.store.reverseProtection = true;
                            sendBotMessage(ctx.channel.id, {
                                content: " **Reverse protection enabled!**\n> Now I'll give back the same actions to those who try to mute/deaf/disconnect me."
                            });
                        } else if (mode === "off") {
                            settings.store.reverseProtection = false;
                            sendBotMessage(ctx.channel.id, {
                                content: " **Reverse protection disabled!**\n> Back to normal protection mode."
                            });
                        }
                        break;
                    case "status":
                        const status = settings.store.reverseProtection ? " **ENABLED**" : " **DISABLED**";
                        const stateInfo = savedVoiceState ?
                            `\n**Saved State:** ✅\n- Mute: ${savedVoiceState.selfMute ? "🔇" : "🔊"}\n- Deaf: ${savedVoiceState.selfDeaf ? "🔇" : "🔊"}\n- Video: ${savedVoiceState.selfVideo ? "📹" : "📷"}\n- Screen Share: ${savedVoiceState.screenShare ? "🖥️" : "❌"}` :
                            "\n**Saved State:** ❌";
                        sendBotMessage(ctx.channel.id, {
                            content: `##  Protection Status\n\n**Reverse Protection:** ${status}\n**Mute Protection:** ${settings.store.protectFromMute ? "✅" : "❌"}\n**Deaf Protection:** ${settings.store.protectFromDeaf ? "✅" : "❌"}\n**Disconnect Protection:** ${settings.store.protectFromDisconnect ? "✅" : "❌"}\n**State Preservation:** ${settings.store.preserveVoiceState ? "✅" : "❌"}${stateInfo}`
                        });
                        break;
                    case "clear-state":
                        savedVoiceState = null;
                        sendBotMessage(ctx.channel.id, {
                            content: " **Voice state cleared!**\n> Your saved voice state has been reset."
                        });
                        break;
                }
            },
        },
    ],
    start: () => {
        const originalDisconnect = window.DiscordNative?.app?.disconnect?.bind(window.DiscordNative.app);
        if (originalDisconnect && window.DiscordNative?.app) {
            window.DiscordNative.app.disconnect = () => {
                isManualDisconnect = true;
                return originalDisconnect();
            };
        }

        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target && (
                target.getAttribute('aria-label')?.includes('Disconnect') ||
                target.getAttribute('aria-label')?.includes('Leave') ||
                target.closest('[aria-label*="Disconnect"]') ||
                target.closest('[aria-label*="Leave"]')
            )) {
                isManualDisconnect = true;
            }
        });
    },
    stop: () => {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }
        if (window.DiscordNative?.app?.disconnect) {
            delete window.DiscordNative.app.disconnect;
        }
        document.removeEventListener('click', () => {});

        // Reset all state variables
        lastChannelId = null;
        isManualDisconnect = false;
        lastActionPerformer = null;
        isReversing = false;
        isReconnecting = false;
        lastDisconnectTime = 0;
        savedVoiceState = null;
    }
});

let lastChannelId: string | null = null;
let isManualDisconnect = false;
let reconnectTimeout: NodeJS.Timeout | null = null;
let lastActionPerformer: string | null = null;
let isReversing = false;
let isReconnecting = false;
let lastDisconnectTime = 0;

// Voice state preservation
let savedVoiceState: {
    selfMute: boolean;
    selfDeaf: boolean;
    selfVideo: boolean;
    selfStream: boolean;
    screenShare: boolean;
    videoQuality: string;
} | null = null;

function saveVoiceState(voiceState: VoiceState) {
    if (!settings.store.preserveVoiceState) return;

    savedVoiceState = {
        selfMute: voiceState.selfMute,
        selfDeaf: voiceState.selfDeaf,
        selfVideo: voiceState.selfVideo,
        selfStream: voiceState.selfStream,
        screenShare: voiceState.selfStream, // Assuming selfStream is screen share
        videoQuality: "auto" // Default quality, can be enhanced later
    };
}

function restoreVoiceState() {
    if (!savedVoiceState || !settings.store.preserveVoiceState) return;

    // Get the current voice state
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return;

    // Find current voice state
    const voiceState = findByPropsLazy("getVoiceState")?.getVoiceState?.(currentUser.id);
    if (!voiceState) return;

    // Restore mute state
    if (savedVoiceState.selfMute !== voiceState.selfMute) {
        const { toggleSelfMute } = findByPropsLazy("toggleSelfMute");
        if (toggleSelfMute) {
            setTimeout(() => toggleSelfMute(), 100);
        }
    }

    // Restore deaf state
    if (savedVoiceState.selfDeaf !== voiceState.selfDeaf) {
        const { toggleSelfDeaf } = findByPropsLazy("toggleSelfDeaf");
        if (toggleSelfDeaf) {
            setTimeout(() => toggleSelfDeaf(), 200);
        }
    }

    // Restore video state
    if (savedVoiceState.selfVideo !== voiceState.selfVideo) {
        const { toggleSelfVideo } = findByPropsLazy("toggleSelfVideo");
        if (toggleSelfVideo) {
            setTimeout(() => toggleSelfVideo(), 300);
        }
    }

    // Restore screen share
    if (settings.store.preserveScreenShare && savedVoiceState.screenShare !== voiceState.selfStream) {
        const { toggleScreenShare } = findByPropsLazy("toggleScreenShare");
        if (toggleScreenShare) {
            setTimeout(() => toggleScreenShare(), 400);
        }
    }
}

function trackActionPerformer(voiceState: VoiceState) {
    // Don't track ourselves as the performer
    if (voiceState.userId === UserStore.getCurrentUser().id) {
        return;
    }

    if (voiceState.mute || voiceState.deaf || !voiceState.channelId) {
        lastActionPerformer = voiceState.userId;
    }
}

function executeProtection(voiceState: VoiceState) {
    const guildId = voiceState.guildId;

    if (settings.store.protectFromMute && voiceState.mute && PermissionStore.canWithPartialContext(PermissionsBits.MUTE_MEMBERS, { channelId: voiceState.channelId })) {
        setServerMute(guildId, voiceState.userId, false);
        if (settings.store.reverseProtection && lastActionPerformer && !isReversing) {
            isReversing = true;
            setServerMute(guildId, lastActionPerformer, true);
            setTimeout(() => {
                isReversing = false;
            }, 10);
        }
    }
    if (settings.store.protectFromDeaf && voiceState.deaf && PermissionStore.canWithPartialContext(PermissionsBits.DEAFEN_MEMBERS, { channelId: voiceState.channelId })) {
        setServerDeaf(guildId, voiceState.userId, false);
        if (settings.store.reverseProtection && lastActionPerformer && !isReversing) {
            isReversing = true;
            setServerDeaf(guildId, lastActionPerformer, true);
            setTimeout(() => {
                isReversing = false;
            }, 10);
        }
    }
}

function track(event: any) {
    if (event.event === "call_button_clicked") {
        isManualDisconnect = true;
    }
}

function protect(event: VoiceStateUpdateEvent) {
    const userId = UserStore.getCurrentUser().id;
    for (const voiceState of event.voiceStates) {
        if (voiceState.userId === userId) {
            const previousChannelId = lastChannelId;
            const currentChannelId = voiceState.channelId;

            if (currentChannelId) {
                lastChannelId = currentChannelId;
                // Save voice state when entering a channel
                saveVoiceState(voiceState);
            }

            trackActionPerformer(voiceState);
            executeProtection(voiceState);

            if (settings.store.protectFromDisconnect &&
                previousChannelId &&
                !currentChannelId &&
                !isManualDisconnect &&
                !isReconnecting) {

                const currentTime = Date.now();
                // Prevent rapid reconnection loops by checking if enough time has passed
                if (currentTime - lastDisconnectTime < 2000) {
                    return;
                }

                lastDisconnectTime = currentTime;
                isReconnecting = true;

                if (reconnectTimeout) {
                    clearTimeout(reconnectTimeout);
                }

                reconnectTimeout = setTimeout(() => {
                    selectVoiceChannel(previousChannelId);
                    // Reset reconnecting flag after a delay to allow for the connection to establish
                    setTimeout(() => {
                        isReconnecting = false;
                        // Restore voice state after reconnecting
                        setTimeout(() => {
                            restoreVoiceState();
                        }, 2000); // Wait 2 seconds for voice connection to stabilize
                    }, 3000);
                }, 1000); // Increased delay to 1 second

                if (settings.store.reverseProtection && lastActionPerformer && !isReversing && PermissionStore.can(PermissionsBits.MOVE_MEMBERS, previousChannelId)) {
                    isReversing = true;
                    const { disconnectUser } = findByPropsLazy("disconnectUser");
                    if (disconnectUser) {
                        disconnectUser(lastActionPerformer);
                    }
                    setTimeout(() => {
                        isReversing = false;
                    }, 10);
                }
            }

            if (isManualDisconnect) {
                setTimeout(() => {
                    isManualDisconnect = false;
                }, 10);
            }
        }
    }
}


