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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { addSettingsPanelButton, Emitter, removeSettingsPanelButton, ScreenshareSettingsIcon } from "../philsPluginLibrary";
import { PluginInfo } from "./constants";
import { openScreenshareModal } from "./modals";
import { ScreenshareAudioPatcher, ScreensharePatcher } from "./patchers";
import { replacedScreenshareModalComponent } from "./patches";
import { initScreenshareAudioStore, initScreenshareStore } from "./stores";

export default definePlugin({
    name: "BetterScreenshare",
    description: "This plugin allows you to further customize your screen sharing.",
    authors: [Devs.philhk],
    dependencies: ["PhilsPluginLibrary"],
    patches: [
        {
            find: "Messages.SCREENSHARE_RELAUNCH",
            replacement: {
                match: /(function .{1,2}\(.{1,2}\){)(.{1,40}(?=selectGuild).+?(?:]}\)}\)))(})/,
                replace: "$1return $self.replacedScreenshareModalComponent(function(){$2}, this, arguments)$3"
            }
        }
    ],
    settings: definePluginSettings({
        hideDefaultSettings: {
            type: OptionType.BOOLEAN,
            description: "Hide Discord screen sharing settings",
            default: true,
        }
    }),
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
    replacedScreenshareModalComponent
});
