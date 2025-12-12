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

import { definePluginSettings } from "@api/Settings";
import { BackupRestoreIcon, CloudIcon, MainSettingsIcon, PaintbrushIcon, PatchHelperIcon, PlaceholderIcon, PluginsIcon, UpdaterIcon, VesktopSettingsIcon } from "@components/Icons";
import { BackupAndRestoreTab, CloudTab, PatchHelperTab, PluginsTab, ThemesTab, UpdaterTab, VencordTab } from "@components/settings/tabs";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { isTruthy } from "@utils/guards";
import definePlugin, { IconProps, OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { React } from "@webpack/common";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

import gitHash from "~git-hash";

let LayoutTypes = {
    SECTION: 1,
    SIDEBAR_ITEM: 2,
    PANEL: 3,
    PANE: 4
};
waitFor(["SECTION", "SIDEBAR_ITEM", "PANEL"], v => LayoutTypes = v);

const FallbackSectionTypes = {
    HEADER: "HEADER",
    DIVIDER: "DIVIDER",
    CUSTOM: "CUSTOM"
};
type SectionTypes = typeof FallbackSectionTypes;

type SettingsLocation =
    | "top"
    | "aboveNitro"
    | "belowNitro"
    | "aboveActivity"
    | "belowActivity"
    | "bottom";

interface SettingsLayoutNode {
    type: number;
    key?: string;
    legacySearchKey?: string;
    getLegacySearchKey?(): string;
    useLabel?(): string;
    useTitle?(): string;
    buildLayout?(): SettingsLayoutNode[];
    icon?(): ReactNode;
    render?(): ReactNode;
    StronglyDiscouragedCustomComponent?(): ReactNode;
}

interface EntryOptions {
    key: string,
    title: string,
    panelTitle?: string,
    Component: ComponentType<{}>,
    Icon: ComponentType<IconProps>;
}
interface SettingsLayoutBuilder {
    key?: string;
    buildLayout(): SettingsLayoutNode[];
}

const settings = definePluginSettings({
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
        ] as { label: string; value: SettingsLocation; default?: boolean; }[]
    }
});

