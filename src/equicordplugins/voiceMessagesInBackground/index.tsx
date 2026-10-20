/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { migratePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import { handlePlaybackRateUpdate, stopPlayback, useBackgroundPlayback } from "./playback";
import { VoiceMessageIcon, VoiceMessagesInBackgroundPlayer } from "./player";

interface PlaybackRateUpdate {
    playbackType: string;
    rate: number;
}

const WrappedVoiceMessagesInBackgroundPlayer = ErrorBoundary.wrap(VoiceMessagesInBackgroundPlayer, { noop: true });

migratePluginSettings("VoiceMessagesInBackground", "Voice Messages In-Background");
export default definePlugin({
    name: "VoiceMessagesInBackground",
    description: "Keeps voice messages playing across chats with a synchronized mini player.",
    authors: [EquicordDevs.ELJoOker],
    tags: ["Voice", "Media", "Chat"],
    dependencies: ["AudioPlayerAPI", "HeaderBarAPI"],

    patches: [{
        find: "#{intl::VOICE_MESSAGES_A11Y_LABEL}",
        replacement: {
            match: /(?<=\i>0\),\[(\i),(\i)\].{0,50}useState\(!1\).{0,10})(\[\i,\i\]=)(\i\.useState\(!1\))(?=.{0,100}\("none"\))/,
            replace: "$3$self.useBackgroundPlayback($4,$1,arguments[0]?.src,arguments[0]?.playbackCacheKey,$2)"
        }
    }],

    headerBarButton: {
        icon: VoiceMessageIcon,
        location: "channeltoolbar",
        priority: 30,
        render: () => <WrappedVoiceMessagesInBackgroundPlayer />
    },

    flux: {
        MEDIA_PLAYBACK_RATE_UPDATE({ playbackType, rate }: PlaybackRateUpdate) {
            if (playbackType === "voice_message") handlePlaybackRateUpdate(rate);
        }
    },

    useBackgroundPlayback,
    stop: stopPlayback
});
