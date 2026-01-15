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
    enableEffects?: boolean;
    masterGain?: number;
    eqEnabled?: boolean;
    eqLowFreq?: number;
    eqLowGain?: number;
    eqLowMidFreq?: number;
    eqLowMidGain?: number;
    eqMidFreq?: number;
    eqMidGain?: number;
    eqHighMidFreq?: number;
    eqHighMidGain?: number;
    eqHighFreq?: number;
    eqHighGain?: number;
    compEnabled?: boolean;
    compThreshold?: number;
    compRatio?: number;
    compAttack?: number;
    compRelease?: number;
    compKnee?: number;
    reverbEnabled?: boolean;
    reverbSeconds?: number;
    reverbDecay?: number;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    forceStereo?: boolean;
    preferredSampleRate?: number;
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
    setEnableEffects: (enabled?: boolean) => void;
    setMasterGain: (gain?: number) => void;
    setEqEnabled: (enabled?: boolean) => void;
    setEqLowFreq: (freq?: number) => void;
    setEqLowGain: (gain?: number) => void;
    setEqLowMidFreq: (freq?: number) => void;
    setEqLowMidGain: (gain?: number) => void;
    setEqMidFreq: (freq?: number) => void;
    setEqMidGain: (gain?: number) => void;
    setEqHighMidFreq: (freq?: number) => void;
    setEqHighMidGain: (gain?: number) => void;
    setEqHighFreq: (freq?: number) => void;
    setEqHighGain: (gain?: number) => void;
    setCompEnabled: (enabled?: boolean) => void;
    setCompThreshold: (threshold?: number) => void;
    setCompRatio: (ratio?: number) => void;
    setCompAttack: (attack?: number) => void;
    setCompRelease: (release?: number) => void;
    setCompKnee: (knee?: number) => void;
    setReverbEnabled: (enabled?: boolean) => void;
    setReverbSeconds: (seconds?: number) => void;
    setReverbDecay: (decay?: number) => void;
    setEchoCancellation: (enabled?: boolean) => void;
    setNoiseSuppression: (enabled?: boolean) => void;
    setAutoGainControl: (enabled?: boolean) => void;
    setForceStereo: (enabled?: boolean) => void;
    setPreferredSampleRate: (rate?: number) => void;
}

