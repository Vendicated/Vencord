/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and Megumin
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

import gitHash from "~git-hash";

import { Devs } from "../utils/constants";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    required: true,
    patches: [{
        find: "().versionHash",
        replacement: [
            {
                match: /\w\.createElement\(.{1,2}.Fragment,.{0,30}\{[^}]+\},"Host ".+?\):null/,
                replace: m => {
                    const idx = m.indexOf("Host") - 1;
                    const template = m.slice(0, idx);
                    const additionalInfo = IS_WEB
                        ? " (Web)"
                        : IS_STANDALONE
                            ? " (Standalone)"
                            : "";

                    let r = `${m}, ${template}"Vencord ", "${gitHash}${additionalInfo}"), " ")`;
                    if (!IS_WEB) {
                        r += `,${template} "Electron ",VencordNative.getVersions().electron)," "),`;
                        r += `${template} "Chrome ",VencordNative.getVersions().chrome)," ")`;
                    }
                    return r;
                }
            }
        ]
    }, {
        find: "Messages.ACTIVITY_SETTINGS",
        replacement: {
            match: /\{section:(.{1,2})\.ID\.HEADER,\s*label:(.{1,2})\..{1,2}\.Messages\.ACTIVITY_SETTINGS\}/,
            replace: (m, mod) => {
                const updater = !IS_WEB ? '{section:"VencordUpdater",label:"Updater",element:Vencord.Components.Updater},' : "";
                const patchHelper = IS_DEV ? '{section:"VencordPatchHelper",label:"PatchHelper",element:Vencord.Components.PatchHelper},' : "";
                return (
                    `{section:${mod}.ID.HEADER,label:"Vencord"},` +
                    '{section:"VencordSetting",label:"Vencord",element:Vencord.Components.Settings},' +
                    '{section:"VencordPlugins",label:"Plugins",element:Vencord.Components.PluginSettings},' +
                    updater +
                    patchHelper +
                    `{section:${mod}.ID.DIVIDER},${m}`
                );
            }
        }
    }]
});
