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

import { UserStore } from "@webpack/common";

import { Emitter, MediaEngineStore, patchConnectionAudioTransportOptions, Patcher, types } from "../../philsPluginLibrary";
import { PluginInfo } from "../constants";
import { logger } from "../logger";
import { screenshareAudioStore } from "../stores/screenshareAudioStore";

export class ScreenshareAudioPatcher extends Patcher {
    private mediaEngineStore: types.MediaEngineStore;
    private mediaEngine: types.MediaEngine;
    public connection?: types.Connection;

    public oldSetTransportOptions: (...args: any[]) => void;
    public forceUpdateTransportationOptions: () => void;

    constructor() {
        super();
        this.mediaEngineStore = MediaEngineStore;
        this.mediaEngine = this.mediaEngineStore.getMediaEngine();

        this.forceUpdateTransportationOptions = () => void 0;
        this.oldSetTransportOptions = () => void 0;
    }

    public patch(): this {
        this.unpatch();

        const { get } = screenshareAudioStore;

        const connectionEventFunction =
            (connection: types.Connection) => {
                if (connection.context !== "stream" || connection.streamUserId !== UserStore.getCurrentUser().id) return;

                this.connection = connection;

                const {
                    forceUpdateTransportationOptions: forceUpdateTransportationOptionsAudio,
                    oldSetTransportOptions: oldSetTransportOptionsAudio
                } = patchConnectionAudioTransportOptions(connection, get, logger);

                this.forceUpdateTransportationOptions = forceUpdateTransportationOptionsAudio;
                this.oldSetTransportOptions = oldSetTransportOptionsAudio;

                Emitter.addListener(connection.emitter, "on", "connected", () => {
                    this.forceUpdateTransportationOptions();
                });

                Emitter.addListener(connection.emitter, "on", "destroy", () => {
                    this.forceUpdateTransportationOptions = () => void 0;
                });
            };

        Emitter.addListener(
            this.mediaEngine.emitter,
            "on",
            "connection",
            connectionEventFunction,
            PluginInfo.PLUGIN_NAME
        );

        return this;
    }

    public unpatch(): this {
        return this._unpatch();
    }
}
