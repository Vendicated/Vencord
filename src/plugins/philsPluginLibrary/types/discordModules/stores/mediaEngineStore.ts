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

import { types } from "../../..";

export type MediaEngineStore = MediaEngineStore__ &
    MediaEngineStore_ & {
        __proto__: MediaEngineStore_;
    };

export interface MediaEngineStore_ {
    initialize: (...args: any[]) => any;
    supports: (...args: any[]) => any;
    supportsInApp: (...args: any[]) => any;
    isSupported: (...args: any[]) => any;
    isExperimentalEncodersSupported: (...args: any[]) => any;
    isNoiseSuppressionSupported: (...args: any[]) => any;
    isNoiseCancellationSupported: (...args: any[]) => any;
    isNoiseCancellationError: (...args: any[]) => any;
    isAutomaticGainControlSupported: (...args: any[]) => any;
    isAdvancedVoiceActivitySupported: (...args: any[]) => any;
    isAecDumpSupported: (...args: any[]) => any;
    isSimulcastSupported: (...args: any[]) => any;
    getAecDump: (...args: any[]) => any;
    getMediaEngine: () => types.MediaEngine;
    getVideoComponent: (...args: any[]) => any;
    getCameraComponent: (...args: any[]) => any;
    isEnabled: (...args: any[]) => any;
    isMute: (...args: any[]) => any;
    isDeaf: (...args: any[]) => any;
    hasContext: (...args: any[]) => any;
    isSelfMutedTemporarily: (...args: any[]) => any;
    isSelfMute: (...args: any[]) => any;
    isHardwareMute: (...args: any[]) => any;
    isSelfDeaf: (...args: any[]) => any;
    isVideoEnabled: (...args: any[]) => any;
    isVideoAvailable: (...args: any[]) => any;
    isScreenSharing: (...args: any[]) => any;
    isSoundSharing: (...args: any[]) => any;
    isLocalMute: (...args: any[]) => any;
    supportsDisableLocalVideo: (...args: any[]) => any;
    isLocalVideoDisabled: (...args: any[]) => any;
    isLocalVideoAutoDisabled: (...args: any[]) => any;
    isMediaFilterSettingLoading: (...args: any[]) => any;
    isNativeAudioPermissionReady: (...args: any[]) => any;
    getDesktopSource: (...args: any[]) => any;
    getDesktopSourceContext: (...args: any[]) => any;
    getLocalPan: (...args: any[]) => any;
    getLocalVolume: (...args: any[]) => any;
    getInputVolume: (...args: any[]) => any;
    getOutputVolume: (...args: any[]) => any;
    getMode: (...args: any[]) => any;
    getModeOptions: (...args: any[]) => any;
    getShortcuts: (...args: any[]) => any;
    getInputDeviceId: (...args: any[]) => any;
    getOutputDeviceId: (...args: any[]) => any;
    getVideoDeviceId: (...args: any[]) => any;
    getInputDevices: (...args: any[]) => any;
    getOutputDevices: (...args: any[]) => any;
    getVideoDevices: (...args: any[]) => any;
    getEchoCancellation: (...args: any[]) => any;
    getLoopback: (...args: any[]) => any;
    getNoiseSuppression: (...args: any[]) => any;
    getAutomaticGainControl: (...args: any[]) => any;
    getNoiseCancellation: (...args: any[]) => any;
    getExperimentalEncoders: (...args: any[]) => any;
    getHardwareH264: (...args: any[]) => any;
    getEnableSilenceWarning: (...args: any[]) => any;
    getDebugLogging: (...args: any[]) => any;
    getQoS: (...args: any[]) => any;
    getAttenuation: (...args: any[]) => any;
    getAttenuateWhileSpeakingSelf: (...args: any[]) => any;
    getAttenuateWhileSpeakingOthers: (...args: any[]) => any;
    getAudioSubsystem: (...args: any[]) => any;
    getSettings: (...args: any[]) => any;
    getState: (...args: any[]) => any;
    getInputDetected: (...args: any[]) => any;
    getNoInputDetectedNotice: (...args: any[]) => any;
    getPacketDelay: (...args: any[]) => any;
    setCanHavePriority: (...args: any[]) => any;
    isInteractionRequired: (...args: any[]) => any;
    getVideoHook: (...args: any[]) => any;
    getExperimentalSoundshare: (...args: any[]) => any;
    supportsExperimentalSoundshare: (...args: any[]) => any;
    getOpenH264: (...args: any[]) => any;
    getAv1Enabled: (...args: any[]) => any;
    getEverSpeakingWhileMuted: (...args: any[]) => any;
    getSoundshareEnabled: (...args: any[]) => any;
    supportsEnableSoundshare: (...args: any[]) => any;
    getVideoStreamParameters: (...args: any[]) => any;
    __proto__: MediaEngineStore__;
}

export interface MediaEngineStore__ {
    registerActionHandlers: (...args: any[]) => any;
    getName: (...args: any[]) => any;
    initializeIfNeeded: (...args: any[]) => any;
    initialize: (...args: any[]) => any;
    syncWith: (...args: any[]) => any;
    waitFor: (...args: any[]) => any;
    emitChange: (...args: any[]) => any;
    getDispatchToken: (...args: any[]) => any;
    mustEmitChanges: (...args: any[]) => any;
}
