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

import { Logger } from "@utils/Logger";
import { lodash } from "@webpack/common";

import { MicrophoneProfile, MicrophoneStore } from "../../betterMicrophone.desktop/stores";
import { ProfilableStore, replaceObjectValuesIfExist, types } from "../../philsPluginLibrary";

export function getDefaultAudioTransportationOptions(connection: types.Connection) {
    return {
        audioEncoder: {
            ...connection.getCodecOptions("opus").audioEncoder,
        },
        encodingVoiceBitRate: 64000
    };
}

export function getReplaceableAudioTransportationOptions(connection: types.Connection, get: ProfilableStore<MicrophoneStore, MicrophoneProfile>["get"]) {
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

export function patchConnectionAudioTransportOptions(
    connection: types.Connection,
    get: ProfilableStore<MicrophoneStore, MicrophoneProfile>["get"],
    logger?: Logger
) {
    const oldSetTransportOptions = connection.conn.setTransportOptions;

    connection.conn.setTransportOptions = function (this: any, options: Record<string, any>) {
        replaceObjectValuesIfExist(options, getReplaceableAudioTransportationOptions(connection, get));

        return Reflect.apply(oldSetTransportOptions, this, [options]);
    };

    const forceUpdateTransportationOptions = () => {
        const transportOptions = lodash.merge({ ...getDefaultAudioTransportationOptions(connection) }, getReplaceableAudioTransportationOptions(connection, get));

        logger?.info("Overridden Transport Options", transportOptions);

        oldSetTransportOptions(transportOptions);
    };

    return { oldSetTransportOptions, forceUpdateTransportationOptions };
}
