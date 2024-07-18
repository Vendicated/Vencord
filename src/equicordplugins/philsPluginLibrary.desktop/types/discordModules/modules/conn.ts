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

export interface Conn {
    destroy: (...args: any[]) => any;
    setTransportOptions: (options: Record<string, any>) => any;
    setSelfMute: (...args: any[]) => any;
    setSelfDeafen: (...args: any[]) => any;
    mergeUsers: (...args: any[]) => any;
    destroyUser: (...args: any[]) => any;
    setLocalVolume: (...args: any[]) => any;
    setLocalMute: (...args: any[]) => any;
    setLocalPan: (...args: any[]) => any;
    setDisableLocalVideo: (...args: any[]) => any;
    setMinimumOutputDelay: (...args: any[]) => any;
    getEncryptionModes: (...args: any[]) => any;
    configureConnectionRetries: (...args: any[]) => any;
    setOnSpeakingCallback: (...args: any[]) => any;
    setOnSpeakingWhileMutedCallback: (...args: any[]) => any;
    setPingInterval: (...args: any[]) => any;
    setPingCallback: (...args: any[]) => any;
    setPingTimeoutCallback: (...args: any[]) => any;
    setRemoteUserSpeakingStatus: (...args: any[]) => any;
    setRemoteUserCanHavePriority: (...args: any[]) => any;
    setOnVideoCallback: (...args: any[]) => any;
    setVideoBroadcast: (...args: any[]) => any;
    setDesktopSource: (...args: any[]) => any;
    setDesktopSourceWithOptions: (...args: any[]) => any;
    clearDesktopSource: (...args: any[]) => any;
    setDesktopSourceStatusCallback: (...args: any[]) => any;
    setOnDesktopSourceEnded: (...args: any[]) => any;
    setOnSoundshare: (...args: any[]) => any;
    setOnSoundshareEnded: (...args: any[]) => any;
    setOnSoundshareFailed: (...args: any[]) => any;
    setPTTActive: (...args: any[]) => any;
    getStats: (...args: any[]) => any;
    getFilteredStats: (...args: any[]) => any;
    startReplay: (...args: any[]) => any;
    startSamplesPlayback: (...args: any[]) => any;
    stopSamplesPlayback: (...args: any[]) => any;
}
