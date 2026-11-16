/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { plugins } from "@api/PluginManager";
import { openPluginModal } from "@components/settings";
import { isSelfMuted, MAX_VOICE_VOLUME, mixerStore } from "@plugins/soundPanel.desktop/audio/mixer";
import { settings } from "@plugins/soundPanel.desktop/settings";
import { useStore } from "@plugins/soundPanel.desktop/utils/store";
import { usesWebRTCEngine } from "@plugins/soundPanel.desktop/webrtc/engine";
import type { Channel } from "@vencord/discord-types";
import { MediaEngineStore, useStateFromStores } from "@webpack/common";

import { cl, RangeSlider } from "./common";
import { HeadphonesIcon, MicIcon, MicOffIcon } from "./icons";

export type StatusLevel = "live" | "warning" | "local";

export interface Status {
    level: StatusLevel;
    text: string;
    action?: { label: string; run(): void; };
}

const openSettings = () => openPluginModal(plugins.SoundPanel);

export function useTransmitStatus(channel: Channel | undefined): Status {
    const mixing = useStore(mixerStore, s => s.activeMixes > 0);
    const muted = useStateFromStores([MediaEngineStore], isSelfMuted);
    const krisp = useStateFromStores([MediaEngineStore], () => MediaEngineStore.getNoiseCancellation());
    const { transmit, webrtcEngine } = settings.use(["transmit", "webrtcEngine"]);

    if (!transmit) return { level: "local", text: "Sending to voice is off. Only you hear your sounds and music" };
    if (!channel) return { level: "local", text: "Not in a voice channel. Only you hear your sounds and music" };

    if (!mixing) {
        if (usesWebRTCEngine()) return { level: "warning", text: "Rejoin the voice channel so others can hear your sounds and music" };
        if (webrtcEngine) return { level: "warning", text: "Restart Discord to switch to the WebRTC voice engine, then others can hear your sounds and music" };

        return {
            level: "warning",
            text: "Discord's native voice engine can't carry your own audio. Turn on the WebRTC voice engine to fix this",
            action: { label: "Open Settings", run: openSettings }
        };
    }

    if (muted) return { level: "warning", text: "You're muted, so others can't hear your sounds and music" };
    if (krisp) return { level: "warning", text: "Live, but Krisp noise suppression may filter out music. Turn it off for the best quality" };

    return { level: "live", text: "Live. Everyone in the call hears your sounds and music" };
}

export function OutputControls({ status }: { status: Status; }) {
    const { transmit, voiceVolume, localVolume } = settings.use(["transmit", "voiceVolume", "localVolume"]);
    const voice = Math.min(voiceVolume, MAX_VOICE_VOLUME);

    return (
        <footer className={cl("footer")}>
            <p className={cl("status", `status-${status.level}`)}>
                <span>{status.text}</span>
                {status.action && (
                    <button type="button" className={cl("link-button")} onClick={status.action.run}>{status.action.label}</button>
                )}
            </p>

            <div className={cl("mixer")}>
                <button
                    type="button"
                    className={cl("transmit", { "transmit-off": !transmit })}
                    aria-pressed={transmit}
                    aria-label="Send to voice"
                    title={transmit ? "Sending your audio to voice" : "Only you hear your audio"}
                    onClick={() => settings.store.transmit = !transmit}
                >
                    {transmit ? <MicIcon size={18} /> : <MicOffIcon size={18} />}
                </button>

                <label className={cl("mixer-slider")} title={`Volume others hear: ${voice}%`}>
                    <RangeSlider label="Volume others hear" value={voice} max={MAX_VOICE_VOLUME} onChange={v => settings.store.voiceVolume = v} />
                </label>

                <label className={cl("mixer-slider")} title={`Volume you hear: ${localVolume}%`}>
                    <HeadphonesIcon size={18} />
                    <RangeSlider label="Volume you hear" value={localVolume} onChange={v => settings.store.localVolume = v} />
                </label>
            </div>
        </footer>
    );
}
