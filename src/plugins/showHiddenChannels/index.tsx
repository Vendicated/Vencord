/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { HiddenChannelIcon, LockIcon } from "./components/ChannelIcons";
import HiddenChannelLockScreen from "./components/HiddenChannelLockScreen";
import { settings } from "./core/settings";
import { installStorePatches, restoreStorePatches } from "./patches/store";
import { patches } from "./patches/webpack";
import { isHiddenChannel, makeAllowedRolesReduce, resolveGuildChannels, swapViewChannelWithConnectPermission } from "./utils/channel";
import {
    getRawActiveStreamsForChannel,
    getRawApplicationStreamsForChannel,
    getVoiceUserActivityApplication,
    getVoiceUserHangStatusActivity,
    mergeStreamArrays,
    shouldForceVoiceUserStreaming,
    shouldShowVoiceUserHangStatus
} from "./utils/stream";

export { cl } from "./core/constants";
export { settings } from "./core/settings";

export default definePlugin({
    name: "ShowHiddenChannels",
    description: "Show channels that you do not have access to view.",
    authors: [Devs.BigDuck, Devs.AverageReactEnjoyer, Devs.D3SOX, Devs.Ven, Devs.Nuckyz, Devs.Nickyux, Devs.dzshn, Devs.qrewy],
    settings,
    patches,

    start: installStorePatches,
    stop: restoreStorePatches,

    mergeStreamArrays,
    getRawActiveStreamsForChannel,
    getRawApplicationStreamsForChannel,
    shouldForceVoiceUserStreaming,
    getVoiceUserActivityApplication,
    getVoiceUserHangStatusActivity,
    shouldShowVoiceUserHangStatus,
    swapViewChannelWithConnectPermission,
    isHiddenChannel,
    resolveGuildChannels,
    makeAllowedRolesReduce,

    HiddenChannelLockScreen: (channel: any) => <HiddenChannelLockScreen channel={channel} />,
    LockIcon,
    HiddenChannelIcon
});
