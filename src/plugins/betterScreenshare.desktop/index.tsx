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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { addSettingsPanelButton, Emitter, removeSettingsPanelButton, ScreenshareSettingsIcon } from "@plugins/philsPluginLibrary";
import { PluginInfo } from "@plugins/betterScreenshare.desktop/constants";
import { openScreenshareModal } from "@plugins/betterScreenshare.desktop/modals";
import { ScreenshareAudioPatcher, ScreensharePatcher } from "@plugins/betterScreenshare.desktop/patchers";
import { GoLivePanelWrapper, replacedSubmitFunction } from "@plugins/betterScreenshare.desktop/patches";
import { initScreenshareAudioStore, initScreenshareStore } from "@plugins/betterScreenshare.desktop/stores";

export default definePlugin({
    name: "BetterScreenshare",
    description: "This plugin allows you to further customize your screenshare.",
    authors:  [{
        name: "rz30",
        id: 786315593963536415n
    }],
    dependencies: ["PhilsPluginLibrary"],
    patches: [
        {
            find: ':"go-live-modal"',
            replacement: {
                match: /function (\i)\((.{1,20})\)\{.{0,300}null==.{0,50}\?(\(0,.{1,10}\.jsxs?\)\(.{1,50}\..{1,10},{).{0,500}channel:.{0,20}}}\)/,
                replace: "$self.GoLivePanelWrapper($1,$2,$3)"
            }
        },
        {
            find: ".STREAM_FPS_OPTION.",
            replacement: {
                match: /,onSubmit:function\(\){/,
                replace: ",onSubmit:function(){$self.replacedSubmitFunction(arguments[0]);"
            }
        }
    ],
    start(): void {
        initScreenshareStore();
        initScreenshareAudioStore();

        this.screensharePatcher = new ScreensharePatcher().patch();
        this.screenshareAudioPatcher = new ScreenshareAudioPatcher().patch();

        addSettingsPanelButton({ 
            name: PluginInfo.PLUGIN_NAME, 
            icon: ScreenshareSettingsIcon, 
            tooltipText: "Screenshare Settings", 
            onClick: openScreenshareModal 
        });
    },
    stop(): void {
        this.screensharePatcher?.unpatch();
        this.screenshareAudioPatcher?.unpatch();

        Emitter.removeAllListeners(PluginInfo.PLUGIN_NAME);

        removeSettingsPanelButton(PluginInfo.PLUGIN_NAME);
    },
    toolboxActions: {
        "Open Screenshare Settings": openScreenshareModal
    },
    GoLivePanelWrapper,
    replacedSubmitFunction
});
