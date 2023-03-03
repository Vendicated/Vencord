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

import { Settings } from "@api/settings";
import PatchHelper from "@components/PatchHelper";
import { Devs } from "@utils/constants";
import Logger from "@utils/Logger";
import { LazyComponent } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { SettingsRouter } from "@webpack/common";

import gitHash from "~git-hash";

const SettingsComponent = LazyComponent(() => require("../components/VencordSettings").default);

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    required: true,
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
                    case "top": return /\{section:(.{1,2})\.ID\.HEADER,\s*label:(.{1,2})\..{1,2}\.Messages\.USER_SETTINGS\}/;
                    case "aboveNitro": return /\{section:(.{1,2})\.ID\.HEADER,\s*label:(.{1,2})\..{1,2}\.Messages\.BILLING_SETTINGS\}/;
                    case "belowNitro": return /\{section:(.{1,2})\.ID\.HEADER,\s*label:(.{1,2})\..{1,2}\.Messages\.APP_SETTINGS\}/;
                    case "aboveActivity": return /\{section:(.{1,2})\.ID\.HEADER,\s*label:(.{1,2})\..{1,2}\.Messages\.ACTIVITY_SETTINGS\}/;
                    case "belowActivity": return /(?<=\{section:(.{1,2})\.ID\.DIVIDER},)\{section:"changelog"/;
                    case "bottom": return /\{section:(.{1,2})\.ID\.CUSTOM,\s*element:.+?}/;
                    default: {
                        new Logger("Settings").error(
                            new Error("No switch case matched????? Don't mess with the settings, silly")
                        );
                        // matches nothing
                        return /(?!a)a/;
                    }
                }
            },
            replace: "...$self.makeSettingsCategories($1),$&"
        }
    }],

    makeSettingsCategories({ ID }: { ID: Record<string, unknown>; }) {
        const makeOnClick = (tab: string) => () => SettingsRouter.open(tab);

        const cats = [
            {
                section: ID.HEADER,
                label: "Vencord"
            }, {
                section: "VencordSettings",
                label: "Vencord",
                element: () => <SettingsComponent tab="VencordSettings" />,
                onClick: makeOnClick("VencordSettings")
            }, {
                section: "VencordPlugins",
                label: "Plugins",
                element: () => <SettingsComponent tab="VencordPlugins" />,
                onClick: makeOnClick("VencordPlugins")
            }, {
                section: "VencordThemes",
                label: "Themes",
                element: () => <SettingsComponent tab="VencordThemes" />,
                onClick: makeOnClick("VencordThemes")
            }
        ] as Array<{
            section: unknown,
            label?: string;
            element?: React.ComponentType;
            onClick?(): void;
        }>;

        if (!IS_WEB)
            cats.push({
                section: "VencordUpdater",
                label: "Updater",
                element: () => <SettingsComponent tab="VencordUpdater" />,
                onClick: makeOnClick("VencordUpdater")
            });

        cats.push({
            section: "VencordSettingsSync",
            label: "Backup & Restore",
            element: () => <SettingsComponent tab="VencordSettingsSync" />,
            onClick: makeOnClick("VencordSettingsSync")
        });

        cats.push({
            section: "VencordCloud",
            label: "Cloud",
            element: () => <SettingsComponent tab="VencordCloud" />,
            onClick: makeOnClick("VencordCloud")
        });

        if (IS_DEV)
            cats.push({
                section: "VencordPatchHelper",
                label: "Patch Helper",
                element: PatchHelper!,
                onClick: makeOnClick("VencordPatchHelper")
            });

        cats.push({ section: ID.DIVIDER });

        return cats;
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

    tabs: {
        vencord: () => <SettingsComponent tab="VencordSettings" />,
        plugins: () => <SettingsComponent tab="VencordPlugins" />,
        themes: () => <SettingsComponent tab="VencordThemes" />,
        updater: () => <SettingsComponent tab="VencordUpdater" />,
        sync: () => <SettingsComponent tab="VencordSettingsSync" />
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
