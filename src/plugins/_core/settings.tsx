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

import { Settings } from "@api/Settings";
import { BackupRestoreIcon, CloudIcon, MainSettingsIcon, PaintbrushIcon, PatchHelperIcon, PluginsIcon, UpdaterIcon } from "@components/Icons";
import { BackupAndRestoreTab, CloudTab, PatchHelperTab, PluginsTab, ThemesTab, UpdaterTab, VencordTab } from "@components/settings/tabs";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import gitHash from "~git-hash";

type SectionType = "HEADER" | "DIVIDER" | "CUSTOM";
type SectionTypes = Record<SectionType, SectionType>;

const LayoutType = { SECTION: 1, ENTRY: 2, PANEL: 3, PANE: 4 } as const;

interface SettingsLayoutNode {
    key?: string;
    type: number;
    legacySearchKey?: string;
    useLabel?: () => string;
    useTitle?: () => string;
    buildLayout?: () => SettingsLayoutNode[];
    icon?: () => React.ReactNode;
    render?: () => React.ReactNode;
}

interface SettingsLayoutBuilder {
    key?: string;
    buildLayout(): SettingsLayoutNode[];
}

function getSettingsCfg(): any { try { return Settings.plugins.Settings; } catch { return null; } }

const isNewUIForcedOff = () => !!getSettingsCfg()?.disableNewUI;
const getSettingsLocationSafe = (): string => getSettingsCfg()?.settingsLocation ?? "aboveNitro";

