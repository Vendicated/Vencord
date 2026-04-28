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

import { MicrophoneSettingsModal } from "@plugins/betterMicrophone.desktop/components";
import { PluginInfo } from "@plugins/betterMicrophone.desktop/constants";
import Plugin from "@plugins/betterMicrophone.desktop/index";
import { microphoneStore } from "@plugins/betterMicrophone.desktop/stores";
import { openModalLazy } from "@utils/modal";

const onMicrophoneModalDone = () => {
    const { microphonePatcher } = Plugin;

    if (microphonePatcher)
        microphonePatcher.forceUpdateTransportationOptions();
};

export const openMicrophoneSettingsModal =
    () => openModalLazy(async () => {
        return props =>
            <MicrophoneSettingsModal
                onDone={onMicrophoneModalDone}
                showInfo
                microphoneStore={microphoneStore}
                author={PluginInfo.AUTHOR}
                contributors={Object.values(PluginInfo.CONTRIBUTORS)}
                {...props} />;
    });
