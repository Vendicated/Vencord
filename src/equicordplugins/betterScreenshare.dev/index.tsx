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

import { addSettingsPanelButton, Emitter, removeSettingsPanelButton, ScreenshareSettingsIcon } from "../philsPluginLibrary";
import { PluginInfo } from "./constants";
import { openScreenshareModal } from "./modals";
import { ScreenshareAudioPatcher, ScreensharePatcher } from "./patchers";
import { replacedScreenshareModalComponent } from "./patches";
import { initScreenshareAudioStore, initScreenshareStore } from "./stores";

var screensharePatcher;
var screenshareAudioPatcher;

export default definePlugin({
    name: "PhilsBetterScreenshare",
    description: "This plugin allows you to further customize your screen sharing.",
    authors: [Devs.philhk, Devs.walrus],
    dependencies: ["PhilsPluginLibrary"],
    replacedScreenshareModalComponent: replacedScreenshareModalComponent,

    patches: [
        {
            find: "Messages.SCREENSHARE_RELAUNCH",
            replacement: {
                match: /(function .{1,2}\(.{1,2}\){)(.{1,40}(?=selectGuild).+?(?:]}\)}\)))(})/,
                replace: "$1return $self.replacedScreenshareModalComponent(function(){$2}, this, arguments)$3"
            }
        }
    ],

    start() {
        initScreenshareStore();
        initScreenshareAudioStore();
        screensharePatcher = new ScreensharePatcher().patch();
        screenshareAudioPatcher = new ScreenshareAudioPatcher().patch();

        addSettingsPanelButton({
            name: PluginInfo.PLUGIN_NAME,
            icon: ScreenshareSettingsIcon,
            tooltipText: "Screenshare Settings",
            onClick: openScreenshareModal
        });
    },

    stop() {
        screensharePatcher?.unpatch();
        screenshareAudioPatcher?.unpatch();
        Emitter.removeAllListeners(PluginInfo.PLUGIN_NAME);
        removeSettingsPanelButton(PluginInfo.PLUGIN_NAME);
    },
});

export { screenshareAudioPatcher, screensharePatcher };
