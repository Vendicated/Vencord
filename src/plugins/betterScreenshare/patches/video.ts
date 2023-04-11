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

import { ProfilableStore, replaceObjectValuesIfExist, types, utils } from "../../philsPluginLibrary";
import { logger } from "../logger";
import { ScreenshareProfile, ScreenshareStore } from "../stores";

export function getDefaultTransportationOptions(connection: types.Connection) {
    return {
        ...connection.videoQualityManager.applyQualityConstraints({}).constraints,
        ...connection.getCodecOptions("opus", "H264", "stream"),
        streamParameters: connection.videoStreamParameters[0],
        keyframeInterval: 0,
    };
}

export function getDefaultDesktopSourceOptions(connection: types.Connection) {
    const [type, sourceId] = connection.desktopSourceId?.split(":") ?? ["screen", 0];

    return {
        hdrCaptureMode: "never",
        allowScreenCaptureKit: true,
        useQuartzCapturer: true,
        useGraphicsCapture: true,
        useVideoHook: true,
        sourceId: sourceId,
        type: type
    };
}

export function getStreamParameters(connection: types.Connection, get: ProfilableStore<ScreenshareStore, ScreenshareProfile>["get"]) {
    const { currentProfile } = get();
    const {
        framerate,
        framerateEnabled,
        height,
        resolutionEnabled,
        videoBitrate,
        videoBitrateEnabled,
        width,
    } = currentProfile;

    const { bitrateMax, capture } = connection.applyQualityConstraints({}).quality;

    return {
        ...connection.videoStreamParameters[0],
        ...(videoBitrateEnabled && videoBitrate
            ? {
                maxBitrate: videoBitrate * 1000,
            }
            : {
                maxBitrate: bitrateMax
            }
        ),
        ...((resolutionEnabled && width && height)
            ? {
                maxResolution: {
                    height: height,
                    width: width,
                    type: "fixed"
                }
            }
            : {
                maxResolution: !capture.height || !capture.width ? {
                    height: capture.height,
                    width: capture.width,
                    type: "source"
                } : {
                    height: capture.height,
                    width: capture.width,
                    type: "fixed"
                }
            }
        ),
        ...(framerateEnabled && framerate
            ? {
                maxFrameRate: framerate,
            }
            : {
                maxFrameRate: capture.framerate
            }
        ),
        active: true
    };
}

export function getReplaceableTransportationOptions(connection: types.Connection, get: ProfilableStore<ScreenshareStore, ScreenshareProfile>["get"]) {
    const { currentProfile, audioSource, audioSourceEnabled } = get();
    const {
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
    } = currentProfile;

    return {
        ...(videoBitrateEnabled && videoBitrate
            ? {
                encodingVideoBitRate: videoBitrate * 1000,
                encodingVideoMinBitRate: videoBitrate * 1000,
                encodingVideoMaxBitRate: videoBitrate * 1000,
                callBitRate: videoBitrate * 1000,
                callMinBitRate: videoBitrate * 1000,
                callMaxBitRate: videoBitrate * 1000
            }
            : {}
        ),
        ...((resolutionEnabled && width && height)
            ? {
                encodingVideoHeight: height,
                encodingVideoWidth: width,
                remoteSinkWantsPixelCount: height * width
            }
            : {}
        ),
        ...(framerateEnabled && framerate
            ? {
                encodingVideoFrameRate: framerate,
                remoteSinkWantsMaxFramerate: framerate
            }
            : {}
        ),
        ...(keyframeIntervalEnabled && keyframeInterval
            ? {
                keyframeInterval: keyframeInterval
            }
            : {}
        ),
        ...(videoCodecEnabled && videoCodec
            ? connection.getCodecOptions("opus", videoCodec, "stream")
            : {}
        ),
        ...(audioSourceEnabled && audioSource && utils.getPidFromDesktopSource(audioSource)
            ? {
                soundsharePid: utils.getPidFromDesktopSource(audioSource),
                soundshareEventDriven: true,
                soundshareLoopback: true
            }
            : {}
        ),
        streamParameters: getStreamParameters(connection, get)
    };
}

export function getReplaceableDesktopSourceOptions(get: ProfilableStore<ScreenshareStore, ScreenshareProfile>["get"]) {
    const { currentProfile } = get();
    const {
        hdrEnabled,
    } = currentProfile;

    return {
        ...(hdrEnabled
            ? {
                hdrCaptureMode: "always"
            }
            : {}
        ),
    };
}

export function patchConnection(
    connection: types.Connection,
    get: ProfilableStore<ScreenshareStore, ScreenshareProfile>["get"]
) {
    const oldSetTransportOptions = connection.conn.setTransportOptions;
    const oldSetDesktopSourceWithOptions = connection.conn.setDesktopSourceWithOptions;

    connection.conn.setDesktopSourceWithOptions = function (this: any, options: Record<string, any>) {
        const replaceableDesktopSourceOptions = getReplaceableDesktopSourceOptions(get);
        replaceObjectValuesIfExist(options, replaceableDesktopSourceOptions);

        return Reflect.apply(oldSetDesktopSourceWithOptions, this, [options]);
    };

    connection.conn.setTransportOptions = function (this: any, options: Record<string, any>) {
        const replaceableTransportOptions = getReplaceableTransportationOptions(connection, get);
        replaceObjectValuesIfExist(options, replaceableTransportOptions);

        if (options.streamParameters)
            connection.videoStreamParameters = [options.streamParameters];

        return Reflect.apply(oldSetTransportOptions, this, [options]);
    };

    const forceUpdateTransportationOptions = () => {
        const transportOptions = window._.merge({ ...getDefaultTransportationOptions(connection) }, getReplaceableTransportationOptions(connection, get));

        logger.info("Replaced Transport Options", transportOptions);

        oldSetTransportOptions(transportOptions);
    };

    const forceUpdateDesktopSourceOptions = () => {
        const desktopSourceOptions = window._.merge({ ...getDefaultDesktopSourceOptions(connection) }, getDefaultDesktopSourceOptions(connection));

        logger.info("Replaced Desktop Source Options", desktopSourceOptions);

        oldSetDesktopSourceWithOptions(desktopSourceOptions);
    };

    return {
        oldSetTransportOptions,
        oldSetDesktopSourceWithOptions,
        forceUpdateTransportationOptions,
        forceUpdateDesktopSourceOptions
    };
}
