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

import { definePluginSettings } from "@api/settings";
import { DefinedSettings, OptionType, Patch, PluginAuthor, PluginDef, SettingsDefinition } from "@utils/types";
import { React } from "@webpack/common";

import { OpenScreenshareSettingsButton } from "./components/OpenScreenshareSettingsButton";
import { PluginInfo } from "./constants";
import { Emitter } from "./emitter";
import { ScreensharePatcher } from "./patchers";
import { PatchedFunctions } from "./patches";
import { initPluginSettings } from "./settings";

export default new class Plugin implements PluginDef {
    readonly name: string;
    readonly description: string;
    readonly authors: PluginAuthor[];
    readonly patches: Omit<Patch, "plugin">[];
    readonly settings: DefinedSettings<SettingsDefinition, {}>;

    private readonly patchedFunctions: PatchedFunctions;
    private screensharePatcher?: ScreensharePatcher;

    constructor() {
        this.name = PluginInfo.PLUGIN_NAME;
        this.description = PluginInfo.DESCRIPTION;
        this.authors = PluginInfo.AUTHORS as PluginAuthor[];
        this.patches = [{
            find: ".ObjectTypes",
            replacement: {
                match: /render=(.+(}}\)}));/,
                replace: "render=function(){return $self.patchedFunctions.patchedLocationRender($1, this, arguments);};"
            }
        }];
        this.settings = definePluginSettings({
            openScreenshareSettings: {
                component: () => <OpenScreenshareSettingsButton />,
                description: "Open advanced screen sharing settings",
                type: OptionType.COMPONENT
            },
            hideDefaultSettings: {
                type: OptionType.BOOLEAN,
                description: "Hide Discord screen sharing settings",
                default: true
            }
        });
        this.patchedFunctions = new PatchedFunctions();
    }

    start(): void {
        initPluginSettings();
        this.screensharePatcher = new ScreensharePatcher().patch();
    }

    stop(): void {
        this.screensharePatcher?.unpatch();
        Emitter.removeAllListeners();
    }
};
