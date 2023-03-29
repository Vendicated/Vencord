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

import { Settings, useSettings } from "@api/settings";

import { PluginInfo } from "../constants";

export interface Profile {
    name: string,
    editable?: boolean,
    width?: number,
    height?: number,
    framerate?: number,
    videoCodec?: string,
    keyframeInterval?: number,
    videoBitrate?: number;
    videoBitrateEnabled?: boolean;
    audioBitrate?: number;
    resolutionEnabled?: boolean,
    framerateEnabled?: boolean,
    videoCodecEnabled?: boolean;
    keyframeIntervalEnabled?: boolean;
    audioBitrateEnabled?: boolean;
    hdrEnabled?: boolean;
}

export interface PluginSettings {
    enabled: boolean;
    profiles: Profile[],
    currentProfile: Profile;
    hideDefaultSettings?: boolean;
    audioSource?: string;
    audioSourceEnabled?: boolean;
}

export interface PluginSettingsSetter {
    setWidth: (width?: number) => void;
    setHeight: (height?: number) => void;
    setFramerate: (framerate?: number) => void;
    setVideoCodec: (codec?: string) => void;
    setKeyframeInterval: (keyframeInterval?: number) => void;
    setVideoBitrate: (bitrate?: number) => void;
    setAudioBitrate: (bitrate?: number) => void;
    setKeyframeIntervalEnabled: (enabled?: boolean) => void;
    setResolutionEnabled: (enabled?: boolean) => void;
    setFramerateEnabled: (enabled?: boolean) => void;
    setVideoCodecEnabled: (enabled?: boolean) => void;
    setVideoBitrateEnabled: (enabled?: boolean) => void;
    setAudioBitrateEnabled: (enabled?: boolean) => void;
    addProfile: (profile: Profile) => void;
    getProfile: (profileName: string) => Profile | undefined;
    setCurrentProfile: (profile: Profile) => void;
    deleteProfile: (profileOrName: Profile | string) => void;
    setEditable: (editable: boolean) => void;
    saveCurrentProfile: (name: string) => void;
    setHdrEnabled: (enabled?: boolean) => void;
    setAudioSource: (audioSource?: string) => void;
    setAudioSourceEnabled: (enabled?: boolean) => void;
}

export const defaultProfiles = {
    low: {
        name: "Low Quality",
        width: 1280,
        height: 720,
        framerate: 60,
        videoBitrate: 2500,
        audioBitrate: 320,
        resolutionEnabled: true,
        framerateEnabled: true,
        videoBitrateEnabled: true,
        audioBitrateEnabled: true,
    },
    medium: {
        name: "Medium Quality",
        width: 1920,
        height: 1080,
        framerate: 60,
        videoBitrate: 5000,
        audioBitrate: 320,
        resolutionEnabled: true,
        framerateEnabled: true,
        videoBitrateEnabled: true,
        audioBitrateEnabled: true,
    },
    high: {
        name: "High Quality",
        width: 1920,
        height: 1080,
        framerate: 60,
        videoBitrate: 10000,
        audioBitrate: 320,
        resolutionEnabled: true,
        framerateEnabled: true,
        videoBitrateEnabled: true,
        audioBitrateEnabled: true,
    }
} as const satisfies Record<string, Profile>;

export const pluginSettingsHelpers: PluginSettingsSetter = {
    setAudioBitrate: bitrate => getPluginSettings().currentProfile.audioBitrate = bitrate,
    setAudioBitrateEnabled: enabled => getPluginSettings().currentProfile.audioBitrateEnabled = enabled,
    setVideoBitrate: bitrate => getPluginSettings().currentProfile.videoBitrate = bitrate,
    setVideoBitrateEnabled: enabled => getPluginSettings().currentProfile.videoBitrateEnabled = enabled,
    setVideoCodec: codec => getPluginSettings().currentProfile.videoCodec = codec,
    setVideoCodecEnabled: enabled => getPluginSettings().currentProfile.videoCodecEnabled = enabled,
    setFramerate: framerate => getPluginSettings().currentProfile.framerate = framerate,
    setFramerateEnabled: enabled => getPluginSettings().currentProfile.framerateEnabled = enabled,
    setHeight: height => getPluginSettings().currentProfile.height = height,
    setWidth: width => getPluginSettings().currentProfile.width = width,
    setResolutionEnabled: enabled => getPluginSettings().currentProfile.resolutionEnabled = enabled,
    setKeyframeInterval: keyframeInterval => getPluginSettings().currentProfile.keyframeInterval = keyframeInterval,
    setKeyframeIntervalEnabled: enabled => getPluginSettings().currentProfile.keyframeIntervalEnabled = enabled,
    setEditable: editable => getPluginSettings().currentProfile.editable = editable,
    setHdrEnabled: enabled => getPluginSettings().currentProfile.hdrEnabled = enabled,
    addProfile: profile => {
        const pluginSettings = getPluginSettings();
        pluginSettingsHelpers.deleteProfile(profile);
        pluginSettings.profiles.push(profile);
    },
    deleteProfile: profileOrName => {
        const pluginSettings = getPluginSettings();
        if (typeof profileOrName === "string")
            pluginSettings.profiles = pluginSettings.profiles.filter(profile => profile.name !== profileOrName);
        else
            pluginSettings.profiles = pluginSettings.profiles.filter(profile => profile.name !== profileOrName.name);
    },
    setCurrentProfile: profile => getPluginSettings().currentProfile = { ...profile },
    getProfile: profileName => Object.values(defaultProfiles).find(profile => profile.name === profileName) || getPluginSettings().profiles.find(profile => profile.name === profileName),
    saveCurrentProfile: profileName => void pluginSettingsHelpers.addProfile({
        ...getPluginSettings().currentProfile,
        name: profileName,
        editable: true
    }),
    setAudioSource: audioSource => getPluginSettings().audioSource = audioSource,
    setAudioSourceEnabled: enabled => getPluginSettings().audioSourceEnabled = enabled
} as const;

export const defaultPluginSettings: Omit<PluginSettings, "enabled"> = {
    profiles: [],
    currentProfile: { name: "", editable: true }
};

export function getPluginSettings(): PluginSettings {
    return Settings.plugins[PluginInfo.PLUGIN_NAME] as PluginSettings;
}

export function usePluginSettings(): PluginSettings {
    return useSettings().plugins[PluginInfo.PLUGIN_NAME] as PluginSettings;
}

export function initPluginSettings() {
    Object.assign(getPluginSettings(), defaultPluginSettings, { ...getPluginSettings() });
}