export const defaultMicrophoneProfiles = {
    normal: {
        name: "Normal",
        freq: 384000,
        freqEnabled: true,
        rate: 384000,
        rateEnabled: true,
        pacsize: 960,
        pacsizeEnabled: true,
        channels: 8,
        channelsEnabled: true,
        voiceBitrate: 24576,
        voiceBitrateEnabled: true,
        enableEffects: true,
        masterGain: 1.0,
        eqEnabled: true,
        eqLowFreq: 80,
        eqLowGain: 0,
        eqLowMidFreq: 500,
        eqLowMidGain: 0,
        eqMidFreq: 2000,
        eqMidGain: 0,
        eqHighMidFreq: 5000,
        eqHighMidGain: 0,
        eqHighFreq: 12000,
        eqHighGain: 0,
        compEnabled: true,
        compThreshold: -20,
        compRatio: 4,
        compAttack: 0.003,
        compRelease: 0.1,
        compKnee: 30,
        reverbEnabled: false,
        reverbSeconds: 1.2,
        reverbDecay: 2.5,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        forceStereo: true,
        preferredSampleRate: 48000
    },
    high: {
        name: "High",
        freq: 384000,
        freqEnabled: true,
        rate: 384000,
        rateEnabled: true,
        pacsize: 960,
        pacsizeEnabled: true,
        channels: 8,
        channelsEnabled: true,
        voiceBitrate: 24576,
        voiceBitrateEnabled: true,
        // Voice Effects Studio defaults
        enableEffects: true,
        masterGain: 1.0,
        eqEnabled: true,
        eqLowFreq: 80,
        eqLowGain: 0,
        eqLowMidFreq: 500,
        eqLowMidGain: 0,
        eqMidFreq: 2000,
        eqMidGain: 0,
        eqHighMidFreq: 5000,
        eqHighMidGain: 0,
        eqHighFreq: 12000,
        eqHighGain: 0,
        compEnabled: true,
        compThreshold: -20,
        compRatio: 4,
        compAttack: 0.003,
        compRelease: 0.1,
        compKnee: 30,
        reverbEnabled: false,
        reverbSeconds: 1.2,
        reverbDecay: 2.5,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        forceStereo: true,
        preferredSampleRate: 48000
    },
    maximum: {
        name: "Maximum",
        freq: 384000,
        freqEnabled: true,
        rate: 384000,
        rateEnabled: true,
        pacsize: 960,
        pacsizeEnabled: true,
        channels: 8,
        channelsEnabled: true,
        voiceBitrate: 24576,
        voiceBitrateEnabled: true,
        // Voice Effects Studio defaults
        enableEffects: true,
        masterGain: 1.0,
        eqEnabled: true,
        eqLowFreq: 80,
        eqLowGain: 0,
        eqLowMidFreq: 500,
        eqLowMidGain: 0,
        eqMidFreq: 2000,
        eqMidGain: 0,
        eqHighMidFreq: 5000,
        eqHighMidGain: 0,
        eqHighFreq: 12000,
        eqHighGain: 0,
        compEnabled: true,
        compThreshold: -20,
        compRatio: 4,
        compAttack: 0.003,
        compRelease: 0.1,
        compKnee: 30,
        reverbEnabled: false,
        reverbSeconds: 1.2,
        reverbDecay: 2.5,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        forceStereo: true,
        preferredSampleRate: 48000
    },
    purify: {
        name: "Purify",
        freq: 384000,
        freqEnabled: true,
        rate: 384000,
        rateEnabled: true,
        pacsize: 960,
        pacsizeEnabled: true,
        channels: 8,
        channelsEnabled: true,
        voiceBitrate: 24576,
        voiceBitrateEnabled: true,
        // Purify Studio - Legendary Settings
        enableEffects: true,
        masterGain: 1.15, // Slightly boosted for studio quality
        eqEnabled: true,
        // Legendary EQ - Professional Studio Curve
        eqLowFreq: 60,     // Deep bass
        eqLowGain: 3.5,    // Enhanced bass
        eqLowMidFreq: 250, // Warmth
        eqLowMidGain: 2.0, // Vocal presence
        eqMidFreq: 2000,   // Clarity
        eqMidGain: 1.5,    // Speech clarity
        eqHighMidFreq: 6000, // Brilliance
        eqHighMidGain: 2.5,  // Air and sparkle
        eqHighFreq: 15000,   // High-end extension
        eqHighGain: 1.0,     // Subtle brightness
        // Professional Compressor
        compEnabled: true,
        compThreshold: -18,  // More aggressive compression
        compRatio: 3.5,      // Smooth compression
        compAttack: 0.002,   // Fast attack
        compRelease: 0.15,   // Natural release
        compKnee: 25,        // Soft knee
        // Light Reverb
        reverbEnabled: true,
        reverbSeconds: 0.8,  // Short reverb
        reverbDecay: 1.8,    // Light decay
        // Audio Quality
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        forceStereo: true,
        preferredSampleRate: 384000
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
    setEnableEffects: enabled => get().currentProfile.enableEffects = enabled,
    setMasterGain: gain => get().currentProfile.masterGain = gain,
    setEqEnabled: enabled => get().currentProfile.eqEnabled = enabled,
    setEqLowFreq: freq => get().currentProfile.eqLowFreq = freq,
    setEqLowGain: gain => get().currentProfile.eqLowGain = gain,
    setEqLowMidFreq: freq => get().currentProfile.eqLowMidFreq = freq,
    setEqLowMidGain: gain => get().currentProfile.eqLowMidGain = gain,
    setEqMidFreq: freq => get().currentProfile.eqMidFreq = freq,
    setEqMidGain: gain => get().currentProfile.eqMidGain = gain,
    setEqHighMidFreq: freq => get().currentProfile.eqHighMidFreq = freq,
    setEqHighMidGain: gain => get().currentProfile.eqHighMidGain = gain,
    setEqHighFreq: freq => get().currentProfile.eqHighFreq = freq,
    setEqHighGain: gain => get().currentProfile.eqHighGain = gain,
    setCompEnabled: enabled => get().currentProfile.compEnabled = enabled,
    setCompThreshold: threshold => get().currentProfile.compThreshold = threshold,
    setCompRatio: ratio => get().currentProfile.compRatio = ratio,
    setCompAttack: attack => get().currentProfile.compAttack = attack,
    setCompRelease: release => get().currentProfile.compRelease = release,
    setCompKnee: knee => get().currentProfile.compKnee = knee,
    setReverbEnabled: enabled => get().currentProfile.reverbEnabled = enabled,
    setReverbSeconds: seconds => get().currentProfile.reverbSeconds = seconds,
    setReverbDecay: decay => get().currentProfile.reverbDecay = decay,
    setEchoCancellation: enabled => get().currentProfile.echoCancellation = enabled,
    setNoiseSuppression: enabled => get().currentProfile.noiseSuppression = enabled,
    setAutoGainControl: enabled => get().currentProfile.autoGainControl = enabled,
    setForceStereo: enabled => get().currentProfile.forceStereo = enabled,
    setPreferredSampleRate: rate => get().currentProfile.preferredSampleRate = rate,
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