const findIndexByKey = (layout: SettingsLayoutNode[], key: string) => layout.findIndex(s => typeof s?.key === "string" && s.key === key);

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    required: true,

    patches: [
        {
            find: ".versionHash",
            replacement: [
                {
                    match: /\.compactInfo.+?\[\(0,\i\.jsxs?\)\((.{1,10}),(\{[^{}}]+\{.{0,20}.versionHash,.+?\})\),/,
                    replace: (m, component, props) => {
                        return `${m}$self.makeInfoElements(${component}, ${props}),`;
                    }
                },
                {
                    match: /\.info.+?\[\(0,\i\.jsxs?\)\((.{1,10}),(\{[^{}}]+\{.{0,20}.versionHash,.+?\})\)," "/,
                    replace: (m, component, props) => {
                        props = props.replace(/children:\[.+\]/, "");
                        return `${m},$self.makeInfoElements(${component}, ${props})`;
                    }
                },
                {
                    match: /copyValue:\i\.join\(" "\)/g,
                    replace: "$& + $self.getInfoString()"
                }
            ]
        },
        {
            find: ".SEARCH_NO_RESULTS&&0===",
            replacement: [
                {
                    match: /(?<=section:(.{0,50})\.DIVIDER\}\))([,;])(?=.{0,200}(\i)\.push.{0,100}label:(\i)\.header)/,
                    replace: (_, sectionTypes, commaOrSemi, elements, element) => `${commaOrSemi} $self.addSettings(${elements}, ${element}, ${sectionTypes}) ${commaOrSemi}`
                },
                {
                    match: /({(?=.+?function (\i).{0,160}(\i)=\i\.useMemo.{0,140}return \i\.useMemo\(\(\)=>\i\(\3).+?\(\)=>)\2/,
                    replace: (_, rest, settingsHook) => `${rest}$self.wrapSettingsHook(${settingsHook})`
                }
            ]
        },
        {
            find: "#{intl::USER_SETTINGS_ACTIONS_MENU_LABEL}",
            replacement: {
                // Skip the check Discord performs to make sure the section being selected in the user settings context menu is valid
                match: /(?<=function\((\i),(\i),\i\)\{)(?=let \i=Object.values\(\i\.\i\).+?(\(0,\i\.openUserSettings\))\()/,
                replace: (_, settingsPanel, section, openUserSettings) => `${openUserSettings}(${settingsPanel},{section:${section}});return;`
            }
        },
        {
            find: "2025-09-user-settings-redesign-1",
            replacement: {
                match: /enabled:![01],showLegacyOpen:/g,
                replace: (m: string) =>
                    isNewUIForcedOff()
                        ? "enabled:false,showLegacyOpen:"
                        : m
            }
        },
        {
            find: ".buildLayout().map",
            replacement: {
                match: /(\i)\.buildLayout\(\)(?=\.map)/,
                replace: "$self.buildLayout($1)"
            }
        }
    ],

    buildLayout(originalLayoutBuilder: SettingsLayoutBuilder) {
        const layout = originalLayoutBuilder.buildLayout();
        if (originalLayoutBuilder.key !== "$Root") return layout;
        if (!Array.isArray(layout)) return layout;
        if (isNewUIForcedOff()) return layout;

        if (layout.some(s => s?.key === "vencord_section")) return layout;

        const makeEntry = (
            key: string,
            title: string,
            Component: React.ComponentType<any>,
            Icon: React.ComponentType<any>
        ): SettingsLayoutNode => ({
            key,
            type: LayoutType.ENTRY,
            legacySearchKey: title.toUpperCase(),
            useTitle: () => title,
            icon: () => <Icon width={20} height={20} />,
            buildLayout: () => [
                {
                    key: key + "_panel",
                    type: LayoutType.PANEL,
                    useTitle: () => title,
                    buildLayout: () => [
                        {
                            key: key + "_pane",
                            type: LayoutType.PANE,
                            buildLayout: () => [],
                            render: () => <Component />,
                            useTitle: () => title
                        }
                    ]
                }
            ]
        });

        const vencordEntries: SettingsLayoutNode[] = [
            makeEntry("vencord_main", "Vencord", VencordTab, MainSettingsIcon),
            makeEntry("vencord_plugins", "Plugins", PluginsTab, PluginsIcon),
            makeEntry("vencord_themes", "Themes", ThemesTab, PaintbrushIcon),
            makeEntry("vencord_cloud", "Cloud", CloudTab, CloudIcon),
            makeEntry("vencord_backup_restore", "Backup & Restore", BackupAndRestoreTab, BackupRestoreIcon)
        ];

        if (!IS_UPDATER_DISABLED && UpdaterTab) {
            vencordEntries.push(makeEntry("vencord_updater", "Updater", UpdaterTab, UpdaterIcon));
        }

        if (IS_DEV && PatchHelperTab) {
            vencordEntries.push(makeEntry("vencord_patch_helper", "Patch Helper", PatchHelperTab, PatchHelperIcon));
        }

        const vencordSection: SettingsLayoutNode = {
            key: "vencord_section",
            type: LayoutType.SECTION,
            useLabel: () => "Vencord",
            buildLayout: () => vencordEntries
        };

        const settingsLocation = getSettingsLocationSafe();
        let insertIndex = layout.length;

        switch (settingsLocation) {
            case "top": {
                const idx = findIndexByKey(layout, "user_section");
                insertIndex = idx === -1 ? Math.min(1, layout.length) : idx;
                break;
            }
            case "aboveNitro": {
                const idx = findIndexByKey(layout, "billing_section");
                insertIndex = idx === -1 ? layout.length : idx;
                break;
            }
            case "belowNitro": {
                const idx = findIndexByKey(layout, "billing_section");
                insertIndex = idx === -1 ? layout.length : idx + 1;
                break;
            }
            case "aboveActivity": {
                const idx = findIndexByKey(layout, "activity_section");
                insertIndex = idx === -1 ? layout.length : idx;
                break;
            }
            case "belowActivity": {
                const idx = findIndexByKey(layout, "activity_section");
                insertIndex = idx === -1 ? layout.length : idx + 1;
                break;
            }
            case "bottom":
            default: {
                const idx = findIndexByKey(layout, "logout_section");
                insertIndex = idx === -1 ? layout.length : idx;
                break;
            }
        }

        layout.splice(insertIndex, 0, vencordSection);

        return layout;
    },

    customSections: [] as ((SectionTypes: SectionTypes) => any)[],

    makeSettingsCategories(SectionTypes: SectionTypes) {
        return [
            {
                section: SectionTypes.HEADER,
                label: "Vencord",
                className: "vc-settings-header"
            },
            {
                section: "settings/tabs",
                label: "Vencord",
                element: VencordTab,
                className: "vc-settings"
            },
            {
                section: "VencordPlugins",
                label: "Plugins",
                element: PluginsTab,
                className: "vc-plugins"
            },
            {
                section: "VencordThemes",
                label: "Themes",
                element: ThemesTab,
                className: "vc-themes"
            },
            !IS_UPDATER_DISABLED && {
                section: "VencordUpdater",
                label: "Updater",
                element: UpdaterTab,
                className: "vc-updater"
            },
            {
                section: "VencordCloud",
                label: "Cloud",
                element: CloudTab,
                className: "vc-cloud"
            },
            {
                section: "settings/tabsSync",
                label: "Backup & Restore",
                element: BackupAndRestoreTab,
                className: "vc-backup-restore"
            },
            IS_DEV && {
                section: "VencordPatchHelper",
                label: "Patch Helper",
                element: PatchHelperTab,
                className: "vc-patch-helper"
            },
            ...this.customSections.map(func => func(SectionTypes)),
            {
                section: SectionTypes.DIVIDER
            }
        ].filter(Boolean);
    },

    isRightSpot({ header, settings }: { header?: string; settings?: string[]; }) {
        const firstChild = settings?.[0];
        // lowest two elements... sanity backup
        if (firstChild === "LOGOUT" || firstChild === "SOCIAL_LINKS") return true;

        const settingsLocation = getSettingsLocationSafe();

        if (settingsLocation === "bottom") return firstChild === "LOGOUT";
        if (settingsLocation === "belowActivity") return firstChild === "CHANGELOG";

        if (!header) return;

        try {
            const names = {
                top: getIntlMessage("USER_SETTINGS"),
                aboveNitro: getIntlMessage("BILLING_SETTINGS"),
                belowNitro: getIntlMessage("APP_SETTINGS"),
                aboveActivity: getIntlMessage("ACTIVITY_SETTINGS")
            };

            if (!names[settingsLocation] || names[settingsLocation].endsWith("_SETTINGS"))
                return firstChild === "PREMIUM";

            return header === names[settingsLocation];
        } catch {
            return firstChild === "PREMIUM";
        }
    },

    patchedSettings: new WeakSet(),

    addSettings(elements: any[], element: { header?: string; settings: string[]; }, sectionTypes: SectionTypes) {
        if (this.patchedSettings.has(elements) || !this.isRightSpot(element)) return;

        this.patchedSettings.add(elements);

        elements.push(...this.makeSettingsCategories(sectionTypes));
    },

    wrapSettingsHook(originalHook: (...args: any[]) => Record<string, unknown>[]) {
        return (...args: any[]) => {
            const elements = originalHook(...args);
            if (!this.patchedSettings.has(elements))
                elements.unshift(...this.makeSettingsCategories({
                    HEADER: "HEADER",
                    DIVIDER: "DIVIDER",
                    CUSTOM: "CUSTOM"
                }));

            return elements;
        };
    },

    options: {
        settingsLocation: {
            type: OptionType.SELECT,
            description: "Where to put the Vencord settings section",
            options: [
                { label: "At the very top", value: "top" },
                { label: "Above the Nitro section", value: "aboveNitro", default: true },
                { label: "Below the Nitro section", value: "belowNitro" },
                { label: "Above Activity Settings", value: "aboveActivity" },
                { label: "Below Activity Settings", value: "belowActivity" },
                { label: "At the very bottom", value: "bottom" },
            ]
        },
        disableNewUI: {
            type: OptionType.BOOLEAN,
            description: "Force Discord to use the old settings UI",
            default: false,
            restartNeeded: true
        }
    },

    get electronVersion() {
        return VencordNative.native.getVersions().electron || window.legcord?.electron || null;
    },

    get chromiumVersion() {
        try {
            return VencordNative.native.getVersions().chrome
                // @ts-expect-error Typescript will add userAgentData IMMEDIATELY
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

    getInfoRows() {
        const { electronVersion, chromiumVersion, additionalInfo } = this;

        const rows = [`Vencord ${gitHash}${additionalInfo}`];

        if (electronVersion) rows.push(`Electron ${electronVersion}`);
        if (chromiumVersion) rows.push(`Chromium ${chromiumVersion}`);

        return rows;
    },

    getInfoString() {
        return "\n" + this.getInfoRows().join("\n");
    },

    makeInfoElements(Component: React.ComponentType<React.PropsWithChildren>, props: React.PropsWithChildren) {
        return this.getInfoRows().map((text, i) =>
            <Component key={i} {...props}>{text}</Component>
        );
    }
});