export default definePlugin({
    name: "Settings",
    description: "Adds Settings UI and debug info",
    authors: [Devs.Ven, Devs.Megu],
    required: true,

    settings,

    patches: [
        {
            find: ".versionHash",
            replacement: [
                {
                    match: /\.compactInfo.+?(?=null!=(\i)&&(.{0,20}\i\.Text.{0,200}?,children:).{0,15}?("span"),({className:\i\.versionHash,children:\["Build Override: ",\1\.id\]\})\)\}\))/,
                    replace: (m, _buildOverride, makeRow, component, props) => {
                        props = props.replace(/children:\[.+\]/, "");
                        return `${m},$self.makeInfoElements(${component},${props}).map(e=>${makeRow}e})),`;
                    }
                },
                {
                    match: /\.info.+?\[\(0,\i\.jsxs?\)\((.{1,10}),(\{[^{}}]+\{.{0,20}.versionHash,.+?\})\)," "/,
                    replace: (m, component, props) => {
                        props = props.replace(/children:\[.+\]/, "");
                        return `${m},$self.makeInfoElements(${component},${props})`;
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
            find: ".buildLayout().map",
            replacement: {
                match: /(\i)\.buildLayout\(\)(?=\.map)/,
                replace: "$self.buildLayout($1)"
            }
        },
        {
            find: "getWebUserSettingFromSection",
            replacement: {
                match: /new Map\(\[(?=\[.{0,10}\.ACCOUNT,.{0,10}\.ACCOUNT_PANEL)/,
                replace: "new Map([...$self.getSettingsSectionMappings(),"
            }
        }
    ],

    buildEntry(options: EntryOptions): SettingsLayoutNode {
        const { key, title, panelTitle = title, Component, Icon } = options;

        const panel: SettingsLayoutNode = {
            key: key + "_panel",
            type: LayoutTypes.PANEL,
            useTitle: () => panelTitle,
        };

        const render = {
            // FIXME
            StronglyDiscouragedCustomComponent: () => <Component />,
            render: () => <Component />,
        };

        // FIXME
        if (LayoutTypes.PANE) {
            panel.buildLayout = () => [
                {
                    key: key + "_pane",
                    type: LayoutTypes.PANE,
                    useTitle: () => panelTitle,
                    buildLayout: () => [],
                    ...render
                }
            ];
        } else {
            Object.assign(panel, render);
            panel.buildLayout = () => [];
        }

        return ({
            key,
            type: LayoutTypes.SIDEBAR_ITEM,
            // FIXME
            legacySearchKey: title.toUpperCase(),
            getLegacySearchKey: () => title.toUpperCase(),
            useTitle: () => title,
            icon: () => <Icon width={20} height={20} />,
            buildLayout: () => [panel]
        });
    },

    getSettingsSectionMappings() {
        return [
            ["VencordSettings", "vencord_main_panel"],
            ["VencordPlugins", "vencord_plugins_panel"],
            ["VencordThemes", "vencord_themes_panel"],
            ["VencordUpdater", "vencord_updater_panel"],
            ["VencordCloud", "vencord_cloud_panel"],
            ["VencordBackupAndRestore", "vencord_backup_restore_panel"],
            ["VencordPatchHelper", "vencord_patch_helper_panel"]
        ];
    },

    buildLayout(originalLayoutBuilder: SettingsLayoutBuilder) {
        const layout = originalLayoutBuilder.buildLayout();
        if (originalLayoutBuilder.key !== "$Root") return layout;
        if (!Array.isArray(layout)) return layout;

        if (layout.some(s => s?.key === "vencord_section")) return layout;

        const { buildEntry } = this;

        const vencordEntries: SettingsLayoutNode[] = [
            buildEntry({
                key: "vencord_main",
                title: "Vencord",
                panelTitle: "Vencord Settings",
                Component: VencordTab,
                Icon: MainSettingsIcon
            }),
            buildEntry({
                key: "vencord_plugins",
                title: "Plugins",
                Component: PluginsTab,
                Icon: PluginsIcon
            }),
            buildEntry({
                key: "vencord_themes",
                title: "Themes",
                Component: ThemesTab,
                Icon: PaintbrushIcon
            }),
            !IS_UPDATER_DISABLED && UpdaterTab && buildEntry({
                key: "vencord_updater",
                title: "Updater",
                panelTitle: "Vencord Updater",
                Component: UpdaterTab,
                Icon: UpdaterIcon
            }),
            buildEntry({
                key: "vencord_cloud",
                title: "Cloud",
                panelTitle: "Vencord Cloud",
                Component: CloudTab,
                Icon: CloudIcon
            }),
            buildEntry({
                key: "vencord_backup_restore",
                title: "Backup & Restore",
                Component: BackupAndRestoreTab,
                Icon: BackupRestoreIcon
            }),
            IS_DEV && PatchHelperTab && buildEntry({
                key: "vencord_patch_helper",
                title: "Patch Helper",
                Component: PatchHelperTab,
                Icon: PatchHelperIcon
            }),
            ...this.customEntries.map(buildEntry),
            // TODO: Remove deprecated customSections in a future update
            ...this.customSections.map((func, i) => {
                const { section, element, label } = func(FallbackSectionTypes);
                if (Object.values(FallbackSectionTypes).includes(section)) return null;

                return buildEntry({
                    key: `vencord_deprecated_custom_${section}`,
                    title: label,
                    Component: element,
                    Icon: section === "Vesktop" ? VesktopSettingsIcon : PlaceholderIcon
                });
            })
        ].filter(isTruthy);

        const vencordSection: SettingsLayoutNode = {
            key: "vencord_section",
            type: LayoutTypes.SECTION,
            useLabel: () => "Vencord",
            buildLayout: () => vencordEntries
        };

        const { settingsLocation } = settings.store;

        const places: Record<SettingsLocation, string> = {
            top: "user_section",
            aboveNitro: "billing_section",
            belowNitro: "billing_section",
            aboveActivity: "activity_section",
            belowActivity: "activity_section",
            bottom: "logout_section"
        };

        const key = places[settingsLocation] ?? places.top;
        let idx = layout.findIndex(s => typeof s?.key === "string" && s.key === key);

        if (idx === -1) {
            idx = 2;
        } else if (settingsLocation.startsWith("below")) {
            idx += 1;
        }

        layout.splice(idx, 0, vencordSection);

        return layout;
    },

    /** @deprecated Use customEntries */
    customSections: [] as ((SectionTypes: SectionTypes) => any)[],
    customEntries: [] as EntryOptions[],

    makeSettingsCategories(SectionTypes: SectionTypes) {
        return [
            {
                section: SectionTypes.HEADER,
                label: "Vencord",
                className: "vc-settings-header"
            },
            {
                section: "VencordSettings",
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
                section: "VencordBackupAndRestore",
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

    isRightSpot({ header, settings: s }: { header?: string; settings?: string[]; }) {
        const firstChild = s?.[0];
        // lowest two elements... sanity backup
        if (firstChild === "LOGOUT" || firstChild === "SOCIAL_LINKS") return true;

        const { settingsLocation } = settings.store;

        if (settingsLocation === "bottom") return firstChild === "LOGOUT";
        if (settingsLocation === "belowActivity") return firstChild === "CHANGELOG";

        if (!header) return;

        try {
            const names: Record<Exclude<SettingsLocation, "bottom" | "belowActivity">, string> = {
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
                elements.unshift(...this.makeSettingsCategories(FallbackSectionTypes));

            return elements;
        };
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

    makeInfoElements(Component: ComponentType<PropsWithChildren>, props: PropsWithChildren) {
        return this.getInfoRows().map((text, i) =>
            <Component key={i} {...props}>{text}</Component>
        );
    }
});
