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

import { ProfilableStore, replaceObjectValuesIfExist, types } from "../../philsPluginLibrary";
import { logger } from "../logger";
import { MicrophoneProfile, MicrophoneStore } from "../stores";

export function getDefaultTransportationOptions(connection: types.Connection) {
    return {
        ...connection.getCodecOptions("opus"),
        encodingVoiceBitRate: 64000
    };
}

export function getReplaceableTransportationOptions(connection: types.Connection, get: ProfilableStore<MicrophoneStore, MicrophoneProfile>["get"]) {
    const { currentProfile } = get();
    const {
        channels,
        channelsEnabled,
        freq,
        freqEnabled,
        pacsize,
        pacsizeEnabled,
        rate,
        rateEnabled,
        voiceBitrate,
        voiceBitrateEnabled
    } = currentProfile;

    return {
        ...(voiceBitrateEnabled && voiceBitrate
            ? {
                callBitRate: voiceBitrate * 1000,
                callMinBitRate: voiceBitrate * 1000,
                callMaxBitRate: voiceBitrate * 1000,
                encodingVoiceBitRate: voiceBitrate * 1000
            }
            : {}
        ),
        audioEncoder: {
            ...connection.getCodecOptions("opus").audioEncoder,
            ...(rateEnabled && rate ? { rate } : {}),
            ...(pacsizeEnabled && pacsize ? { pacsize } : {}),
            ...(freqEnabled && freq ? { freq } : {}),
            ...(channelsEnabled && channels ? { channels } : {})
        }
    };
}

export function patchConnection(
    connection: types.Connection,
    get: ProfilableStore<MicrophoneStore, MicrophoneProfile>["get"]
) {
    const oldSetTransportOptions = connection.conn.setTransportOptions;

    connection.conn.setTransportOptions = function (this: any, options: Record<string, any>) {
        replaceObjectValuesIfExist(options, getReplaceableTransportationOptions(connection, get));

        return Reflect.apply(oldSetTransportOptions, this, [options]);
    };

    const forceUpdateTransportationOptions = () => {
        const transportOptions = window._.merge({ ...getDefaultTransportationOptions(connection) }, getReplaceableTransportationOptions(connection, get));

        logger.info("Replaced Transport Options", transportOptions);

        oldSetTransportOptions(transportOptions);
    };

    return { oldSetTransportOptions, forceUpdateTransportationOptions };
}
