/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { BackupRestoreIcon, CloudIcon, LogIcon, MainSettingsIcon, PaintbrushIcon, PatchHelperIcon, PluginsIcon, UpdaterIcon, VesktopSettingsIcon } from "@components/Icons";
import {
    BackupAndRestoreTab,
    ChangelogTab,
    CloudTab,
    PatchHelperTab,
    PluginsTab,
    ThemesTab,
    UpdaterTab,
    VencordTab,
} from "@components/settings";
import { gitHashShort } from "@shared/vencordUserAgent";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { isTruthy } from "@utils/guards";
import definePlugin, { IconProps, OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { React } from "@webpack/common";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";

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
        description: "Where to put the Equicord settings section",
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
                // for whatever reason the first letter of RELEASE_CHANNEL is now lowercase, so we fix that here because it looks better imo
                {
                    match: /\.RELEASE_CHANNEL/,
                    replace: "$&.replace(/^./, c => c.toUpperCase())"
                },
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
                    replace: (
                        _,
                        sectionTypes,
                        commaOrSemi,
                        elements,
                        element,
                    ) =>
                        `${commaOrSemi} $self.addSettings(${elements}, ${element}, ${sectionTypes}) ${commaOrSemi}`,
                },
                {
                    match: /({(?=.+?function (\i).{0,160}(\i)=\i\.useMemo.{0,140}return \i\.useMemo\(\(\)=>\i\(\3).+?\(\)=>)\2/,
                    replace: (_, rest, settingsHook) =>
                        `${rest}$self.wrapSettingsHook(${settingsHook})`,
                },
            ],
        },
        // Fix the settings cog context menu to work properly
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
            ["EquicordSettings", "equicord_main_panel"],
            ["EquicordPlugins", "equicord_plugins_panel"],
            ["EquicordThemes", "equicord_themes_panel"],
            ["EquicordUpdater", "equicord_updater_panel"],
            ["EquicordChangelog", "equicord_changelog_panel"],
            ["EquicordCloud", "equicord_cloud_panel"],
            ["EquicordBackupAndRestore", "equicord_backup_restore_panel"],
            ["EquicordPatchHelper", "equicord_patch_helper_panel"],
            ["EquibopSettings", "equicord_equibop_settings_panel"],
            ["EquicordDiscordIcons", "equicord_icon_viewer"],
            ["EquicordThemeLibrary", "equicord_theme_library"],
            ["EquicordIRememberYou", "equicord_i_remember_you"],
        ];
    },

    buildLayout(originalLayoutBuilder: SettingsLayoutBuilder) {
        const layout = originalLayoutBuilder.buildLayout();
        if (originalLayoutBuilder.key !== "$Root") return layout;
        if (!Array.isArray(layout)) return layout;

        if (layout.some(s => s?.key === "equicord_section")) return layout;

        const { buildEntry } = this;

        const equicordEntries: SettingsLayoutNode[] = [
            buildEntry({
                key: "equicord_main",
                title: "Equicord",
                panelTitle: "Equicord Settings",
                Component: VencordTab,
                Icon: MainSettingsIcon
            }),
            buildEntry({
                key: "equicord_plugins",
                title: "Plugins",
                Component: PluginsTab,
                Icon: PluginsIcon
            }),
            buildEntry({
                key: "equicord_themes",
                title: "Themes",
                Component: ThemesTab,
                Icon: PaintbrushIcon
            }),
            !IS_UPDATER_DISABLED && UpdaterTab && buildEntry({
                key: "equicord_updater",
                title: "Updater",
                panelTitle: "Equicord Updater",
                Component: UpdaterTab,
                Icon: UpdaterIcon
            }),
            buildEntry({
                key: "equicord_changelog",
                title: "Changelog",
                Component: ChangelogTab,
                Icon: LogIcon,
            }),
            buildEntry({
                key: "equicord_cloud",
                title: "Cloud",
                panelTitle: "Equicord Cloud",
                Component: CloudTab,
                Icon: CloudIcon
            }),
            buildEntry({
                key: "equicord_backup_restore",
                title: "Backup & Restore",
                Component: BackupAndRestoreTab,
                Icon: BackupRestoreIcon
            }),
            IS_DEV && PatchHelperTab && buildEntry({
                key: "equicord_patch_helper",
                title: "Patch Helper",
                Component: PatchHelperTab,
                Icon: PatchHelperIcon
            }),
            ...this.customEntries.map(buildEntry),
            // TODO: Remove deprecated customSections in a future update
            ...this.customSections.map((func, i) => {
                const { section, element, label } = func(FallbackSectionTypes);
                if (section !== "Equibop") return null;

                return buildEntry({
                    key: `equicord_deprecated_custom_${section}`,
                    title: label,
                    Component: element,
                    Icon: VesktopSettingsIcon
                });
            })
        ].filter(isTruthy);

        const equicordSection: SettingsLayoutNode = {
            key: "equicord_section",
            type: LayoutTypes.SECTION,
            useLabel: () => "Equicord",
            buildLayout: () => equicordEntries
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

        layout.splice(idx, 0, equicordSection);

        return layout;
    },

    /** @deprecated Use customEntries */
    customSections: [] as ((SectionTypes: SectionTypes) => any)[],
    customEntries: [] as EntryOptions[],

    makeSettingsCategories(SectionTypes: SectionTypes) {
        return [
            {
                section: SectionTypes.HEADER,
                label: "Equicord",
                className: "vc-settings-header",
            },
            {
                section: "EquicordSettings",
                label: "Equicord",
                element: VencordTab,
                className: "vc-settings",
            },
            {
                section: "EquicordPlugins",
                label: "Plugins",
                searchableTitles: ["Plugins"],
                element: PluginsTab,
                className: "vc-plugins",
            },
            {
                section: "EquicordThemes",
                label: "Themes",
                searchableTitles: ["Themes"],
                element: ThemesTab,
                className: "vc-themes",
            },
            !IS_UPDATER_DISABLED && {
                section: "EquicordUpdater",
                label: "Updater",
                searchableTitles: ["Updater"],
                element: UpdaterTab,
                className: "vc-updater",
            },
            {
                section: "EquicordChangelog",
                label: "Changelog",
                searchableTitles: ["Changelog"],
                element: ChangelogTab,
                className: "vc-changelog",
            },
            {
                section: "EquicordCloud",
                label: "Cloud",
                searchableTitles: ["Cloud"],
                element: CloudTab,
                className: "vc-cloud",
            },
            {
                section: "EquicordBackupAndRestore",
                label: "Backup & Restore",
                searchableTitles: ["Backup & Restore"],
                element: BackupAndRestoreTab,
                className: "vc-backup-restore",
            },
            IS_DEV && {
                section: "EquicordPatchHelper",
                label: "Patch Helper",
                searchableTitles: ["Patch Helper"],
                element: PatchHelperTab,
                className: "vc-patch-helper",
            },
            ...this.customSections.map(func => func(SectionTypes)),
            {
                section: SectionTypes.DIVIDER,
            },
        ].filter(Boolean);
    },

    isRightSpot({ header, settings: s }: { header?: string; settings?: string[]; }) {
        const firstChild = s?.[0];
        // lowest two elements... sanity backup
        if (firstChild === "LOGOUT" || firstChild === "SOCIAL_LINKS")
            return true;

        const { settingsLocation } = settings.store;

        if (settingsLocation === "bottom") return firstChild === "LOGOUT";
        if (settingsLocation === "belowActivity")
            return firstChild === "CHANGELOG";

        if (!header) return;

        try {
            const names: Record<Exclude<SettingsLocation, "bottom" | "belowActivity">, string> = {
                top: getIntlMessage("USER_SETTINGS"),
                aboveNitro: getIntlMessage("BILLING_SETTINGS"),
                belowNitro: getIntlMessage("APP_SETTINGS"),
                aboveActivity: getIntlMessage("ACTIVITY_SETTINGS"),
            };

            if (
                !names[settingsLocation] ||
                names[settingsLocation].endsWith("_SETTINGS")
            )
                return firstChild === "PREMIUM";

            return header === names[settingsLocation];
        } catch {
            return firstChild === "PREMIUM";
        }
    },

    patchedSettings: new WeakSet(),

    addSettings(
        elements: any[],
        element: { header?: string; settings: string[]; },
        sectionTypes: SectionTypes,
    ) {
        if (this.patchedSettings.has(elements) || !this.isRightSpot(element))
            return;

        this.patchedSettings.add(elements);

        elements.push(...this.makeSettingsCategories(sectionTypes));
    },

    wrapSettingsHook(
        originalHook: (...args: any[]) => Record<string, unknown>[],
    ) {
        return (...args: any[]) => {
            const elements = originalHook(...args);
            if (!this.patchedSettings.has(elements))
                elements.unshift(...this.makeSettingsCategories(FallbackSectionTypes));

            return elements;
        };
    },

    get electronVersion() {
        return (
            VencordNative.native.getVersions().electron ||
            window.legcord?.electron ||
            null
        );
    },

    get chromiumVersion() {
        try {
            return (
                VencordNative.native.getVersions().chrome ||
                // @ts-expect-error Typescript will add userAgentData IMMEDIATELY
                navigator.userAgentData?.brands?.find(
                    b =>
                        b.brand === "Chromium" || b.brand === "Google Chrome",
                )?.version ||
                null
            );
        } catch {
            // inb4 some stupid browser throws unsupported error for navigator.userAgentData, it's only in chromium
            return null;
        }
    },

    getVersionInfo(support = true) {
        let version = "";

        if (IS_DEV) version = "Dev";
        if (IS_WEB) version = "Web";
        if (IS_VESKTOP) version = `Vesktop v${VesktopNative.app.getVersion()}`;
        if (IS_EQUIBOP) version = `Equibop v${VesktopNative.app.getVersion()}`;
        if (IS_STANDALONE) version = "Standalone";

        return support && version ? ` (${version})` : version;
    },

    getInfoRows() {
        const { electronVersion, chromiumVersion, getVersionInfo } = this;

        const rows = [`Equicord ${gitHashShort}${getVersionInfo()}`];

        if (electronVersion) rows.push(`Electron ${electronVersion}`);
        if (chromiumVersion) rows.push(`Chromium ${chromiumVersion}`);

        return rows;
    },

    getInfoString() {
        return "\n" + this.getInfoRows().join("\n");
    },

    makeInfoElements(
        Component: ComponentType<React.PropsWithChildren>,
        props: PropsWithChildren,
    ) {
        return this.getInfoRows().map((text, i) => (
            <Component key={i} {...props}>
                {text}
            </Component>
        ));
    },
});
