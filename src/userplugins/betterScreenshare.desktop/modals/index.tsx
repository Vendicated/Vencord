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

import { openModalLazy } from "@utils/modal";

import Plugin from "..";
import { ScreenshareSettingsModal } from "../components";
import { PluginInfo } from "../constants";
import { screenshareAudioStore, screenshareStore } from "../stores";

const onScreenshareModalDone = () => {
    const { screenshareAudioPatcher, screensharePatcher } = Plugin;

    if (screensharePatcher) {
        screensharePatcher.forceUpdateTransportationOptions();
        screensharePatcher.forceUpdateDesktopSourceOptions();
    }
    if (screenshareAudioPatcher)
        screenshareAudioPatcher.forceUpdateTransportationOptions();
};

const onScreenshareAudioModalDone = () => {
    const { screenshareAudioPatcher } = Plugin;

    if (screenshareAudioPatcher)
        screenshareAudioPatcher.forceUpdateTransportationOptions();
};

export const openScreenshareModal =
    () => openModalLazy(async () => {
        return props =>
            <ScreenshareSettingsModal
                onAudioDone={onScreenshareAudioModalDone}
                onDone={onScreenshareModalDone}
                screenshareStore={screenshareStore}
                screenshareAudioStore={screenshareAudioStore}
                author={PluginInfo.AUTHOR}
                contributors={Object.values(PluginInfo.CONTRIBUTORS)}
                {...props} />;
    });
