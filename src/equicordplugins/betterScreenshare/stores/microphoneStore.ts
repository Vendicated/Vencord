/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { createPluginStore, ProfilableInitializer, ProfilableStore, profileable, ProfileableProfile } from "../../philsPluginLibrary";
import { PluginInfo } from "../constants";


export interface MicrophoneProfile {
    freq?: number,
    pacsize?: number,
    channels?: number,
    rate?: number,
    voiceBitrate?: number;
    freqEnabled?: boolean,
    pacsizeEnabled?: boolean;
    channelsEnabled?: boolean;
    rateEnabled?: boolean;
    voiceBitrateEnabled?: boolean;
}

export interface MicrophoneStore {
    simpleMode?: boolean;
    setSimpleMode: (enabled?: boolean) => void;
    setFreq: (freq?: number) => void;
    setPacsize: (pacsize?: number) => void;
    setChannels: (channels?: number) => void;
    setRate: (rate?: number) => void;
    setVoiceBitrate: (voiceBitrate?: number) => void;
    setFreqEnabled: (enabled?: boolean) => void;
    setPacsizeEnabled: (enabled?: boolean) => void;
    setChannelsEnabled: (enabled?: boolean) => void;
    setRateEnabled: (enabled?: boolean) => void;
    setVoiceBitrateEnabled: (enabled?: boolean) => void;
}

export const defaultMicrophoneProfiles = {
    normal: {
        name: "Normal",
        channels: 2,
        channelsEnabled: true,
        voiceBitrate: 96,
        voiceBitrateEnabled: true
    },
    high: {
        name: "High",
        channels: 2,
        channelsEnabled: true,
        voiceBitrate: 320,
        voiceBitrateEnabled: true
    },
} as const satisfies Record<string, MicrophoneProfile & ProfileableProfile>;

export const microphoneStoreDefault: ProfilableInitializer<MicrophoneStore, MicrophoneProfile> = (set, get) => ({
    simpleMode: true,
    setSimpleMode: enabled => get().simpleMode = enabled,
    setChannels: channels => get().currentProfile.channels = channels,
    setRate: rate => get().currentProfile.rate = rate,
    setVoiceBitrate: voiceBitrate => get().currentProfile.voiceBitrate = voiceBitrate,
    setPacsize: pacsize => get().currentProfile.pacsize = pacsize,
    setFreq: freq => get().currentProfile.freq = freq,
    setChannelsEnabled: enabled => get().currentProfile.channelsEnabled = enabled,
    setFreqEnabled: enabled => get().currentProfile.freqEnabled = enabled,
    setPacsizeEnabled: enabled => get().currentProfile.pacsizeEnabled = enabled,
    setRateEnabled: enabled => get().currentProfile.rateEnabled = enabled,
    setVoiceBitrateEnabled: enabled => get().currentProfile.voiceBitrateEnabled = enabled,
});

export let microphoneStore: ProfilableStore<MicrophoneStore, MicrophoneProfile>;

export const initMicrophoneStore = () =>
    microphoneStore = createPluginStore(
        PluginInfo.PLUGIN_NAME,
        "MicrophoneStore",
        profileable(
            microphoneStoreDefault,
            { name: "" },
            Object.values(defaultMicrophoneProfiles)
        )
    );
