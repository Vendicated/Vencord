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


export interface ScreenshareProfile {
    width?: number,
    height?: number,
    framerate?: number,
    videoCodec?: string,
    keyframeInterval?: number,
    videoBitrate?: number;
    videoBitrateEnabled?: boolean;
    resolutionEnabled?: boolean,
    framerateEnabled?: boolean,
    videoCodecEnabled?: boolean;
    keyframeIntervalEnabled?: boolean;
    hdrEnabled?: boolean;
}

export interface ScreenshareStore {
    audioSource?: string;
    audioSourceEnabled?: boolean;
    simpleMode?: boolean;
    setWidth: (width?: number) => void;
    setHeight: (height?: number) => void;
    setFramerate: (framerate?: number) => void;
    setVideoCodec: (codec?: string) => void;
    setKeyframeInterval: (keyframeInterval?: number) => void;
    setVideoBitrate: (bitrate?: number) => void;
    setKeyframeIntervalEnabled: (enabled?: boolean) => void;
    setResolutionEnabled: (enabled?: boolean) => void;
    setFramerateEnabled: (enabled?: boolean) => void;
    setVideoCodecEnabled: (enabled?: boolean) => void;
    setVideoBitrateEnabled: (enabled?: boolean) => void;
    setHdrEnabled: (enabled?: boolean) => void;
    setAudioSource: (audioSource?: string) => void;
    setAudioSourceEnabled: (enabled?: boolean) => void;
    setSimpleMode: (enabled?: boolean) => void;
}

export const defaultScreenshareProfiles = {
    low: {
        name: "Low Quality",
        width: 1280,
        height: 720,
        framerate: 60,
        videoBitrate: 2500,
        resolutionEnabled: true,
        framerateEnabled: true,
        videoBitrateEnabled: true,
    },
    medium: {
        name: "Medium Quality",
        width: 1920,
        height: 1080,
        framerate: 60,
        videoBitrate: 5000,
        resolutionEnabled: true,
        framerateEnabled: true,
        videoBitrateEnabled: true,
    },
    high: {
        name: "High Quality",
        width: 1920,
        height: 1080,
        framerate: 60,
        videoBitrate: 10000,
        resolutionEnabled: true,
        framerateEnabled: true,
        videoBitrateEnabled: true,
    }
} as const satisfies Record<string, ScreenshareProfile & ProfileableProfile>;

export const screenshareStoreDefault: ProfilableInitializer<ScreenshareStore, ScreenshareProfile> = (set, get) => ({
    setVideoBitrate: bitrate => get().currentProfile.videoBitrate = bitrate,
    setVideoBitrateEnabled: enabled => get().currentProfile.videoBitrateEnabled = enabled,
    setVideoCodec: codec => get().currentProfile.videoCodec = codec,
    setVideoCodecEnabled: enabled => get().currentProfile.videoCodecEnabled = enabled,
    setFramerate: framerate => get().currentProfile.framerate = framerate,
    setFramerateEnabled: enabled => get().currentProfile.framerateEnabled = enabled,
    setHeight: height => get().currentProfile.height = height,
    setWidth: width => get().currentProfile.width = width,
    setResolutionEnabled: enabled => get().currentProfile.resolutionEnabled = enabled,
    setKeyframeInterval: keyframeInterval => get().currentProfile.keyframeInterval = keyframeInterval,
    setKeyframeIntervalEnabled: enabled => get().currentProfile.keyframeIntervalEnabled = enabled,
    setHdrEnabled: enabled => get().currentProfile.hdrEnabled = enabled,
    setAudioSource: audioSource => get().audioSource = audioSource,
    setAudioSourceEnabled: enabled => get().audioSourceEnabled = enabled,
    setSimpleMode: enabled => get().simpleMode = enabled,
    simpleMode: true
});

export let screenshareStore: ProfilableStore<ScreenshareStore, ScreenshareProfile>;

export const initScreenshareStore = () =>
    screenshareStore = createPluginStore(
        PluginInfo.PLUGIN_NAME,
        "ScreenshareStore",
        profileable(
            screenshareStoreDefault,
            { name: "" },
            Object.values(defaultScreenshareProfiles)
        )
    );
