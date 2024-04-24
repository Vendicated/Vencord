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

export interface Utils {
    requireModule: (...args: any[]) => any;
    ensureModule: (...args: any[]) => any;
    getCrashReporterMetadata: (...args: any[]) => any;
    getSetting: (...args: any[]) => any;
    beforeUnload: (...args: any[]) => any;
    inputEventRegister: (...args: any[]) => any;
    inputEventUnregister: (...args: any[]) => any;
    setOnInputEventCallback: (...args: any[]) => any;
    setFocused: (...args: any[]) => any;
    getIdleMilliseconds: (...args: any[]) => any;
    setObservedGamesCallback: (...args: any[]) => any;
    setCandidateGamesCallback: (...args: any[]) => any;
    clearCandidateGamesCallback: (...args: any[]) => any;
    setGameCandidateOverrides: (...args: any[]) => any;
    detectPid: (...args: any[]) => any;
    undetectPid: (...args: any[]) => any;
    shouldDisplayNotifications: (...args: any[]) => any;
    getVoiceEngine: (...args: any[]) => any;
    getDiscordUtils: (...args: any[]) => any;
    isSystemDarkMode: (...args: any[]) => any;
    getGameUtils: (...args: any[]) => any;
    getCloudSync: (...args: any[]) => any;
    getDispatch: (...args: any[]) => any;
    setBadge: (...args: any[]) => any;
    setSystemTrayIcon: (...args: any[]) => any;
    setThumbarButtons: (...args: any[]) => any;
    bounceDock: (...args: any[]) => any;
    setSystemTrayApplications: (...args: any[]) => any;
    architecture: (...args: any[]) => any;
    moduleVersions: (...args: any[]) => any;
    copy: (...args: any[]) => any;
    copyImage: (...args: any[]) => any;
    saveImage: (...args: any[]) => any;
    saveFile: (...args: any[]) => any;
    canCopyImage: (...args: any[]) => any;
    cut: (...args: any[]) => any;
    paste: (...args: any[]) => any;
    readClipboard: (...args: any[]) => any;
    on: (...args: any[]) => any;
    invoke: (...args: any[]) => any;
    send: (...args: any[]) => any;
    flashFrame: (...args: any[]) => any;
    minimize: (...args: any[]) => any;
    restore: (...args: any[]) => any;
    maximize: (...args: any[]) => any;
    focus: (...args: any[]) => any;
    blur: (...args: any[]) => any;
    fullscreen: (...args: any[]) => any;
    close: (...args: any[]) => any;
    setAlwaysOnTop: (...args: any[]) => any;
    isAlwaysOnTop: (...args: any[]) => any;
    purgeMemory: (...args: any[]) => any;
    updateCrashReporter: (...args: any[]) => any;
    flushDNSCache: (...args: any[]) => any;
    supportsFeature: (...args: any[]) => any;
    getEnableHardwareAcceleration: (...args: any[]) => any;
    setEnableHardwareAcceleration: (...args: any[]) => any;
    getGPUDriverVersions: (...args: any[]) => any;
    setZoomFactor: (...args: any[]) => any;
    setBackgroundThrottling: (...args: any[]) => any;
    getPidFromDesktopSource: (...args: any[]) => any;
    getDesktopSourceFromPid: (...args: any[]) => any;
    generateSessionFromPid: (...args: any[]) => any;
    getAudioPid: (...args: any[]) => any;
    setForegroundProcess: (...args: any[]) => any;
    getDiscordMemoryUsage: (...args: any[]) => any;
    showOpenDialog: (...args: any[]) => any;
    flushStorageData: (...args: any[]) => any;
    flushCookies: (...args: any[]) => any;
    setCrashInformation: (...args: any[]) => any;
    blockDisplaySleep: (...args: any[]) => any;
    unblockDisplaySleep: (...args: any[]) => any;
    cleanupDisplaySleep: (...args: any[]) => any;
    relaunch: (...args: any[]) => any;
    makeChunkedRequest: (...args: any[]) => any;
    submitLiveCrashReport: (...args: any[]) => any;
    crash: (...args: any[]) => any;
    setApplicationBackgroundColor: (...args: any[]) => any;
    asyncify: (...args: any[]) => any;
    releaseChannel: string,
    canBootstrapNewUpdater: boolean;
    buildNumber: number;
    version: number[];
}
