/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { migratePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { handlePlaybackRateUpdate, stopPlayback, useBackgroundPlayback } from "./playback";
import { VoiceMessagesInBackgroundPlayer } from "./player";

interface PlaybackRateUpdate {
    playbackType: string;
    rate: number;
}

const WrappedVoiceMessagesInBackgroundPlayer = ErrorBoundary.wrap(VoiceMessagesInBackgroundPlayer, { noop: true });

migratePluginSettings("VoiceMessagesInBackground", "Voice Messages In-Background");

export default definePlugin({
    name: "VoiceMessagesInBackground",
    description: "Keeps voice messages playing across chats with a synchronized mini player.",
    authors: [Devs.ELJoOker],
    tags: ["Voice", "Media", "Chat"],

    patches: [
        {
            find: "#{intl::PAUSE_VOICE_MESSAGE_A11Y_LABEL}",
            replacement: {
                match: /(?<=\i>0\),\[(\i),(\i)\].{0,50}useState\(!1\).{0,10})(\[\i,\i\]=)(\i\.useState\(!1\))(?=.{0,100}\("none"\))/,
                replace: "$3$self.useBackgroundPlayback($4,$1,arguments[0]?.src,arguments[0]?.playbackCacheKey,$2)"
            }
        },
        {
            find: "Missing channel in Channel.renderHeaderToolbar",
            replacement: {
                match: /(?<=renderHeaderToolbar"\);let (\i)=\[\];)/,
                replace: "$1.push($self.renderPlayer());"
            }
        }
    ],

    flux: {
        MEDIA_PLAYBACK_RATE_UPDATE({ playbackType, rate }: PlaybackRateUpdate) {
            if (playbackType === "voice_message") handlePlaybackRateUpdate(rate);
        }
    },

    renderPlayer: () => <WrappedVoiceMessagesInBackgroundPlayer key="vc-vmib-player" />,
    useBackgroundPlayback,
    stop: stopPlayback
});
