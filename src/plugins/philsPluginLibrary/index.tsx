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

import { Patch, PluginAuthor, PluginDef } from "@utils/types";

import { PluginInfo } from "./constants";
import { replacedUserPanelComponent } from "./patches";

export default new class Plugin implements PluginDef {
    readonly name: string;
    readonly description: string;
    readonly authors: PluginAuthor[];
    readonly patches: Omit<Patch, "plugin">[];

    readonly replacedUserPanelComponent: typeof replacedUserPanelComponent;

    constructor() {
        this.name = PluginInfo.PLUGIN_NAME;
        this.description = PluginInfo.DESCRIPTION;
        this.authors = PluginInfo.AUTHORS as PluginAuthor[];
        this.patches = [{
            find: "Messages.ACCOUNT_A11Y_LABEL",
            replacement: {
                match: /(?<=function)( .{0,8}(?={).)(.{0,1000}isFullscreenInContext\(\).+?\)]}\))(})/,
                replace: "$1return $self.replacedUserPanelComponent(function(){$2}, this, arguments)$3"
            }
        }];
        this.replacedUserPanelComponent = replacedUserPanelComponent;
    }
};

export * from "./components";
export * from "./discordModules";
export * from "./emitter";
export * from "./icons";
export * from "./patchers";
export * from "./patches";
export * from "./store";
export * as types from "./types";
export * from "./utils";
