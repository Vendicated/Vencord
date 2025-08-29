/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { annouceUser, messageRecieved, speakMessage, stopTTS } from "./libraries/actions";
import AudioPlayer from "./libraries/AudioPlayer";
import { PatchChannelContextMenu, PatchGuildContextMenu, PatchUserContextMenu } from "./libraries/ContextMenu";
import { onKeyDown, updateRelationships } from "./libraries/utils";
import settings from "./settings";

export default definePlugin({
    name: "BetterTTS",
    description: "A plugin that allows you to play a custom TTS when a message is received.",
    authors: [Devs.nicola02nb],
    settings,
    contextMenus: {
        "user-context": PatchUserContextMenu,
        "channel-context": PatchChannelContextMenu,
        "guild-context": PatchGuildContextMenu,
        "guild-header-popout": PatchGuildContextMenu
    },
    flux: {
        AUDIO_TOGGLE_SELF_DEAF: stopTTS,
        VOICE_STATE_UPDATES: annouceUser,
        SPEAK_MESSAGE: speakMessage,
        MESSAGE_CREATE: messageRecieved,
        RELATIONSHIP_ADD: updateRelationships,
        RELATIONSHIP_REMOVE: updateRelationships,
    },
    patches: [
        {
            find: "new SpeechSynthesisUtterance(",
            group: true,
            replacement: [
                {
                    match: /\((\i),(\i)\){(\i)&&[\s\S]*?,speechSynthesis\.speak\((\i)\)[\s\S]*?}/,
                    replace: "($1,$2){return;}"
                },
                {
                    match: /\(\){[\s\S]*?speechSynthesis\.cancel\(\)[\s\S]*?}/,
                    replace: "() {return;}"
                }
            ]
        },
        {
            find: "default.setTTSType",
            replacement: {
                match: /default.setTTSType\((\i)\)/,
                replace: "default.setTTSType('NONE')"
            }
        }
    ],
    start: () => {
        document.addEventListener("keydown", onKeyDown);
        AudioPlayer.updateConfig(settings.store.ttsSource, settings.store.ttsVoice, settings.store.ttsSpeechRate, settings.store.ttsDelayBetweenMessages, settings.store.ttsVolume);
    },
    stop: () => {
        AudioPlayer.stopTTS();
        document.removeEventListener("keydown", onKeyDown);
    }
});

