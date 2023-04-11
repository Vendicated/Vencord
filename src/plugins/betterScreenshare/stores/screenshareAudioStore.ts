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

import {
    defaultProfiles,
    MicrophoneProfile as ScreenshareAudioProfile,
    MicrophoneStore as ScreenshareAudioStore,
    microphoneStoreDefault as screenshareAudioStoreDefault
} from "plugins/betterMicrophone/stores";
import { createPluginStore } from "plugins/philsPluginLibrary";
import { ProfilableStore, profileable } from "plugins/philsPluginLibrary/store/profileable";

import { PluginInfo } from "../constants";

export let screenshareAudioStore: ProfilableStore<ScreenshareAudioStore, ScreenshareAudioProfile>;

export const initScreenshareAudioStore = () =>
    screenshareAudioStore = createPluginStore(
        PluginInfo.PLUGIN_NAME,
        "ScreenshareAudioStore",
        profileable(
            screenshareAudioStoreDefault,
            { name: "" },
            Object.values(defaultProfiles)
        )
    );

export { defaultProfiles, ScreenshareAudioProfile, ScreenshareAudioStore, screenshareAudioStoreDefault };
