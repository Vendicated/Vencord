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
import { LazyComponent } from "../utils/misc";
import definePlugin from "../utils/types";

let SettingsComponent;

function loadSettingsTab(tabName: string) {
    SettingsComponent ??= LazyComponent(() => require("../components/VencordSettings").default);
    return SettingsComponent ? <SettingsComponent tab={tabName} /> : null;
}

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    required: true,
    patches: [{
        find: "().versionHash",
        replacement: [
            {
                match: /\[\(0,.{1,3}\.jsxs?\)\((.{1,10}),(\{[^{}}]+\{.{0,20}\(\)\.versionHash,.+?\})\)," "/,
                replace: (m, component, props) => {
                    props = props.replace(/children:\[.+\]/, "");
                    return `${m},Vencord.Plugins.plugins.Settings.makeInfoElements(${component}, ${props})`;
                }
            }
        ]
    }, {
        find: "Messages.ACTIVITY_SETTINGS",
        replacement: {
            match: /\{section:(.{1,2})\.ID\.HEADER,\s*label:(.{1,2})\..{1,2}\.Messages\.ACTIVITY_SETTINGS\}/,
            replace: (m, mod) => {
                const updater = !IS_WEB ? '{section:"VencordUpdater",label:"Updater",element:Vencord.Plugins.plugins.Settings.tabs.updater},' : "";
                const patchHelper = IS_DEV ? '{section:"VencordPatchHelper",label:"Patch Helper",element:Vencord.Components.PatchHelper},' : "";
                return (
                    `{section:${mod}.ID.HEADER,label:"Vencord"},` +
                    '{section:"VencordSettings",label:"Vencord",element:Vencord.Plugins.plugins.Settings.tabs.vencord},' +
                    '{section:"VencordPlugins",label:"Plugins",element:Vencord.Plugins.plugins.Settings.tabs.plugins},' +
                    '{section:"VencordThemes",label:"Themes",element:Vencord.Plugins.plugins.Settings.tabs.themes},' +
                    updater +
                    '{section:"VencordSettingsSync",label:"Backup & Restore",element:Vencord.Plugins.plugins.Settings.tabs.sync},' +
                    patchHelper +
                    `{section:${mod}.ID.DIVIDER},${m}`
                );
            }
        }
    }],

    tabs: {
        vencord: () => loadSettingsTab("VencordSettings"),
        plugins: () => loadSettingsTab("VencordPlugins"),
        themes: () => loadSettingsTab("VencordThemes"),
        updater: () => loadSettingsTab("VencordUpdater"),
        sync: () => loadSettingsTab("VencordSettingsSync")
    },

    get electronVersion() {
        return VencordNative.getVersions().electron || window.armcord?.electron || null;
    },

    get chromiumVersion() {
        try {
            return VencordNative.getVersions().chrome
                // @ts-ignore Typescript will add userAgentData IMMEDIATELY
                || navigator.userAgentData?.brands?.find(b => b.brand === "Chromium" || b.brand === "Google Chrome")?.version
                || null;
        } catch { // inb4 some stupid browser throws unsupported error for navigator.userAgentData, it's only in chromium
            return null;
        }
    },

    get additionalInfo() {
        if (IS_DEV) return " (Dev)";
        if (IS_WEB) return " (Web)";
        if (IS_STANDALONE) return " (Standalone)";
        return "";
    },

    makeInfoElements(Component: React.ComponentType<React.PropsWithChildren>, props: React.PropsWithChildren) {
        const { electronVersion, chromiumVersion, additionalInfo } = this;

        return (
            <>
                <Component {...props}>Vencord {gitHash}{additionalInfo}</Component>
                {electronVersion && <Component {...props}>Electron {electronVersion}</Component>}
                {chromiumVersion && <Component {...props}>Chromium {chromiumVersion}</Component>}
            </>
        );
    }
});
