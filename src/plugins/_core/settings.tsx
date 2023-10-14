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

import { addContextMenuPatch } from "@api/ContextMenu";
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, SettingsRouter } from "@webpack/common";

import gitHash from "~git-hash";

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    required: true,

    start() {
        // The settings shortcuts in the user settings cog context menu
        // read the elements from a hardcoded map which for obvious reason
        // doesn't contain our sections. This patches the actions of our
        // sections to manually use SettingsRouter (which only works on desktop
        // but the context menu is usually not available on mobile anyway)
        addContextMenuPatch("user-settings-cog", children => () => {
            const section = children.find(c => Array.isArray(c) && c.some(it => it?.props?.id === "VencordSettings")) as any;
            section?.forEach(c => {
                const id = c?.props?.id;
                if (id?.startsWith("Vencord") || id?.startsWith("Vesktop")) {
                    c.props.action = () => SettingsRouter.open(id);
                }
            });
        });
    },

    patches: [{
        find: ".versionHash",
        replacement: [
            {
                match: /\[\(0,.{1,3}\.jsxs?\)\((.{1,10}),(\{[^{}}]+\{.{0,20}.versionHash,.+?\})\)," "/,
                replace: (m, component, props) => {
                    props = props.replace(/children:\[.+\]/, "");
                    return `${m},Vencord.Plugins.plugins.Settings.makeInfoElements(${component}, ${props})`;
                }
            }
        ]
    }, {
        find: "Messages.ACTIVITY_SETTINGS",
        replacement: {
            get match() {
                switch (Settings.plugins.Settings.settingsLocation) {
                    case "top": return /\{section:(\i)\.ID\.HEADER,\s*label:(\i)\.\i\.Messages\.USER_SETTINGS\}/;
                    case "aboveNitro": return /\{section:(\i)\.ID\.HEADER,\s*label:(\i)\.\i\.Messages\.BILLING_SETTINGS\}/;
                    case "belowNitro": return /\{section:(\i)\.ID\.HEADER,\s*label:(\i)\.\i\.Messages\.APP_SETTINGS\}/;
                    case "belowActivity": return /(?<=\{section:(\i)\.ID\.DIVIDER},)\{section:"changelog"/;
                    case "bottom": return /\{section:(\i)\.ID\.CUSTOM,\s*element:.+?}/;
                    case "aboveActivity":
                    default:
                        return /\{section:(\i)\.ID\.HEADER,\s*label:(\i)\.\i\.Messages\.ACTIVITY_SETTINGS\}/;
                }
            },
            replace: "...$self.makeSettingsCategories($1),$&"
        }
    }],

    customSections: [] as ((ID: Record<string, unknown>) => any)[],

    makeSettingsCategories({ ID }: { ID: Record<string, unknown>; }) {
        return [
            {
                section: ID.HEADER,
                label: "Vencord",
                className: "vc-settings-header"
            },
            {
                section: "VencordSettings",
                label: "Vencord",
                element: require("@components/VencordSettings/VencordTab").default,
                className: "vc-settings"
            },
            {
                section: "VencordPlugins",
                label: "Plugins",
                element: require("@components/VencordSettings/PluginsTab").default,
                className: "vc-plugins"
            },
            {
                section: "VencordThemes",
                label: "Themes",
                element: require("@components/VencordSettings/ThemesTab").default,
                className: "vc-themes"
            },
            !IS_UPDATER_DISABLED && {
                section: "VencordUpdater",
                label: "Updater",
                element: require("@components/VencordSettings/UpdaterTab").default,
                className: "vc-updater"
            },
            {
                section: "VencordCloud",
                label: "Cloud",
                element: require("@components/VencordSettings/CloudTab").default,
                className: "vc-cloud"
            },
            {
                section: "VencordSettingsSync",
                label: "Backup & Restore",
                element: require("@components/VencordSettings/BackupAndRestoreTab").default,
                className: "vc-backup-restore"
            },
            IS_DEV && {
                section: "VencordPatchHelper",
                label: "Patch Helper",
                element: require("@components/VencordSettings/PatchHelperTab").default,
                className: "vc-patch-helper"
            },
            ...this.customSections.map(func => func(ID)),
            {
                section: ID.DIVIDER
            }
        ].filter(Boolean);
    },

    options: {
        settingsLocation: {
            type: OptionType.SELECT,
            description: "Where to put the Vencord settings section",
            options: [
                { label: "At the very top", value: "top" },
                { label: "Above the Nitro section", value: "aboveNitro" },
                { label: "Below the Nitro section", value: "belowNitro" },
                { label: "Above Activity Settings", value: "aboveActivity", default: true },
                { label: "Below Activity Settings", value: "belowActivity" },
                { label: "At the very bottom", value: "bottom" },
            ],
            restartNeeded: true
        },
    },

    get electronVersion() {
        return VencordNative.native.getVersions().electron || window.armcord?.electron || null;
    },

    get chromiumVersion() {
        try {
            return VencordNative.native.getVersions().chrome
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
        if (IS_VESKTOP) return ` (Vesktop v${VesktopNative.app.getVersion()})`;
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
