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

import * as Stores from "../discordModules";
import { utils } from "../discordModules/modules/modules";
import { DesktopSourceOptions, MediaEngine } from "../discordModules/modules/types";
import { MediaEngineStore } from "../discordModules/stores/types";
import { Emitter } from "../emitter";
import { getPluginSettings } from "../settings";
import { Framerate, Resolution } from "../types";
import { Patcher } from "./";


export class ScreensharePatcher extends Patcher {
    private mediaEngineStore: MediaEngineStore;
    private mediaEngine: MediaEngine;

    constructor() {
        super();
        this.mediaEngineStore = Stores.MediaEngineStore;
        this.mediaEngine = this.mediaEngineStore.getMediaEngine();
    }

    public patch(): this {
        this.unpatch();

        Emitter.addListener(
            this.mediaEngine.emitter,
            "on",
            "connection",
            connection => {
                if (connection.context !== "stream") return;

                const oldHandleSoundshare = connection.handleSoundshare;
                connection.handleSoundshare = function () {
                    const {
                        currentProfile,
                    } = getPluginSettings();
                    const { audioBitrate, audioBitrateEnabled } = currentProfile;

                    if (audioBitrateEnabled && audioBitrate) {
                        const bitrateBit = audioBitrate * 1000;
                        this.voiceBitrate = bitrateBit;
                        this.conn.setTransportOptions({
                            encodingVoiceBitRate: bitrateBit
                        });
                    } else
                        Reflect.apply(oldHandleSoundshare, this, arguments);
                };


                const oldSetDesktopSource = connection.setDesktopSource;
                connection.setDesktopSource = function (source: string | null, options?: DesktopSourceOptions | undefined) {
                    const {
                        currentProfile,
                        audioSource,
                        audioSourceEnabled
                    } = getPluginSettings();
                    const {
                        name,
                        audioBitrate,
                        audioBitrateEnabled,
                        editable,
                        framerate,
                        framerateEnabled,
                        height,
                        keyframeInterval,
                        keyframeIntervalEnabled,
                        resolutionEnabled,
                        videoBitrate,
                        videoBitrateEnabled,
                        videoCodec,
                        videoCodecEnabled,
                        width,
                        hdrEnabled
                    } = currentProfile;
                    const { videoQualityManager } = connection;

                    Reflect.apply(oldSetDesktopSource, this, [source, {
                        ...options,
                        useVideoHook: true,
                        useGraphicsCapture: true,
                        useQuartzCapturer: true,
                        allowScreenCaptureKit: true,
                        ...(hdrEnabled ? { hdrCaptureMode: "always" } : { hdrCaptureMode: "never" }),
                        ...(framerateEnabled && framerate ? { fps: framerate } : {}),
                        ...(resolutionEnabled && width && height ? { width: width, height: height } : {}),
                    } satisfies DesktopSourceOptions]);

                    if (videoCodec && videoCodecEnabled)
                        connection.setCodecs("opus", videoCodec, "stream");

                    if (videoBitrateEnabled && videoBitrate) {
                        const bitrateBit = videoBitrate * 1000;
                        connection.setCameraBitRate(bitrateBit, bitrateBit, bitrateBit);
                        videoQualityManager.qualityOverwrite.bitrateMax = bitrateBit;
                        videoQualityManager.qualityOverwrite.bitrateMin = bitrateBit;
                        videoQualityManager.qualityOverwrite.bitrateTarget = bitrateBit;
                    }
                    if (keyframeIntervalEnabled && keyframeInterval)
                        connection.setKeyframeInterval(keyframeInterval);

                    if (audioSourceEnabled && audioSource) {
                        const pid = utils.getPidFromDesktopSource(audioSource);
                        if (pid)
                            connection.setSoundshareSource(
                                pid,
                                true
                            );
                    }

                    const qualityOverwrite: Resolution & Framerate = {
                        ...(framerateEnabled && framerate ? { framerate: framerate } : { framerate: options?.fps || 60 }),
                        ...(resolutionEnabled && width && height ? { width: width, height: height } : { width: options?.width || 1920, height: options?.height || 1080 }),
                    };

                    videoQualityManager.qualityOverwrite.capture = qualityOverwrite;
                    videoQualityManager.qualityOverwrite.encode = qualityOverwrite;

                    connection.updateVideoQuality();

                    if ((audioSourceEnabled && audioSource) || (audioBitrateEnabled && audioBitrate))
                        this.handleSoundshare(true);
                };
            }
        );

        return this;
    }

    public unpatch(): this {
        return this._unpatch();
    }
}
