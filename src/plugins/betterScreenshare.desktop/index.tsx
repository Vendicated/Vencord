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
import { DefinedSettings, OptionType, Patch, PluginAuthor, PluginDef, SettingsDefinition } from "@utils/types";

import { addSettingsPanelButton, Emitter, removeSettingsPanelButton, ScreenshareSettingsIcon } from "../philsPluginLibrary";
import { PluginInfo } from "./constants";
import { openScreenshareModal } from "./modals";
import { ScreenshareAudioPatcher, ScreensharePatcher } from "./patchers";
import { getQuality, replacedScreenshareModalComponent } from "./patches";
import { initScreenshareAudioStore, initScreenshareStore } from "./stores";

export default new class Plugin implements PluginDef {
    readonly name: string;
    readonly description: string;
    readonly authors: PluginAuthor[];
    readonly patches: Omit<Patch, "plugin">[];
    readonly settings: DefinedSettings<SettingsDefinition, {}>;
    readonly dependencies: string[];

    private readonly replacedScreenshareModalComponent: typeof replacedScreenshareModalComponent;
    private readonly getQuality: typeof getQuality;
    public screensharePatcher?: ScreensharePatcher;
    public screenshareAudioPatcher?: ScreenshareAudioPatcher;

    constructor() {
        this.name = PluginInfo.PLUGIN_NAME;
        this.description = PluginInfo.DESCRIPTION;
        this.authors = [PluginInfo.AUTHOR, ...Object.values(PluginInfo.CONTRIBUTORS)] as PluginAuthor[];
        this.patches = [
            {
                find: "Messages.SCREENSHARE_RELAUNCH",
                replacement: {
                    match: /(function .{1,2}\(.{1,2}\){)(.{1,40}(?=selectGuild).+?(?:]}\)}\)))(})/,
                    replace: "$1return $self.replacedScreenshareModalComponent(function(){$2}, this, arguments)$3"
                }
            },
            {
                find: "setGoLiveSource(e,t){if(null==e)",
                replacement: {
                    match: /setGoLiveSource\(e,t\)\{(if\(null==e\))/,
                    replace: "setGoLiveSource(e,t){if(e!=null){e.quality.frameRate=$self.getQuality().framerate;e.quality.resolution=$self.getQuality().height}$1"
                }
            },
            {
                find: "\"remoteSinkWantsPixelCount\",\"remoteSinkWantsMaxFramerate\"",
                replacement: {
                    match: /(\i)=15e3/, // disable discord idle fps reduction
                    replace: (_, g1) => `${g1}=15e8`
                }
            },
            {
                find: "updateRemoteWantsFramerate(){",
                replacement: {
                    match: /updateRemoteWantsFramerate\(\)\{/, // disable discord mute fps reduction
                    replace: match => `${match}return;`
                }
            },
            {
                find: "getApplicationFramerate:function(){",
                replacement: {
                    match: /getApplicationFramerate:function\(\)\{return .{1,2}\}/,
                    replace: "getApplicationFramerate:function(){return function(){return $self.getQuality().framerate;}}"
                }
            },
            {
                find: "getApplicationResolution:function(){",
                replacement: {
                    match: /getApplicationResolution:function\(\)\{return .{1,2}\}/,
                    replace: "getApplicationResolution:function(){return function(){return $self.getQuality().height;}}"
                }
            },
        ];
        this.settings = definePluginSettings({
            hideDefaultSettings: {
                type: OptionType.BOOLEAN,
                description: "Hide Discord screen sharing settings",
                default: true,
            }
        });
        this.dependencies = ["PhilsPluginLibrary"];
        this.replacedScreenshareModalComponent = replacedScreenshareModalComponent;
        this.getQuality = getQuality;
    }

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
    }

    stop(): void {
        this.screensharePatcher?.unpatch();
        this.screenshareAudioPatcher?.unpatch();
        Emitter.removeAllListeners(PluginInfo.PLUGIN_NAME);

        removeSettingsPanelButton(PluginInfo.PLUGIN_NAME);
    }
};
